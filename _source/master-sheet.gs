/**
 * ANOTHER LIFE · Passport Master Record
 *
 * Paste this into a Google Sheet (Extensions → Apps Script), save, and reload the sheet.
 * A menu "Another Life" appears. It keeps this sheet an exact copy of the Passport system:
 *   - tabs: Batches, Wood lots, Workshops, About
 *   - photos copied into a Google Drive folder next to the sheet
 *   - every hour, automatically (after "Turn on hourly update")
 * "Rebuild site from this sheet" writes everything back into a site, with the same codes,
 * so every engraved QR code keeps working.
 *
 * The private export key is stored in the script's own settings, never in the sheet.
 */

const SITE = "https://id.another-life.dk";
const SHEET_NAME = "ANOTHER LIFE · Passport Master Record — DO NOT DELETE";
const FOLDER_NAME = "ANOTHER LIFE · Passport Master Record — photos (DO NOT DELETE)";
const PHOTOS_PER_RUN = 150; // the rest follow on the next run

const BATCH_COLS = ["Code", "Status", "Product", "Pieces", "Wood lots", "Wood source", "Area", "Maker", "Weight kg", "Workshop",
  "Created", "Created by", "Completed", "Updated", "Updated by", "Photos", "Passport", "_data"];
const LOT_COLS = ["Lot", "Name", "Status", "Source", "Place", "Region", "Supplier", "Arrived", "Volume", "Source location",
  "Workshop", "Used in batches", "Notes", "Created", "Created by", "Photos", "_data"];
const WS_COLS = ["Workshop", "Created", "_data"];

function onOpen() {
  SpreadsheetApp.getUi().createMenu("Another Life")
    .addItem("Update now", "syncNow")
    .addItem("Turn on hourly update", "installTrigger")
    .addItem("Set export key", "setKey")
    .addSeparator()
    .addItem("Rebuild site from this sheet…", "rebuildSite")
    .addToUi();
  try { readMe_(SpreadsheetApp.getActive()); } catch (e) {}
}

function setKey() {
  const ui = SpreadsheetApp.getUi();
  const r = ui.prompt("Export key", "Paste the EXPORT_KEY you added in Netlify.", ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  PropertiesService.getScriptProperties().setProperty("EXPORT_KEY", r.getResponseText().trim());
  ui.alert("Saved. Now choose Another Life → Update now.");
}

function installTrigger() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === "syncNow").forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger("syncNow").timeBased().everyHours(1).create();
  SpreadsheetApp.getUi().alert("Done. The sheet now updates itself every hour.");
}

function key_() {
  const k = PropertiesService.getScriptProperties().getProperty("EXPORT_KEY");
  if (!k) throw new Error("No export key yet. Choose Another Life → Set export key.");
  return k;
}
function api_(site) { return site.replace(/\/+$/, "") + "/.netlify/functions/passport"; }

function getJson_(site, query) {
  const r = UrlFetchApp.fetch(api_(site) + "?" + query, { headers: { "x-export-key": key_() }, muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) throw new Error("The site answered " + r.getResponseCode() + ". Check the export key.");
  return JSON.parse(r.getContentText());
}
function postJson_(site, body) {
  const r = UrlFetchApp.fetch(api_(site), { method: "post", contentType: "application/json", payload: JSON.stringify(body),
    headers: { "x-export-key": key_() }, muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) throw new Error("The site answered " + r.getResponseCode() + ": " + r.getContentText().slice(0, 200));
  return JSON.parse(r.getContentText());
}

// ---------- copy the site into the sheet

function syncNow() {
  const ss = SpreadsheetApp.getActive();
  readMe_(ss);
  const d = getJson_(SITE, "export=1");
  writeTab_(ss, "Batches", BATCH_COLS, d.batches.map(b => [b.code, b.status, b.model, b.qty, (b.lots || []).map(n => "LOT " + n).join(" "),
    b.origin, b.region, b.maker, b.kg, b.workshop, b.made, b.createdBy, b.completed, b.updated, b.updatedBy, (b.photos || []).length,
    SITE + "/" + b.code, JSON.stringify(b)]));
  writeTab_(ss, "Wood lots", LOT_COLS, d.lots.map(l => ["LOT " + l.n, l.name, l.status, l.origin, l.place, l.region, l.supplier, l.arrived,
    l.volume, l.gps, l.workshop, (l.usedBy || []).join(" "), l.notes, l.created, l.createdBy, (l.photos || []).length, JSON.stringify(l)]));
  writeTab_(ss, "Workshops", WS_COLS, d.workshops.map(w => [w.name, w.created, JSON.stringify(w)]));
  const copied = copyPhotos_(d);
  writeTab_(ss, "About", ["What", "Value"], [
    ["Last updated", new Date()],
    ["Copied from", SITE],
    ["Batches", d.batches.length], ["Wood lots", d.lots.length], ["Workshops", d.workshops.length],
    ["Photos copied this time", copied.copied], ["Photos still to copy", copied.left],
    ["Photo folder", copied.folderUrl],
    ["Note", "This sheet is rewritten every hour from the site. Don't edit or delete the _data columns: they hold everything needed to rebuild the site."]
  ]);
}

// The first tab explains what this file is. Written once; it's never overwritten after that.
function readMe_(ss) {
  if (ss.getName() !== SHEET_NAME) ss.rename(SHEET_NAME);
  let sh = ss.getSheetByName("READ ME");
  if (!sh) {
    const blank = ss.getSheetByName("Sheet1");
    sh = blank && blank.getLastRow() === 0 ? blank.setName("READ ME") : ss.insertSheet("READ ME", 0);
    const lines = [
      ["ANOTHER LIFE · PASSPORT MASTER RECORD"],
      [""],
      ["What this is"],
      ["The complete record behind every Another Life Passport and QR code: every furniture batch, every wood lot, every workshop, and all photos."],
      ["The site id.another-life.dk is copied into this file every hour. If the site or Netlify ever disappeared, the whole system can be rebuilt from this file, with the same codes, so every engraved QR code keeps working."],
      [""],
      ["Do not delete"],
      ["- This file"],
      ["- The photo folder next to it: \"" + FOLDER_NAME + "\""],
      ["- The grey _data columns: they hold everything needed to rebuild"],
      [""],
      ["Tabs"],
      ["Batches: one row per furniture batch (one QR code). Wood lots: one row per delivery of reclaimed wood. Workshops: the workshops using the system. About: when the last copy was made."],
      [""],
      ["Menu: Another Life"],
      ["Update now: copy the latest from the site. Turn on hourly update: keeps this file current by itself. Rebuild site from this sheet: writes everything back into a site (adds only what is missing)."],
      [""],
      ["Keep it private. Share only with people who need it. It holds supplier names and internal notes that never appear on passports."]
    ];
    sh.getRange(1, 1, lines.length, 1).setValues(lines);
    sh.setColumnWidth(1, 900);
    sh.getRange(1, 1, lines.length, 1).setWrap(true);
    sh.getRange(1, 1).setFontSize(16).setFontWeight("bold");
    [3, 7, 12, 15].forEach(r => sh.getRange(r, 1).setFontWeight("bold"));
  }
  ss.setActiveSheet(sh); ss.moveActiveSheet(1);
}

function writeTab_(ss, name, cols, rows) {
  const sh = ss.getSheetByName(name) || ss.insertSheet(name);
  sh.clearContents();
  const data = [cols].concat(rows.map(r => r.map(v => v == null ? "" : v)));
  sh.getRange(1, 1, data.length, cols.length).setValues(data);
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, cols.length).setFontWeight("bold");
  const dataCol = cols.indexOf("_data");
  if (dataCol >= 0) { sh.setColumnWidth(dataCol + 1, 60); sh.getRange(1, dataCol + 1, data.length, 1).setFontColor("#999999"); }
}

function folder_() {
  const file = DriveApp.getFileById(SpreadsheetApp.getActive().getId());
  const parents = file.getParents();
  const parent = parents.hasNext() ? parents.next() : DriveApp.getRootFolder();
  const it = parent.getFoldersByName(FOLDER_NAME);
  return it.hasNext() ? it.next() : parent.createFolder(FOLDER_NAME);
}
function sub_(folder, name) {
  const it = folder.getFoldersByName(name);
  return it.hasNext() ? it.next() : folder.createFolder(name);
}

// Photos are named by their id, so a photo already in Drive is never copied twice.
function copyPhotos_(d) {
  const root = folder_();
  const jobs = [];
  d.batches.forEach(b => (b.photos || []).forEach(id => jobs.push({ dir: ["batches", b.code], id: id, q: "photo=" + encodeURIComponent(b.code) + "/" + id })));
  d.lots.forEach(l => (l.photos || []).forEach(id => jobs.push({ dir: ["wood-lots", "LOT-" + l.n], id: id, q: "lphoto=" + l.n + "/" + id })));
  let copied = 0, left = 0;
  const cache = {};
  jobs.forEach(j => {
    const path = j.dir.join("/");
    const f = cache[path] || (cache[path] = sub_(sub_(root, j.dir[0]), j.dir[1]));
    if (f.getFilesByName(j.id + ".jpg").hasNext()) return;
    if (copied >= PHOTOS_PER_RUN) { left++; return; }
    const r = UrlFetchApp.fetch(api_(SITE) + "?" + j.q, { headers: { "x-export-key": key_() }, muteHttpExceptions: true });
    if (r.getResponseCode() === 200) { f.createFile(r.getBlob().setName(j.id + ".jpg")); copied++; }
  });
  return { copied: copied, left: left, folderUrl: root.getUrl() };
}

// ---------- rebuild a site from the sheet

// Reads a tab back into records: everything from _data, with the visible columns you may have corrected on top.
function readTab_(ss, name, cols, apply) {
  const sh = ss.getSheetByName(name);
  if (!sh || sh.getLastRow() < 2) return [];
  const values = sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getValues();
  const head = values[0].map(String);
  const at = c => head.indexOf(c);
  return values.slice(1).filter(r => r[at("_data")]).map(r => {
    const rec = JSON.parse(r[at("_data")]);
    const cell = c => (at(c) >= 0 ? r[at(c)] : undefined);
    apply(rec, cell);
    return rec;
  });
}
const text_ = v => (v instanceof Date ? Utilities.formatDate(v, "UTC", "yyyy-MM-dd") : v == null ? "" : String(v));
const lotNums_ = v => text_(v).split(/[\s,]+/).map(x => x.replace(/^LOT/i, "")).filter(x => /^\d+$/.test(x)).map(Number);

function rebuildSite() {
  const ui = SpreadsheetApp.getUi();
  const a = ui.prompt("Rebuild site from this sheet",
    "Which site should be rebuilt? Leave as it is for " + SITE + ".\nOnly missing records and photos are added; nothing on the site is overwritten.",
    ui.ButtonSet.OK_CANCEL);
  if (a.getSelectedButton() !== ui.Button.OK) return;
  const site = a.getResponseText().trim() || SITE;
  const ss = SpreadsheetApp.getActive();
  const workshops = readTab_(ss, "Workshops", WS_COLS, (w, c) => { if (c("Workshop")) w.name = text_(c("Workshop")); });
  const lots = readTab_(ss, "Wood lots", LOT_COLS, (l, c) => {
    const map = { Name: "name", Status: "status", Source: "origin", Place: "place", Region: "region", Supplier: "supplier", Volume: "volume", "Source location": "gps", Notes: "notes" };
    Object.keys(map).forEach(k => { if (c(k) !== undefined) l[map[k]] = text_(c(k)); });
    if (c("Arrived") !== undefined) l.arrived = text_(c("Arrived"));
  });
  const batches = readTab_(ss, "Batches", BATCH_COLS, (b, c) => {
    if (c("Product")) b.model = text_(c("Product"));
    if (c("Pieces")) b.qty = Number(c("Pieces"));
    if (c("Wood lots") !== undefined) b.lots = lotNums_(c("Wood lots"));
    if (c("Maker") !== undefined) b.maker = text_(c("Maker"));
    if (c("Weight kg") !== undefined) b.kg = c("Weight kg") === "" ? null : Number(c("Weight kg"));
  });
  const total = { workshops: 0, lots: 0, batches: 0, skipped: 0, errors: [] };
  const add = res => Object.keys(total).forEach(k => { total[k] = k === "errors" ? total[k].concat(res[k] || []) : total[k] + (res[k] || 0); });
  add(postJson_(site, { action: "restore", workshops: workshops, lots: lots, batches: [] }));
  for (let i = 0; i < batches.length; i += 200) add(postJson_(site, { action: "restore", batches: batches.slice(i, i + 200) }));
  // Photos from the Drive folder
  let photos = 0;
  const root = folder_();
  [["batches", "batch"], ["wood-lots", "lot"]].forEach(([dir, kind]) => {
    const top = root.getFoldersByName(dir);
    if (!top.hasNext()) return;
    const subs = top.next().getFolders();
    while (subs.hasNext()) {
      const f = subs.next(), ref = f.getName().replace(/^LOT-/, "");
      const files = f.getFiles();
      while (files.hasNext()) {
        const file = files.next(), id = file.getName().replace(/\.jpg$/, "");
        const res = postJson_(site, { action: "restore-photo", kind: kind, ref: ref, id: id, image: Utilities.base64Encode(file.getBlob().getBytes()) });
        if (!res.skipped) photos++;
      }
    }
  });
  ui.alert("Rebuild finished",
    "Added: " + total.batches + " batches, " + total.lots + " wood lots, " + total.workshops + " workshops, " + photos + " photos.\n" +
    "Already there (left as they were): " + total.skipped + ".\n" + (total.errors.length ? "Could not add: " + total.errors.join(", ") : "No problems."),
    ui.ButtonSet.OK);
}
