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
    work: '<svg class="ico" viewBox="0 0 64 64" aria-hidden="true"><circle class="f" cx="32" cy="32" r="30"/><path d="M14 40l22-22 7 7-22 22zM40 18l7-7M46 24l7-7M18 50h28"/></svg>',
    now: '<svg class="ico" viewBox="0 0 64 64" aria-hidden="true"><circle class="f" cx="32" cy="32" r="30"/><path class="l" d="M14 36h36M18 36v11M46 36v11M14 29h36"/><circle class="l" cx="32" cy="18" r="4"/></svg>'
  };

  const T = {
    en: {
      // lookup
      lkT: "Find a piece", lkP: "Enter the code under the QR code on your furniture.", lkPh: "e.g. AL-2610-03-Q", lkBtn: "Look up",
      lkFmt: "Codes look like AL-2610-03-Q.", lkBad: "That code doesn't look right. Check the last letter.", lkNone: "We have no batch with that code yet.",
      lkErr: "Something went wrong. Try again in a moment.", lkHint: "Want to see an example? Type", staffLink: "Factory / staff login",
      // login
      liT: "Staff login", liP: "For the workshop and the Another Life team.", liPw: "Password", liBtn: "Log in",
      liWrong: "That password isn't right.", liNotReady: "Login isn't set up yet. The staff password still needs to be added in Netlify.",
      // factory
      newBatch: "New batch", q1: "Which product?", q2: "Where did the wood come from?", q3: "Area (if known)", q3ph: "e.g. Central Java",
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
      journeyK: "Its journey", journeyT: "Jakarta to Bali", calcK: "Travel calculator", distK: "Distance", distU: "km by road and ferry",
      co2K: "Transport CO₂", co2U: "kg CO₂e for this piece", madeK: "Made in", madeV: "Jakarta", madeU: "on Java",
      legs: [["Truck", "Across Java"], ["Ferry", "Over the Bali Strait"], ["Truck", "To its new home in Bali"]],
      noteNo: "Distances follow the usual road route.", noteYes: "Estimate, using a typical truck emission factor and the packed weight of this piece.",
      flatK: "Why flat matters", flatT: "Same truck. Far less air.", flat: "Flat-packed", asm: "Assembled",
      flatNote: "Flat-packed, many more pieces fit in each truck, so fewer trips are needed.",
      youK: "What your scan just did", youT: "Now you know where it comes from.",
      c1: "The wood in this piece has already lived one life.", c2: "Its story stays with it, through every repair and every new owner.", c3: "Most furniture can't tell you any of this. This piece can.",
      repair: "Report a repair", repairMsg: c => `Hi Another Life, I'd like to report a repair for a piece from batch ${c}.`,
      another: "Look up another code", site: "Visit another-life.dk", loading: "Loading…"
    },
    id: {
      lkT: "Cari produk", lkP: "Masukkan kode di bawah kode QR pada furnitur Anda.", lkPh: "mis. AL-2610-03-Q", lkBtn: "Cari",
      lkFmt: "Format kode seperti AL-2610-03-Q.", lkBad: "Kode itu sepertinya salah. Periksa huruf terakhirnya.", lkNone: "Belum ada batch dengan kode itu.",
      lkErr: "Terjadi kesalahan. Coba lagi sebentar lagi.", lkHint: "Ingin melihat contoh? Ketik", staffLink: "Login pabrik / staf",
      liT: "Login staf", liP: "Untuk bengkel dan tim Another Life.", liPw: "Kata sandi", liBtn: "Masuk",
      liWrong: "Kata sandi itu salah.", liNotReady: "Login belum diatur. Kata sandi staf masih perlu ditambahkan di Netlify.",
      newBatch: "Batch baru", q1: "Produk apa?", q2: "Kayunya berasal dari mana?", q3: "Daerah (jika tahu)", q3ph: "mis. Jawa Tengah",
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
      journeyK: "Perjalanannya", journeyT: "Jakarta ke Bali", calcK: "Kalkulator perjalanan", distK: "Jarak", distU: "km lewat darat dan feri",
      co2K: "CO₂ transportasi", co2U: "kg CO₂e untuk produk ini", madeK: "Dibuat di", madeV: "Jakarta", madeU: "di Pulau Jawa",
      legs: [["Truk", "Melintasi Pulau Jawa"], ["Feri", "Menyeberangi Selat Bali"], ["Truk", "Ke rumah barunya di Bali"]],
      noteNo: "Jarak mengikuti rute jalan yang biasa.", noteYes: "Perkiraan, memakai faktor emisi truk yang umum dan berat kemasan produk ini.",
      flatK: "Mengapa dikemas datar", flatT: "Truk yang sama. Jauh lebih sedikit udara.", flat: "Dikemas datar", asm: "Sudah dirakit",
      flatNote: "Dalam kemasan datar, jauh lebih banyak produk muat di setiap truk, jadi perjalanan lebih sedikit.",
      youK: "Arti pindaian Anda", youT: "Sekarang Anda tahu asal-usulnya.",
      c1: "Kayu pada produk ini sudah menjalani satu kehidupan.", c2: "Kisahnya tetap melekat, melalui setiap perbaikan dan setiap pemilik baru.", c3: "Kebanyakan furnitur tidak bisa menceritakan semua ini. Produk ini bisa.",
      repair: "Laporkan perbaikan", repairMsg: c => `Halo Another Life, saya ingin melaporkan perbaikan untuk produk dari batch ${c}.`,
      another: "Cari kode lain", site: "Kunjungi another-life.dk", loading: "Memuat…"
    }
  };

  const TEST_BATCH = { code: "TEST", model: "The Bench", origin: "bridge", region: "Central Java", maker: "Tim A", qty: 12, kg: 9, route: "jakarta-bali", made: new Date().toISOString() };

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
  function downloadSvg(code) {
    const blob = new Blob([qrSvg(code, true)], { type: "image/svg+xml" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `${code}.svg`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  // ---------- routing
  function route() {
    const p = decodeURIComponent(location.pathname.slice(BASE.length).replace(/^\/+|\/+$/g, ""));
    if (!p) return { view: "lookup" };
    if (p.toLowerCase() === "login") return { view: "login" };
    if (p.toLowerCase() === "factory") return { view: "factory" };
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
  $("#homeLink").href = BASE + "/";
  $("#homeLink").addEventListener("click", e => { e.preventDefault(); go(""); });

  // ---------- views
  let current = null, cache = {}, form = null;

  function render(langOnly) {
    const r = route();
    $("#banner").hidden = true;
    document.querySelectorAll("[data-lang]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
    document.documentElement.lang = lang;
    if (r.view === "lookup") return viewLookup(langOnly);
    if (r.view === "login") return viewLogin();
    if (r.view === "factory") return viewFactory(langOnly);
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

  function viewLogin() {
    const L = t();
    document.title = L.liT + " · Another Life Passport";
    app.innerHTML = `
      <section>
        <span class="k">${PUBLIC_HOST.toLowerCase()}</span>
        <h1>${L.liT}</h1>
        <p class="lead">${L.liP}</p>
        <form class="form" id="liForm" style="gap:10px">
          <label class="q"><span>${L.liPw}</span><input type="password" id="liPw" autocomplete="current-password" required></label>
          <button class="btn" type="submit" id="liBtn">${L.liBtn}</button>
          <p class="msg bad" id="liMsg" role="status"></p>
        </form>
      </section>`;
    $("#liForm").addEventListener("submit", async e => {
      e.preventDefault();
      const btn = $("#liBtn"); btn.disabled = true; $("#liMsg").textContent = "";
      const { status } = await api("", { action: "login", password: $("#liPw").value }).catch(() => ({ status: 0 }));
      btn.disabled = false;
      if (status === 200) return go("factory");
      $("#liMsg").textContent = status === 503 ? L.liNotReady : status === 401 ? L.liWrong : L.lkErr;
    });
  }

  async function viewFactory(langOnly) {
    const L = t();
    document.title = L.newBatch + " · Another Life Passport";
    if (!langOnly) {
      const me = await api("me=1").catch(() => ({ data: {} }));
      if (!me.data.staff) return go("login");
    }
    form = form || { model: "", origin: "", region: "", maker: "", qty: "", kg: "" };
    const res = form.result;
    app.innerHTML = `
      <section>
        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px"><span class="k">${L.newBatch}</span><button type="button" class="staff" id="logout">${L.logout}</button></div>
        <div id="fWrap" ${res ? "hidden" : ""}>
          <form class="form" id="fForm" novalidate>
            <div class="q"><span>${L.q1}</span><div class="chips">${MODELS.map(m => `<button type="button" class="chip" data-m="${esc(m)}" aria-pressed="${m === form.model}">${esc(m)}</button>`).join("")}</div></div>
            <div class="q"><span>${L.q2}</span><div class="chips">${["house", "bridge", "boat", "other"].map(o => `<button type="button" class="chip" data-o="${o}" aria-pressed="${o === form.origin}">${ICONS[o]}${L["o_" + o]}</button>`).join("")}</div></div>
            <label class="q"><span>${L.q3}</span><input type="text" id="fRegion" maxlength="60" placeholder="${L.q3ph}" value="${esc(form.region)}"></label>
            <label class="q"><span>${L.q4}</span><input type="text" id="fMaker" maxlength="60" value="${esc(form.maker)}"></label>
            <label class="q"><span>${L.qN}</span><input type="number" id="fQty" min="1" max="999" inputmode="numeric" value="${esc(form.qty)}"></label>
            <label class="q"><span>${L.q5}</span><input type="number" id="fKg" min="0" step="0.1" inputmode="decimal" value="${esc(form.kg)}"></label>
            <div class="auto"><span>${L.dateLbl}</span><span>${dateStr(new Date().toISOString())}</span></div>
            <button class="btn" type="submit" id="fBtn">${L.create}</button>
            <p class="msg bad" id="fMsg" role="status"></p>
          </form>
        </div>
        ${res ? `<div class="label-out">
          <span class="k">${L.engrave}</span>
          <div class="plate">${qrSvg(res.code, false)}<span class="serial">${esc(res.code)}</span></div>
          <p class="fine">${L.same(res.qty)}</p>
          <button class="btn" type="button" id="dl">${L.dl}</button>
          <a class="btn ghost" href="${BASE}/${res.code}" data-go="${res.code}">${L.view}</a>
          <button class="btn ghost" type="button" id="nextB">${L.next}</button>
        </div>` : ""}
      </section>
      <section>
        <span class="k">${L.recent}</span>
        <div class="recent" id="recent"><p class="fine" style="padding:12px 0">${L.loading}</p></div>
      </section>`;

    $("#logout").addEventListener("click", async () => { await api("", { action: "logout" }).catch(() => {}); form = null; go(""); });
    if (res) {
      $("#dl").addEventListener("click", () => downloadSvg(res.code));
      $("#nextB").addEventListener("click", () => { form = { model: form.model, origin: "", region: "", maker: form.maker, qty: "", kg: form.kg }; viewFactory(true); });
    } else {
      const sync = () => { form.region = $("#fRegion").value; form.maker = $("#fMaker").value; form.qty = $("#fQty").value; form.kg = $("#fKg").value; };
      app.querySelectorAll("[data-m]").forEach(b => b.addEventListener("click", () => { sync(); form.model = b.dataset.m; viewFactory(true); }));
      app.querySelectorAll("[data-o]").forEach(b => b.addEventListener("click", () => { sync(); form.origin = b.dataset.o; viewFactory(true); }));
      $("#fForm").addEventListener("submit", async e => {
        e.preventDefault(); sync();
        const msg = $("#fMsg"); msg.textContent = "";
        if (!form.model) return (msg.textContent = L.err_model);
        if (!form.origin) return (msg.textContent = L.err_origin);
        const qty = parseInt(form.qty, 10);
        if (!(qty >= 1 && qty <= 999)) return (msg.textContent = L.err_qty);
        const btn = $("#fBtn"); btn.disabled = true; btn.textContent = L.creating;
        const { status, data } = await api("", { action: "create", model: form.model, origin: form.origin, region: form.region, maker: form.maker, qty, kg: form.kg }).catch(() => ({ status: 0, data: {} }));
        btn.disabled = false; btn.textContent = L.create;
        if (status === 201) { form.result = data.batch; cache[data.batch.code] = data.batch; return viewFactory(true); }
        if (status === 401) return go("login");
        msg.textContent = L["err_" + data.error] || L.err_other;
      });
    }
    loadRecent();
  }

  async function loadRecent() {
    const L = t(), box = $("#recent");
    const { status, data } = await api("list=1").catch(() => ({ status: 0, data: {} }));
    if (!box) return;
    if (status !== 200) { box.innerHTML = `<p class="fine" style="padding:12px 0">${L.lkErr}</p>`; return; }
    if (!data.batches.length) { box.innerHTML = `<p class="fine" style="padding:12px 0">${L.none}</p>`; return; }
    box.innerHTML = data.batches.map(b => `<div class="rrow"><div><b>${esc(b.code)}</b><br><small>${esc(b.model)} · ${b.qty} ${L.pcs} · ${dateStr(b.made)}</small></div>
      <div class="acts"><button type="button" class="linkish" data-dl="${esc(b.code)}">SVG</button><a class="linkish" href="${BASE}/${esc(b.code)}" data-go="${esc(b.code)}">${L.view}</a></div></div>`).join("");
    box.querySelectorAll("[data-dl]").forEach(b => b.addEventListener("click", () => downloadSvg(b.dataset.dl)));
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
    const lives = [
      ["tree", L.l1k, L.l1h, L.l1p, ""],
      [b.origin, L.l2k, L.l2h[b.origin], L.l2p[b.origin] + (reg ? ` · ${reg}` : ""), ""],
      ["work", `${L.l3k} · ${dateStr(b.made)}`, L.l3h, L.l3p(by, b.qty || 1), ""],
      ["now", L.l4k, L.l4h, L.l4p, "now"]
    ];
    const total = LEGS.reduce((a, c) => a + c, 0);
    const hasKg = b.kg != null && b.kg > 0;
    let rings = ""; for (let i = 1; i <= 20; i++) { const r = 6 + i * 6.6 + (i % 3) * 1.2; rings += `<circle cx="150" cy="150" r="${r.toFixed(1)}" style="animation-delay:${(i * .05).toFixed(2)}s;opacity:${(1 - i * .028).toFixed(2)}"></circle>`; }
    const wa = atob(WA).split("").reverse().join("");
    app.innerHTML = `
      <section>
        <span class="k">${L.passport} · ${esc(b.code)}</span>
        <svg class="rings" viewBox="0 0 300 300" aria-hidden="true">${rings}<circle class="core" cx="150" cy="150" r="5"></circle></svg>
        <span class="k">${L.look} ${esc(b.model)}</span>
        <h1>${L.h1}</h1>
        <p class="lead">${esc(L.lead(b.model, L.oPhrase[b.origin]))}</p>
      </section>
      <section>
        <span class="k">${L.livesK}</span>
        <div>${lives.map((l, i) => `<div class="life ${l[4]}" style="animation-delay:${.15 + i * .2}s">${ICONS[l[0]] || ICONS.other}<div><span class="k">${esc(l[1])}</span><h3>${esc(l[2])}</h3><p>${esc(l[3])}</p></div></div>`).join("")}</div>
      </section>
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
        <a class="btn" href="https://wa.me/${wa}?text=${encodeURIComponent(L.repairMsg(b.code))}" target="_blank" rel="noopener">${L.repair}</a>
        <a class="btn ghost" href="${BASE}/" data-go="">${L.another}</a>
      </section>
      <section class="foot"><a class="staff" href="https://another-life.dk">${L.site}</a></section>`;
    const setPack = p => {
      $("#box").className = "box " + p; $("#box").innerHTML = "<i></i>".repeat(p === "flat" ? 300 : 30);
      $("#tFlat").setAttribute("aria-pressed", String(p === "flat")); $("#tAsm").setAttribute("aria-pressed", String(p === "asm"));
    };
    $("#tFlat").addEventListener("click", () => setPack("flat"));
    $("#tAsm").addEventListener("click", () => setPack("asm"));
  }

  function notFound(message) {
    const L = t();
    app.innerHTML = `<section><span class="k">${PUBLIC_HOST.toLowerCase()}</span><h1>${L.lkT}</h1><p class="msg bad">${esc(message)}</p>
      <a class="btn" href="${BASE}/" data-go="">${L.another}</a></section>`;
  }

  render();
})();
