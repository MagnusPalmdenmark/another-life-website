import { getStore } from "@netlify/blobs";
import { parseCode, makeCode, yymmNow, validateBatch, publicView, makeToken, checkToken, safeEqual } from "../passport-core.mjs";

const COOKIE = "al_staff";
const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers } });

// Production keeps its own store; previews and branch deploys never touch real batches.
function store(context) {
  const name = context?.deploy?.context === "production" ? "passport" : "passport-preview";
  return getStore({ name, consistency: "strong" });
}

async function isStaff(context) {
  const pw = Netlify.env.get("STAFF_PASSWORD");
  return checkToken(pw, context.cookies.get(COOKIE));
}

export default async (req, context) => {
  const url = new URL(req.url);
  const db = store(context);

  if (req.method === "GET") {
    // Public lookup
    if (url.searchParams.has("code")) {
      const p = parseCode(url.searchParams.get("code"));
      if (p.error) return json({ error: p.error }, 400);
      const b = await db.get(`batch/${p.code}`, { type: "json" });
      if (!b) return json({ error: "none" }, 404);
      return json({ batch: publicView(b), staff: await isStaff(context) });
    }
    if (url.searchParams.has("me")) {
      return json({ staff: await isStaff(context), ready: Boolean(Netlify.env.get("STAFF_PASSWORD")) });
    }
    if (url.searchParams.has("list")) {
      if (!(await isStaff(context))) return json({ error: "auth" }, 401);
      const { blobs } = await db.list({ prefix: "batch/" });
      const keys = blobs.map(b => b.key).sort().reverse().slice(0, 30);
      const items = (await Promise.all(keys.map(k => db.get(k, { type: "json" })))).filter(Boolean);
      items.sort((a, b) => (b.made || "").localeCompare(a.made || ""));
      return json({ batches: items.map(publicView) });
    }
    return json({ error: "unknown" }, 400);
  }

  if (req.method !== "POST") return json({ error: "method" }, 405);
  let body = {};
  try { body = await req.json(); } catch { return json({ error: "body" }, 400); }

  if (body.action === "login") {
    const pw = Netlify.env.get("STAFF_PASSWORD");
    if (!pw) return json({ error: "not-ready" }, 503);
    await new Promise(r => setTimeout(r, 400)); // slow down guessing
    if (!safeEqual(String(body.password || ""), pw)) return json({ error: "wrong" }, 401);
    context.cookies.set({ name: COOKIE, value: await makeToken(pw), path: "/", httpOnly: true, secure: true, sameSite: "Lax", expires: new Date(Date.now() + 30 * 864e5) });
    return json({ ok: true });
  }
  if (body.action === "logout") {
    context.cookies.delete({ name: COOKIE, path: "/" });
    return json({ ok: true });
  }
  if (body.action === "create") {
    if (!(await isStaff(context))) return json({ error: "auth" }, 401);
    const v = validateBatch(body);
    if (v.error) return json({ error: v.error }, 400);
    const yymm = yymmNow();
    // Next free batch number this month: highest existing + 1, created only if the key is still new.
    const { blobs } = await db.list({ prefix: `batch/AL-${yymm}-` });
    let n = blobs.reduce((max, b) => Math.max(max, Number(b.key.split("-")[2]) || 0), 0) + 1;
    for (let tries = 0; tries < 5; tries++, n++) {
      if (n > 999) return json({ error: "full" }, 409);
      const code = makeCode(yymm, n);
      const batch = { ...v.batch, code, made: new Date().toISOString() };
      if (await db.get(`batch/${code}`)) continue;
      const res = await db.setJSON(`batch/${code}`, batch, { onlyIfNew: true });
      if (!res || res.modified !== false) return json({ batch: publicView(batch) }, 201);
    }
    return json({ error: "busy" }, 409);
  }
  return json({ error: "unknown" }, 400);
};
