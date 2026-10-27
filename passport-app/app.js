/* Another Life Passport — lookup, passport pages, staff login and the factory form. */
(function () {
  "use strict";

  const API = "/.netlify/functions/passport";
  const PUBLIC_HOST = "ID.ANOTHER-LIFE.DK";
  const MODELS = ["The Chair", "The Sun Lounger", "The Bench", "The Lounge Chair", "The Side Table", "The Coffee Table", "The Table"];
  const CHECK = "ABCDEFGHJKMNPQRSTUVWXYZ";
  const WA = "NTA0MDM1MDM1NA=="; // WhatsApp number, encoded against scrapers
  const LEGS = [1080, 5, 125];   // Jakarta → Bali by road and ferry, usual route (km)
  const TRUCK_PER_TKM = 0.09;    // kg CO2e per tonne-km, typical truck (estimate)

  // On id.another-life.dk the app lives at "/". Elsewhere (previews, main domain) it lives under "/id".
  const BASE = /^\/id(\/|$)/i.test(location.pathname) ? "/id" : "";

  const ICONS = {
    tree: '<svg class="ico" viewBox="0 0 64 64" aria-hidden="true"><circle class="f" cx="32" cy="32" r="30"/><path class="l" d="M32 52V27"/><path class="l" d="M32 36c-7 0-12-5-12-11 5 0 12 3 12 11zM32 31c7 0 11-5 11-10-5 0-11 3-11 10z"/><path d="M22 52h20"/></svg>',
    house: '<svg class="ico" viewBox="0 0 64 64" aria-hidden="true"><circle class="f" cx="32" cy="32" r="30"/><path d="M12 30l20-14 20 14M18 28h28M20 30v18M44 30v18M28 48V38h8v10M14 48h36"/></svg>',
    bridge: '<svg class="ico" viewBox="0 0 64 64" aria-hidden="true"><circle class="f" cx="32" cy="32" r="30"/><path d="M10 32h44M16 32v10M27 32v10M38 32v10M49 32v10M12 32c7-9 33-9 40 0"/><path class="s" d="M10 47c4-3 7-3 11 0s7 3 11 0 7-3 11 0 7 3 11 0"/></svg>',
    boat: '<svg class="ico" viewBox="0 0 64 64" aria-hidden="true"><circle class="f" cx="32" cy="32" r="30"/><path d="M14 38h36l-6 8H20zM32 38V16l12 18"/><path class="s" d="M10 50c4-3 7-3 11 0s7 3 11 0 7-3 11 0 7 3 11 0"/></svg>',
    other: '<svg class="ico" viewBox="0 0 64 64" aria-hidden="true"><circle class="f" cx="32" cy="32" r="30"/><path d="M16 24h32M16 32h32M16 40h32"/></svg>',
    work: '<svg class="ico" viewBox="0 0 64 64" aria-hidden="true"><circle class="f" cx="32" cy="32" r="30"/><path d="M10 44h44v7H10z"/><path d="M24 44v2.5" stroke-width="1.6"/><g transform="translate(1 5.5) rotate(-25 30 30)"><path d="M9 26L37 22v10L9 31z"/><path d="M9 31l1.5 2l1.5 -2l1.5 2l1.5 -2l1.5 2l1.5 -2l1.5 2l1.5 -2l1.5 2l1.5 -2l1.5 2l1.5 -2l1.5 2l1.5 -2l1.5 2l1.5 -2l1.5 2l1.5 -2" stroke-width="1.4"/><path d="M37 20h7a4 4 0 0 1 4 4v9a4 4 0 0 1-4 4h-7z"/><path d="M40 25h5v7h-5z" stroke-width="1.6"/></g></svg>',
    now: '<svg class="ico" viewBox="0 0 64 64" aria-hidden="true"><circle class="f" cx="32" cy="32" r="30"/><g transform="translate(32 33) scale(1.15) translate(-33 -31)"><path class="l" d="M21 13c1 8 3 15 6 22h19M27 35l-3 14M44 35l2 14"/><path class="l" d="M28 31h17v4"/></g></svg>'
  };

  const T = {
    en: {
      // lookup
      lkT: "Find a piece", lkP: "Enter the code under the QR code on your furniture.", lkPh: "e.g. AL-2610-03-Q", lkBtn: "Look up",
      lkFmt: "Codes look like AL-2610-03-Q.", lkBad: "That code doesn't look right. Check the last letter.", lkNone: "We have no batch with that code yet.",
      lkErr: "Something went wrong. Try again in a moment.", lkHint: "Want to see an example? Type", staffLink: "Factory / staff login",
      // login
      abT: "All batches", abLink: "All batches", abBig: "See all QR codes", newBig: "Make a new batch", abSearch: "Search code, area or maker", abAllP: "All products", abAllM: "All months",
      abCount: (n, t) => `${n} of ${t} batches`, abPieces: (n) => `${n} pieces in total`, abNone: "No batches match.", abCols: ["Code", "Product", "Status", "Wood", "Area", "Pieces", "Workshop", "Made", "By"],
      tlT: "Test login (preview only)", tlU: "Username", tlP: "Password", tlBtn: "Log in", tlWrong: "Use test / test on the preview.",
      liT: "Staff access", liP: "This page is for the workshop and the Another Life team. Open the personal link you received on WhatsApp to get access.", adminLink: "Admin",
      joining: "Opening your link…", joinUsed: "This link has already been used or has expired. Ask Another Life for a new one.",
      welcome: n => `Welcome, ${n}. This phone now has access.`, loggedAs: n => `Logged in as ${n}`, manage: "Manage people", by: "by",
      adT: "Admin", adKeyP: "Enter the admin key to manage who has access.", adKey: "Admin key", adBtn: "Open admin",
      adWrong: "That key isn't right.", adNotReady: "The admin key hasn't been added in Netlify yet.",
      adAdd: "Add a person", adName: "Name, e.g. Budi, workshop", adCreate: "Create invite link",
      adLinkFor: n => `Personal link for ${n}`, adLinkNote: "Works once, within 7 days. Send it only to this person.",
      adCopy: "Copy link", adCopied: "Copied", adWa: "Send on WhatsApp",
      adWaMsg: (n, l) => `Hi ${n}, this is your personal link to the Another Life Passport. Open it on your work phone: ${l}`,
      adList: "Who has access", adNone: "No one added yet.", stWaiting: "Link sent, not opened yet", stActive: d => `Active since ${d}`, stExpired: "Link expired, send a new one",
      adNew: "New link", adRemove: "Remove", adConfirm: n => `Remove ${n}? Their phone loses access straight away.`, adYes: "Yes, remove", adNo: "Cancel", toFactory: "Go to the factory form",
      // factory
      newBatch: "New batch", q1: "Which product?", q2: "Where did the wood come from? (can be added later)", q3: "Area (if known)", q3ph: "e.g. Central Java",
      q4: "Made by", qN: "How many pieces in this batch?", q5: "Packed weight per piece in kg (if known)", dateLbl: "Date",
      o_house: "Old house", o_bridge: "Bridge", o_boat: "Boat", o_other: "Other",
      create: "Create batch code", creating: "Creating…", engrave: "Engrave this code on every piece",
      same: n => `The same code goes on all ${n} pieces in this batch.`, dl: "Download for engraving (SVG)", next: "Next batch", view: "View passport",
      recent: "Recent batches", none: "No batches yet.", pcs: "pcs", logout: "Log out",
      err_model: "Choose a product.", err_origin: "Choose where the wood came from.", err_qty: "Enter how many pieces (1–999).", err_kg: "Check the weight.",
      err_auth: "You've been logged out. Log in again.", err_other: "Couldn't save. Check the connection and try again.",
      // passport
      passport: "Passport", testBanner: "Test example · not a real piece", look: "You're looking at", h1: "This wood has lived before.",
      lead: (m, o) => `Before it became ${m}, it was ${o}. Before that, it was a teak tree growing for decades. Here is its story.`,
      oPhrase: { house: "part of an old house", bridge: "part of a bridge", boat: "part of a boat", other: "wood that had already been used once" },
      livesK: "Its lives",
      l1k: "Life 1 · decades", l1h: "A teak tree", l1p: "Growing slowly, ring by ring.",
      l2k: "Life 2", l2h: { house: "An old house", bridge: "A bridge", boat: "A boat", other: "Its first use" },
      l2p: { house: "Beams that held up a home for years.", bridge: "Beams that carried people across.", boat: "Planks that went out to sea.", other: "Wood that had already done one job." },
      l3k: "Remade", l3h: "The workshop",
      l3p: (by, n) => `Cut, burned and oiled by hand${by ? ` by ${by}` : ""} in Jakarta, as one of ${n} pieces in this batch. Bolted together so it can come apart again.`,
      l4k: "Life 3 · now", l4h: "Here, with you", l4p: "And when this life ends, it can be repaired, rebuilt or given another one.",
      started: m => `This ${m.replace(/^The /, "")} started as a tree.`,
      s1: "Decades of slow growth.",
      s2: { house: "Held up a home.", bridge: "Carried people across.", boat: "Went out to sea.", other: "Already did one job." },
      s3: (by, d) => `Remade${by ? ` by ${by}` : ""} in Jakarta, ${d}.`,
      s4: "Ready to be repaired, rebuilt or passed on.",
      beforeK: m => `Before it became ${m}`, seeOn: m => `See ${m} on another-life.dk`,
      qPh: "Photos of the wood before (optional)", qPhHint: "What it was: the house, bridge or boat. Up to 6 photos.",
      phPick: "Take or choose photos", phSel: n => `${n} photo${n === 1 ? "" : "s"} selected`, phUp: (i, n) => `Uploading photo ${i} of ${n}…`,
      phErr: "A photo couldn't be uploaded. Add it again below.", phAdd: "Add photos", phFull: "This batch has 6 photos, the most it can hold.", phRemove: "Remove",
      journeyK: "Its journey", journeyT: "Jakarta to Bali", calcK: "Travel calculator", distK: "Distance", distU: "km by road and ferry",
      co2K: "Transport CO₂", co2U: "kg CO₂e for this piece", madeK: "Made in", madeV: "Jakarta", madeU: "on Java",
      legs: [["Truck", "Across Java"], ["Ferry", "Over the Bali Strait"], ["Truck", "To its new home in Bali"]],
      noteNo: "Distances follow the usual road route.", noteYes: "Estimate, using a typical truck emission factor and the packed weight of this piece.",
      flatK: "Why flat matters", flatT: "Same truck. Far less air.", flat: "Flat-packed", asm: "Assembled",
      flatNote: "Flat-packed, many more pieces fit in each truck, so fewer trips are needed.",
      youK: "What your scan just did", youT: "Now you know where it comes from.",
      c1: "The wood in this piece has already lived one life.", c2: "Its story stays with it, through every repair and every new owner.", c3: "Most furniture can't tell you any of this. This piece can.",
      repair: "Tell us about this piece",
      rpT: "Tell us about this piece", rpP: "Something wrong with it, or is it in a different place than this passport says? Tell us. It takes a minute.",
      rpWhat: "What is it about? Tick all that apply", rpLocation: "It's in a different place than the passport says",
      rpGps: "Add my location", rpGpsOk: "Location added", rpGpsNo: "Couldn't get the location. Type the place instead.", rpNeedPlace: "Tell us where the piece is now, or add your location.", rpLoose: "Loose joint or bolt", rpBroken: "Broken or cracked part", rpSurface: "Worn surface, needs oil", rpMissing: "Missing part", rpOther: "Something else",
      rpPhoto: "Photo (optional)", rpPhotoBtn: "Take or choose a photo", rpPhotoChange: "Change photo",
      rpMsg: "Anything else we should know? (optional)", rpPlace: "Where is the piece now? Place, hotel or restaurant name",
      rpContact: "Your email or phone, if you'd like a reply (optional)", rpSend: "Send report", rpSending: "Sending…",
      rpNeed: "Tick at least one box or add a photo.", rpErr: "Couldn't send. Check the connection and try again.", rpBig: "That photo is too large. Try another one.",
      rpThanks: "Thank you so much for reporting.", rpThanksP: "We've received it and will take a look. It helps this piece keep going, and keeps its story right.", rpBack: "Back to the passport",
      another: "Look up another code", site: "Visit another-life.dk", loading: "Loading…",
      // overview, workshops, drafts
      ovT: "Overview", stB: "Batches", stP: "Pieces", stD: "Waiting for details",
      drT: "Waiting for details", drP: "These codes are made and can be engraved. The workshop still needs to add where the wood came from.",
      drNone: "Nothing waiting. Every batch has its story.", fillIn: "Fill in",
      wsT: "Workshops", wsP: "Each workshop only sees its own batches. Add the people who work there.",
      wsAdd: "Add a workshop", wsName: "Workshop name, e.g. Jakarta workshop", wsCreate: "Add workshop",
      wsNone: "No workshops yet. Add one, then add the people who work there.",
      wsSum: (b, d) => `${b} batch${b === 1 ? "" : "es"}${d ? ` · ${d} waiting for details` : ""}`,
      wsNoPeople: "No one here yet.", noWs: "Not in a workshop", noWsP: "Sees only the batches they made themselves.",
      qWs: "Which workshop?", wsPick: "Workshop", wsNoneOpt: "No workshop", adAddTo: n => `Add a person to ${n}`,
      stDraft: "Draft", stDone: "Complete", stCol: "Status", wsCol: "Workshop", abAllS: "All statuses", abOnlyD: "Drafts only",
      woodLater: "Don't know the wood yet? Leave it empty. The code is saved as a draft, and the wood can be added later.",
      createDraft: "Create code, fill in later",
      draftRes: "Draft. Engrave it now. Until the details are filled in, scanning it shows the general Another Life story.",
      finish: "Fill in the details", toFinish: "To finish", toFinishP: "Codes that are made, but still need the wood details.",
      edT: "Batch details", edSave: "Save", edSaving: "Saving…", edSaved: "Saved.",
      edDone: "Complete. Scanning this code now shows the full story.", edDraft: "Draft. Scanning this code shows the general story until you choose where the wood came from.",
      edPh: "Photos of the wood before", edBack: "Back", edNone: "This batch doesn't exist, or it belongs to another workshop.",
      err_workshop: "That workshop doesn't exist any more.",
      // passport for a draft
      dLead: m => `${m} is made from reclaimed teak: wood that has already lived one life, as part of a house, a bridge or a boat. Before that, it was a teak tree growing for decades.`,
      dS2h: "A house, a bridge or a boat", dS2: "Its first life, before the workshop.", dS3: "Remade by hand in Jakarta.",
      // wood lots
      lotsT: "Wood lots", lotsP: "Every delivery of reclaimed wood gets a lot number. Print the tag and fix it to the stack. When furniture is made, pick the lot number from the tag.",
      lotsLink: "Wood lots", lotNew: "New wood lot", lotNewP: "Register wood when it arrives. You get a number to print and put on the stack.",
      lotSrc: "What was the wood?", lotPlace: "Where it came from: village or town", lotPlacePh: "e.g. Jepara", lotRegion: "Region", lotRegionPh: "e.g. Central Java",
      lotSupplier: "Bought from (internal)", lotArrived: "Arrived", lotVolume: "How much (e.g. 2 m³, 40 beams)", lotGps: "Location of the source (internal, optional)", lotGpsBtn: "Use my location",
      lotNotes: "Notes (internal)", lotName: "Short name on the tag", lotNamePh: "Made automatically, e.g. House · Jepara",
      lotPhotos: "Photos of the wood and where it came from", lotPubPh: "Show these photos on passports", lotCreate: "Create lot and print tag",
      lotOpen: "In stock", lotUsed: "Used up", lotMarkUsed: "Mark as used up", lotMarkOpen: "Back in stock", lotPrint: "Print tag", lotEdit: "Edit",
      lotNone: "No wood lots yet.", lotIn: n => `Used in ${n} batch${n === 1 ? "" : "es"}`, lotBatches: "Furniture made from this lot", lotNoB: "Not used in any batch yet.",
      lotNotFound: "This lot doesn't exist, or it belongs to another workshop.", lotSaved: "Saved.", lotShowUsed: n => `Show ${n} used-up lot${n === 1 ? "" : "s"}`,
      qLot: "Which wood lot? Read the number on the tag", lotTypePh: "Type lot number, e.g. 2610-48", lotAdd: "Add", lotNo: n => `There is no lot ${n} for this workshop.`,
      byHand: "No lot number? Choose the wood by hand", lotFromTag: "Area comes from the lot.",
      tagTitle: "Print this tag and fix it to the wood stack", tagPrint: "Print", tagBack: "Back to the lot",
      err_lot: "One of the lot numbers doesn't exist for this workshop.", err_lot_workshop: "That lot belongs to another workshop.", err_origin_lot: "Choose what the wood was.",
      dlAll: "Download everything (ZIP)", dlAllP: "A copy of all batches, wood lots and photos, with spreadsheets you can open in Excel. Keep it on your computer or in Google Drive.",
      dlBusy: (i, n) => `Preparing… ${i} of ${n} photos`, dlDone: "Downloaded.", lotsSum: (o, u) => `${o} in stock · ${u} used up`,
      // material record (internal)
      matK: "Material record · internal", matP: "Everything known about this wood, kept here so it never depends on an outside page. Never shown on passports.",
      mDescribed: "Material, as described", mSpecies: "Species verified?", mPrevUse: "Previous use", mArea: "Recovery area", mRoute: "Supply route",
      mPurchase: "Purchase status", mDims: "Dimensions (range)", mLimits: "What is not verified / limits",
      mExtT: "Outside record (e.g. supplier passport): title", mExtU: "Link", mExtV: "Version", mExtD: "Issued",
      mSources: "Source documents: one per line, as  title | date (YYYY-MM-DD) | what it supports",
      mPieces: "Piece schedule", mPiecesSum: (n, v) => `${n} piece${n === 1 ? "" : "s"} · ${v} m³ gross`, mPiecesNone: "No pieces recorded yet.",
      mPaste: "Paste or edit the piece list: one piece per line, as  number thickness width length  (mm). Copying rows from Excel or a table works.",
      mCols: ["Piece", "T mm", "W mm", "L mm", "m³"], mShow: "Show all pieces", mSave: "Save material record", mSaved: "Material record saved.",
      mBadLines: n => `${n} line${n === 1 ? "" : "s"} could not be read and ${n === 1 ? "was" : "were"} left out.`,
      docsK: "Documents · internal", docsP: "Scans and files: invoices, village letters, certificates, measurement lists, saved copies of outside records. PDF or image, up to 4 MB each.",
      docsNone: "No documents yet.", docAdd: "Add documents", docNote: "Note for the next upload (optional)", docUp: (i, n) => `Uploading ${i} of ${n}…`,
      docBig: "Too large (over 4 MB). Make the PDF smaller or scan at a lower resolution.", docBadType: "Only PDF or image files.", docOpen: "Open", docDl: "Download",
    },
    id: {
      lkT: "Cari produk", lkP: "Masukkan kode di bawah kode QR pada furnitur Anda.", lkPh: "mis. AL-2610-03-Q", lkBtn: "Cari",
      lkFmt: "Format kode seperti AL-2610-03-Q.", lkBad: "Kode itu sepertinya salah. Periksa huruf terakhirnya.", lkNone: "Belum ada batch dengan kode itu.",
      lkErr: "Terjadi kesalahan. Coba lagi sebentar lagi.", lkHint: "Ingin melihat contoh? Ketik", staffLink: "Login pabrik / staf",
      abT: "Semua batch", abLink: "Semua batch", abBig: "Lihat semua kode QR", newBig: "Buat batch baru", abSearch: "Cari kode, daerah atau pembuat", abAllP: "Semua produk", abAllM: "Semua bulan",
      abCount: (n, t) => `${n} dari ${t} batch`, abPieces: (n) => `${n} produk total`, abNone: "Tidak ada batch yang cocok.", abCols: ["Kode", "Produk", "Status", "Kayu", "Daerah", "Jumlah", "Bengkel", "Dibuat", "Oleh"],
      tlT: "Login uji (hanya pratinjau)", tlU: "Nama pengguna", tlP: "Kata sandi", tlBtn: "Masuk", tlWrong: "Gunakan test / test di pratinjau.",
      liT: "Akses staf", liP: "Halaman ini untuk bengkel dan tim Another Life. Buka tautan pribadi yang Anda terima lewat WhatsApp untuk mendapatkan akses.", adminLink: "Admin",
      joining: "Membuka tautan Anda…", joinUsed: "Tautan ini sudah dipakai atau sudah kedaluwarsa. Minta tautan baru ke Another Life.",
      welcome: n => `Selamat datang, ${n}. Ponsel ini sekarang punya akses.`, loggedAs: n => `Masuk sebagai ${n}`, manage: "Kelola orang", by: "oleh",
      adT: "Admin", adKeyP: "Masukkan kunci admin untuk mengatur siapa yang punya akses.", adKey: "Kunci admin", adBtn: "Buka admin",
      adWrong: "Kunci itu salah.", adNotReady: "Kunci admin belum ditambahkan di Netlify.",
      adAdd: "Tambah orang", adName: "Nama, mis. Budi, bengkel", adCreate: "Buat tautan undangan",
      adLinkFor: n => `Tautan pribadi untuk ${n}`, adLinkNote: "Hanya bisa dipakai sekali, dalam 7 hari. Kirim hanya ke orang ini.",
      adCopy: "Salin tautan", adCopied: "Tersalin", adWa: "Kirim lewat WhatsApp",
      adWaMsg: (n, l) => `Halo ${n}, ini tautan pribadi Anda untuk Another Life Passport. Buka di ponsel kerja Anda: ${l}`,
      adList: "Yang punya akses", adNone: "Belum ada orang.", stWaiting: "Tautan dikirim, belum dibuka", stActive: d => `Aktif sejak ${d}`, stExpired: "Tautan kedaluwarsa, kirim yang baru",
      adNew: "Tautan baru", adRemove: "Hapus", adConfirm: n => `Hapus ${n}? Ponselnya langsung kehilangan akses.`, adYes: "Ya, hapus", adNo: "Batal", toFactory: "Ke formulir pabrik",
      newBatch: "Batch baru", q1: "Produk apa?", q2: "Kayunya berasal dari mana? (bisa diisi nanti)", q3: "Daerah (jika tahu)", q3ph: "mis. Jawa Tengah",
      q4: "Dibuat oleh", qN: "Berapa produk dalam batch ini?", q5: "Berat kemasan per produk dalam kg (jika tahu)", dateLbl: "Tanggal",
      o_house: "Rumah tua", o_bridge: "Jembatan", o_boat: "Perahu", o_other: "Lainnya",
      create: "Buat kode batch", creating: "Sedang membuat…", engrave: "Grafir kode ini di setiap produk",
      same: n => `Kode yang sama dipakai untuk semua ${n} produk dalam batch ini.`, dl: "Unduh untuk grafir (SVG)", next: "Batch berikutnya", view: "Lihat paspor",
      recent: "Batch terbaru", none: "Belum ada batch.", pcs: "pcs", logout: "Keluar",
      err_model: "Pilih produk.", err_origin: "Pilih asal kayu.", err_qty: "Isi jumlah produk (1–999).", err_kg: "Periksa beratnya.",
      err_auth: "Anda sudah keluar. Silakan masuk lagi.", err_other: "Gagal menyimpan. Periksa koneksi dan coba lagi.",
      passport: "Paspor", testBanner: "Contoh uji · bukan produk sungguhan", look: "Anda sedang melihat", h1: "Kayu ini pernah hidup sebelumnya.",
      lead: (m, o) => `Sebelum menjadi ${m}, kayu ini adalah ${o}. Sebelumnya lagi, ia adalah pohon jati yang tumbuh selama puluhan tahun. Inilah kisahnya.`,
      oPhrase: { house: "bagian dari rumah tua", bridge: "bagian dari jembatan", boat: "bagian dari perahu", other: "kayu yang sudah pernah dipakai" },
      livesK: "Kehidupannya",
      l1k: "Kehidupan 1 · puluhan tahun", l1h: "Pohon jati", l1p: "Tumbuh perlahan, lingkar demi lingkar.",
      l2k: "Kehidupan 2", l2h: { house: "Rumah tua", bridge: "Jembatan", boat: "Perahu", other: "Penggunaan pertamanya" },
      l2p: { house: "Balok yang menopang sebuah rumah selama bertahun-tahun.", bridge: "Balok yang dilalui orang untuk menyeberang.", boat: "Papan yang pernah berlayar di laut.", other: "Kayu yang sudah pernah dipakai sekali." },
      l3k: "Dibuat ulang", l3h: "Bengkel kerja",
      l3p: (by, n) => `Dipotong, dibakar, dan diminyaki dengan tangan${by ? ` oleh ${by}` : ""} di Jakarta, sebagai salah satu dari ${n} produk dalam batch ini. Dibaut agar bisa dibongkar lagi.`,
      l4k: "Kehidupan 3 · sekarang", l4h: "Di sini, bersama Anda", l4p: "Saat kehidupan ini berakhir, ia bisa diperbaiki, dirakit ulang, atau diberi kehidupan berikutnya.",
      started: m => `${m.replace(/^The /, "")} ini berawal dari sebatang pohon.`,
      s1: "Tumbuh perlahan selama puluhan tahun.",
      s2: { house: "Menopang sebuah rumah.", bridge: "Dilalui orang untuk menyeberang.", boat: "Pernah berlayar di laut.", other: "Sudah pernah dipakai." },
      s3: (by, d) => `Dibuat ulang${by ? ` oleh ${by}` : ""} di Jakarta, ${d}.`,
      s4: "Siap diperbaiki, dirakit ulang, atau diwariskan.",
      beforeK: m => `Sebelum menjadi ${m}`, seeOn: m => `Lihat ${m} di another-life.dk`,
      qPh: "Foto kayu sebelumnya (opsional)", qPhHint: "Asalnya: rumah, jembatan, atau perahu. Maksimal 6 foto.",
      phPick: "Ambil atau pilih foto", phSel: n => `${n} foto dipilih`, phUp: (i, n) => `Mengunggah foto ${i} dari ${n}…`,
      phErr: "Ada foto yang gagal diunggah. Tambahkan lagi di bawah.", phAdd: "Tambah foto", phFull: "Batch ini sudah punya 6 foto, jumlah maksimal.", phRemove: "Hapus",
      journeyK: "Perjalanannya", journeyT: "Jakarta ke Bali", calcK: "Kalkulator perjalanan", distK: "Jarak", distU: "km lewat darat dan feri",
      co2K: "CO₂ transportasi", co2U: "kg CO₂e untuk produk ini", madeK: "Dibuat di", madeV: "Jakarta", madeU: "di Pulau Jawa",
      legs: [["Truk", "Melintasi Pulau Jawa"], ["Feri", "Menyeberangi Selat Bali"], ["Truk", "Ke rumah barunya di Bali"]],
      noteNo: "Jarak mengikuti rute jalan yang biasa.", noteYes: "Perkiraan, memakai faktor emisi truk yang umum dan berat kemasan produk ini.",
      flatK: "Mengapa dikemas datar", flatT: "Truk yang sama. Jauh lebih sedikit udara.", flat: "Dikemas datar", asm: "Sudah dirakit",
      flatNote: "Dalam kemasan datar, jauh lebih banyak produk muat di setiap truk, jadi perjalanan lebih sedikit.",
      youK: "Arti pindaian Anda", youT: "Sekarang Anda tahu asal-usulnya.",
      c1: "Kayu pada produk ini sudah menjalani satu kehidupan.", c2: "Kisahnya tetap melekat, melalui setiap perbaikan dan setiap pemilik baru.", c3: "Kebanyakan furnitur tidak bisa menceritakan semua ini. Produk ini bisa.",
      repair: "Beri tahu kami tentang produk ini",
      rpT: "Beri tahu kami tentang produk ini", rpP: "Ada yang rusak, atau lokasinya berbeda dari yang tertulis di paspor ini? Beri tahu kami. Hanya butuh satu menit.",
      rpWhat: "Tentang apa? Centang semua yang sesuai", rpLocation: "Lokasinya berbeda dari yang tertulis di paspor",
      rpGps: "Tambahkan lokasi saya", rpGpsOk: "Lokasi ditambahkan", rpGpsNo: "Lokasi tidak bisa didapat. Ketik tempatnya saja.", rpNeedPlace: "Beri tahu kami di mana produk ini sekarang, atau tambahkan lokasi Anda.", rpLoose: "Sambungan atau baut longgar", rpBroken: "Bagian patah atau retak", rpSurface: "Permukaan aus, perlu diminyaki", rpMissing: "Ada bagian yang hilang", rpOther: "Lainnya",
      rpPhoto: "Foto (opsional)", rpPhotoBtn: "Ambil atau pilih foto", rpPhotoChange: "Ganti foto",
      rpMsg: "Ada hal lain yang perlu kami tahu? (opsional)", rpPlace: "Di mana produk ini sekarang? Tempat, nama hotel atau restoran",
      rpContact: "Email atau nomor telepon Anda, jika ingin dibalas (opsional)", rpSend: "Kirim laporan", rpSending: "Mengirim…",
      rpNeed: "Centang minimal satu kotak atau tambahkan foto.", rpErr: "Gagal mengirim. Periksa koneksi dan coba lagi.", rpBig: "Foto itu terlalu besar. Coba foto lain.",
      rpThanks: "Terima kasih banyak atas laporannya.", rpThanksP: "Laporan sudah kami terima dan akan kami periksa. Ini membantu produk ini terus dipakai, dan kisahnya tetap benar.", rpBack: "Kembali ke paspor",
      another: "Cari kode lain", site: "Kunjungi another-life.dk", loading: "Memuat…",
      ovT: "Ringkasan", stB: "Batch", stP: "Produk", stD: "Menunggu detail",
      drT: "Menunggu detail", drP: "Kode-kode ini sudah dibuat dan bisa digrafir. Bengkel masih perlu mengisi asal kayunya.",
      drNone: "Tidak ada yang menunggu. Setiap batch sudah punya kisahnya.", fillIn: "Isi",
      wsT: "Bengkel", wsP: "Setiap bengkel hanya melihat batch miliknya sendiri. Tambahkan orang yang bekerja di sana.",
      wsAdd: "Tambah bengkel", wsName: "Nama bengkel, mis. Bengkel Jakarta", wsCreate: "Tambah bengkel",
      wsNone: "Belum ada bengkel. Tambahkan satu, lalu tambahkan orang yang bekerja di sana.",
      wsSum: (b, d) => `${b} batch${d ? ` · ${d} menunggu detail` : ""}`,
      wsNoPeople: "Belum ada orang di sini.", noWs: "Belum masuk bengkel", noWsP: "Hanya melihat batch yang dibuatnya sendiri.",
      qWs: "Bengkel yang mana?", wsPick: "Bengkel", wsNoneOpt: "Tanpa bengkel", adAddTo: n => `Tambah orang ke ${n}`,
      stDraft: "Draf", stDone: "Lengkap", stCol: "Status", wsCol: "Bengkel", abAllS: "Semua status", abOnlyD: "Hanya draf",
      woodLater: "Belum tahu asal kayunya? Kosongkan saja. Kode disimpan sebagai draf, dan detailnya bisa diisi nanti.",
      createDraft: "Buat kode, isi nanti",
      draftRes: "Draf. Grafir sekarang. Sampai detailnya diisi, pindaian kode ini menampilkan kisah umum Another Life.",
      finish: "Isi detailnya", toFinish: "Perlu dilengkapi", toFinishP: "Kode yang sudah dibuat, tapi detail kayunya belum diisi.",
      edT: "Detail batch", edSave: "Simpan", edSaving: "Menyimpan…", edSaved: "Tersimpan.",
      edDone: "Lengkap. Pindaian kode ini sekarang menampilkan kisah lengkapnya.", edDraft: "Draf. Pindaian kode ini menampilkan kisah umum sampai Anda memilih asal kayunya.",
      edPh: "Foto kayu sebelumnya", edBack: "Kembali", edNone: "Batch ini tidak ada, atau milik bengkel lain.",
      err_workshop: "Bengkel itu sudah tidak ada.",
      dLead: m => `${m} dibuat dari kayu jati daur ulang: kayu yang sudah menjalani satu kehidupan, sebagai bagian dari rumah, jembatan, atau perahu. Sebelumnya, ia adalah pohon jati yang tumbuh selama puluhan tahun.`,
      dS2h: "Rumah, jembatan, atau perahu", dS2: "Kehidupan pertamanya, sebelum ke bengkel.", dS3: "Dibuat ulang dengan tangan di Jakarta.",
      lotsT: "Lot kayu", lotsP: "Setiap kiriman kayu bekas mendapat nomor lot. Cetak labelnya dan pasang di tumpukan kayu. Saat membuat furnitur, pilih nomor lot dari label itu.",
      lotsLink: "Lot kayu", lotNew: "Lot kayu baru", lotNewP: "Catat kayu saat tiba. Anda mendapat nomor untuk dicetak dan dipasang di tumpukan.",
      lotSrc: "Kayunya dulu apa?", lotPlace: "Asalnya: desa atau kota", lotPlacePh: "mis. Jepara", lotRegion: "Wilayah", lotRegionPh: "mis. Jawa Tengah",
      lotSupplier: "Dibeli dari (internal)", lotArrived: "Tiba", lotVolume: "Berapa banyak (mis. 2 m³, 40 balok)", lotGps: "Lokasi asal kayu (internal, opsional)", lotGpsBtn: "Pakai lokasi saya",
      lotNotes: "Catatan (internal)", lotName: "Nama singkat di label", lotNamePh: "Dibuat otomatis, mis. House · Jepara",
      lotPhotos: "Foto kayu dan tempat asalnya", lotPubPh: "Tampilkan foto ini di paspor", lotCreate: "Buat lot dan cetak label",
      lotOpen: "Tersedia", lotUsed: "Sudah habis", lotMarkUsed: "Tandai sudah habis", lotMarkOpen: "Tersedia lagi", lotPrint: "Cetak label", lotEdit: "Ubah",
      lotNone: "Belum ada lot kayu.", lotIn: n => `Dipakai di ${n} batch`, lotBatches: "Furnitur dari lot ini", lotNoB: "Belum dipakai di batch mana pun.",
      lotNotFound: "Lot ini tidak ada, atau milik bengkel lain.", lotSaved: "Tersimpan.", lotShowUsed: n => `Tampilkan ${n} lot yang sudah habis`,
      qLot: "Lot kayu yang mana? Baca nomor di label", lotTypePh: "Ketik nomor lot, mis. 2610-48", lotAdd: "Tambah", lotNo: n => `Tidak ada lot ${n} untuk bengkel ini.`,
      byHand: "Tidak ada nomor lot? Pilih kayunya secara manual", lotFromTag: "Daerah diambil dari lot.",
      tagTitle: "Cetak label ini dan pasang di tumpukan kayu", tagPrint: "Cetak", tagBack: "Kembali ke lot",
      err_lot: "Salah satu nomor lot tidak ada untuk bengkel ini.", err_lot_workshop: "Lot itu milik bengkel lain.", err_origin_lot: "Pilih kayunya dulu apa.",
      dlAll: "Unduh semua (ZIP)", dlAllP: "Salinan semua batch, lot kayu, dan foto, dengan tabel yang bisa dibuka di Excel. Simpan di komputer atau Google Drive.",
      dlBusy: (i, n) => `Menyiapkan… ${i} dari ${n} foto`, dlDone: "Sudah diunduh.", lotsSum: (o, u) => `${o} tersedia · ${u} sudah habis`,
      matK: "Catatan material · internal", matP: "Semua yang diketahui tentang kayu ini, disimpan di sini agar tidak bergantung pada halaman luar. Tidak pernah tampil di paspor.",
      mDescribed: "Material, sesuai keterangan", mSpecies: "Jenis kayu sudah diverifikasi?", mPrevUse: "Penggunaan sebelumnya", mArea: "Daerah asal", mRoute: "Rantai pasok",
      mPurchase: "Status pembelian", mDims: "Ukuran (rentang)", mLimits: "Yang belum diverifikasi / batasan",
      mExtT: "Catatan luar (mis. paspor pemasok): judul", mExtU: "Tautan", mExtV: "Versi", mExtD: "Tanggal terbit",
      mSources: "Dokumen sumber: satu per baris, sebagai  judul | tanggal (YYYY-MM-DD) | yang didukung",
      mPieces: "Daftar potongan", mPiecesSum: (n, v) => `${n} potong · ${v} m³ kotor`, mPiecesNone: "Belum ada potongan yang dicatat.",
      mPaste: "Tempel atau ubah daftar potongan: satu potong per baris, sebagai  nomor tebal lebar panjang  (mm). Menyalin baris dari Excel atau tabel juga bisa.",
      mCols: ["Potong", "T mm", "L mm", "P mm", "m³"], mShow: "Tampilkan semua potongan", mSave: "Simpan catatan material", mSaved: "Catatan material tersimpan.",
      mBadLines: n => `${n} baris tidak terbaca dan tidak dimasukkan.`,
      docsK: "Dokumen · internal", docsP: "Pindaian dan file: faktur, surat desa, sertifikat, daftar ukur, salinan catatan luar. PDF atau gambar, maksimal 4 MB per file.",
      docsNone: "Belum ada dokumen.", docAdd: "Tambah dokumen", docNote: "Catatan untuk unggahan berikutnya (opsional)", docUp: (i, n) => `Mengunggah ${i} dari ${n}…`,
      docBig: "Terlalu besar (lebih dari 4 MB). Perkecil PDF atau pindai dengan resolusi lebih rendah.", docBadType: "Hanya file PDF atau gambar.", docOpen: "Buka", docDl: "Unduh",
    }
  };

  const TEST_BATCH = { code: "TEST", model: "The Bench", origin: "bridge", region: "Central Java", maker: "Tim A", qty: 12, kg: 9, route: "jakarta-bali", made: new Date().toISOString(), photos: ["test1", "test2"] };
  const photoUrl = (code, id) => code === "TEST" ? `/passport-app/wood-${id}.jpg` : /^L\d+\//.test(id) ? `${API}?lphoto=${id.slice(1)}` : `${API}?photo=${encodeURIComponent(code)}/${id}`;
  const lotPhotoUrl = (n, id) => `${API}?lphoto=${n}/${id}`;
  // Lot numbers are stored as YYMMNN (261048) and shown as 2610-48.
  const lotNo = n => { const s = String(n); return s.length === 6 ? s.slice(0, 4) + "-" + s.slice(4) : s; };
  const SITE = "https://another-life.dk";
  const productUrl = m => `${SITE}/${m.toLowerCase().replace(/\s+/g, "-")}.html`;

  // ---------- helpers
  const $ = s => document.querySelector(s);
  const app = $("#app");
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = (v, d) => v.toLocaleString("en-GB", { minimumFractionDigits: d, maximumFractionDigits: d });
  const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  let lang = store.get("al-lang") || ((navigator.language || "").toLowerCase().startsWith("id") ? "id" : "en");
  const t = () => T[lang];
  const dateStr = iso => new Date(iso).toLocaleDateString(lang === "id" ? "id-ID" : "en-GB", { day: "numeric", month: "short", year: "numeric" });

  function checkLetter(core) { const d = core.replace(/\D/g, ""); let s = 0; for (let i = 0; i < d.length; i++) s += Number(d[i]) * (i + 3); return CHECK[s % CHECK.length]; }
  function parseCode(input) {
    const v = String(input || "").trim().toUpperCase().replace(/\s+/g, "");
    const m = v.match(/^AL-(\d{4})-(\d{2,3})-([A-Z])$/);
    if (!m) return { error: "format" };
    if (checkLetter(`AL-${m[1]}-${m[2]}`) !== m[3]) return { error: "check" };
    return { code: v };
  }
  async function api(params, body) {
    const opts = body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), credentials: "same-origin" } : { credentials: "same-origin" };
    const res = await fetch(API + (params ? "?" + params : ""), opts);
    let data = {}; try { data = await res.json(); } catch (e) {}
    return { status: res.status, data };
  }

  // QR in uppercase alphanumeric mode: smaller code, easier to engrave.
  function qrSvg(code, withText) {
    const q = qrcode(0, "Q");
    q.addData(`HTTPS://${PUBLIC_HOST}/${code}`, "Alphanumeric");
    q.make();
    const n = q.getModuleCount(), quiet = 4, size = n + quiet * 2;
    let d = "";
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c + quiet} ${r + quiet}h1v1h-1z`;
    const textH = withText ? 6 : 0;
    const text = withText ? `<text x="${size / 2}" y="${size + 3.6}" text-anchor="middle" font-family="IBM Plex Mono, Menlo, monospace" font-size="3.2" letter-spacing="0.5" fill="#000">${esc(code)}</text>` : "";
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size + textH}" shape-rendering="crispEdges"><rect width="${size}" height="${size + textH}" fill="#fff"/><path d="${d}" fill="#000"/>${text}</svg>`;
  }
  // The engraving file (150 x 55 mm plate, text as outlines) is made by the server and downloaded as a normal file,
  // which works on phones too.
  const plateUrl = (code, view) => `${API}?plate=${encodeURIComponent(code)}${view ? "&view=1" : ""}`;
  function downloadSvg(code) {
    const a = document.createElement("a");
    a.href = plateUrl(code); a.download = ""; // the server names the file: product, code, date
    document.body.appendChild(a); a.click(); a.remove();
  }

  // ---------- routing
  function route() {
    const p = decodeURIComponent(location.pathname.slice(BASE.length).replace(/^\/+|\/+$/g, ""));
    if (!p) return { view: "lookup" };
    if (p.toLowerCase() === "login") return { view: "login" };
    if (p.toLowerCase() === "factory") return { view: "factory" };
    if (p.toLowerCase() === "admin") return { view: "admin" };
    if (p.toLowerCase() === "batches") return { view: "batches" };
    if (/^join\//i.test(p)) return { view: "join", token: p.slice(5) };
    if (/^edit\//i.test(p)) return { view: "edit", code: p.slice(5).toUpperCase() };
    if (p.toLowerCase() === "lots") return { view: "lots" };
    let lm = p.match(/^lot\/([\d-]+)\/tag$/i);
    if (lm) return { view: "tag", n: Number(lm[1].replace(/-/g, "")) };
    lm = p.match(/^lot\/([\d-]+)$/i);
    if (lm) return { view: "lot", n: Number(lm[1].replace(/-/g, "")) };
    const m = p.match(/^(.+)\/repair$/i);
    if (m) return { view: "repair", code: m[1].toLowerCase() === "test" ? "TEST" : m[1].toUpperCase() };
    if (p.toLowerCase() === "test") return { view: "passport", code: "TEST" };
    return { view: "passport", code: p.toUpperCase() };
  }
  function go(path) { history.pushState(null, "", BASE + "/" + path); render(); window.scrollTo(0, 0); }
  window.addEventListener("popstate", render);
  document.addEventListener("click", e => {
    const a = e.target.closest("a[data-go]");
    if (a) { e.preventDefault(); go(a.dataset.go); }
  });

  // ---------- language
  function setLang(l) {
    lang = l; store.set("al-lang", l); document.documentElement.lang = l;
    document.querySelectorAll("[data-lang]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.lang === l)));
    render(true);
  }
  document.querySelectorAll("[data-lang]").forEach(b => b.addEventListener("click", () => setLang(b.dataset.lang)));
  $("#homeLink").href = SITE;

  // ---------- views
  let current = null, cache = {}, form = null, who = {};

  function render(langOnly) {
    const r = route();
    $("#banner").hidden = true;
    document.body.classList.toggle("tagmode", r.view === "tag");
    if (r.view !== "batches" && r.view !== "admin") document.body.classList.remove("wide");
    document.querySelectorAll("[data-lang]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
    document.documentElement.lang = lang;
    if (r.view === "lookup") return viewLookup(langOnly);
    if (r.view === "login") return viewLogin();
    if (r.view === "factory") return viewFactory(langOnly);
    if (r.view === "admin") return viewAdmin(langOnly);
    if (r.view === "batches") return viewBatches(langOnly);
    if (r.view === "join") return viewJoin(r.token);
    if (r.view === "edit") return viewEdit(r.code, langOnly);
    if (r.view === "lots") return viewLots(langOnly);
    if (r.view === "lot") return viewLot(r.n, langOnly);
    if (r.view === "tag") return viewTag(r.n);
    if (r.view === "repair") return viewRepair(r.code);
    return viewPassport(r.code);
  }

  function viewLookup(keep) {
    const prev = keep ? ($("#lkIn") || {}).value || "" : "";
    const L = t();
    document.title = "Another Life Passport";
    app.innerHTML = `
      <section>
        <span class="k">${PUBLIC_HOST.toLowerCase()}</span>
        <h1>${L.lkT}</h1>
        <p class="lead">${L.lkP}</p>
        <form class="form" id="lkForm" style="gap:10px" novalidate>
          <input type="text" class="code-in" id="lkIn" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="${L.lkPh}" aria-label="${L.lkT}" value="${esc(prev)}">
          <button class="btn" type="submit">${L.lkBtn}</button>
          <p class="msg" id="lkMsg" role="status"></p>
        </form>
        <p class="fine">${L.lkHint} <button type="button" class="linkish" id="lkTest">test</button></p>
      </section>
      <section class="foot"><a class="staff" href="${BASE}/login" data-go="login">${L.staffLink}</a></section>`;
    $("#lkTest").addEventListener("click", () => go("test"));
    $("#lkForm").addEventListener("submit", async e => {
      e.preventDefault();
      const v = $("#lkIn").value.trim(), msg = $("#lkMsg");
      msg.className = "msg";
      if (v.toLowerCase() === "test") return go("test");
      const p = parseCode(v);
      if (p.error) { msg.textContent = p.error === "check" ? L.lkBad : L.lkFmt; msg.classList.add("bad"); return; }
      msg.textContent = L.loading;
      const { status, data } = await api("code=" + encodeURIComponent(p.code)).catch(() => ({ status: 0, data: {} }));
      if (status === 200) { cache[p.code] = data.batch; return go(p.code); }
      msg.textContent = status === 404 ? L.lkNone : L.lkErr; msg.classList.add("bad");
    });
  }

  async function viewLogin() {
    const L = t();
    document.title = L.liT + " · Another Life Passport";
    app.innerHTML = `
      <section>
        <span class="k">${PUBLIC_HOST.toLowerCase()}</span>
        <h1>${L.liT}</h1>
        <p class="lead">${L.liP}</p>
      </section>
      <section id="testBox" hidden>
        <span class="k">${L.tlT}</span>
        <form class="form" id="tlForm" style="gap:10px">
          <label class="q"><span>${L.tlU}</span><input type="text" id="tlU" autocomplete="username" autocapitalize="none"></label>
          <label class="q"><span>${L.tlP}</span><input type="password" id="tlP" autocomplete="current-password"></label>
          <button class="btn" type="submit" id="tlBtn">${L.tlBtn}</button>
          <p class="msg bad" id="tlMsg" role="status"></p>
        </form>
      </section>
      <section class="foot"><a class="staff" href="${BASE}/admin" data-go="admin">${L.adminLink}</a></section>`;
    const me = (await api("me=1").catch(() => ({ data: {} }))).data;
    if (me.staff) return go("factory");
    if (!me.testLogin || !$("#testBox")) return;
    $("#testBox").hidden = false;
    $("#tlForm").addEventListener("submit", async e => {
      e.preventDefault();
      const btn = $("#tlBtn"); btn.disabled = true;
      const { status } = await api("", { action: "test-login", username: $("#tlU").value, password: $("#tlP").value }).catch(() => ({ status: 0 }));
      btn.disabled = false;
      if (status === 200) return go("factory");
      $("#tlMsg").textContent = status === 401 ? L.tlWrong : L.lkErr;
    });
  }

  async function viewJoin(token) {
    const L = t();
    app.innerHTML = `<section><span class="k">${PUBLIC_HOST.toLowerCase()}</span><h1>${L.liT}</h1><p class="lead" id="jMsg">${L.joining}</p></section>`;
    // Remove the secret from the address bar and history straight away
    history.replaceState(null, "", BASE + "/login");
    const { status, data } = await api("", { action: "join", token }).catch(() => ({ status: 0, data: {} }));
    if (status === 200) {
      $("#jMsg").textContent = L.welcome(data.name);
      setTimeout(() => go("factory"), 1400);
    } else {
      $("#jMsg").textContent = status === 404 ? L.joinUsed : L.lkErr;
      $("#jMsg").className = "msg bad";
    }
  }

  let adminState = { link: null };
  async function viewAdmin(langOnly) {
    const L = t();
    document.title = L.adT + " · Another Life Passport";
    const me = (await api("me=1").catch(() => ({ data: {} }))).data;
    if (!me.admin) {
      app.innerHTML = `
        <section>
          <span class="k">${L.adminLink}</span>
          <h1>${L.adT}</h1>
          <p class="lead">${L.adKeyP}</p>
          <form class="form" id="akForm" style="gap:10px">
            <label class="q"><span>${L.adKey}</span><input type="password" id="akIn" autocomplete="current-password" required></label>
            <button class="btn" type="submit" id="akBtn">${L.adBtn}</button>
            <p class="msg bad" id="akMsg" role="status">${me.adminReady === false ? L.adNotReady : ""}</p>
          </form>
        </section>`;
      $("#akForm").addEventListener("submit", async e => {
        e.preventDefault();
        const btn = $("#akBtn"); btn.disabled = true;
        const { status } = await api("", { action: "admin-login", key: $("#akIn").value }).catch(() => ({ status: 0 }));
        btn.disabled = false;
        if (status === 200) return viewAdmin();
        $("#akMsg").textContent = status === 503 ? L.adNotReady : status === 401 ? L.adWrong : L.lkErr;
      });
      return;
    }
    document.body.classList.add("wide");
    const link = adminState.link;
    app.innerHTML = `
      <section>
        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px"><span class="k">${L.adminLink}</span><button type="button" class="staff" id="logout">${L.logout}</button></div>
        <h1>${L.ovT}</h1>
        <div class="stats three" id="ovStats"><div class="stat"><span class="k">${L.stB}</span><b>–</b></div><div class="stat"><span class="k">${L.stP}</span><b>–</b></div><div class="stat"><span class="k">${L.stD}</span><b>–</b></div></div>
        <div class="two-btn" style="margin:20px 0 0"><a class="btn" href="${BASE}/factory" data-go="factory">${L.newBig}</a><a class="btn ghost" href="${BASE}/batches" data-go="batches">${L.abBig}</a></div>
      </section>
      ${link ? `<section><div class="invite">
          <span class="k">${esc(L.adLinkFor(link.name))}</span>
          <input type="text" id="invLink" readonly value="${esc(link.url)}">
          <p class="fine">${L.adLinkNote}</p>
          <div class="two-btn"><button class="btn" type="button" id="invCopy">${L.adCopy}</button>
          <a class="btn ghost" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(L.adWaMsg(link.name, link.url))}">${L.adWa}</a></div>
        </div></section>` : ""}
      <section>
        <span class="k">${L.drT}</span>
        <p class="fine">${L.drP}</p>
        <div class="recent" id="drafts"><p class="fine" style="padding:12px 0">${L.loading}</p></div>
      </section>
      <section>
        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px"><span class="k">${L.lotsT}</span><a class="staff" href="${BASE}/lots" data-go="lots">${L.lotsLink} →</a></div>
        <p class="fine" id="ovLots">${L.loading}</p>
      </section>
      <section>
        <span class="k">${L.wsT}</span>
        <p class="fine">${L.wsP}</p>
        <div id="wsList"><p class="fine" style="padding:12px 0">${L.loading}</p></div>
        <form class="form inline-add" id="wsForm">
          <label class="q"><span>${L.wsAdd}</span><input type="text" id="wsName" maxlength="40" placeholder="${L.wsName}" required></label>
          <button class="btn ghost" type="submit" id="wsBtn">${L.wsCreate}</button>
        </form>
      </section>
      <section>
        <span class="k">Backup</span>
        <p class="fine">${L.dlAllP}</p>
        <button class="btn ghost" type="button" id="dlAll">${L.dlAll}</button>
        <p class="msg" id="dlMsg" role="status"></p>
      </section>
      <section class="foot" style="display:flex;gap:20px;flex-wrap:wrap"><a class="staff" href="${BASE}/factory" data-go="factory">${L.toFactory}</a><a class="staff" href="${BASE}/batches" data-go="batches">${L.abLink}</a><a class="staff" href="${BASE}/lots" data-go="lots">${L.lotsLink}</a></section>`;
    $("#logout").addEventListener("click", async () => { await api("", { action: "logout" }).catch(() => {}); adminState.link = null; go(""); });
    $("#dlAll").addEventListener("click", downloadEverything);
    if (link) {
      $("#invCopy").addEventListener("click", async () => {
        const inp = $("#invLink");
        try { await navigator.clipboard.writeText(inp.value); } catch (e) { inp.select(); document.execCommand && document.execCommand("copy"); }
        $("#invCopy").textContent = L.adCopied;
      });
    }
    $("#wsForm").addEventListener("submit", async e => {
      e.preventDefault();
      const name = $("#wsName").value.trim(); if (!name) return;
      $("#wsBtn").disabled = true;
      await api("", { action: "add-workshop", name }).catch(() => {});
      viewAdmin();
    });
    loadOverview();
  }

  // Everything on the admin page that needs data: the numbers, drafts, workshops and their people.
  async function loadOverview() {
    const L = t();
    const [u, bt, lt] = await Promise.all([api("users=1"), api("batches=1"), api("lots=1")].map(p => p.catch(() => ({ status: 0, data: {} }))));
    if ($("#ovLots") && lt.status === 200) { const ls = lt.data.lots; $("#ovLots").textContent = ls.length ? L.lotsSum(ls.filter(l => l.status !== "used").length, ls.filter(l => l.status === "used").length) : L.lotNone; }
    if (!$("#wsList")) return;
    if (u.status !== 200 || bt.status !== 200) { $("#wsList").innerHTML = `<p class="fine">${L.lkErr}</p>`; return; }
    const users = u.data.users, workshops = u.data.workshops, batches = bt.data.batches;
    const drafts = batches.filter(b => b.status === "draft");
    const stats = [batches.length, batches.reduce((n, b) => n + (b.qty || 0), 0), drafts.length];
    $("#ovStats").querySelectorAll("b").forEach((el, i) => { el.textContent = fmt(stats[i], 0); });
    $("#ovStats").querySelectorAll(".stat")[2].classList.toggle("warn", drafts.length > 0);
    $("#drafts").innerHTML = drafts.length ? drafts.map(b => `<div class="rrow"><div><b>${esc(b.code)}</b><br><small>${esc(b.model)} · ${b.qty} ${L.pcs}${b.workshop ? ` · ${esc(b.workshop)}` : ""} · ${dateStr(b.made)}</small></div>
      <div class="acts"><button type="button" class="linkish" data-dl="${esc(b.code)}">SVG</button><a class="linkish" href="${BASE}/edit/${esc(b.code)}" data-go="edit/${esc(b.code)}">${L.fillIn}</a></div></div>`).join("")
      : `<p class="fine" style="padding:12px 0">${L.drNone}</p>`;
    $("#drafts").querySelectorAll("[data-dl]").forEach(x => x.addEventListener("click", () => downloadSvg(x.dataset.dl)));

    const person = p => {
      const st = p.joined ? L.stActive(dateStr(p.joined)) : p.waiting ? L.stWaiting : L.stExpired;
      return `<div class="rrow" data-row="${esc(p.id)}"><div><b>${esc(p.name)}</b><br><small>${esc(st)}</small></div>
        <div class="acts"><select class="mini" data-mv="${esc(p.id)}" aria-label="${L.wsPick}"><option value="">${L.wsNoneOpt}</option>${workshops.map(w => `<option value="${esc(w.id)}" ${w.id === p.workshopId ? "selected" : ""}>${esc(w.name)}</option>`).join("")}</select>
        <button type="button" class="linkish" data-new="${esc(p.id)}">${L.adNew}</button><button type="button" class="linkish" data-rm="${esc(p.id)}" data-name="${esc(p.name)}">${L.adRemove}</button></div></div>`;
    };
    const addForm = (wsId, label) => `<form class="form inline-add" data-add="${esc(wsId)}"><label class="q"><span>${esc(label)}</span><input type="text" maxlength="40" placeholder="${L.adName}" required></label><button class="btn" type="submit">${L.adCreate}</button></form>`;
    const known = new Set(workshops.map(w => w.id));
    const loose = users.filter(p => !p.workshopId || !known.has(p.workshopId));
    $("#wsList").innerHTML = (workshops.length ? workshops.map(w => {
      const wb = batches.filter(b => b.workshopId === w.id), wd = wb.filter(b => b.status === "draft").length, people = users.filter(p => p.workshopId === w.id);
      return `<div class="ws"><div class="ws-h"><h3>${esc(w.name)}</h3><small>${esc(L.wsSum(wb.length, wd))}</small></div>
        <div class="recent">${people.length ? people.map(person).join("") : `<p class="fine" style="padding:12px 0">${L.wsNoPeople}</p>`}</div>
        ${addForm(w.id, L.adAddTo(w.name))}</div>`;
    }).join("") : `<p class="fine" style="padding:12px 0">${L.wsNone}</p>`) +
      (loose.length || !workshops.length ? `<div class="ws"><div class="ws-h"><h3>${L.noWs}</h3><small>${L.noWsP}</small></div>
        <div class="recent">${loose.map(person).join("")}</div>${workshops.length ? "" : addForm("", L.adAdd)}</div>` : "");

    const box = $("#wsList");
    box.querySelectorAll("[data-add]").forEach(f => f.addEventListener("submit", async e => {
      e.preventDefault();
      const name = f.querySelector("input").value.trim(); if (!name) return;
      f.querySelector("button").disabled = true;
      const { status, data } = await api("", { action: "add-user", name, workshopId: f.dataset.add }).catch(() => ({ status: 0, data: {} }));
      if (status === 201) { adminState.link = { name: data.user.name, url: `${location.origin}${BASE}/join/${data.token}` }; viewAdmin(); window.scrollTo(0, 0); return; }
      f.querySelector("button").disabled = false;
    }));
    box.querySelectorAll("[data-mv]").forEach(sel => sel.addEventListener("change", async () => {
      sel.disabled = true;
      await api("", { action: "set-user-workshop", id: sel.dataset.mv, workshopId: sel.value }).catch(() => {});
      loadOverview();
    }));
    box.querySelectorAll("[data-new]").forEach(x => x.addEventListener("click", async () => {
      const { status, data } = await api("", { action: "new-link", id: x.dataset.new }).catch(() => ({ status: 0, data: {} }));
      if (status === 200) { adminState.link = { name: data.user.name, url: `${location.origin}${BASE}/join/${data.token}` }; viewAdmin(); window.scrollTo(0, 0); }
    }));
    box.querySelectorAll("[data-rm]").forEach(x => x.addEventListener("click", () => {
      const row = x.closest(".rrow");
      row.innerHTML = `<div><b>${esc(L.adConfirm(x.dataset.name))}</b></div><div class="acts"><button type="button" class="linkish" data-yes>${L.adYes}</button><button type="button" class="linkish" data-no>${L.adNo}</button></div>`;
      row.querySelector("[data-no]").addEventListener("click", loadOverview);
      row.querySelector("[data-yes]").addEventListener("click", async () => { await api("", { action: "remove-user", id: x.dataset.rm }).catch(() => {}); loadOverview(); });
    }));
  }

  // Wood lots visible to this person; admin sees all, filtered by the chosen workshop.
  async function loadLots() {
    const { status, data } = await api("lots=1").catch(() => ({ status: 0, data: {} }));
    who.lots = status === 200 ? data.lots : [];
  }
  const lotsForWs = wsId => (who.lots || []).filter(l => !who.admin || !wsId || !l.workshopId || l.workshopId === wsId);
  // The "which wood" part of the batch forms. st has .lots (numbers) and .origin.
  function woodPicker(st, wsId) {
    const L = t(), mine = lotsForWs(wsId);
    const shown = mine.filter(l => l.status !== "used" || st.lots.includes(l.n));
    const unknown = st.lots.filter(n => !mine.some(l => l.n === n));
    return `<div class="q"><span>${L.qLot}</span>
        ${shown.length || unknown.length ? `<div class="chips lots">${shown.map(l => `<button type="button" class="chip lotchip" data-lot="${l.n}" aria-pressed="${st.lots.includes(l.n)}"><b>${lotNo(l.n)}</b><span>${esc(l.name)}</span></button>`).join("")}${unknown.map(n => `<button type="button" class="chip lotchip" data-lot="${n}" aria-pressed="true"><b>${lotNo(n)}</b></button>`).join("")}</div>` : `<p class="fine">${L.lotNone} <a class="linkish" href="${BASE}/lots" data-go="lots">${L.lotNew}</a></p>`}
        <div class="lot-type"><input type="text" id="lotIn" inputmode="numeric" autocomplete="off" placeholder="${L.lotTypePh}" aria-label="${L.lotTypePh}"><button type="button" class="btn ghost" id="lotAdd">${L.lotAdd}</button></div>
        <p class="msg bad" id="lotMsg" role="status"></p></div>
      ${st.lots.length ? "" : `<details class="byhand" ${st.origin ? "open" : ""}><summary>${L.byHand}</summary>
        <div class="chips" style="margin-top:10px">${["house", "bridge", "boat", "other"].map(o => `<button type="button" class="chip" data-o="${o}" aria-pressed="${o === st.origin}">${ICONS[o]}${L["o_" + o]}</button>`).join("")}</div></details>`}`;
  }
  function bindWood(st, wsId, sync, rerender) {
    const L = t();
    app.querySelectorAll("[data-lot]").forEach(b => b.addEventListener("click", () => {
      sync(); const n = Number(b.dataset.lot);
      st.lots = st.lots.includes(n) ? st.lots.filter(x => x !== n) : [...st.lots, n]; rerender();
    }));
    app.querySelectorAll("[data-o]").forEach(b => b.addEventListener("click", () => { sync(); st.origin = st.origin === b.dataset.o ? "" : b.dataset.o; rerender(); }));
    const add = () => {
      const n = parseInt(String($("#lotIn").value).replace(/\D/g, ""), 10);
      if (!n) return;
      if (!lotsForWs(wsId).some(l => l.n === n)) { $("#lotMsg").textContent = L.lotNo(lotNo(n)); return; }
      sync(); if (!st.lots.includes(n)) st.lots = [...st.lots, n]; rerender();
    };
    $("#lotAdd").addEventListener("click", add);
    $("#lotIn").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); add(); } });
  }

  async function viewFactory(langOnly) {
    const L = t();
    document.title = L.newBatch + " · Another Life Passport";
    if (!langOnly) {
      const me = await api("me=1").catch(() => ({ data: {} }));
      if (!me.data.staff) return go("login");
      who = me.data;
      if (who.admin) who.workshops = ((await api("users=1").catch(() => ({ data: {} }))).data.workshops) || [];
      await loadLots();
    }
    form = form || { model: "", origin: "", region: "", maker: "", qty: "", kg: "", workshopId: "", lots: [] };
    form.lots = form.lots || [];
    const wsList = who.admin ? who.workshops || [] : [];
    if (wsList.length === 1 && !form.workshopId) form.workshopId = wsList[0].id;
    const res = form.result;
    app.innerHTML = `
      <section id="toFinish" hidden>
        <span class="k">${L.toFinish}</span>
        <p class="fine">${L.toFinishP}</p>
        <div class="recent" id="drafts"></div>
      </section>
      <section>
        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px"><span class="k">${L.newBatch}</span><span style="display:flex;gap:14px;flex-wrap:wrap;justify-content:flex-end"><a class="staff" href="${BASE}/lots" data-go="lots">${L.lotsLink}</a><a class="staff" href="${BASE}/batches" data-go="batches">${L.abLink}</a>${who.admin ? `<a class="staff" href="${BASE}/admin" data-go="admin">${L.ovT}</a>` : ""}<button type="button" class="staff" id="logout">${L.logout}</button></span></div>
        ${who.name ? `<p class="fine">${esc(L.loggedAs(who.name))}${who.workshop ? ` · ${esc(who.workshop)}` : ""}</p>` : ""}
        <div id="fWrap" ${res ? "hidden" : ""}>
          <form class="form" id="fForm" novalidate>
            <div class="q"><span>${L.q1}</span><div class="chips">${MODELS.map(m => `<button type="button" class="chip" data-m="${esc(m)}" aria-pressed="${m === form.model}">${esc(m)}</button>`).join("")}</div></div>
            ${wsList.length ? `<div class="q"><span>${L.qWs}</span><div class="chips">${wsList.map(w => `<button type="button" class="chip" data-w="${esc(w.id)}" aria-pressed="${w.id === form.workshopId}">${esc(w.name)}</button>`).join("")}</div></div>` : ""}
            <label class="q"><span>${L.qN}</span><input type="number" id="fQty" min="1" max="999" inputmode="numeric" value="${esc(form.qty)}"></label>
            <p class="fine note">${L.woodLater}</p>
            ${woodPicker(form, form.workshopId)}
            ${form.lots.length ? `<p class="fine">${L.lotFromTag}</p><input type="hidden" id="fRegion" value="${esc(form.region)}">` : `<label class="q"><span>${L.q3}</span><input type="text" id="fRegion" maxlength="60" placeholder="${L.q3ph}" value="${esc(form.region)}"></label>`}
            <label class="q"><span>${L.q4}</span><input type="text" id="fMaker" maxlength="60" value="${esc(form.maker)}"></label>
            <label class="q"><span>${L.q5}</span><input type="number" id="fKg" min="0" step="0.1" inputmode="decimal" value="${esc(form.kg)}"></label>
            <div class="q"><span>${L.qPh}</span><small class="fine">${L.qPhHint}</small>
              <label class="photo-pick"><input type="file" id="fPhotos" accept="image/*" multiple><span>${form.files && form.files.length ? L.phSel(form.files.length) : L.phPick}</span></label></div>
            <div class="auto"><span>${L.dateLbl}</span><span>${dateStr(new Date().toISOString())}</span></div>
            <button class="btn" type="submit" id="fBtn">${form.origin || form.lots.length ? L.create : L.createDraft}</button>
            <p class="msg bad" id="fMsg" role="status"></p>
          </form>
        </div>
        ${res ? `<div class="label-out">
          <span class="k">${L.engrave}</span>
          <div class="plate">${qrSvg(res.code, false)}<span class="serial">${esc(res.code)}</span></div>
          <img class="engrave-prev" src="${plateUrl(res.code, true)}" alt="${esc(res.code)}" width="150" height="55">
          <p class="fine">${L.same(res.qty)}</p>
          ${res.status === "draft" ? `<p class="note">${L.draftRes}</p><a class="btn" href="${BASE}/edit/${res.code}" data-go="edit/${res.code}">${L.finish}</a>` : ""}
          <div class="before staff-ph" id="resPh">${(res.photos || []).map(id => `<figure><img src="${photoUrl(res.code, id)}" alt=""><button type="button" class="linkish" data-rm="${id}">${L.phRemove}</button></figure>`).join("")}</div>
          <p class="msg bad" id="phMsg" role="status">${form.photoErr ? L.phErr : ""}</p>
          ${(res.photos || []).length < 6 ? `<label class="photo-pick"><input type="file" id="moreP" accept="image/*" multiple><span>${L.phAdd}</span></label>` : `<p class="fine">${L.phFull}</p>`}
          <button class="btn" type="button" id="dl">${L.dl}</button>
          <a class="btn ghost" href="${BASE}/${res.code}" data-go="${res.code}">${L.view}</a>
          <button class="btn ghost" type="button" id="nextB">${L.next}</button>
        </div>` : ""}
      </section>
      <section>
        <span class="k">${L.recent}</span>
        <div class="recent" id="recent"><p class="fine" style="padding:12px 0">${L.loading}</p></div>
      </section>`;

    form.photoErr = false;
    $("#logout").addEventListener("click", async () => { await api("", { action: "logout" }).catch(() => {}); form = null; go(""); });
    if (res) {
      $("#dl").addEventListener("click", () => downloadSvg(res.code));
      $("#nextB").addEventListener("click", () => { form = { model: form.model, origin: "", region: "", maker: form.maker, qty: "", kg: form.kg, workshopId: form.workshopId, lots: form.lots }; viewFactory(true); });
      const more = $("#moreP");
      if (more) more.addEventListener("change", async () => { await uploadPhotos(res, [...more.files]); viewFactory(true); });
      app.querySelectorAll("[data-rm]").forEach(btn => btn.addEventListener("click", async () => {
        btn.disabled = true;
        const { status, data } = await api("", { action: "photo-remove", code: res.code, id: btn.dataset.rm }).catch(() => ({ status: 0, data: {} }));
        if (status === 200) { form.result = data.batch; cache[res.code] = data.batch; }
        viewFactory(true);
      }));
    } else {
      const sync = () => { form.region = $("#fRegion").value; form.maker = $("#fMaker").value; form.qty = $("#fQty").value; form.kg = $("#fKg").value; };
      $("#fPhotos").addEventListener("change", e => { sync(); form.files = [...(form.files || []), ...e.target.files].slice(0, 6); viewFactory(true); });
      app.querySelectorAll("[data-m]").forEach(b => b.addEventListener("click", () => { sync(); form.model = b.dataset.m; viewFactory(true); }));
      bindWood(form, form.workshopId, sync, () => viewFactory(true));
      app.querySelectorAll("[data-w]").forEach(b => b.addEventListener("click", () => { sync(); form.workshopId = b.dataset.w; form.lots = form.lots.filter(n => lotsForWs(b.dataset.w).some(l => l.n === n)); viewFactory(true); }));
      $("#fForm").addEventListener("submit", async e => {
        e.preventDefault(); sync();
        const msg = $("#fMsg"); msg.textContent = "";
        if (!form.model) return (msg.textContent = L.err_model);
        const qty = parseInt(form.qty, 10);
        if (!(qty >= 1 && qty <= 999)) return (msg.textContent = L.err_qty);
        if (wsList.length && !form.workshopId) return (msg.textContent = L.qWs);
        const btn = $("#fBtn"); btn.disabled = true; btn.textContent = L.creating;
        const { status, data } = await api("", { action: "create", model: form.model, origin: form.lots.length ? "" : form.origin, region: form.lots.length ? "" : form.region, maker: form.maker, qty, kg: form.kg, workshopId: form.workshopId, lots: form.lots }).catch(() => ({ status: 0, data: {} }));
        btn.disabled = false; btn.textContent = L.create;
        if (status === 201) {
          form.result = data.batch; cache[data.batch.code] = data.batch;
          if (form.files && form.files.length) { btn.disabled = true; await uploadPhotos(form.result, form.files, btn); form.files = []; }
          return viewFactory(true);
        }
        if (status === 401) return go("login");
        msg.textContent = L["err_" + String(data.error).replace(/-/g, "_")] || L.err_other;
      });
    }
    loadRecent();
  }

  // Upload photos one by one to a batch; keeps form.result up to date.
  async function uploadPhotos(batch, files, btn) {
    const L = t();
    let failed = false;
    files = files.slice(0, Math.max(0, 6 - (batch.photos || []).length));
    for (let i = 0; i < files.length; i++) {
      const msg = btn || $("#phMsg"); if (msg) msg.textContent = L.phUp(i + 1, files.length);
      const small = await shrinkPhoto(files[i]);
      const image = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(String(fr.result).split(",")[1] || ""); fr.onerror = () => r(""); fr.readAsDataURL(small); });
      const { status, data } = await api("", { action: "photo", code: batch.code, image }).catch(() => ({ status: 0, data: {} }));
      if (status === 201) { if (form && form.result && form.result.code === batch.code) form.result = data.batch; cache[batch.code] = data.batch; batch = data.batch; } else failed = true;
    }
    if (btn) { btn.disabled = false; btn.textContent = L.create; }
    if (failed && form) form.photoErr = true;
    return !failed;
  }

  async function loadRecent() {
    const L = t(), box = $("#recent");
    const { status, data } = await api("list=1").catch(() => ({ status: 0, data: {} }));
    if (!box) return;
    if (status !== 200) { box.innerHTML = `<p class="fine" style="padding:12px 0">${L.lkErr}</p>`; return; }
    const drafts = data.batches.filter(b => b.status === "draft"), done = data.batches.filter(b => b.status !== "draft");
    const row = (b, draft) => `<div class="rrow"><div><b>${esc(b.code)}</b>${draft ? ` <span class="tag">${L.stDraft}</span>` : ""}<br><small>${esc(b.model)} · ${b.qty} ${L.pcs} · ${dateStr(b.made)}${b.createdBy ? ` · ${L.by} ${esc(b.createdBy)}` : ""}</small></div>
      <div class="acts"><button type="button" class="linkish" data-dl="${esc(b.code)}">SVG</button>${draft
        ? `<a class="linkish" href="${BASE}/edit/${esc(b.code)}" data-go="edit/${esc(b.code)}">${L.fillIn}</a>`
        : `<a class="linkish" href="${BASE}/edit/${esc(b.code)}" data-go="edit/${esc(b.code)}">${L.edT}</a><a class="linkish" href="${BASE}/${esc(b.code)}" data-go="${esc(b.code)}">${L.view}</a>`}</div></div>`;
    const dbox = $("#drafts");
    if (dbox && drafts.length) { $("#toFinish").hidden = false; dbox.innerHTML = drafts.map(b => row(b, true)).join(""); }
    box.innerHTML = done.length ? done.map(b => row(b, false)).join("") : `<p class="fine" style="padding:12px 0">${L.none}</p>`;
    app.querySelectorAll("[data-dl]").forEach(b => b.addEventListener("click", () => downloadSvg(b.dataset.dl)));
  }

  // Fill in or correct a batch. Workshop staff: the wood details. Admin: everything.
  let edit = null;
  async function viewEdit(code, langOnly) {
    const L = t();
    document.title = L.edT + " · Another Life Passport";
    if (!langOnly || !edit || edit.b.code !== code) {
      app.innerHTML = `<section><p class="fine">${L.loading}</p></section>`;
      const me = (await api("me=1").catch(() => ({ data: {} }))).data;
      if (!me.staff) return go("login");
      who = me;
      const { status, data } = await api("staff=" + encodeURIComponent(code)).catch(() => ({ status: 0, data: {} }));
      if (status === 401) return go("login");
      if (status !== 200) { app.innerHTML = `<section><span class="k">${L.edT}</span><p class="msg bad">${status === 404 ? L.edNone : L.lkErr}</p><a class="btn ghost" href="${BASE}/factory" data-go="factory">${L.edBack}</a></section>`; return; }
      const ws = me.admin ? ((await api("users=1").catch(() => ({ data: {} }))).data.workshops || []) : [];
      await loadLots();
      const b = data.batch;
      edit = { b, ws, msg: "", f: { model: b.model, qty: String(b.qty), workshopId: b.workshopId || "", origin: (b.lots || []).length ? "" : b.origin, region: (b.lots || []).length ? "" : b.region, maker: b.maker, kg: b.kg == null ? "" : String(b.kg), lots: [...(b.lots || [])] } };
    }
    const { b, f, ws } = edit;
    const back = who.admin ? "admin" : "factory";
    app.innerHTML = `
      <section>
        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px"><span class="k">${L.edT}</span><a class="staff" href="${BASE}/${back}" data-go="${back}">${L.edBack}</a></div>
        <h1 class="code-h">${esc(b.code)}</h1>
        <p class="note ${b.status === "draft" ? "" : "ok"}">${b.status === "draft" ? L.edDraft : L.edDone}</p>
        <div class="label-out" style="margin-top:0"><div class="plate">${qrSvg(b.code, false)}<span class="serial">${esc(b.code)}</span></div>
          <img class="engrave-prev" src="${plateUrl(b.code, true)}" alt="${esc(b.code)}" width="150" height="55">
          <div class="two-btn"><button class="btn ghost" type="button" id="dl">${L.dl}</button><a class="btn ghost" href="${BASE}/${b.code}" data-go="${b.code}">${L.view}</a></div></div>
        <form class="form" id="eForm" novalidate>
          ${who.admin ? `<div class="q"><span>${L.q1}</span><div class="chips">${MODELS.map(m => `<button type="button" class="chip" data-m="${esc(m)}" aria-pressed="${m === f.model}">${esc(m)}</button>`).join("")}</div></div>
            ${ws.length ? `<div class="q"><span>${L.qWs}</span><div class="chips">${ws.map(w => `<button type="button" class="chip" data-w="${esc(w.id)}" aria-pressed="${w.id === f.workshopId}">${esc(w.name)}</button>`).join("")}</div></div>` : ""}
            <label class="q"><span>${L.qN}</span><input type="number" id="eQty" min="1" max="999" inputmode="numeric" value="${esc(f.qty)}"></label>`
          : `<div class="auto"><span>${esc(b.model)}</span><span>${b.qty} ${L.pcs}</span></div>`}
          ${woodPicker(f, f.workshopId)}
          ${f.lots.length ? `<p class="fine">${L.lotFromTag}</p><input type="hidden" id="eRegion" value="${esc(f.region)}">` : `<label class="q"><span>${L.q3}</span><input type="text" id="eRegion" maxlength="60" placeholder="${L.q3ph}" value="${esc(f.region)}"></label>`}
          <label class="q"><span>${L.q4}</span><input type="text" id="eMaker" maxlength="60" value="${esc(f.maker)}"></label>
          <label class="q"><span>${L.q5}</span><input type="number" id="eKg" min="0" step="0.1" inputmode="decimal" value="${esc(f.kg)}"></label>
          <button class="btn" type="submit" id="eBtn">${L.edSave}</button>
          <p class="msg ${edit.msg === L.edSaved ? "" : "bad"}" id="eMsg" role="status">${esc(edit.msg)}</p>
        </form>
      </section>
      <section>
        <span class="k">${L.edPh}</span>
        <small class="fine">${L.qPhHint}</small>
        <div class="before staff-ph" id="ePh">${(b.photos || []).map(id => `<figure><img src="${photoUrl(b.code, id)}" alt=""><button type="button" class="linkish" data-rm="${id}">${L.phRemove}</button></figure>`).join("")}</div>
        <p class="msg" id="phMsg" role="status"></p>
        ${(b.photos || []).length < 6 ? `<label class="photo-pick"><input type="file" id="eMore" accept="image/*" multiple><span>${L.phAdd}</span></label>` : `<p class="fine">${L.phFull}</p>`}
      </section>`;
    edit.msg = "";
    const sync = () => {
      f.region = $("#eRegion").value; f.maker = $("#eMaker").value; f.kg = $("#eKg").value;
      if ($("#eQty")) f.qty = $("#eQty").value;
    };
    const fresh = nb => { edit.b = nb; cache[nb.code] = nb; };
    $("#dl").addEventListener("click", () => downloadSvg(b.code));
    bindWood(f, f.workshopId, sync, () => viewEdit(code, true));
    app.querySelectorAll("[data-m]").forEach(x => x.addEventListener("click", () => { sync(); f.model = x.dataset.m; viewEdit(code, true); }));
    app.querySelectorAll("[data-w]").forEach(x => x.addEventListener("click", () => { sync(); f.workshopId = x.dataset.w; viewEdit(code, true); }));
    $("#eForm").addEventListener("submit", async e => {
      e.preventDefault(); sync();
      const btn = $("#eBtn"); btn.disabled = true; btn.textContent = L.edSaving;
      const body = { action: "update", code: b.code, origin: f.lots.length ? "" : f.origin, region: f.lots.length ? "" : f.region, maker: f.maker, kg: f.kg, lots: f.lots };
      if (who.admin) Object.assign(body, { model: f.model, qty: parseInt(f.qty, 10), workshopId: f.workshopId });
      const { status, data } = await api("", body).catch(() => ({ status: 0, data: {} }));
      if (status === 401) return go("login");
      if (status === 200) { fresh(data.batch); edit.msg = L.edSaved; } else edit.msg = L["err_" + String(data.error).replace(/-/g, "_")] || L.err_other;
      viewEdit(code, true);
    });
    const more = $("#eMore");
    if (more) more.addEventListener("change", async () => { sync(); await uploadPhotos(edit.b, [...more.files]); if (cache[b.code]) edit.b = { ...edit.b, photos: cache[b.code].photos }; viewEdit(code, true); });
    app.querySelectorAll("[data-rm]").forEach(x => x.addEventListener("click", async () => {
      x.disabled = true; sync();
      const { status, data } = await api("", { action: "photo-remove", code: b.code, id: x.dataset.rm }).catch(() => ({ status: 0, data: {} }));
      if (status === 200) fresh(data.batch);
      viewEdit(code, true);
    }));
  }

  // ---------- wood lots
  let lotState = { showUsed: false, form: null, edit: null };
  const today = () => new Date().toISOString().slice(0, 10);
  function lotFields(f, ws, isNew) {
    const L = t();
    return `${ws.length ? `<div class="q"><span>${L.qWs}</span><div class="chips">${ws.map(w => `<button type="button" class="chip" data-lw="${esc(w.id)}" aria-pressed="${w.id === f.workshopId}">${esc(w.name)}</button>`).join("")}</div></div>` : ""}
      <div class="q"><span>${L.lotSrc}</span><div class="chips">${["house", "bridge", "boat", "other"].map(o => `<button type="button" class="chip" data-lo="${o}" aria-pressed="${o === f.origin}">${ICONS[o]}${L["o_" + o]}</button>`).join("")}</div></div>
      <label class="q"><span>${L.lotPlace}</span><input type="text" id="lPlace" maxlength="80" placeholder="${L.lotPlacePh}" value="${esc(f.place)}"></label>
      <label class="q"><span>${L.lotRegion}</span><input type="text" id="lRegion" maxlength="60" placeholder="${L.lotRegionPh}" value="${esc(f.region)}"></label>
      ${isNew ? "" : `<label class="q"><span>${L.lotName}</span><input type="text" id="lName" maxlength="40" placeholder="${L.lotNamePh}" value="${esc(f.name)}"></label>`}
      <label class="q"><span>${L.lotArrived}</span><input type="date" id="lArrived" value="${esc(f.arrived)}"></label>
      <label class="q"><span>${L.lotVolume}</span><input type="text" id="lVolume" maxlength="30" value="${esc(f.volume)}"></label>
      <label class="q"><span>${L.lotSupplier}</span><input type="text" id="lSupplier" maxlength="80" value="${esc(f.supplier)}"></label>
      <div class="q"><span>${L.lotGps}</span><input type="text" id="lGps" maxlength="80" value="${esc(f.gps)}"><button type="button" class="btn ghost" id="lGpsBtn" style="margin-top:8px">${L.lotGpsBtn}</button></div>
      <label class="q"><span>${L.lotNotes}</span><textarea id="lNotes" rows="3" maxlength="1000">${esc(f.notes)}</textarea></label>`;
  }
  function bindLotFields(f, rerender) {
    const sync = () => { ["place", "region", "arrived", "volume", "supplier", "gps", "notes", "name"].forEach(k => { const el = $("#l" + k[0].toUpperCase() + k.slice(1)); if (el) f[k] = el.value; }); };
    app.querySelectorAll("[data-lo]").forEach(b => b.addEventListener("click", () => { sync(); f.origin = b.dataset.lo; rerender(); }));
    app.querySelectorAll("[data-lw]").forEach(b => b.addEventListener("click", () => { sync(); f.workshopId = b.dataset.lw; rerender(); }));
    $("#lGpsBtn").addEventListener("click", () => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(p => { $("#lGps").value = `${p.coords.latitude.toFixed(5)},${p.coords.longitude.toFixed(5)}`; }, () => {}, { enableHighAccuracy: true, timeout: 15000 });
    });
    return sync;
  }
  const lotBody = f => ({ origin: f.origin, place: f.place, region: f.region, arrived: f.arrived, volume: f.volume, supplier: f.supplier, gps: f.gps, notes: f.notes });

  async function viewLots(langOnly) {
    const L = t();
    document.title = L.lotsT + " · Another Life Passport";
    if (!langOnly || !lotState.form) {
      app.innerHTML = `<section><p class="fine">${L.loading}</p></section>`;
      const me = (await api("me=1").catch(() => ({ data: {} }))).data;
      if (!me.staff) return go("login");
      who = me;
      if (who.admin) who.workshops = ((await api("users=1").catch(() => ({ data: {} }))).data.workshops) || [];
      await loadLots();
      lotState.form = lotState.form || { origin: "", place: "", region: "", arrived: today(), volume: "", supplier: "", gps: "", notes: "", workshopId: "", files: [] };
    }
    const f = lotState.form, ws = who.admin ? who.workshops || [] : [];
    if (ws.length === 1 && !f.workshopId) f.workshopId = ws[0].id;
    const lots = who.lots || [], open = lots.filter(l => l.status !== "used"), used = lots.filter(l => l.status === "used");
    const row = l => `<div class="rrow lotrow"><a class="lotnum" href="${BASE}/lot/${l.n}" data-go="lot/${l.n}">${lotNo(l.n)}</a><div><b>${esc(l.name)}</b><br><small>${esc(L["o_" + l.origin] || "")}${l.arrived ? ` · ${dateStr(l.arrived)}` : ""}${l.workshop && who.admin ? ` · ${esc(l.workshop)}` : ""} · ${L.lotIn(l.usedBy.length)}</small></div>
      <div class="acts"><a class="linkish" href="${BASE}/lot/${l.n}/tag" data-go="lot/${l.n}/tag">${L.lotPrint}</a><a class="linkish" href="${BASE}/lot/${l.n}" data-go="lot/${l.n}">${L.lotEdit}</a></div></div>`;
    app.innerHTML = `
      <section>
        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px"><span class="k">${PUBLIC_HOST.toLowerCase()}</span><span style="display:flex;gap:14px"><a class="staff" href="${BASE}/factory" data-go="factory">${L.newBatch}</a>${who.admin ? `<a class="staff" href="${BASE}/admin" data-go="admin">${L.ovT}</a>` : ""}</span></div>
        <h1>${L.lotsT}</h1>
        <p class="lead">${L.lotsP}</p>
        <div class="recent">${open.length ? open.map(row).join("") : `<p class="fine" style="padding:12px 0">${L.lotNone}</p>`}</div>
        ${used.length ? (lotState.showUsed ? `<div class="recent used">${used.map(row).join("")}</div>` : `<button type="button" class="linkish" id="showUsed" style="margin-top:12px">${L.lotShowUsed(used.length)}</button>`) : ""}
      </section>
      <section>
        <span class="k">${L.lotNew}</span>
        <p class="fine">${L.lotNewP}</p>
        <form class="form" id="lForm" novalidate>
          ${lotFields(f, ws, true)}
          <div class="q"><span>${L.lotPhotos}</span><label class="photo-pick"><input type="file" id="lPhotos" accept="image/*" multiple><span>${f.files.length ? L.phSel(f.files.length) : L.phPick}</span></label></div>
          <button class="btn" type="submit" id="lBtn">${L.lotCreate}</button>
          <p class="msg bad" id="lMsg" role="status"></p>
        </form>
      </section>`;
    const su = $("#showUsed"); if (su) su.addEventListener("click", () => { lotState.showUsed = true; viewLots(true); });
    const sync = bindLotFields(f, () => viewLots(true));
    $("#lPhotos").addEventListener("change", e => { sync(); f.files = [...f.files, ...e.target.files].slice(0, 12); viewLots(true); });
    $("#lForm").addEventListener("submit", async e => {
      e.preventDefault(); sync();
      if (!f.origin) return ($("#lMsg").textContent = L.err_origin_lot);
      if (ws.length && !f.workshopId) return ($("#lMsg").textContent = L.qWs);
      const btn = $("#lBtn"); btn.disabled = true; btn.textContent = L.creating;
      const { status, data } = await api("", { action: "add-lot", ...lotBody(f), workshopId: f.workshopId }).catch(() => ({ status: 0, data: {} }));
      if (status !== 201) { btn.disabled = false; btn.textContent = L.lotCreate; $("#lMsg").textContent = status === 401 ? L.err_auth : L.err_other; return; }
      const n = data.lot.n;
      for (let i = 0; i < f.files.length; i++) {
        btn.textContent = L.phUp(i + 1, f.files.length);
        const image = await toB64(await shrinkPhoto(f.files[i]));
        await api("", { action: "lot-photo", n, image }).catch(() => {});
      }
      lotState.form = null;
      go(`lot/${n}/tag`);
    });
  }

  const toB64 = file => new Promise(r => { const fr = new FileReader(); fr.onload = () => r(String(fr.result).split(",")[1] || ""); fr.onerror = () => r(""); fr.readAsDataURL(file); });

  async function viewLot(n, langOnly) {
    const L = t();
    document.title = `LOT ${lotNo(n)} · Another Life Passport`;
    if (!langOnly || !lotState.edit || lotState.edit.lot.n !== n) {
      app.innerHTML = `<section><p class="fine">${L.loading}</p></section>`;
      const me = (await api("me=1").catch(() => ({ data: {} }))).data;
      if (!me.staff) return go("login");
      who = me;
      const { status, data } = await api("lot=" + n).catch(() => ({ status: 0, data: {} }));
      if (status !== 200) { app.innerHTML = `<section><span class="k">${L.lotsT}</span><p class="msg bad">${status === 404 ? L.lotNotFound : L.lkErr}</p><a class="btn ghost" href="${BASE}/lots" data-go="lots">${L.lotsT}</a></section>`; return; }
      const ws = me.admin ? ((await api("users=1").catch(() => ({ data: {} }))).data.workshops || []) : [];
      const l = data.lot;
      lotState.edit = { lot: l, batches: data.batches, ws, msg: "", mmsg: "", m: matForm(l.material), f: { origin: l.origin, place: l.place, region: l.region, arrived: l.arrived, volume: l.volume, supplier: l.supplier, gps: l.gps, notes: l.notes, name: l.name, workshopId: l.workshopId || "" } };
    }
    const E = lotState.edit, l = E.lot, f = E.f;
    app.innerHTML = `
      <section>
        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px"><span class="k">${L.lotsT}</span><a class="staff" href="${BASE}/lots" data-go="lots">${L.edBack}</a></div>
        <div class="lot-head"><span class="lotnum big">${lotNo(l.n)}</span><div><h1 style="margin:0">${esc(l.name)}</h1><span class="tag ${l.status === "used" ? "" : "ok"}">${l.status === "used" ? L.lotUsed : L.lotOpen}</span></div></div>
        <div class="two-btn" style="margin-top:18px"><a class="btn" href="${BASE}/lot/${l.n}/tag" data-go="lot/${l.n}/tag">${L.lotPrint}</a><button class="btn ghost" type="button" id="lStatus">${l.status === "used" ? L.lotMarkOpen : L.lotMarkUsed}</button></div>
        <form class="form" id="lForm" novalidate style="margin-top:24px">
          ${lotFields(f, E.ws, false)}
          <label class="check"><input type="checkbox" id="lPub" ${l.publicPhotos ? "checked" : ""}><span>${L.lotPubPh}</span></label>
          <button class="btn" type="submit" id="lBtn">${L.edSave}</button>
          <p class="msg ${E.msg === L.lotSaved ? "" : "bad"}" id="lMsg" role="status">${esc(E.msg)}</p>
        </form>
      </section>
      ${matSection(E)}
      ${docsSection(E)}
      <section>
        <span class="k">${L.lotPhotos}</span>
        <div class="before staff-ph">${l.photos.map(id => `<figure><img src="${lotPhotoUrl(l.n, id)}" alt=""><button type="button" class="linkish" data-rm="${id}">${L.phRemove}</button></figure>`).join("")}</div>
        <p class="msg" id="phMsg" role="status"></p>
        ${l.photos.length < 12 ? `<label class="photo-pick"><input type="file" id="lMore" accept="image/*" multiple><span>${L.phAdd}</span></label>` : ""}
      </section>
      <section>
        <span class="k">${L.lotBatches}</span>
        <div class="recent">${E.batches.length ? E.batches.map(b => `<div class="rrow"><div><b>${esc(b.code)}</b><br><small>${esc(b.model)} · ${b.qty} ${L.pcs} · ${dateStr(b.made)}</small></div><div class="acts"><a class="linkish" href="${BASE}/edit/${esc(b.code)}" data-go="edit/${esc(b.code)}">${L.edT}</a></div></div>`).join("") : `<p class="fine" style="padding:12px 0">${L.lotNoB}</p>`}</div>
      </section>`;
    E.msg = ""; E.mmsg = "";
    bindMaterial(E, n);
    const sync = bindLotFields(f, () => viewLot(n, true));
    const save = async extra => {
      sync();
      const body = { action: "update-lot", n: l.n, ...lotBody(f), name: f.name, publicPhotos: $("#lPub").checked, ...extra };
      if (who.admin) body.workshopId = f.workshopId;
      const { status, data } = await api("", body).catch(() => ({ status: 0, data: {} }));
      if (status === 200) { E.lot = { ...data.lot, usedBy: l.usedBy }; E.f.name = data.lot.name; E.msg = L.lotSaved; } else E.msg = L.err_other;
      viewLot(n, true);
    };
    $("#lForm").addEventListener("submit", e => { e.preventDefault(); save({}); });
    $("#lStatus").addEventListener("click", () => save({ status: l.status === "used" ? "open" : "used" }));
    const more = $("#lMore");
    if (more) more.addEventListener("change", async () => {
      sync(); const files = [...more.files].slice(0, 12 - l.photos.length);
      for (let i = 0; i < files.length; i++) {
        $("#phMsg").textContent = L.phUp(i + 1, files.length);
        const { status, data } = await api("", { action: "lot-photo", n: l.n, image: await toB64(await shrinkPhoto(files[i])) }).catch(() => ({ status: 0, data: {} }));
        if (status === 201) E.lot = { ...data.lot, usedBy: l.usedBy };
      }
      viewLot(n, true);
    });
    app.querySelectorAll("[data-rm]").forEach(x => x.addEventListener("click", async () => {
      x.disabled = true; sync();
      const { status, data } = await api("", { action: "lot-photo-remove", n: l.n, id: x.dataset.rm }).catch(() => ({ status: 0, data: {} }));
      if (status === 200) E.lot = { ...data.lot, usedBy: l.usedBy };
      viewLot(n, true);
    }));
  }

  // ---------- material record: internal details, piece schedule, sources, documents
  const MAT_FIELDS = [["described", "mDescribed"], ["species", "mSpecies"], ["previousUse", "mPrevUse"], ["recoveryArea", "mArea"], ["supplyRoute", "mRoute"], ["purchase", "mPurchase"], ["dimensions", "mDims"]];
  const fmtVol = v => (Math.round(v * 1e5) / 1e5).toFixed(5);
  const pieceVol = p => p.t * p.w * p.l / 1e9;
  const piecesText = ps => (ps || []).map(p => [p.ref, p.t, p.w, p.l].join("\t")).join("\n");
  function parsePieces(text) {
    const pieces = []; let bad = 0;
    String(text || "").split(/\r?\n/).forEach((line, i) => {
      if (!line.trim()) return;
      const nums = line.split(/[\t;, ]+/).map(x => x.trim()).filter(Boolean);
      const vals = nums.filter(x => /^\d+(\.\d+)?$/.test(x)).map(Number);
      if (vals.length >= 4) pieces.push({ ref: String(vals[0]), t: vals[1], w: vals[2], l: vals[3] });
      else if (vals.length === 3) pieces.push({ ref: String(pieces.length + 1), t: vals[0], w: vals[1], l: vals[2] });
      else if (/\d/.test(line) && !/[a-z]{3,}/i.test(line)) bad++; // headings and totals are skipped quietly
    });
    return { pieces, bad };
  }
  function matForm(m) {
    m = m || {};
    const f = {}; MAT_FIELDS.forEach(([k]) => { f[k] = m[k] || ""; });
    Object.assign(f, { limits: m.limits || "", extTitle: m.extTitle || "", extUrl: m.extUrl || "", extVersion: m.extVersion || "", extIssued: m.extIssued || "",
      sources: (m.sources || []).map(x => [x.title, x.date, x.supports].filter((v, i) => v || i < 2).join(" | ")).join("\n"),
      pieces: piecesText(m.pieces) });
    return f;
  }
  function matSection(E) {
    const L = t(), f = E.m, ps = parsePieces(f.pieces).pieces, total = ps.reduce((a, p) => a + pieceVol(p), 0);
    return `<section class="matrec">
        <span class="k">${L.matK}</span>
        <p class="fine">${L.matP}</p>
        <form class="form" id="mForm" novalidate>
          ${MAT_FIELDS.map(([k, lab]) => `<label class="q"><span>${L[lab]}</span><input type="text" data-mf="${k}" maxlength="300" value="${esc(f[k])}"></label>`).join("")}
          <label class="q"><span>${L.mLimits}</span><textarea data-mf="limits" rows="4" maxlength="4000">${esc(f.limits)}</textarea></label>
          <div class="mgrid">
            <label class="q"><span>${L.mExtT}</span><input type="text" data-mf="extTitle" maxlength="200" value="${esc(f.extTitle)}"></label>
            <label class="q"><span>${L.mExtU}</span><input type="text" data-mf="extUrl" maxlength="400" value="${esc(f.extUrl)}"></label>
            <label class="q"><span>${L.mExtV}</span><input type="text" data-mf="extVersion" maxlength="40" value="${esc(f.extVersion)}"></label>
            <label class="q"><span>${L.mExtD}</span><input type="date" data-mf="extIssued" value="${esc(f.extIssued)}"></label>
          </div>
          <label class="q"><span>${L.mSources}</span><textarea data-mf="sources" rows="4" class="mono">${esc(f.sources)}</textarea></label>
          <div class="q"><span>${L.mPieces}</span>
            <p class="msum">${ps.length ? L.mPiecesSum(ps.length, fmtVol(total)) : L.mPiecesNone}</p>
            ${ps.length ? `<details><summary>${L.mShow}</summary><div class="ab-wrap"><table class="ptable"><thead><tr>${L.mCols.map(c => `<th>${c}</th>`).join("")}</tr></thead><tbody>${ps.map(p => `<tr><td>${esc(p.ref)}</td><td>${p.t}</td><td>${p.w}</td><td>${p.l}</td><td>${fmtVol(pieceVol(p))}</td></tr>`).join("")}<tr class="tot"><td>Total</td><td></td><td></td><td></td><td>${fmtVol(total)}</td></tr></tbody></table></div></details>` : ""}
            <small class="fine">${L.mPaste}</small>
            <textarea data-mf="pieces" rows="6" class="mono" spellcheck="false">${esc(f.pieces)}</textarea></div>
          <button class="btn" type="submit" id="mBtn">${L.mSave}</button>
          <p class="msg ${E.mmsg && E.mmsg.ok ? "" : "bad"}" id="mMsg" role="status">${esc(E.mmsg ? E.mmsg.text : "")}</p>
        </form>
      </section>`;
  }
  function docsSection(E) {
    const L = t(), l = E.lot, docs = l.docs || [];
    const kb = b => b > 1e6 ? (b / 1e6).toFixed(1) + " MB" : Math.max(1, Math.round(b / 1e3)) + " kB";
    return `<section>
        <span class="k">${L.docsK}</span>
        <p class="fine">${L.docsP}</p>
        <div class="recent">${docs.length ? docs.map(d => `<div class="rrow"><div><b class="docname">${esc(d.name)}</b><br><small>${kb(d.size)} · ${dateStr(d.added)}${d.addedBy ? ` · ${esc(d.addedBy)}` : ""}${d.note ? ` · ${esc(d.note)}` : ""}</small></div>
          <div class="acts"><a class="linkish" target="_blank" rel="noopener" href="${API}?ldoc=${l.n}/${d.id}">${L.docOpen}</a><a class="linkish" href="${API}?ldoc=${l.n}/${d.id}&download=1">${L.docDl}</a><button type="button" class="linkish" data-drm="${d.id}">${L.phRemove}</button></div></div>`).join("") : `<p class="fine" style="padding:12px 0">${L.docsNone}</p>`}</div>
        <label class="q" style="margin-top:12px"><span>${L.docNote}</span><input type="text" id="docNote" maxlength="300"></label>
        <label class="photo-pick" style="margin-top:10px"><input type="file" id="docIn" accept="application/pdf,image/*" multiple><span>${L.docAdd}</span></label>
        <p class="msg" id="docMsg" role="status"></p>
      </section>`;
  }
  function bindMaterial(E, n) {
    const L = t();
    const sync = () => app.querySelectorAll("[data-mf]").forEach(el => { E.m[el.dataset.mf] = el.value; });
    $("#mForm").addEventListener("submit", async e => {
      e.preventDefault(); sync();
      const f = E.m, { pieces, bad } = parsePieces(f.pieces);
      const sources = String(f.sources || "").split(/\r?\n/).map(x => x.split("|").map(y => y.trim())).filter(x => x[0]).map(([title, date, ...rest]) => ({ title, date: date || "", supports: rest.join(" | ") }));
      const material = { limits: f.limits, extTitle: f.extTitle, extUrl: f.extUrl, extVersion: f.extVersion, extIssued: f.extIssued, sources, pieces };
      MAT_FIELDS.forEach(([k]) => { material[k] = f[k]; });
      const btn = $("#mBtn"); btn.disabled = true; btn.textContent = L.edSaving;
      const { status, data } = await api("", { action: "update-lot", n: E.lot.n, material }).catch(() => ({ status: 0, data: {} }));
      if (status === 200) { E.lot = { ...data.lot, usedBy: E.lot.usedBy }; E.m = matForm(data.lot.material); E.mmsg = { ok: true, text: L.mSaved + (bad ? " " + L.mBadLines(bad) : "") }; }
      else E.mmsg = { ok: false, text: data.error === "url" ? L.mExtU + "?" : L.err_other };
      viewLot(n, true);
    });
    const inp = $("#docIn");
    inp.addEventListener("change", async () => {
      sync();
      const files = [...inp.files], msg = $("#docMsg"), note = $("#docNote").value;
      for (let i = 0; i < files.length; i++) {
        let file = files[i];
        msg.className = "msg"; msg.textContent = L.docUp(i + 1, files.length);
        if (!/^(application\/pdf|image\/)/.test(file.type)) { msg.className = "msg bad"; msg.textContent = L.docBadType; continue; }
        if (file.size > 4e6 && /^image\//.test(file.type)) file = await shrinkPhoto(file);
        if (file.size > 4e6) { msg.className = "msg bad"; msg.textContent = L.docBig; continue; }
        const { status, data } = await api("", { action: "lot-doc", n: E.lot.n, name: files[i].name, note, data: await toB64(file) }).catch(() => ({ status: 0, data: {} }));
        if (status === 201) E.lot = { ...data.lot, usedBy: E.lot.usedBy };
        else { msg.className = "msg bad"; msg.textContent = L.err_other; return; }
      }
      viewLot(n, true);
    });
    app.querySelectorAll("[data-drm]").forEach(x => x.addEventListener("click", async () => {
      x.disabled = true; sync();
      const { status, data } = await api("", { action: "lot-doc-remove", n: E.lot.n, id: x.dataset.drm }).catch(() => ({ status: 0, data: {} }));
      if (status === 200) E.lot = { ...data.lot, usedBy: E.lot.usedBy };
      viewLot(n, true);
    }));
  }

  // A4 tag for the wood stack: the number is what matters, readable from a distance and without a phone.
  async function viewTag(n) {
    const L = t();
    app.innerHTML = `<section><p class="fine">${L.loading}</p></section>`;
    const { status, data } = await api("lot=" + n).catch(() => ({ status: 0, data: {} }));
    if (status === 401) return go("login");
    if (status !== 200) { app.innerHTML = `<section><p class="msg bad">${L.lotNotFound}</p></section>`; return; }
    const l = data.lot;
    document.title = `LOT ${lotNo(l.n)} · ${l.name}`;
    const q = qrcode(0, "M"); q.addData(`HTTPS://${PUBLIC_HOST}/LOT/${l.n}`, "Alphanumeric"); q.make();
    const mc = q.getModuleCount(); let d = ""; for (let r = 0; r < mc; r++) for (let c = 0; c < mc; c++) if (q.isDark(r, c)) d += `M${c + 2} ${r + 2}h1v1h-1z`;
    const qr = `<svg viewBox="0 0 ${mc + 4} ${mc + 4}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
    const src = { house: ["Rumah tua", "Old house"], bridge: ["Jembatan", "Bridge"], boat: ["Perahu", "Boat"], other: ["Lainnya", "Other"] }[l.origin] || ["", ""];
    app.innerHTML = `
      <section class="noprint">
        <span class="k">${L.lotsT}</span>
        <p class="lead">${L.tagTitle}</p>
        <div class="two-btn"><button class="btn" type="button" id="doPrint">${L.tagPrint}</button><a class="btn ghost" href="${BASE}/lot/${l.n}" data-go="lot/${l.n}">${L.tagBack}</a></div>
      </section>
      <div class="woodtag">
        <div class="wt-top"><span>ANOTHER — LIFE</span><span>LOT KAYU · WOOD LOT</span></div>
        <div class="wt-lot">LOT</div>
        <div class="wt-num">${lotNo(l.n)}</div>
        <div class="wt-name">${esc(l.name)}</div>
        <div class="wt-rows">
          <div><span>Asal · Source</span><b>${esc(src[0])} · ${esc(src[1])}</b></div>
          <div><span>Tempat · Place</span><b>${esc([l.place, l.region].filter(Boolean).join(", ") || "–")}</b></div>
          <div><span>Tiba · Arrived</span><b>${l.arrived ? esc(l.arrived.split("-").reverse().join(".")) : "–"}</b></div>
          ${l.workshop ? `<div><span>Bengkel · Workshop</span><b>${esc(l.workshop)}</b></div>` : ""}
        </div>
        <div class="wt-foot">
          <p><b>Saat membuat furnitur dari kayu ini, sebutkan: LOT ${lotNo(l.n)}</b><br>When you make furniture from this wood, say: LOT ${lotNo(l.n)}</p>
          <div class="wt-qr">${qr}</div>
        </div>
      </div>`;
    $("#doPrint").addEventListener("click", () => window.print());
  }

  // ---------- download everything: a ZIP made in the browser (spreadsheets, full data, photos)
  function crc32(buf) {
    const tb = crc32.t || (crc32.t = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; }));
    let c = -1; for (let i = 0; i < buf.length; i++) c = tb[(c ^ buf[i]) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0;
  }
  function makeZip(files) {
    const te = new TextEncoder(), chunks = [], central = []; let off = 0;
    for (const f of files) {
      const name = te.encode(f.name), data = f.data, crc = crc32(data);
      const h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
      h.setUint16(10, 0, true); h.setUint16(12, 0x21, true); h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true);
      h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
      chunks.push(new Uint8Array(h.buffer), name, data);
      const c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
      c.setUint16(12, 0, true); c.setUint16(14, 0x21, true); c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true);
      c.setUint16(28, name.length, true); c.setUint32(42, off, true);
      central.push(new Uint8Array(c.buffer), name);
      off += 30 + name.length + data.length;
    }
    const csize = central.reduce((n, a) => n + a.length, 0);
    const e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, csize, true); e.setUint32(16, off, true);
    return new Blob([...chunks, ...central, new Uint8Array(e.buffer)], { type: "application/zip" });
  }
  const csv = rows => "﻿" + rows.map(r => r.map(v => { const x = v == null ? "" : String(v); return /[",\n;]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x; }).join(",")).join("\r\n");
  async function downloadEverything() {
    const L = t(), msg = $("#dlMsg"), btn = $("#dlAll");
    btn.disabled = true; msg.textContent = L.loading;
    const { status, data } = await api("export=1").catch(() => ({ status: 0, data: {} }));
    if (status !== 200) { msg.textContent = L.lkErr; btn.disabled = false; return; }
    const te = new TextEncoder(), files = [];
    const site = `https://${PUBLIC_HOST.toLowerCase()}`;
    files.push({ name: "data.json", data: te.encode(JSON.stringify(data, null, 1)) });
    files.push({ name: "batches.csv", data: te.encode(csv([["Code", "Status", "Product", "Pieces", "Wood lots", "Wood source", "Area", "Maker", "Weight kg", "Workshop", "Created", "Created by", "Completed", "Updated", "Updated by", "Photos", "Passport"],
      ...data.batches.map(b => [b.code, b.status, b.model, b.qty, (b.lotInfo || []).map(l => l.label).join(" "), b.origin, b.region, b.maker, b.kg, b.workshop, b.made, b.createdBy, b.completed, b.updated, b.updatedBy, (b.photos || []).length, `${site}/${b.code}`])])) });
    files.push({ name: "wood-lots.csv", data: te.encode(csv([["Lot", "Name", "Status", "Source", "Place", "Region", "Supplier", "Arrived", "Volume", "Source location", "Workshop", "Used in batches", "Notes", "Created", "Created by", "Photos"],
      ...data.lots.map(l => [l.label, l.name, l.status, l.origin, l.place, l.region, l.supplier, l.arrived, l.volume, l.gps, l.workshop, (l.usedBy || []).join(" "), l.notes, l.created, l.createdBy, (l.photos || []).length])])) });
    files.push({ name: "wood-lot-pieces.csv", data: te.encode(csv([["Lot", "Piece", "Thickness mm", "Width mm", "Length mm", "Volume m3"],
      ...data.lots.flatMap(l => ((l.material || {}).pieces || []).map(p => [l.label, p.ref, p.t, p.w, p.l, fmtVol(pieceVol(p))]))])) });
    const photos = [...data.lots.flatMap(l => (l.docs || []).map(d => ({ url: `${API}?ldoc=${l.n}/${d.id}`, name: `documents/LOT-${lotNo(l.n)}/${d.id}-${d.name}` }))),
      ...data.batches.flatMap(b => (b.photos || []).map(id => ({ url: photoUrl(b.code, id), name: `photos/batches/${b.code}/${id}.jpg` }))),
      ...data.lots.flatMap(l => (l.photos || []).map(id => ({ url: lotPhotoUrl(l.n, id), name: `photos/wood-lots/LOT-${lotNo(l.n)}/${id}.jpg` })))];
    for (let i = 0; i < photos.length; i++) {
      msg.textContent = L.dlBusy(i + 1, photos.length);
      try { const r = await fetch(photos[i].url, { credentials: "same-origin" }); if (r.ok) files.push({ name: photos[i].name, data: new Uint8Array(await r.arrayBuffer()) }); } catch (e) {}
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(makeZip(files)); a.download = `another-life-passport-${data.exported.slice(0, 10)}.zip`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    msg.textContent = L.dlDone; btn.disabled = false;
  }

  async function viewPassport(code) {
    const L = t();
    let b = code === "TEST" ? TEST_BATCH : cache[code];
    if (!b) {
      const p = parseCode(code);
      if (p.error) return notFound(p.error === "check" ? L.lkBad : L.lkFmt);
      app.innerHTML = `<section><p class="fine">${L.loading}</p></section>`;
      const { status, data } = await api("code=" + encodeURIComponent(p.code)).catch(() => ({ status: 0, data: {} }));
      if (status !== 200) return notFound(status === 404 ? L.lkNone : L.lkErr);
      b = cache[code] = data.batch;
    }
    if (code === "TEST") { $("#banner").textContent = L.testBanner; $("#banner").hidden = false; }
    document.title = `${b.model} · ${b.code} · Another Life Passport`;
    const by = (b.maker || "").trim(), reg = (b.region || "").trim();
    const draft = b.status === "draft" || !b.origin;
    const lives = draft ? [
      ["tree", L.l1h, L.s1, ""],
      ["house", L.dS2h, L.dS2, ""],
      ["work", L.l3h, L.dS3, ""],
      ["now", L.l4h, L.s4, "now"]
    ] : [
      ["tree", L.l1h, L.s1, ""],
      [b.origin, L.l2h[b.origin], L.s2[b.origin] + (reg ? ` · ${reg}` : ""), ""],
      ["work", L.l3h, L.s3(by, dateStr(b.made)), ""],
      ["now", L.l4h, L.s4, "now"]
    ];
    const photos = (b.photos || []).slice(0, 6);
    const total = LEGS.reduce((a, c) => a + c, 0);
    const hasKg = !draft && b.kg != null && b.kg > 0;
    let rings = ""; for (let i = 1; i <= 20; i++) { const r = 6 + i * 6.6 + (i % 3) * 1.2; rings += `<circle cx="150" cy="150" r="${r.toFixed(1)}" style="animation-delay:${(i * .05).toFixed(2)}s;opacity:${(1 - i * .028).toFixed(2)}"></circle>`; }
    app.innerHTML = `
      <section>
        <span class="k">${L.passport} · ${esc(b.code)}</span>
        <svg class="rings" viewBox="0 0 300 300" aria-hidden="true">${rings}<circle class="core" cx="150" cy="150" r="5"></circle></svg>
        <span class="k">${L.look} ${esc(b.model)}</span>
        <h1>${L.h1}</h1>
        <p class="lead">${esc(draft ? L.dLead(b.model) : L.lead(b.model, L.oPhrase[b.origin]))}</p>
      </section>
      <section>
        <span class="k">${L.livesK}</span>
        <p class="h2">${esc(L.started(b.model))}</p>
        <div>${lives.map((l, i) => `<div class="life ${l[3]}" style="animation-delay:${.15 + i * .2}s">${ICONS[l[0]] || ICONS.other}<div><h3>${esc(l[1])}</h3><p>${esc(l[2])}</p></div></div>`).join("")}</div>
      </section>
      ${photos.length ? `<section>
        <span class="k">${esc(L.beforeK(b.model))}</span>
        <div class="before">${photos.map(id => `<a href="${photoUrl(b.code, id)}" target="_blank" rel="noopener"><img src="${photoUrl(b.code, id)}" alt="${esc(L.beforeK(b.model))}" loading="lazy"></a>`).join("")}</div>
      </section>` : ""}
      <section>
        <span class="k">${L.journeyK}</span>
        <p class="h2">${L.journeyT}</p>
        <svg class="map" viewBox="0 0 400 190" role="img" aria-label="${L.journeyT}">
          <path class="land" d="M28 84c22-8 48-6 70-2 26 4 48 2 74 4 28 2 54 6 80 10 20 3 38 6 52 14 6 4 4 12-2 16-16 8-40 6-62 4-30-2-58-6-88-8-28-2-56-2-82-6-18-3-36-6-46-14-6-6-4-14 4-18z"/>
          <path class="land" d="M232 84c14-4 32-4 44 0 4 2 2 6-2 8-12 3-30 3-42 0-4-2-4-6 0-8z"/>
          <path class="land" d="M326 108c8-4 20-4 28 0 8 4 10 12 4 18-6 5-16 6-24 4-8-2-12-8-12-14 0-3 2-6 4-8z"/>
          <text x="58" y="70">JAKARTA</text><text x="150" y="150">JAVA</text><text x="338" y="146">BALI</text><text class="sea" x="296" y="170">BALI STRAIT</text>
          <path class="road" d="M66 88 C 110 96, 160 100, 210 106 S 290 116, 314 118"/>
          <path class="ferry" d="M314 118 L 328 116"/>
          <path class="road" d="M328 116 C 334 120, 340 124, 346 124"/>
          <path id="pAll" fill="none" stroke="none" d="M66 88 C 110 96, 160 100, 210 106 S 290 116, 314 118 L 328 116 C 334 120, 340 124, 346 124"/>
          <circle class="pin" cx="66" cy="88" r="5.5"/><circle class="pin2" cx="346" cy="124" r="5.5"/>
          <g class="truck"><rect x="-7" y="-4" width="9" height="6" rx="1"/><rect x="2" y="-2.5" width="4.5" height="4.5" rx="1"/><animateMotion dur="7s" repeatCount="indefinite" rotate="auto"><mpath href="#pAll"/></animateMotion></g>
        </svg>
      </section>
      <section>
        <span class="k">${L.calcK}</span>
        <div class="stats">
          <div class="stat"><span class="k">${L.distK}</span><b>≈ ${fmt(Math.round(total / 50) * 50, 0)}</b><small>${L.distU}</small></div>
          <div class="stat">${hasKg
            ? `<span class="k">${L.co2K}</span><b>≈ ${fmt(total * TRUCK_PER_TKM * b.kg / 1000, 1)}</b><small>${L.co2U}</small>`
            : `<span class="k">${L.madeK}</span><b>${L.madeV}</b><small>${L.madeU}</small>`}</div>
        </div>
        <div class="legs">${L.legs.map((l, i) => `<div class="leg"><span class="n">${i + 1}</span><span><strong>${l[0]}</strong> · ${l[1]}</span><span class="n">≈ ${fmt(LEGS[i], 0)} km</span></div>`).join("")}</div>
        <p class="fine">${hasKg ? L.noteYes : L.noteNo}</p>
      </section>
      <section>
        <span class="k">${L.flatK}</span>
        <p class="h2">${L.flatT}</p>
        <div class="toggle" role="group" aria-label="${L.flatK}"><button type="button" id="tFlat" aria-pressed="true">${L.flat}</button><button type="button" id="tAsm" aria-pressed="false">${L.asm}</button></div>
        <div class="box flat" id="box" aria-hidden="true">${"<i></i>".repeat(300)}</div>
        <p class="fine">${L.flatNote}</p>
      </section>
      <section class="you">
        <span class="k">${L.youK}</span>
        <p class="h2">${L.youT}</p>
        <ul class="checks">
          ${[L.c1, L.c2, L.c3].map((c, i) => `<li><svg viewBox="0 0 22 22" aria-hidden="true"><path d="M4 11.5l4.5 4.5L18 6.5" style="animation-delay:${.2 + i * .3}s"/></svg><span>${c}</span></li>`).join("")}
        </ul>
        <a class="btn" href="${BASE}/${b.code === "TEST" ? "test" : b.code}/repair" data-go="${b.code === "TEST" ? "test" : b.code}/repair">${L.repair}</a>
        <a class="btn ghost" href="${productUrl(b.model)}">${esc(L.seeOn(b.model))}</a>
        <a class="btn ghost" href="${BASE}/" data-go="">${L.another}</a>
      </section>
      <section class="foot"><a class="staff" href="${SITE}">${L.site}</a></section>`;
    const setPack = p => {
      $("#box").className = "box " + p; $("#box").innerHTML = "<i></i>".repeat(p === "flat" ? 300 : 30);
      $("#tFlat").setAttribute("aria-pressed", String(p === "flat")); $("#tAsm").setAttribute("aria-pressed", String(p === "asm"));
    };
    $("#tFlat").addEventListener("click", () => setPack("flat"));
    $("#tAsm").addEventListener("click", () => setPack("asm"));
  }

  // Shrink photos on the phone before upload: max 1600 px, JPEG, well under the 8 MB form limit.
  function shrinkPhoto(file) {
    return new Promise(resolve => {
      if (!file || !/^image\//.test(file.type)) return resolve(file);
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => {
        const k = Math.min(1, 1600 / Math.max(img.width, img.height));
        const c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(b => resolve(b ? new File([b], "photo.jpg", { type: "image/jpeg" }) : file), "image/jpeg", 0.82);
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  }

  async function viewRepair(code) {
    const L = t();
    let b = code === "TEST" ? TEST_BATCH : cache[code];
    if (!b) {
      const p = parseCode(code);
      if (p.error) return notFound(p.error === "check" ? L.lkBad : L.lkFmt);
      const { status, data } = await api("code=" + encodeURIComponent(p.code)).catch(() => ({ status: 0, data: {} }));
      if (status !== 200) return notFound(status === 404 ? L.lkNone : L.lkErr);
      b = cache[code] = data.batch;
    }
    if (code === "TEST") { $("#banner").textContent = L.testBanner; $("#banner").hidden = false; }
    document.title = `${L.rpT} · ${b.code} · Another Life Passport`;
    const back = code === "TEST" ? "test" : b.code;
    const issues = [["issue_loose", L.rpLoose], ["issue_broken", L.rpBroken], ["issue_surface", L.rpSurface], ["issue_missing", L.rpMissing], ["issue_other", L.rpOther], ["issue_location", L.rpLocation]];
    app.innerHTML = `
      <section>
        <span class="k">${L.passport} · ${esc(b.code)} · ${esc(b.model)}</span>
        <h1>${L.rpT}</h1>
        <p class="lead">${L.rpP}</p>
        <form class="form" id="rpForm" name="repair" novalidate>
          <input type="hidden" name="form-name" value="repair">
          <p hidden><label>Leave empty <input name="bot-field" tabindex="-1" autocomplete="off"></label></p>
          <div class="q"><span>${L.rpWhat}</span>
            <div class="checks-list">${issues.map(([n, l]) => `<label class="check"><input type="checkbox" name="${n}" value="yes"><span>${l}</span></label>`).join("")}</div>
            <div class="where">
              <label class="q"><span>${L.rpPlace}</span><input type="text" name="place" maxlength="120"></label>
              <input type="hidden" name="gps" id="rpGps">
              <button type="button" class="btn ghost" id="rpGpsBtn">${L.rpGps}</button>
            </div></div>
          <div class="q"><span>${L.rpPhoto}</span>
            <label class="photo-pick" id="rpPick"><input type="file" id="rpPhoto" accept="image/*"><span id="rpPickTxt">${L.rpPhotoBtn}</span></label>
            <img id="rpPrev" class="photo-prev" alt="" hidden></div>
          <label class="q"><span>${L.rpMsg}</span><textarea name="message" rows="3" maxlength="1500"></textarea></label>
          <label class="q"><span>${L.rpContact}</span><input type="text" name="contact" maxlength="120" autocomplete="email"></label>
          <button class="btn" type="submit" id="rpBtn">${L.rpSend}</button>
          <p class="msg bad" id="rpMsgOut" role="status"></p>
        </form>
      </section>
      <section class="foot"><a class="staff" href="${BASE}/${back}" data-go="${back}">${L.rpBack}</a></section>`;
    let photo = null;
    $("#rpForm").addEventListener("change", () => { $("#rpMsgOut").textContent = ""; });
    $("#rpGpsBtn").addEventListener("click", () => {
      const btn = $("#rpGpsBtn");
      if (!navigator.geolocation) { $("#rpMsgOut").textContent = L.rpGpsNo; return; }
      btn.disabled = true;
      navigator.geolocation.getCurrentPosition(pos => {
        const { latitude: la, longitude: lo } = pos.coords;
        $("#rpGps").value = `${la.toFixed(5)},${lo.toFixed(5)} https://maps.google.com/?q=${la.toFixed(5)},${lo.toFixed(5)}`;
        btn.textContent = L.rpGpsOk + " ✓"; btn.disabled = false; $("#rpMsgOut").textContent = "";
      }, () => { btn.disabled = false; $("#rpMsgOut").textContent = L.rpGpsNo; }, { enableHighAccuracy: true, timeout: 15000 });
    });
    $("#rpPhoto").addEventListener("change", async e => {
      const f = e.target.files && e.target.files[0]; if (!f) return;
      photo = await shrinkPhoto(f);
      const prev = $("#rpPrev"); prev.src = URL.createObjectURL(photo); prev.hidden = false;
      $("#rpPickTxt").textContent = L.rpPhotoChange;
    });
    $("#rpForm").addEventListener("submit", async e => {
      e.preventDefault();
      const form = e.target, out = $("#rpMsgOut");
      const ticked = issues.some(([n]) => form.elements[n].checked);
      if (!ticked && !photo) { out.textContent = L.rpNeed; return; }
      const wrongPlace = form.elements.issue_location.checked;
      if (wrongPlace && !form.elements.place.value.trim() && !$("#rpGps").value) { out.textContent = L.rpNeedPlace; return; }
      if (photo && photo.size > 7.5e6) { out.textContent = L.rpBig; return; }
      const fd = new FormData(form);
      fd.set("code", b.code);
      fd.set("lang", lang);
      fd.set("subject", `${wrongPlace ? "Wrong location" : "Report"} · ${b.code} · ${b.model}`);
      if (photo) fd.set("photo", photo, photo.name || "repair-photo.jpg");
      const btn = $("#rpBtn"); btn.disabled = true; btn.textContent = L.rpSending; out.textContent = "";
      let ok = false;
      try { const res = await fetch("/passport-app/__forms.html", { method: "POST", body: fd }); ok = res.ok; } catch (err) { ok = false; }
      btn.disabled = false; btn.textContent = L.rpSend;
      if (!ok) { out.textContent = L.rpErr; return; }
      app.innerHTML = `
        <section>
          <span class="k">${L.passport} · ${esc(b.code)}</span>
          <svg class="thanks-mark" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="30"/><path d="M19 33l9 9 17-19"/></svg>
          <h1>${L.rpThanks}</h1>
          <p class="lead">${L.rpThanksP}</p>
          <a class="btn ghost" href="${BASE}/${back}" data-go="${back}">${L.rpBack}</a>
        </section>`;
      window.scrollTo(0, 0);
    });
  }

  let allBatches = null, abState = { q: "", model: "", month: "", status: "" };
  async function viewBatches(langOnly) {
    const L = t();
    document.title = L.abT + " · Another Life Passport";
    document.body.classList.add("wide");
    if (!langOnly || !allBatches) {
      app.innerHTML = `<section><p class="fine">${L.loading}</p></section>`;
      const [res, me] = await Promise.all([api("batches=1"), api("me=1")].map(p => p.catch(() => ({ status: 0, data: {} }))));
      const { status, data } = res; who = me.data || who;
      if (status === 401) return go("login");
      if (status !== 200) { app.innerHTML = `<section><p class="msg bad">${L.lkErr}</p></section>`; return; }
      allBatches = data.batches;
    }
    const months = [...new Set(allBatches.map(b => (b.made || "").slice(0, 7)).filter(Boolean))];
    const monthName = m => new Date(m + "-01").toLocaleDateString(lang === "id" ? "id-ID" : "en-GB", { month: "long", year: "numeric" });
    app.innerHTML = `
      <section>
        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap"><span class="k">${PUBLIC_HOST.toLowerCase()}</span><span style="display:flex;gap:14px">${who.admin ? `<a class="staff" href="${BASE}/admin" data-go="admin">${L.ovT}</a>` : ""}<a class="staff" href="${BASE}/factory" data-go="factory">${L.toFactory}</a></span></div>
        <h1>${L.abT}</h1>
        <div class="ab-tools">
          <input type="text" id="abQ" placeholder="${L.abSearch}" value="${esc(abState.q)}" aria-label="${L.abSearch}">
          <select id="abM" aria-label="${L.abAllP}"><option value="">${L.abAllP}</option>${MODELS.map(m => `<option ${m === abState.model ? "selected" : ""}>${esc(m)}</option>`).join("")}</select>
          <select id="abS" aria-label="${L.abAllS}"><option value="">${L.abAllS}</option><option value="draft" ${abState.status === "draft" ? "selected" : ""}>${L.abOnlyD}</option></select>
          <select id="abD" aria-label="${L.abAllM}"><option value="">${L.abAllM}</option>${months.map(m => `<option value="${m}" ${m === abState.month ? "selected" : ""}>${esc(monthName(m))}</option>`).join("")}</select>
        </div>
        <p class="fine" id="abSum"></p>
        <div class="ab-wrap"><table class="ab-table"><thead><tr>${L.abCols.map(c => `<th>${c}</th>`).join("")}</tr></thead><tbody id="abBody"></tbody></table></div>
      </section>`;
    const draw = () => {
      const q = abState.q.trim().toLowerCase();
      const rows = allBatches.filter(b => (!abState.model || b.model === abState.model) && (!abState.month || (b.made || "").startsWith(abState.month)) &&
        (!abState.status || b.status === abState.status) &&
        (!q || [b.code, b.region, b.maker, b.createdBy, b.model, b.workshop, ...(b.lotInfo || []).map(l => l.label + " " + l.name)].some(v => String(v || "").toLowerCase().includes(q))));
      const pieces = rows.reduce((n, b) => n + (b.qty || 0), 0);
      $("#abSum").textContent = `${L.abCount(rows.length, allBatches.length)} · ${L.abPieces(pieces)}`;
      $("#abBody").innerHTML = rows.length ? rows.map(b => `<tr>
        <td data-l="${L.abCols[0]}"><a class="ab-code" href="${BASE}/${esc(b.code)}" data-go="${esc(b.code)}">${rows.length <= 300 ? `<span class="ab-qr">${qrSvg(b.code, false)}</span>` : ""}${esc(b.code)}</a></td>
        <td data-l="${L.abCols[1]}">${esc(b.model)}</td>
        <td data-l="${L.abCols[2]}">${b.status === "draft" ? `<a class="tag" href="${BASE}/edit/${esc(b.code)}" data-go="edit/${esc(b.code)}">${L.stDraft} · ${L.fillIn}</a>` : `<a class="linkish" href="${BASE}/edit/${esc(b.code)}" data-go="edit/${esc(b.code)}">${L.stDone}</a>`}</td>
        <td data-l="${L.abCols[3]}">${(b.lotInfo || []).length ? b.lotInfo.map(l => `<a class="linkish" href="${BASE}/lot/${l.n}" data-go="lot/${l.n}">${esc(l.label)}</a>`).join(" ") + `<br><small>${esc(L["o_" + b.origin] || "")}</small>` : esc(L["o_" + b.origin] || b.origin || "–")}</td>
        <td data-l="${L.abCols[4]}">${esc(b.region || "–")}</td><td data-l="${L.abCols[5]}" class="num">${b.qty}</td>
        <td data-l="${L.abCols[6]}">${esc(b.workshop || "–")}</td>
        <td data-l="${L.abCols[7]}">${dateStr(b.made)}</td><td data-l="${L.abCols[8]}">${esc(b.createdBy || b.maker || "–")}</td></tr>`).join("")
        : `<tr><td colspan="9" class="fine">${L.abNone}</td></tr>`;
    };
    $("#abQ").addEventListener("input", e => { abState.q = e.target.value; draw(); });
    $("#abM").addEventListener("change", e => { abState.model = e.target.value; draw(); });
    $("#abD").addEventListener("change", e => { abState.month = e.target.value; draw(); });
    $("#abS").addEventListener("change", e => { abState.status = e.target.value; draw(); });
    draw();
  }

  function notFound(message) {
    const L = t();
    app.innerHTML = `<section><span class="k">${PUBLIC_HOST.toLowerCase()}</span><h1>${L.lkT}</h1><p class="msg bad">${esc(message)}</p>
      <a class="btn" href="${BASE}/" data-go="">${L.another}</a></section>`;
  }

  render();
})();
