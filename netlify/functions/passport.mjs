import { getStore } from "@netlify/blobs";
import { parseCode, makeCode, yymmNow, validateBatch, validateDetails, statusOf, publicView, staffView, lotKey, lotLabel, parseLotId, validateLot, defaultLotName, lotView, applyLots, makeToken, checkToken, safeEqual, randomToken, sha256, cleanName } from "../passport-core.mjs";

const ADMIN_COOKIE = "al_admin";   // signed with ADMIN_KEY, 30 days
const DEVICE_COOKIE = "al_device"; // personal phone key from an invite link
const INVITE_DAYS = 7;
const DEVICE_DAYS = 400;
const MAX_PHOTOS = 6;
const MAX_PHOTO_BYTES = 2_500_000;
const PHOTO_ID = /^[a-f0-9]{12}$/;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

// Production keeps its own store; previews and branch deploys never touch real data.
function store(context) {
  const name = context?.deploy?.context === "production" ? "passport" : "passport-preview";
  return getStore({ name, consistency: "strong" });
}

// Test login (username "test", password "test") works only on previews and branch deploys, never in production.
const isProd = context => context?.deploy?.context === "production";
function adminSecret(context) {
  return Netlify.env.get("ADMIN_KEY") || (isProd(context) ? null : "al-preview-test-only");
}

// Who is calling: { admin: true, name: "Admin" }, { id, name, workshopId } for workshop staff, or null.
async function whoAmI(db, context) {
  const secret = adminSecret(context);
  if (secret && (await checkToken(secret, context.cookies.get(ADMIN_COOKIE)))) return { admin: true, name: "Admin" };
  const dev = context.cookies.get(DEVICE_COOKIE);
  if (!dev) return null;
  const userId = await db.get(`devices/${await sha256(dev)}`);
  if (!userId) return null;
  const user = await db.get(`users/${userId}`, { type: "json" });
  return user && user.active ? { id: user.id, name: user.name, workshopId: user.workshopId || null } : null;
}

// Workshop staff see and change only their own workshop's batches. Someone not yet placed in a
// workshop sees only the batches they made themselves. Admin sees everything.
function canSee(me, b) {
  if (!me || !b) return false;
  if (me.admin) return true;
  return me.workshopId ? b.workshopId === me.workshopId : b.createdById === me.id;
}

async function readAll(db, prefix) {
  const { blobs } = await db.list({ prefix });
  const items = [];
  for (let i = 0; i < blobs.length; i += 50) {
    const chunk = await Promise.all(blobs.slice(i, i + 50).map(b => db.get(b.key, { type: "json" })));
    items.push(...chunk.filter(Boolean));
  }
  return items;
}
// id -> name of every workshop
async function workshopNames(db) {
  const ws = await readAll(db, "workshops/");
  return Object.fromEntries(ws.filter(w => w.active).map(w => [w.id, w.name]));
}
async function loadBatch(db, code) {
  const p = parseCode(String(code || ""));
  if (p.error) return null;
  return db.get(`batch/${p.code}`, { type: "json" });
}

// Every lot by number
async function allLots(db) {
  return Object.fromEntries((await readAll(db, "lots/")).map(l => [l.n, l]));
}
async function lotsFor(db, b) {
  const out = {};
  for (const n of b.lots || []) { const l = await db.get(lotKey(n), { type: "json" }); if (l) out[n] = l; }
  return out;
}
// Checks a list of lot numbers from a form: each must exist and belong to the batch's workshop.
async function checkLots(db, me, list, workshopId) {
  if (!Array.isArray(list)) return { lots: [] };
  const ns = [...new Set(list.map(parseLotId).filter(n => n != null))].slice(0, 8);
  for (const n of ns) {
    const l = await db.get(lotKey(n), { type: "json" });
    if (!l) return { error: "lot" };
    if (!me.admin && !canSee(me, l)) return { error: "lot" };
    if (me.admin && workshopId && l.workshopId && l.workshopId !== workshopId) return { error: "lot-workshop" };
  }
  return { lots: ns };
}

// Before a batch or lot is changed, the old version is kept, so a mistake can always be undone.
async function keepHistory(db, kind, id, prev) {
  if (prev) await db.setJSON(`history/${kind}/${id}/${new Date().toISOString()}`, prev);
}

// The export key lets the Google Sheet copy everything and rebuild the site from it.
function exportKeyOk(req, context) {
  const key = Netlify.env.get("EXPORT_KEY") || (isProd(context) ? null : "preview-export-key");
  const got = req.headers.get("x-export-key") || "";
  return Boolean(key && got && safeEqual(got, key));
}

// Saves a JPEG sent as base64. Returns { id } or { error }.
async function savePhoto(db, prefix, image) {
  let bytes;
  try { bytes = Buffer.from(String(image || ""), "base64"); } catch { return { error: "photo" }; }
  if (bytes.length < 100 || bytes.length > MAX_PHOTO_BYTES || bytes[0] !== 0xff || bytes[1] !== 0xd8) return { error: "photo" };
  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  await db.set(`${prefix}/${id}`, bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length));
  return { id };
}

async function newInvite(db, user) {
  if (user.inviteHash) await db.delete(`invites/${user.inviteHash}`);
  const token = randomToken();
  const hash = await sha256(token);
  await db.setJSON(`invites/${hash}`, { userId: user.id, expires: Date.now() + INVITE_DAYS * 864e5 });
  user.inviteHash = hash;
  user.inviteExpires = Date.now() + INVITE_DAYS * 864e5;
  return token;
}

const userView = u => ({ id: u.id, name: u.name, active: u.active, created: u.created, joined: u.joined || null, workshopId: u.workshopId || null, waiting: Boolean(u.inviteHash) && (u.inviteExpires || 0) > Date.now() });

export default async (req, context) => {
  const url = new URL(req.url);
  const db = store(context);

  if (req.method === "GET") {
    if (url.searchParams.has("code")) {
      const p = parseCode(url.searchParams.get("code"));
      if (p.error) return json({ error: p.error }, 400);
      const b = await db.get(`batch/${p.code}`, { type: "json" });
      if (!b) return json({ error: "none" }, 404);
      return json({ batch: publicView(applyLots(b, await lotsFor(db, b))) });
    }
    if (url.searchParams.has("photo")) {
      const [c, id] = String(url.searchParams.get("photo")).split("/");
      const p = parseCode(c || "");
      if (p.error || !PHOTO_ID.test(id || "")) return json({ error: "none" }, 404);
      const img = await db.get(`photo/${p.code}/${id}`, { type: "arrayBuffer" });
      if (!img) return json({ error: "none" }, 404);
      return new Response(img, { headers: { "content-type": "image/jpeg", "cache-control": "public, max-age=31536000, immutable" } });
    }
    if (url.searchParams.has("lphoto")) {
      // Lot photos are public only when the lot allows it; staff and the export key always see them.
      const [ln, id] = String(url.searchParams.get("lphoto")).replace(/^L/i, "").split("/");
      const n = parseLotId(ln);
      if (n == null || !PHOTO_ID.test(id || "")) return json({ error: "none" }, 404);
      const lot = await db.get(lotKey(n), { type: "json" });
      if (!lot || !(lot.photos || []).includes(id)) return json({ error: "none" }, 404);
      if (lot.publicPhotos === false && !exportKeyOk(req, context) && !(await whoAmI(db, context))) return json({ error: "none" }, 404);
      const img = await db.get(`lphoto/${n}/${id}`, { type: "arrayBuffer" });
      if (!img) return json({ error: "none" }, 404);
      return new Response(img, { headers: { "content-type": "image/jpeg", "cache-control": lot.publicPhotos === false ? "private, no-store" : "public, max-age=31536000, immutable" } });
    }
    if (url.searchParams.has("export")) {
      // Everything, for the master Google Sheet and the "Download everything" button.
      const me = exportKeyOk(req, context) ? { admin: true } : await whoAmI(db, context);
      if (!me?.admin) return json({ error: "auth" }, 401);
      const [batches, lotsByN, workshops] = await Promise.all([readAll(db, "batch/"), allLots(db), readAll(db, "workshops/")]);
      const names = Object.fromEntries(workshops.filter(w => w.active).map(w => [w.id, w.name]));
      batches.sort((a, b) => (a.made || "").localeCompare(b.made || ""));
      const lots = Object.values(lotsByN).sort((a, b) => a.n - b.n);
      return json({ exported: new Date().toISOString(), site: url.origin, version: 1,
        workshops: workshops.map(w => ({ id: w.id, name: w.name, active: w.active, created: w.created })),
        lots: lots.map(l => ({ ...lotView(l, names, batches.filter(b => (b.lots || []).includes(l.n)).map(b => b.code)) })),
        batches: batches.map(b => ({ ...staffView(applyLots(b, lotsByN), names), createdById: b.createdById || null })) });
    }
    if (url.searchParams.has("me")) {
      const me = await whoAmI(db, context);
      const ws = me?.workshopId ? await db.get(`workshops/${me.workshopId}`, { type: "json" }) : null;
      return json({ staff: Boolean(me), admin: Boolean(me?.admin), name: me?.name || null, workshopId: me?.workshopId || null, workshop: ws?.name || null,
        adminReady: Boolean(Netlify.env.get("ADMIN_KEY")), testLogin: !isProd(context) });
    }
    if (url.searchParams.has("list") || url.searchParams.has("batches")) {
      const me = await whoAmI(db, context);
      if (!me) return json({ error: "auth" }, 401);
      const [items, names, lotsByN] = await Promise.all([readAll(db, "batch/"), workshopNames(db), allLots(db)]);
      let mine = items.filter(b => canSee(me, b)).map(b => applyLots(b, lotsByN));
      mine.sort((a, b) => (b.made || "").localeCompare(a.made || ""));
      if (url.searchParams.has("list")) mine = mine.filter(b => statusOf(b) === "draft").concat(mine.filter(b => statusOf(b) !== "draft").slice(0, 30));
      return json({ batches: mine.map(b => staffView(b, names)) });
    }
    if (url.searchParams.has("staff")) {
      // One batch with all details, for the edit screen
      const me = await whoAmI(db, context);
      if (!me) return json({ error: "auth" }, 401);
      const b = await loadBatch(db, url.searchParams.get("staff"));
      if (!b || !canSee(me, b)) return json({ error: "none" }, 404);
      return json({ batch: staffView(applyLots(b, await lotsFor(db, b)), await workshopNames(db)) });
    }
    if (url.searchParams.has("lots")) {
      const me = await whoAmI(db, context);
      if (!me) return json({ error: "auth" }, 401);
      const [lotsByN, names, batches] = await Promise.all([allLots(db), workshopNames(db), readAll(db, "batch/")]);
      const lots = Object.values(lotsByN).filter(l => canSee(me, l)).sort((a, b) => b.n - a.n);
      return json({ lots: lots.map(l => lotView(l, names, batches.filter(b => (b.lots || []).includes(l.n)).map(b => b.code))) });
    }
    if (url.searchParams.has("lot")) {
      const me = await whoAmI(db, context);
      if (!me) return json({ error: "auth" }, 401);
      const n = parseLotId(url.searchParams.get("lot"));
      const l = n == null ? null : await db.get(lotKey(n), { type: "json" });
      if (!l || !canSee(me, l)) return json({ error: "none" }, 404);
      const batches = (await readAll(db, "batch/")).filter(b => (b.lots || []).includes(n));
      return json({ lot: lotView(l, await workshopNames(db), batches.map(b => b.code)),
        batches: batches.map(b => ({ code: b.code, model: b.model, qty: b.qty, made: b.made })) });
    }
    if (url.searchParams.has("users")) {
      const me = await whoAmI(db, context);
      if (!me?.admin) return json({ error: "auth" }, 401);
      const { blobs } = await db.list({ prefix: "users/" });
      const users = (await Promise.all(blobs.map(b => db.get(b.key, { type: "json" })))).filter(u => u && u.active);
      users.sort((a, b) => a.created.localeCompare(b.created));
      const workshops = (await readAll(db, "workshops/")).filter(w => w.active).sort((a, b) => a.created.localeCompare(b.created));
      return json({ users: users.map(userView), workshops: workshops.map(w => ({ id: w.id, name: w.name, created: w.created })) });
    }
    return json({ error: "unknown" }, 400);
  }

  if (req.method !== "POST") return json({ error: "method" }, 405);
  let body = {};
  try { body = await req.json(); } catch { return json({ error: "body" }, 400); }

  switch (body.action) {
    case "admin-login": {
      const key = Netlify.env.get("ADMIN_KEY");
      if (!key) return json({ error: "not-ready" }, 503);
      await new Promise(r => setTimeout(r, 500)); // slow down guessing
      if (!safeEqual(String(body.key || ""), key)) return json({ error: "wrong" }, 401);
      context.cookies.set({ name: ADMIN_COOKIE, value: await makeToken(key), path: "/", httpOnly: true, secure: true, sameSite: "Lax", expires: new Date(Date.now() + 30 * 864e5) });
      return json({ ok: true });
    }
    case "test-login": {
      if (isProd(context)) return json({ error: "unknown" }, 404);
      if (String(body.username || "").trim().toLowerCase() !== "test" || String(body.password || "") !== "test") return json({ error: "wrong" }, 401);
      context.cookies.set({ name: ADMIN_COOKIE, value: await makeToken(adminSecret(context), 1), path: "/", httpOnly: true, secure: true, sameSite: "Lax", expires: new Date(Date.now() + 864e5) });
      return json({ ok: true });
    }
    case "join": {
      const hash = await sha256(String(body.token || ""));
      const inv = await db.get(`invites/${hash}`, { type: "json" });
      if (!inv) return json({ error: "used" }, 404);
      await db.delete(`invites/${hash}`); // a link works once
      const user = await db.get(`users/${inv.userId}`, { type: "json" });
      if (!user || !user.active || inv.expires < Date.now() || user.inviteHash !== hash) return json({ error: "used" }, 404);
      const device = randomToken();
      const devHash = await sha256(device);
      await db.set(`devices/${devHash}`, user.id);
      user.devices = [...(user.devices || []), devHash];
      user.inviteHash = null; user.inviteExpires = null;
      user.joined = new Date().toISOString();
      await db.setJSON(`users/${user.id}`, user);
      context.cookies.set({ name: DEVICE_COOKIE, value: device, path: "/", httpOnly: true, secure: true, sameSite: "Lax", expires: new Date(Date.now() + DEVICE_DAYS * 864e5) });
      return json({ ok: true, name: user.name });
    }
    case "logout": {
      const dev = context.cookies.get(DEVICE_COOKIE);
      if (dev) {
        const devHash = await sha256(dev);
        const userId = await db.get(`devices/${devHash}`);
        await db.delete(`devices/${devHash}`);
        if (userId) {
          const user = await db.get(`users/${userId}`, { type: "json" });
          if (user) { user.devices = (user.devices || []).filter(d => d !== devHash); await db.setJSON(`users/${user.id}`, user); }
        }
      }
      context.cookies.delete({ name: DEVICE_COOKIE, path: "/" });
      context.cookies.delete({ name: ADMIN_COOKIE, path: "/" });
      return json({ ok: true });
    }
    case "create": {
      const me = await whoAmI(db, context);
      if (!me) return json({ error: "auth" }, 401);
      const v = validateBatch(body);
      if (v.error) return json({ error: v.error }, 400);
      // Admin picks the workshop; workshop staff always make batches for their own workshop.
      let workshopId = me.admin ? String(body.workshopId || "") || null : me.workshopId;
      if (workshopId && !(await db.get(`workshops/${workshopId}`))) return json({ error: "workshop" }, 400);
      const cl = await checkLots(db, me, body.lots, workshopId);
      if (cl.error) return json({ error: cl.error }, 400);
      v.batch.lots = cl.lots;
      v.batch.status = statusOf(v.batch);
      const yymm = yymmNow();
      // Next free batch number this month: highest existing + 1, written only if the key is still new.
      const { blobs } = await db.list({ prefix: `batch/AL-${yymm}-` });
      let n = blobs.reduce((max, b) => Math.max(max, Number(b.key.split("-")[2]) || 0), 0) + 1;
      for (let tries = 0; tries < 5; tries++, n++) {
        if (n > 999) return json({ error: "full" }, 409);
        const code = makeCode(yymm, n);
        if (await db.get(`batch/${code}`)) continue;
        const now = new Date().toISOString();
        const batch = { ...v.batch, code, made: now, createdBy: me.name, createdById: me.id || "admin", workshopId };
        if (batch.status === "complete") batch.completed = now;
        const res = await db.setJSON(`batch/${code}`, batch, { onlyIfNew: true });
        if (!res || res.modified !== false) return json({ batch: staffView(applyLots(batch, await lotsFor(db, batch)), await workshopNames(db)) }, 201);
      }
      return json({ error: "busy" }, 409);
    }
    case "update": {
      // Fill in or correct the details of a batch. The QR code never changes.
      const me = await whoAmI(db, context);
      if (!me) return json({ error: "auth" }, 401);
      const batch = await loadBatch(db, body.code);
      if (!batch || !canSee(me, batch)) return json({ error: "none" }, 404);
      const d = validateDetails(body);
      if (d.error) return json({ error: d.error }, 400);
      const prev = { ...batch };
      const wasDraft = statusOf(batch) === "draft";
      // Once a passport shows its story, the wood can be corrected but not removed again.
      if (!d.details.origin) delete d.details.origin;
      Object.assign(batch, d.details);
      if (me.admin) {
        if ("model" in body || "qty" in body) {
          const v = validateBatch({ model: body.model ?? batch.model, qty: body.qty ?? batch.qty });
          if (v.error) return json({ error: v.error }, 400);
          batch.model = v.batch.model; batch.qty = v.batch.qty;
        }
        if ("workshopId" in body) {
          const w = String(body.workshopId || "") || null;
          if (w && !(await db.get(`workshops/${w}`))) return json({ error: "workshop" }, 400);
          batch.workshopId = w;
        }
      }
      if ("lots" in body) {
        const cl = await checkLots(db, me, body.lots, batch.workshopId);
        if (cl.error) return json({ error: cl.error }, 400);
        // A batch that already shows its story keeps at least its origin when lots are removed.
        if (!cl.lots.length && (batch.lots || []).length && !batch.origin) {
          const old = await lotsFor(db, batch); const first = old[batch.lots[0]];
          if (first) batch.origin = first.origin;
        }
        batch.lots = cl.lots;
      }
      batch.status = statusOf(batch);
      batch.updated = new Date().toISOString(); batch.updatedBy = me.name;
      if (wasDraft && batch.status === "complete") batch.completed = batch.updated;
      await keepHistory(db, "batch", batch.code, prev);
      await db.setJSON(`batch/${batch.code}`, batch);
      return json({ batch: staffView(applyLots(batch, await lotsFor(db, batch)), await workshopNames(db)) });
    }
    case "add-lot": {
      const me = await whoAmI(db, context);
      if (!me) return json({ error: "auth" }, 401);
      const v = validateLot(body, true);
      if (v.error) return json({ error: v.error }, 400);
      const workshopId = me.admin ? String(body.workshopId || "") || null : me.workshopId;
      if (workshopId && !(await db.get(`workshops/${workshopId}`))) return json({ error: "workshop" }, 400);
      const { blobs } = await db.list({ prefix: "lots/" });
      let n = blobs.reduce((max, b) => Math.max(max, Number(b.key.slice(5)) || 0), 0) + 1;
      for (let tries = 0; tries < 5; tries++, n++) {
        const now = new Date().toISOString();
        const lot = { status: "open", publicPhotos: true, ...v.lot, n, workshopId, photos: [], created: now, createdBy: me.name, createdById: me.id || "admin" };
        if (!lot.name) lot.name = defaultLotName(lot);
        if (!lot.arrived) lot.arrived = now.slice(0, 10);
        const res = await db.setJSON(lotKey(n), lot, { onlyIfNew: true });
        if (!res || res.modified !== false) return json({ lot: lotView(lot, await workshopNames(db)) }, 201);
      }
      return json({ error: "busy" }, 409);
    }
    case "update-lot": {
      const me = await whoAmI(db, context);
      if (!me) return json({ error: "auth" }, 401);
      const n = parseLotId(body.n);
      const lot = n == null ? null : await db.get(lotKey(n), { type: "json" });
      if (!lot || !canSee(me, lot)) return json({ error: "none" }, 404);
      const v = validateLot(body);
      if (v.error) return json({ error: v.error }, 400);
      const prev = { ...lot };
      Object.assign(lot, v.lot);
      if (!lot.name) lot.name = defaultLotName(lot);
      if (me.admin && "workshopId" in body) {
        const w = String(body.workshopId || "") || null;
        if (w && !(await db.get(`workshops/${w}`))) return json({ error: "workshop" }, 400);
        lot.workshopId = w;
      }
      lot.updated = new Date().toISOString(); lot.updatedBy = me.name;
      await keepHistory(db, "lot", n, prev);
      await db.setJSON(lotKey(n), lot);
      return json({ lot: lotView(lot, await workshopNames(db)) });
    }
    case "lot-photo":
    case "lot-photo-remove": {
      const me = await whoAmI(db, context);
      if (!me) return json({ error: "auth" }, 401);
      const n = parseLotId(body.n);
      const lot = n == null ? null : await db.get(lotKey(n), { type: "json" });
      if (!lot || !canSee(me, lot)) return json({ error: "none" }, 404);
      lot.photos = lot.photos || [];
      if (body.action === "lot-photo") {
        if (lot.photos.length >= 12) return json({ error: "photos-full" }, 409);
        const ph = await savePhoto(db, `lphoto/${n}`, body.image);
        if (ph.error) return json({ error: ph.error }, 400);
        lot.photos.push(ph.id);
      } else {
        const id = String(body.id || "");
        if (!lot.photos.includes(id)) return json({ error: "none" }, 404);
        lot.photos = lot.photos.filter(x => x !== id);
        await db.delete(`lphoto/${n}/${id}`);
      }
      await db.setJSON(lotKey(n), lot);
      return json({ lot: lotView(lot, await workshopNames(db)) }, body.action === "lot-photo" ? 201 : 200);
    }
    case "photo": {
      // Photos of the wood before it was remade, added by workshop staff to a batch.
      const me = await whoAmI(db, context);
      if (!me) return json({ error: "auth" }, 401);
      const p = parseCode(String(body.code || ""));
      if (p.error) return json({ error: "code" }, 400);
      const batch = await db.get(`batch/${p.code}`, { type: "json" });
      if (!batch || !canSee(me, batch)) return json({ error: "none" }, 404);
      batch.photos = batch.photos || [];
      if (batch.photos.length >= MAX_PHOTOS) return json({ error: "photos-full" }, 409);
      const ph = await savePhoto(db, `photo/${p.code}`, body.image);
      if (ph.error) return json({ error: ph.error }, 400);
      batch.photos.push(ph.id);
      await db.setJSON(`batch/${p.code}`, batch);
      return json({ batch: staffView(batch, await workshopNames(db)) }, 201);
    }
    case "photo-remove": {
      const me = await whoAmI(db, context);
      if (!me) return json({ error: "auth" }, 401);
      const p = parseCode(String(body.code || ""));
      const id = String(body.id || "");
      if (p.error || !PHOTO_ID.test(id)) return json({ error: "none" }, 404);
      const batch = await db.get(`batch/${p.code}`, { type: "json" });
      if (!batch || !canSee(me, batch) || !(batch.photos || []).includes(id)) return json({ error: "none" }, 404);
      batch.photos = batch.photos.filter(x => x !== id);
      await db.delete(`photo/${p.code}/${id}`);
      await db.setJSON(`batch/${p.code}`, batch);
      return json({ batch: staffView(batch, await workshopNames(db)) });
    }
  }

  // Rebuild from the master sheet: writes back workshops, lots, batches and photos with their
  // original codes, so every engraved QR code keeps working. Needs the export key or admin.
  if (body.action === "restore" || body.action === "restore-photo") {
    const ok = exportKeyOk(req, context) || (await whoAmI(db, context))?.admin;
    if (!ok) return json({ error: "auth" }, 401);
    const overwrite = Boolean(body.overwrite);
    if (body.action === "restore-photo") {
      const kind = body.kind === "lot" ? "lot" : "batch";
      const id = String(body.id || "");
      if (!PHOTO_ID.test(id)) return json({ error: "photo" }, 400);
      let key;
      if (kind === "lot") { const n = parseLotId(body.ref); if (n == null) return json({ error: "lot" }, 400); key = `lphoto/${n}/${id}`; }
      else { const p = parseCode(String(body.ref || "")); if (p.error) return json({ error: "code" }, 400); key = `photo/${p.code}/${id}`; }
      if (!overwrite && (await db.get(key))) return json({ ok: true, skipped: true });
      let bytes;
      try { bytes = Buffer.from(String(body.image || ""), "base64"); } catch { return json({ error: "photo" }, 400); }
      if (bytes.length < 100 || bytes.length > MAX_PHOTO_BYTES || bytes[0] !== 0xff || bytes[1] !== 0xd8) return json({ error: "photo" }, 400);
      await db.set(key, bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length));
      return json({ ok: true });
    }
    const done = { workshops: 0, lots: 0, batches: 0, skipped: 0, errors: [] };
    const put = async (key, rec) => {
      if (!overwrite && (await db.get(key))) { done.skipped++; return false; }
      const prev = await db.get(key, { type: "json" });
      if (prev) await db.setJSON(`history/restore/${key.replace(/\//g, "_")}/${new Date().toISOString()}`, prev);
      await db.setJSON(key, rec); return true;
    };
    for (const w of Array.isArray(body.workshops) ? body.workshops : []) {
      const id = String(w.id || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 20), name = cleanName(w.name);
      if (!id || !name) { done.errors.push(`workshop ${w.id}`); continue; }
      if (await put(`workshops/${id}`, { id, name, active: w.active !== false, created: String(w.created || new Date().toISOString()) })) done.workshops++;
    }
    for (const l of Array.isArray(body.lots) ? body.lots : []) {
      const n = parseLotId(l.n), v = validateLot({ ...l, status: l.status || "open", publicPhotos: l.publicPhotos !== false }, true);
      if (n == null || v.error) { done.errors.push(`lot ${l.n}`); continue; }
      const rec = { ...v.lot, n, workshopId: l.workshopId || null, photos: (l.photos || []).filter(x => PHOTO_ID.test(x)),
        created: String(l.created || new Date().toISOString()), createdBy: cleanName(l.createdBy) || null, updated: l.updated || null, updatedBy: cleanName(l.updatedBy) || null };
      if (await put(lotKey(n), rec)) done.lots++;
    }
    for (const b of Array.isArray(body.batches) ? body.batches : []) {
      const p = parseCode(String(b.code || ""));
      const v = validateBatch({ model: b.model, qty: b.qty, origin: b.lots && b.lots.length ? "" : b.origin, region: b.lots && b.lots.length ? "" : b.region, maker: b.maker, kg: b.kg });
      if (p.error || v.error) { done.errors.push(`batch ${b.code}`); continue; }
      const rec = { ...v.batch, code: p.code, lots: (b.lots || []).map(parseLotId).filter(n => n != null), photos: (b.photos || []).filter(x => PHOTO_ID.test(x)),
        made: String(b.made || new Date().toISOString()), completed: b.completed || null, workshopId: b.workshopId || null,
        createdBy: cleanName(b.createdBy) || null, createdById: b.createdById || null, updated: b.updated || null, updatedBy: cleanName(b.updatedBy) || null };
      rec.status = statusOf(rec);
      if (await put(`batch/${p.code}`, rec)) done.batches++;
    }
    return json(done);
  }

  // Admin-only actions below
  const me = await whoAmI(db, context);
  if (!me?.admin) return json({ error: "auth" }, 401);

  if (body.action === "add-user") {
    const name = cleanName(body.name);
    if (!name) return json({ error: "name" }, 400);
    const workshopId = String(body.workshopId || "") || null;
    if (workshopId && !(await db.get(`workshops/${workshopId}`))) return json({ error: "workshop" }, 400);
    const user = { id: randomToken(9), name, active: true, created: new Date().toISOString(), devices: [], workshopId };
    const token = await newInvite(db, user);
    await db.setJSON(`users/${user.id}`, user);
    return json({ user: userView(user), token }, 201);
  }
  if (body.action === "add-workshop") {
    const name = cleanName(body.name);
    if (!name) return json({ error: "name" }, 400);
    const ws = { id: randomToken(6), name, active: true, created: new Date().toISOString() };
    await db.setJSON(`workshops/${ws.id}`, ws);
    return json({ workshop: { id: ws.id, name: ws.name, created: ws.created } }, 201);
  }
  if (body.action === "rename-workshop") {
    const ws = await db.get(`workshops/${String(body.id || "")}`, { type: "json" });
    const name = cleanName(body.name);
    if (!ws || !ws.active) return json({ error: "none" }, 404);
    if (!name) return json({ error: "name" }, 400);
    ws.name = name; await db.setJSON(`workshops/${ws.id}`, ws);
    return json({ ok: true });
  }
  if (body.action === "set-user-workshop") {
    const user = await db.get(`users/${String(body.id || "")}`, { type: "json" });
    if (!user || !user.active) return json({ error: "none" }, 404);
    const workshopId = String(body.workshopId || "") || null;
    if (workshopId && !(await db.get(`workshops/${workshopId}`))) return json({ error: "workshop" }, 400);
    user.workshopId = workshopId; await db.setJSON(`users/${user.id}`, user);
    return json({ user: userView(user) });
  }
  if (body.action === "new-link" || body.action === "remove-user") {
    const user = await db.get(`users/${String(body.id || "")}`, { type: "json" });
    if (!user || !user.active) return json({ error: "none" }, 404);
    // Both actions log out every phone this person has
    for (const d of user.devices || []) await db.delete(`devices/${d}`);
    user.devices = [];
    if (body.action === "remove-user") {
      if (user.inviteHash) await db.delete(`invites/${user.inviteHash}`);
      user.inviteHash = null; user.active = false; user.removed = new Date().toISOString();
      await db.setJSON(`users/${user.id}`, user);
      return json({ ok: true });
    }
    const token = await newInvite(db, user);
    await db.setJSON(`users/${user.id}`, user);
    return json({ user: userView(user), token });
  }
  return json({ error: "unknown" }, 400);
};
