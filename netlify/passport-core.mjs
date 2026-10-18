// Shared rules for Another Life Passport codes. Imported by the function and by local tests.

export const MODELS = ["The Chair", "The Sun Lounger", "The Bench", "The Lounge Chair", "The Side Table", "The Coffee Table", "The Table"];
export const ORIGINS = ["house", "bridge", "boat", "other"];
export const CHECK = "ABCDEFGHJKMNPQRSTUVWXYZ"; // no I, L or O

// Check letter: weighted sum of the digits, so a swapped or mistyped digit gives a different letter.
export function checkLetter(core) {
  const d = String(core).replace(/\D/g, "");
  let sum = 0;
  for (let i = 0; i < d.length; i++) sum += Number(d[i]) * (i + 3);
  return CHECK[sum % CHECK.length];
}

// AL-YYMM-NN-K, e.g. AL-2610-03-Q
export function makeCode(yymm, n) {
  const core = `AL-${yymm}-${String(n).padStart(2, "0")}`;
  return `${core}-${checkLetter(core)}`;
}

// Returns { code } for a valid code, { error: "format" | "check" } otherwise.
export function parseCode(input) {
  const v = String(input || "").trim().toUpperCase().replace(/\s+/g, "");
  const m = v.match(/^AL-(\d{4})-(\d{2,3})-([A-Z])$/);
  if (!m) return { error: "format" };
  const core = `AL-${m[1]}-${m[2]}`;
  if (checkLetter(core) !== m[3]) return { error: "check" };
  return { code: v, yymm: m[1], n: Number(m[2]) };
}

// Year and month in Jakarta time, where the workshop is.
export function yymmNow(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jakarta", year: "2-digit", month: "2-digit" }).formatToParts(date);
  const y = parts.find(p => p.type === "year").value, m = parts.find(p => p.type === "month").value;
  return y + m;
}

const clean = (v, max) => String(v ?? "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, max);

// Validates a new batch from the factory form. Returns { batch } or { error }.
export function validateBatch(body) {
  const model = clean(body.model, 40);
  const origin = clean(body.origin, 10);
  if (!MODELS.includes(model)) return { error: "model" };
  if (!ORIGINS.includes(origin)) return { error: "origin" };
  const qty = Number.parseInt(body.qty, 10);
  if (!Number.isFinite(qty) || qty < 1 || qty > 999) return { error: "qty" };
  let kg = body.kg === "" || body.kg == null ? null : Number(body.kg);
  if (kg != null && (!Number.isFinite(kg) || kg <= 0 || kg > 500)) return { error: "kg" };
  return { batch: { model, origin, region: clean(body.region, 60), maker: clean(body.maker, 60), qty, kg, route: "jakarta-bali" } };
}

// The public view of a batch: only the story, nothing private.
export function publicView(b) {
  return { code: b.code, model: b.model, origin: b.origin, region: b.region, maker: b.maker, qty: b.qty, kg: b.kg, route: b.route, made: b.made };
}

// Staff session tokens: expiry + HMAC, keyed from the staff password.
const enc = new TextEncoder();
async function hmac(secret, msg) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(msg));
  return Buffer.from(sig).toString("base64url");
}
const secretFrom = pw => "al-passport-session:" + pw;
export async function makeToken(pw, days = 30, now = Date.now()) {
  const exp = String(now + days * 864e5);
  return `${exp}.${await hmac(secretFrom(pw), exp)}`;
}
export async function checkToken(pw, token, now = Date.now()) {
  if (!pw || !token || !token.includes(".")) return false;
  const [exp, sig] = token.split(".");
  if (!(Number(exp) > now)) return false;
  return safeEqual(sig, await hmac(secretFrom(pw), exp));
}
export function safeEqual(a, b) {
  a = String(a); b = String(b);
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

// Random secrets for invite links and logged-in phones. Only their SHA-256 hashes are stored.
export function randomToken(bytes = 32) {
  const a = new Uint8Array(bytes); crypto.getRandomValues(a);
  return Buffer.from(a).toString("base64url");
}
export async function sha256(s) {
  const d = await crypto.subtle.digest("SHA-256", enc.encode(String(s)));
  return Buffer.from(d).toString("base64url");
}
export function cleanName(v) { return clean(v, 40); }
