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
// The wood details may be left empty: then the batch is a draft, so its QR code can be made
// and engraved first, and the workshop fills in the rest later.
export function validateBatch(body) {
  const model = clean(body.model, 40);
  if (!MODELS.includes(model)) return { error: "model" };
  const qty = Number.parseInt(body.qty, 10);
  if (!Number.isFinite(qty) || qty < 1 || qty > 999) return { error: "qty" };
  const d = validateDetails(body);
  if (d.error) return d;
  const batch = { model, qty, origin: d.details.origin || "", region: d.details.region || "", maker: d.details.maker || "", kg: d.details.kg ?? null, route: "jakarta-bali" };
  batch.status = batch.origin ? "complete" : "draft";
  return { batch };
}

// The details the workshop can fill in later. Only fields that are sent are returned.
export function validateDetails(body) {
  const details = {};
  if ("origin" in body) {
    const origin = clean(body.origin, 10);
    if (origin && !ORIGINS.includes(origin)) return { error: "origin" };
    details.origin = origin;
  }
  if ("region" in body) details.region = clean(body.region, 60);
  if ("maker" in body) details.maker = clean(body.maker, 60);
  if ("kg" in body) {
    const kg = body.kg === "" || body.kg == null ? null : Number(body.kg);
    if (kg != null && (!Number.isFinite(kg) || kg <= 0 || kg > 500)) return { error: "kg" };
    details.kg = kg;
  }
  return { details };
}

// A batch is complete once it knows its wood: a wood lot, or (older batches) an origin chosen by hand.
export const statusOf = b => (b.origin || (b.lots || []).length ? "complete" : "draft");

// ---------- Wood lots: one delivery or stack of reclaimed wood at the workshop.
// Each lot gets a short number (LOT 12) that can be read off a paper tag and said out loud.
// Lots made since Oct 2026 are numbered YYMM-NN (arrival month + 2 random digits) and stored as YYMMNN.
export const lotKey = n => `lots/${String(n).padStart(5, "0")}`; // older lots (LOT 1) stay at their 5-digit key
export const lotNo = n => { const s = String(n); return s.length === 6 ? s.slice(0, 4) + "-" + s.slice(4) : s; };
export const lotLabel = n => `LOT ${lotNo(n)}`;
export function parseLotId(v) {
  const m = String(v ?? "").trim().toUpperCase().replace(/^LOT[\s-]*/, "").replace(/[\s-]/g, "").match(/^0*(\d{1,6})$/);
  return m ? Number(m[1]) : null;
}
// Validates wood lot fields. On create, the source is required. Only fields that are sent are returned.
export function validateLot(body, create = false) {
  const lot = {};
  if (create || "origin" in body) {
    const origin = clean(body.origin, 10);
    if (!ORIGINS.includes(origin)) return { error: "origin" };
    lot.origin = origin;
  }
  const text = { name: 40, place: 80, region: 60, supplier: 80, volume: 30, gps: 80, notes: 1000 };
  for (const [k, max] of Object.entries(text)) if (k in body) lot[k] = k === "notes" ? String(body.notes ?? "").replace(/[\u0000-\u0008<>]/g, "").trim().slice(0, max) : clean(body[k], max);
  if ("arrived" in body) {
    const d = clean(body.arrived, 10);
    if (d && !/^\d{4}-\d{2}-\d{2}$/.test(d)) return { error: "arrived" };
    lot.arrived = d;
  }
  if ("status" in body) {
    if (!["open", "used"].includes(body.status)) return { error: "status" };
    lot.status = body.status;
  }
  if ("publicPhotos" in body) lot.publicPhotos = Boolean(body.publicPhotos);
  return { lot };
}
// Readable default name from the source and place, e.g. "Joglo · Jepara"
const ORIGIN_WORD = { house: "House", bridge: "Bridge", boat: "Boat", other: "Wood" }; // "House", not "Joglo": only say joglo when the papers do
export const defaultLotName = l => [ORIGIN_WORD[l.origin] || "Wood", l.place || l.region].filter(Boolean).join(" · ");

// ---------- Material record: everything known about a lot, internal only (never on passports).
const MAT_TEXT = { described: 300, species: 300, previousUse: 300, recoveryArea: 300, supplyRoute: 400, purchase: 300,
  dimensions: 300, limits: 4000, extTitle: 200, extVersion: 40 };
const longText = (v, max) => String(v ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").replace(/[<>]/g, "").trim().slice(0, max);
const num = (v, min, max) => { const x = Number(v); return Number.isFinite(x) && x >= min && x <= max ? x : null; };
export function validateMaterial(m) {
  if (!m || typeof m !== "object") return { material: null };
  const out = {};
  for (const [k, max] of Object.entries(MAT_TEXT)) if (m[k] != null && m[k] !== "") out[k] = longText(m[k], max);
  if (m.extUrl) { const u = String(m.extUrl).trim(); if (!/^https?:\/\/\S{3,400}$/.test(u)) return { error: "url" }; out.extUrl = u; }
  if (m.extIssued) { const d = clean(m.extIssued, 10); if (/^\d{4}-\d{2}-\d{2}$/.test(d)) out.extIssued = d; }
  if (Array.isArray(m.pieces)) {
    if (m.pieces.length > 5000) return { error: "pieces" };
    out.pieces = [];
    for (const p of m.pieces) {
      const t = num(p.t, 1, 2000), w = num(p.w, 1, 2000), l = num(p.l, 1, 20000);
      if (t == null || w == null || l == null) return { error: "pieces" };
      out.pieces.push({ ref: clean(p.ref, 12), t, w, l });
    }
  }
  if (Array.isArray(m.sources)) out.sources = m.sources.slice(0, 50).map(x => ({ title: longText(x.title, 300), date: /^\d{4}-\d{2}-\d{2}$/.test(String(x.date || "")) ? x.date : "", supports: longText(x.supports, 400) })).filter(x => x.title);
  return { material: out };
}
export const pieceVolume = p => (p.t * p.w * p.l) / 1e9;
export const piecesTotal = ps => (ps || []).reduce((a, p) => a + pieceVolume(p), 0);

// Documents on a lot: PDF or image files, internal only.
export const DOC_TYPES = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
export const MAX_DOC_BYTES = 4_000_000;
export function docType(bytes) {
  if (bytes.length > 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return "application/pdf";
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes.length > 12 && bytes.toString("latin1", 0, 4) === "RIFF" && bytes.toString("latin1", 8, 12) === "WEBP") return "image/webp";
  return null;
}
export const cleanDocName = v => String(v ?? "").replace(/[\u0000-\u001f<>\\/:*?"|]/g, "").trim().slice(0, 120) || "document";
export const docView = d => ({ id: d.id, name: d.name, type: d.type, size: d.size, added: d.added, addedBy: d.addedBy || null, note: d.note || "" });

export function lotView(l, workshops = {}, usedBy = []) {
  return { n: l.n, label: lotLabel(l.n), name: l.name || defaultLotName(l), origin: l.origin, place: l.place || "", region: l.region || "",
    supplier: l.supplier || "", arrived: l.arrived || "", volume: l.volume || "", gps: l.gps || "", notes: l.notes || "",
    status: l.status || "open", publicPhotos: l.publicPhotos !== false, photos: l.photos || [],
    workshopId: l.workshopId || null, workshop: (l.workshopId && workshops[l.workshopId]) || null,
    created: l.created, createdBy: l.createdBy || null, updated: l.updated || null, updatedBy: l.updatedBy || null, usedBy,
    material: l.material || {}, docs: (l.docs || []).map(docView),
    pieceCount: (l.material?.pieces || []).length, pieceVolume: Math.round(piecesTotal(l.material?.pieces) * 1e5) / 1e5 };
}

// Copies the wood story from a batch's lots onto it (origin and area), so the passport always
// shows what the lot says, even if the lot is corrected later.
export function applyLots(b, lotsByN) {
  const lots = (b.lots || []).map(n => lotsByN[n]).filter(Boolean);
  if (!lots.length) return { ...b, lotInfo: [] };
  const regions = [...new Set(lots.map(l => [l.place, l.region].filter(Boolean).join(", ")).filter(Boolean))];
  return { ...b, origin: lots[0].origin, region: regions.join(" · "),
    lotInfo: lots.map(l => ({ n: l.n, label: lotLabel(l.n), name: l.name || defaultLotName(l), origin: l.origin, photos: l.publicPhotos === false ? [] : (l.photos || []) })) };
}

// The public view of a batch: only the story, nothing private.
// A draft shows only the product, so a scan before the details are in gives the general story.
export function publicView(b) {
  if (statusOf(b) === "draft") return { code: b.code, model: b.model, status: "draft", photos: [] };
  const lotPhotos = (b.lotInfo || []).flatMap(l => l.photos.map(id => `L${l.n}/${id}`));
  return { code: b.code, model: b.model, origin: b.origin, region: b.region, maker: b.maker, qty: b.qty, kg: b.kg, route: b.route, made: b.completed || b.made,
    photos: [...(b.photos || []), ...lotPhotos].slice(0, 9), status: "complete" };
}

// What logged-in staff see: everything, including drafts and who made and changed what.
export function staffView(b, workshops = {}) {
  return { code: b.code, model: b.model, origin: b.origin || "", region: b.region || "", maker: b.maker || "", qty: b.qty, kg: b.kg ?? null, route: b.route, made: b.made,
    photos: b.photos || [], status: statusOf(b), workshopId: b.workshopId || null, workshop: (b.workshopId && workshops[b.workshopId]) || null,
    createdBy: b.createdBy || null, updated: b.updated || null, updatedBy: b.updatedBy || null, completed: b.completed || null,
    lots: b.lots || [], lotInfo: (b.lotInfo || []).map(l => ({ n: l.n, label: l.label, name: l.name })) };
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
