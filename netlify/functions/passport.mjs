import { getStore } from "@netlify/blobs";
import { parseCode, makeCode, yymmNow, validateBatch, publicView, makeToken, checkToken, safeEqual, randomToken, sha256, cleanName } from "../passport-core.mjs";

const ADMIN_COOKIE = "al_admin";   // signed with ADMIN_KEY, 30 days
const DEVICE_COOKIE = "al_device"; // personal phone key from an invite link
const INVITE_DAYS = 7;
const DEVICE_DAYS = 400;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

// Production keeps its own store; previews and branch deploys never touch real data.
function store(context) {
  const name = context?.deploy?.context === "production" ? "passport" : "passport-preview";
  return getStore({ name, consistency: "strong" });
}

// Who is calling: { admin: true, name: "Admin" }, { id, name } for workshop staff, or null.
async function whoAmI(db, context) {
  const adminKey = Netlify.env.get("ADMIN_KEY");
  if (adminKey && (await checkToken(adminKey, context.cookies.get(ADMIN_COOKIE)))) return { admin: true, name: "Admin" };
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
    if (url.searchParams.has("me")) {
      const me = await whoAmI(db, context);
      return json({ staff: Boolean(me), admin: Boolean(me?.admin), name: me?.name || null, adminReady: Boolean(Netlify.env.get("ADMIN_KEY")) });
    }
    if (url.searchParams.has("list")) {
      if (!(await whoAmI(db, context))) return json({ error: "auth" }, 401);
      const { blobs } = await db.list({ prefix: "batch/" });
      const keys = blobs.map(b => b.key).sort().reverse().slice(0, 30);
      const items = (await Promise.all(keys.map(k => db.get(k, { type: "json" })))).filter(Boolean);
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
