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
const SHEET_ID = "1bSQ6Lwn-SVyXF4_bIWDRHDDDx000J-gR8mHBWzniAE8"; // this sheet
const SHEET_NAME = "ANOTHER LIFE · Passport Master Record — DO NOT DELETE";
const FOLDER_NAME = "ANOTHER LIFE · Passport Master Record — photos (DO NOT DELETE)";
const PHOTOS_PER_RUN = 150; // the rest follow on the next run

const BATCH_COLS = ["Code", "Status", "Product", "Pieces", "Wood lots", "Wood source", "Area", "Maker", "Weight kg", "Workshop",
  "Created", "Created by", "Completed", "Updated", "Updated by", "Photos", "Passport", "_data"];
const LOT_COLS = ["Lot", "Name", "Status", "Source", "Place", "Region", "Supplier", "Arrived", "Volume", "Source location",
  "Workshop", "Used in batches", "Notes", "Created", "Created by", "Photos", "_data"];
const WS_COLS = ["Workshop", "Created", "_data"];

// The sheet: the one this script is attached to, or else the sheet named above.
function ss_() { return SpreadsheetApp.getActive() || SpreadsheetApp.openById(SHEET_ID); }
// The sheet's menus and pop-ups exist only when someone has the sheet open; otherwise messages go to the log.
function ui_() { try { return SpreadsheetApp.getUi(); } catch (e) { return null; } }
function say_(title, text) { const ui = ui_(); if (ui) ui.alert(title, text, ui.ButtonSet.OK); else Logger.log(title + ": " + text); }

// Run this once from the script editor (the ▷ Run button). Google asks you to allow access. It then
// adds the READ ME tab, switches on the hourly update and adds the "Another Life" menu to the sheet.
function setupSheet() {
  const ss = ss_();
  readMe_(ss);
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger("syncNow").timeBased().everyHours(1).create();
  ScriptApp.newTrigger("onOpen").forSpreadsheet(ss).onOpen().create();
  Logger.log("Set up. Hourly update is on. Last step: add the export key under Project Settings → Script properties (name EXPORT_KEY).");
}

function onOpen() {
  const ui = ui_();
  if (ui) ui.createMenu("Another Life")
    .addItem("Update now", "syncNow")
    .addItem("Turn on hourly update", "installTrigger")
    .addItem("Create export key", "createKey")
    .addItem("Show export key", "showKey")
    .addItem("Set export key", "setKey")
    .addSeparator()
    .addItem("Rebuild site from this sheet…", "rebuildSite")
    .addToUi();
  try { readMe_(ss_()); } catch (e) {}
}

// Makes a strong random key here in Google, saves it for this script, and shows it once to copy into Netlify.
function createKey() {
  const ui = ui_();
  if (!ui) { Logger.log("Open the sheet and use Another Life → Create export key."); return; }
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty("EXPORT_KEY")) {
    const again = ui.alert("Export key", "A key already exists. Make a new one? Then it must also be replaced in Netlify.", ui.ButtonSet.YES_NO);
    if (again !== ui.Button.YES) return;
  }
  const key = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, "");
  props.setProperty("EXPORT_KEY", key);
  keyDialog_(key);
}

// Shows the saved key again, e.g. to paste into Netlify a second time.
function showKey() {
  const ui = ui_(), key = PropertiesService.getScriptProperties().getProperty("EXPORT_KEY");
  if (!ui) return;
  if (!key) { ui.alert("Export key", "There is no key yet. Choose Another Life → Create export key.", ui.ButtonSet.OK); return; }
  keyDialog_(key);
}

function keyDialog_(key) {
  const ui = ui_();
  const html = HtmlService.createHtmlOutput(
    '<div style="font:14px Arial;line-height:1.5">' +
    '<p><b>1.</b> Click <b>Copy</b>.</p>' +
    '<input id="k" readonly value="' + key + '" style="width:100%;padding:8px;font:13px monospace;box-sizing:border-box" onclick="this.select()">' +
    '<p><button onclick="var k=document.getElementById(\'k\');k.select();document.execCommand(\'copy\');this.textContent=\'Copied\'" style="padding:8px 16px">Copy</button></p>' +
    '<p><b>2.</b> In Netlify, paste it into the box <b>Production</b> for the variable <b>EXPORT_KEY</b>, then click <b>Create variable</b>.</p>' +
    '<p><b>3.</b> Close this window. The key is saved in this sheet. To see it again: Another Life → Show export key.</p></div>'
  ).setWidth(520).setHeight(300);
  ui.showModalDialog(html, "Export key for Netlify");
}

function setKey() {
  const ui = ui_();
  if (!ui) { Logger.log("Add the key under Project Settings → Script properties, name EXPORT_KEY."); return; }
  const r = ui.prompt("Export key", "Paste the EXPORT_KEY you added in Netlify.", ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  PropertiesService.getScriptProperties().setProperty("EXPORT_KEY", r.getResponseText().trim());
  ui.alert("Saved. Now choose Another Life → Update now.");
}

function installTrigger() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === "syncNow").forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger("syncNow").timeBased().everyHours(1).create();
  say_("Hourly update", "Done. The sheet now updates itself every hour.");
}

function key_() {
  const k = PropertiesService.getScriptProperties().getProperty("EXPORT_KEY");
  if (!k) throw new Error("No export key yet. Add it under Project Settings → Script properties (name EXPORT_KEY), or Another Life → Set export key.");
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
  const ss = ss_();
  readMe_(ss);
  // Before the key is added, the hourly run quietly waits instead of failing every hour.
  if (!PropertiesService.getScriptProperties().getProperty("EXPORT_KEY")) { Logger.log("Waiting for the export key."); return; }
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
      ["How it runs"],
      ["It updates itself every hour. Menu Another Life (if shown): Update now, Rebuild site from this sheet. The same can be run from Extensions → Apps Script: choose syncNow or rebuildSite and press Run. Rebuilding only adds what is missing; it never overwrites."],
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
  const file = DriveApp.getFileById(ss_().getId());
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
  const ui = ui_();
  let site = PropertiesService.getScriptProperties().getProperty("REBUILD_SITE") || SITE;
  if (ui) {
    const a = ui.prompt("Rebuild site from this sheet",
      "Which site should be rebuilt? Leave empty for " + site + ".\nOnly missing records and photos are added; nothing on the site is overwritten.",
      ui.ButtonSet.OK_CANCEL);
    if (a.getSelectedButton() !== ui.Button.OK) return;
    site = a.getResponseText().trim() || site;
  }
  const ss = ss_();
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
  say_("Rebuild finished",
    "Added: " + total.batches + " batches, " + total.lots + " wood lots, " + total.workshops + " workshops, " + photos + " photos.\n" +
    "Already there (left as they were): " + total.skipped + ".\n" + (total.errors.length ? "Could not add: " + total.errors.join(", ") : "No problems."));
}
