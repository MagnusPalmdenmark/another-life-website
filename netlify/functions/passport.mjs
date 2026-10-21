import { getStore } from "@netlify/blobs";
import { parseCode, makeCode, yymmNow, validateBatch, publicView, makeToken, checkToken, safeEqual, randomToken, sha256, cleanName } from "../passport-core.mjs";

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

// Who is calling: { admin: true, name: "Admin" }, { id, name } for workshop staff, or null.
async function whoAmI(db, context) {
  const secret = adminSecret(context);
  if (secret && (await checkToken(secret, context.cookies.get(ADMIN_COOKIE)))) return { admin: true, name: "Admin" };
  const dev = context.cookies.get(DEVICE_COOKIE);
  if (!dev) return null;
  const userId = await db.get(`devices/${await sha256(dev)}`);
  if (!userId) return null;
  const user = await db.get(`users/${userId}`, { type: "json" });
  return user && user.active ? { id: user.id, name: user.name } : null;
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

const userView = u => ({ id: u.id, name: u.name, active: u.active, created: u.created, joined: u.joined || null, waiting: Boolean(u.inviteHash) && (u.inviteExpires || 0) > Date.now() });

export default async (req, context) => {
  const url = new URL(req.url);
  const db = store(context);

  if (req.method === "GET") {
    if (url.searchParams.has("code")) {
      const p = parseCode(url.searchParams.get("code"));
      if (p.error) return json({ error: p.error }, 400);
      const b = await db.get(`batch/${p.code}`, { type: "json" });
      if (!b) return json({ error: "none" }, 404);
      return json({ batch: publicView(b) });
    }
    if (url.searchParams.has("photo")) {
      const [c, id] = String(url.searchParams.get("photo")).split("/");
      const p = parseCode(c || "");
      if (p.error || !PHOTO_ID.test(id || "")) return json({ error: "none" }, 404);
      const img = await db.get(`photo/${p.code}/${id}`, { type: "arrayBuffer" });
      if (!img) return json({ error: "none" }, 404);
      return new Response(img, { headers: { "content-type": "image/jpeg", "cache-control": "public, max-age=31536000, immutable" } });
    }
    if (url.searchParams.has("me")) {
      const me = await whoAmI(db, context);
      return json({ staff: Boolean(me), admin: Boolean(me?.admin), name: me?.name || null, adminReady: Boolean(Netlify.env.get("ADMIN_KEY")), testLogin: !isProd(context) });
    }
    if (url.searchParams.has("list")) {
      if (!(await whoAmI(db, context))) return json({ error: "auth" }, 401);
      const { blobs } = await db.list({ prefix: "batch/" });
      const keys = blobs.map(b => b.key).sort().reverse().slice(0, 30);
      const items = (await Promise.all(keys.map(k => db.get(k, { type: "json" })))).filter(Boolean);
      items.sort((a, b) => (b.made || "").localeCompare(a.made || ""));
      return json({ batches: items.map(b => ({ ...publicView(b), createdBy: b.createdBy || null })) });
    }
    if (url.searchParams.has("batches")) {
      if (!(await whoAmI(db, context))) return json({ error: "auth" }, 401);
      const { blobs } = await db.list({ prefix: "batch/" });
      const items = [];
      for (let i = 0; i < blobs.length; i += 50) {
        const chunk = await Promise.all(blobs.slice(i, i + 50).map(b => db.get(b.key, { type: "json" })));
        items.push(...chunk.filter(Boolean));
      }
      items.sort((a, b) => (b.made || "").localeCompare(a.made || ""));
      return json({ batches: items.map(b => ({ ...publicView(b), createdBy: b.createdBy || null })) });
    }
    if (url.searchParams.has("users")) {
      const me = await whoAmI(db, context);
      if (!me?.admin) return json({ error: "auth" }, 401);
      const { blobs } = await db.list({ prefix: "users/" });
      const users = (await Promise.all(blobs.map(b => db.get(b.key, { type: "json" })))).filter(u => u && u.active);
      users.sort((a, b) => a.created.localeCompare(b.created));
      return json({ users: users.map(userView) });
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
      const yymm = yymmNow();
      // Next free batch number this month: highest existing + 1, written only if the key is still new.
      const { blobs } = await db.list({ prefix: `batch/AL-${yymm}-` });
      let n = blobs.reduce((max, b) => Math.max(max, Number(b.key.split("-")[2]) || 0), 0) + 1;
      for (let tries = 0; tries < 5; tries++, n++) {
        if (n > 999) return json({ error: "full" }, 409);
        const code = makeCode(yymm, n);
        if (await db.get(`batch/${code}`)) continue;
        const batch = { ...v.batch, code, made: new Date().toISOString(), createdBy: me.name, createdById: me.id || "admin" };
        const res = await db.setJSON(`batch/${code}`, batch, { onlyIfNew: true });
        if (!res || res.modified !== false) return json({ batch: publicView(batch) }, 201);
      }
      return json({ error: "busy" }, 409);
    }
    case "photo": {
      // Photos of the wood before it was remade, added by workshop staff to a batch.
      const me = await whoAmI(db, context);
      if (!me) return json({ error: "auth" }, 401);
      const p = parseCode(String(body.code || ""));
      if (p.error) return json({ error: "code" }, 400);
      const batch = await db.get(`batch/${p.code}`, { type: "json" });
      if (!batch) return json({ error: "none" }, 404);
      batch.photos = batch.photos || [];
      if (batch.photos.length >= MAX_PHOTOS) return json({ error: "photos-full" }, 409);
      let bytes;
      try { bytes = Buffer.from(String(body.image || ""), "base64"); } catch { return json({ error: "photo" }, 400); }
      if (bytes.length < 100 || bytes.length > MAX_PHOTO_BYTES || bytes[0] !== 0xff || bytes[1] !== 0xd8) return json({ error: "photo" }, 400);
      const id = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
      await db.set(`photo/${p.code}/${id}`, bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length));
      batch.photos.push(id);
      await db.setJSON(`batch/${p.code}`, batch);
      return json({ batch: publicView(batch) }, 201);
    }
    case "photo-remove": {
      const me = await whoAmI(db, context);
      if (!me) return json({ error: "auth" }, 401);
      const p = parseCode(String(body.code || ""));
      const id = String(body.id || "");
      if (p.error || !PHOTO_ID.test(id)) return json({ error: "none" }, 404);
      const batch = await db.get(`batch/${p.code}`, { type: "json" });
      if (!batch || !(batch.photos || []).includes(id)) return json({ error: "none" }, 404);
      batch.photos = batch.photos.filter(x => x !== id);
      await db.delete(`photo/${p.code}/${id}`);
      await db.setJSON(`batch/${p.code}`, batch);
      return json({ batch: publicView(batch) });
    }
  }

  // Admin-only actions below
  const me = await whoAmI(db, context);
  if (!me?.admin) return json({ error: "auth" }, 401);

  if (body.action === "add-user") {
    const name = cleanName(body.name);
    if (!name) return json({ error: "name" }, 400);
    const user = { id: randomToken(9), name, active: true, created: new Date().toISOString(), devices: [] };
    const token = await newInvite(db, user);
    await db.setJSON(`users/${user.id}`, user);
    return json({ user: userView(user), token }, 201);
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
