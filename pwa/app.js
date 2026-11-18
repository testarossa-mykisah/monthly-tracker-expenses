"use strict";

/* Tracker Pengeluaran Bulanan — versi standalone.
   Data tersimpan di localStorage browser ini saja.
   Rumus: Jumlah Uang = total saldo awal semua dompet + pemasukan bulan yang dipilih.
   Sisa = Jumlah Uang - pengeluaran bulan yang dipilih. Transfer tidak mengubah keduanya.
   Saldo tiap dompet dihitung sepanjang waktu (semua riwayat). */

const STORAGE_KEY = "monthly-tracker-expenses:v1";

const CATEGORIES = [
  "Makanan & Minuman",
  "Transportasi",
  "Belanja",
  "Tagihan & Langganan",
  "Hiburan",
  "Kesehatan",
  "Pendidikan",
  "Rumah Tangga",
  "Lainnya",
];

const CATEGORY_COLORS = {
  "Makanan & Minuman": "#141414",
  "Transportasi": "#7cb518",
  "Belanja": "#2a7f62",
  "Tagihan & Langganan": "#c94f6d",
  "Hiburan": "#e9a23b",
  "Kesehatan": "#4a7fb5",
  "Pendidikan": "#8a6d3b",
  "Rumah Tangga": "#6b8e23",
  "Lainnya": "#9aa38b",
};

const MONTHS_LONG = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

function uid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}

function pad2(n) { return String(n).padStart(2, "0"); }

function localTodayParts() {
  const d = new Date();
  return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() };
}

function currentMonthKey() {
  const t = localTodayParts();
  return t.y + "-" + pad2(t.m);
}

function todayStr() {
  const t = localTodayParts();
  return t.y + "-" + pad2(t.m) + "-" + pad2(t.d);
}

function nowTimeStr() {
  const d = new Date();
  return pad2(d.getHours()) + ":" + pad2(d.getMinutes());
}

function monthKeyFromDate(dateStr) {
  return typeof dateStr === "string" ? dateStr.slice(0, 7) : "";
}

function monthLabel(monthKey) {
  const m = /^(\d{4})-(\d{2})$/.exec(monthKey || "");
  if (!m) return monthKey || "";
  const idx = Number(m[2]) - 1;
  if (idx < 0 || idx > 11) return monthKey;
  return MONTHS_LONG[idx] + " " + m[1];
}

function parseDateParts(dateStr) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr || "");
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return { y: y, m: mo, d: d };
}

function formatDateDisplay(dateStr) {
  const p = parseDateParts(dateStr);
  if (!p) return dateStr || "";
  return p.d + " " + MONTHS_SHORT[p.m - 1] + " " + p.y;
}

function formatRupiah(n) {
  const num = Number(n) || 0;
  const sign = num < 0 ? "-" : "";
  return sign + "Rp" + Math.abs(num).toLocaleString("id-ID");
}

function isValidTime(value) {
  if (value === "" || value === null || value === undefined) return true;
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

/* Jumlah harus bilangan bulat Rupiah. Desimal, minus, dan karakter lain ditolak
   secara eksplisit, bukan dibersihkan diam-diam. */
function parseAmountInput(raw, allowZero) {
  const text = String(raw == null ? "" : raw).trim().replace(/\s+/g, "");
  if (text === "") return { ok: false, error: "Jumlah wajib diisi." };
  if (/[-]/.test(text)) return { ok: false, error: "Jumlah tidak boleh negatif. Tulis angka Rupiah tanpa tanda minus." };
  if (/[.,]/.test(text)) return { ok: false, error: "Jumlah harus bilangan bulat Rupiah tanpa koma atau titik desimal." };
  if (!/^\d+$/.test(text)) return { ok: false, error: "Jumlah hanya boleh berisi angka." };
  const value = Number(text);
  if (!Number.isSafeInteger(value)) return { ok: false, error: "Jumlah terlalu besar." };
  if (!allowZero && value <= 0) return { ok: false, error: "Jumlah harus lebih dari Rp0." };
  if (allowZero && value < 0) return { ok: false, error: "Jumlah tidak boleh negatif." };
  return { ok: true, value: value };
}

function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ---------- State ---------- */

let data = { wallets: [], transactions: [], transfers: [], nextSeq: 1 };
let viewedMonth = currentMonthKey();
let storageAvailable = true;
let lastFocusedElement = null;
let activeModal = null;
let confirmAction = null;
let toastTimer = null;
let toastHideTimer = null;

function loadData() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return;
    data.wallets = Array.isArray(parsed.wallets) ? parsed.wallets : [];
    data.transactions = Array.isArray(parsed.transactions) ? parsed.transactions : [];
    data.transfers = Array.isArray(parsed.transfers) ? parsed.transfers : [];
    data.nextSeq = Number.isInteger(parsed.nextSeq) && parsed.nextSeq > 0 ? parsed.nextSeq : 1;
    let seq = data.nextSeq;
    const ensureSeq = function (list) {
      list.forEach(function (r) {
        if (!Number.isInteger(r.seq)) { r.seq = seq; seq += 1; }
      });
    };
    ensureSeq(data.transactions);
    ensureSeq(data.transfers);
    data.nextSeq = seq;
  } catch (e) {
    storageAvailable = false;
  }
}

function saveData() {
  if (!storageAvailable) return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    storageAvailable = false;
    showToast("Data tidak bisa disimpan di browser ini. Perubahan hanya berlaku sementara.");
    return false;
  }
}

function ensureDefaultWallet() {
  if (data.wallets.length === 0) {
    data.wallets.push({ id: uid(), name: "Tunai", initialBalance: 0, createdAt: Date.now() });
    saveData();
  }
}

function walletById(id) {
  return data.wallets.find(function (w) { return w.id === id; }) || null;
}

function walletBalance(walletId, excludeTransferId) {
  const wallet = walletById(walletId);
  let balance = wallet ? Number(wallet.initialBalance) || 0 : 0;
  data.transactions.forEach(function (t) {
    if (t.walletId !== walletId) return;
    if (t.type === "income") balance += Number(t.amount) || 0;
    else if (t.type === "expense") balance -= Number(t.amount) || 0;
  });
  data.transfers.forEach(function (tr) {
    if (excludeTransferId && tr.id === excludeTransferId) return;
    if (tr.toWalletId === walletId) balance += Number(tr.amount) || 0;
    if (tr.fromWalletId === walletId) balance -= Number(tr.amount) || 0;
  });
  return balance;
}

function walletHasHistory(walletId) {
  return data.transactions.some(function (t) { return t.walletId === walletId; }) ||
    data.transfers.some(function (tr) { return tr.fromWalletId === walletId || tr.toWalletId === walletId; });
}

function monthTotals(monthKey) {
  const totalInitial = data.wallets.reduce(function (s, w) { return s + (Number(w.initialBalance) || 0); }, 0);
  let income = 0;
  let expense = 0;
  data.transactions.forEach(function (t) {
    if (monthKeyFromDate(t.date) !== monthKey) return;
    if (t.type === "income") income += Number(t.amount) || 0;
    else if (t.type === "expense") expense += Number(t.amount) || 0;
  });
  const total = totalInitial + income;
  return { totalInitial: totalInitial, income: income, expense: expense, total: total, remaining: total - expense };
}

function compareHistory(a, b) {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  const ta = a.time || "";
  const tb = b.time || "";
  if (ta !== tb) {
    if (ta === "") return 1;
    if (tb === "") return -1;
    return ta < tb ? 1 : -1;
  }
  return (b.seq || 0) - (a.seq || 0);
}

function monthHistory(monthKey) {
  const items = [];
  data.transactions.forEach(function (t) {
    if (monthKeyFromDate(t.date) === monthKey) items.push({ kind: "tx", record: t, date: t.date, time: t.time || null, seq: t.seq || 0 });
  });
  data.transfers.forEach(function (tr) {
    if (monthKeyFromDate(tr.date) === monthKey) items.push({ kind: "transfer", record: tr, date: tr.date, time: tr.time || null, seq: tr.seq || 0 });
  });
  items.sort(compareHistory);
  return items;
}

/* ---------- Toast & errors ---------- */

function showToast(message) {
  const toast = document.getElementById("toast");
  if (toastTimer) clearTimeout(toastTimer);
  if (toastHideTimer) clearTimeout(toastHideTimer);
  toast.classList.remove("toast-out");
  toast.textContent = message;
  const wasHidden = toast.hidden;
  toast.hidden = false;
  /* Kalau toast sedang tampil, paksa animasi masuknya berulang dari awal. */
  if (!wasHidden) {
    toast.style.animation = "none";
    void toast.offsetWidth;
    toast.style.animation = "";
  }
  toastTimer = setTimeout(function () {
    toast.classList.add("toast-out");
    toastHideTimer = setTimeout(function () {
      toast.hidden = true;
      toast.classList.remove("toast-out");
    }, 260);
  }, 4200);
}

function showError(el, message) {
  el.textContent = message;
  el.hidden = false;
}
function hideError(el) { el.hidden = true; el.textContent = ""; }
function showWarning(el, message) {
  el.textContent = message;
  el.hidden = false;
}
function hideWarning(el) { el.hidden = true; el.textContent = ""; }

/* ---------- Render ---------- */

function renderHeader() {
  document.getElementById("monthLabel").textContent = monthLabel(viewedMonth);
  document.getElementById("thisMonthBtn").hidden = viewedMonth === currentMonthKey();
}

function renderSummary() {
  const t = monthTotals(viewedMonth);
  const totalEl = document.getElementById("totalMoney");
  const remainingEl = document.getElementById("remainingMoney");
  totalEl.textContent = formatRupiah(t.total);
  remainingEl.textContent = formatRupiah(t.remaining);
  remainingEl.classList.toggle("is-negative", t.remaining < 0);

  let pct = 0;
  let over = false;
  if (t.expense > 0) {
    if (t.total <= 0) { pct = 100; over = true; }
    else {
      pct = Math.round((t.expense / t.total) * 100);
      over = t.remaining < 0;
      if (pct > 100) pct = 100;
    }
  }
  const bar = document.getElementById("progressBar");
  const fill = document.getElementById("progressFill");
  const pill = document.getElementById("progressPill");
  fill.style.width = pct + "%";
  fill.classList.toggle("is-over", over);
  pill.textContent = pct + "%";
  pill.classList.toggle("is-over", over);
  bar.setAttribute("aria-valuenow", String(pct));
  bar.setAttribute("aria-valuetext", pct + "%" + (over ? ", melebihi batas" : ""));

  const overLabel = document.getElementById("overLabel");
  if (t.remaining < 0) {
    overLabel.textContent = "Melebihi " + formatRupiah(Math.abs(t.remaining)) + " dari Jumlah Uang.";
    overLabel.hidden = false;
  } else if (t.remaining === 0 && t.expense > 0) {
    overLabel.textContent = "Sisa sudah Rp0. Pengeluaran sudah mencapai Jumlah Uang.";
    overLabel.hidden = false;
  } else {
    overLabel.hidden = true;
    overLabel.textContent = "";
  }
}

function luminance(hex) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const f = function (c) { return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function piePath(cx, cy, r, startAngle, endAngle) {
  const s = (startAngle - 90) * Math.PI / 180;
  const e = (endAngle - 90) * Math.PI / 180;
  const x1 = cx + r * Math.cos(s);
  const y1 = cy + r * Math.sin(s);
  const x2 = cx + r * Math.cos(e);
  const y2 = cy + r * Math.sin(e);
  const large = endAngle - startAngle > 180 ? 1 : 0;
  if (endAngle - startAngle >= 359.999) {
    return "M " + cx + " " + (cy - r) + " A " + r + " " + r + " 0 1 1 " + (cx - 0.01) + " " + (cy - r) + " Z";
  }
  return "M " + cx + " " + cy + " L " + x1 + " " + y1 + " A " + r + " " + r + " 0 " + large + " 1 " + x2 + " " + y2 + " Z";
}

function renderPie() {
  const groups = {};
  let totalExpense = 0;
  data.transactions.forEach(function (t) {
    if (t.type !== "expense") return;
    if (monthKeyFromDate(t.date) !== viewedMonth) return;
    const cat = t.category || "Lainnya";
    groups[cat] = (groups[cat] || 0) + (Number(t.amount) || 0);
    totalExpense += Number(t.amount) || 0;
  });

  const emptyEl = document.getElementById("pieEmpty");
  const bodyEl = document.getElementById("pieBody");
  if (totalExpense <= 0) {
    document.getElementById("pieEmptyText").textContent = "Belum ada pengeluaran " + monthLabel(viewedMonth) + ".";
    emptyEl.hidden = false;
    bodyEl.hidden = true;
    document.getElementById("pieSvg").innerHTML = "";
    document.getElementById("pieLegend").innerHTML = "";
    return;
  }
  emptyEl.hidden = true;
  bodyEl.hidden = false;

  const entries = Object.keys(groups).map(function (cat) {
    return { category: cat, amount: groups[cat] };
  }).sort(function (a, b) { return b.amount - a.amount; });

  const svg = document.getElementById("pieSvg");
  const NS = "http://www.w3.org/2000/svg";
  svg.innerHTML = "";
  let angle = 0;
  entries.forEach(function (entry) {
    const exactPct = (entry.amount / totalExpense) * 100;
    const sweep = (entry.amount / totalExpense) * 360;
    const color = CATEGORY_COLORS[entry.category] || "#9aa38b";
    const path = document.createElementNS(NS, "path");
    path.setAttribute("d", piePath(100, 100, 80, angle, angle + sweep));
    path.setAttribute("fill", color);
    const title = document.createElementNS(NS, "title");
    title.textContent = entry.category + ": " + formatRupiah(entry.amount);
    path.appendChild(title);
    svg.appendChild(path);
    if (exactPct >= 10) {
      const mid = (angle + sweep / 2 - 90) * Math.PI / 180;
      const tx = 100 + 52 * Math.cos(mid);
      const ty = 100 + 52 * Math.sin(mid);
      const text = document.createElementNS(NS, "text");
      text.setAttribute("x", String(tx));
      text.setAttribute("y", String(ty));
      text.setAttribute("fill", luminance(color) > 0.4 ? "#141414" : "#ffffff");
      text.textContent = Math.round(exactPct) + "%";
      svg.appendChild(text);
    }
    angle += sweep;
  });

  const legend = document.getElementById("pieLegend");
  legend.innerHTML = "";
  entries.forEach(function (entry) {
    const exactPct = (entry.amount / totalExpense) * 100;
    const pctText = exactPct < 1 ? "<1%" : Math.round(exactPct) + "%";
    const li = document.createElement("li");
    const dot = document.createElement("span");
    dot.className = "legend-dot";
    dot.style.background = CATEGORY_COLORS[entry.category] || "#9aa38b";
    dot.setAttribute("aria-hidden", "true");
    const name = document.createElement("span");
    name.className = "legend-name";
    name.textContent = entry.category + " · " + pctText;
    const value = document.createElement("span");
    value.className = "legend-value";
    value.textContent = formatRupiah(entry.amount);
    li.appendChild(dot);
    li.appendChild(name);
    li.appendChild(value);
    legend.appendChild(li);
  });
}

function renderWallets() {
  const list = document.getElementById("walletList");
  list.innerHTML = "";
  data.wallets.forEach(function (wallet, index) {
    const li = document.createElement("li");
    li.className = "wallet-tile" + (index % 2 === 1 ? " is-alt" : "");
    const main = document.createElement("div");
    main.className = "wallet-main";
    const name = document.createElement("span");
    name.className = "wallet-name";
    name.textContent = wallet.name;
    const balance = document.createElement("span");
    balance.className = "wallet-balance";
    balance.textContent = formatRupiah(walletBalance(wallet.id));
    main.appendChild(name);
    main.appendChild(balance);
    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "icon-btn";
    editBtn.textContent = "Ubah";
    editBtn.setAttribute("aria-label", "Ubah dompet " + wallet.name);
    editBtn.addEventListener("click", function () { openWalletModal(wallet.id); });
    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "icon-btn";
    delBtn.textContent = "Hapus";
    delBtn.setAttribute("aria-label", "Hapus dompet " + wallet.name);
    delBtn.addEventListener("click", function () { requestDeleteWallet(wallet.id); });
    li.appendChild(main);
    li.appendChild(editBtn);
    li.appendChild(delBtn);
    list.appendChild(li);
  });
}

function historyRowLabel(item) {
  if (item.kind === "transfer") {
    const from = walletById(item.record.fromWalletId);
    const to = walletById(item.record.toWalletId);
    return "Transfer " + (from ? from.name : "?") + " \u2192 " + (to ? to.name : "?");
  }
  const desc = String(item.record.description || "").trim();
  if (desc) return desc;
  return item.record.type === "expense" ? "Pengeluaran" : "Pemasukan";
}

function renderHistory() {
  const items = monthHistory(viewedMonth);
  const list = document.getElementById("historyList");
  const emptyEl = document.getElementById("historyEmpty");
  list.innerHTML = "";
  if (items.length === 0) {
    emptyEl.textContent = "Belum ada riwayat " + monthLabel(viewedMonth) + ".";
    emptyEl.hidden = false;
    return;
  }
  emptyEl.hidden = true;
  items.forEach(function (item) {
    const rec = item.record;
    const li = document.createElement("li");
    li.className = "history-row";
    const main = document.createElement("div");
    main.className = "history-main";
    const desc = document.createElement("span");
    desc.className = "history-desc";
    desc.textContent = historyRowLabel(item);
    const meta = document.createElement("span");
    meta.className = "history-meta";
    let metaText = formatDateDisplay(rec.date);
    if (rec.time) metaText += " \u2022 " + rec.time;
    if (item.kind === "tx") {
      const w = walletById(rec.walletId);
      if (w) metaText += " \u2022 " + w.name;
    } else if (rec.description && String(rec.description).trim()) {
      metaText += " \u2022 " + String(rec.description).trim();
    }
    meta.textContent = metaText;
    main.appendChild(desc);
    main.appendChild(meta);
    if (item.kind === "tx" && rec.type === "expense") {
      const pill = document.createElement("span");
      pill.className = "category-pill";
      pill.textContent = rec.category || "Lainnya";
      main.appendChild(pill);
    }
    const amount = document.createElement("span");
    amount.className = "history-amount";
    if (item.kind === "transfer") {
      amount.textContent = formatRupiah(rec.amount);
    } else if (rec.type === "expense") {
      amount.classList.add("is-expense");
      amount.textContent = "-" + formatRupiah(rec.amount);
    } else {
      amount.classList.add("is-income");
      amount.textContent = "+" + formatRupiah(rec.amount);
    }
    const actions = document.createElement("div");
    actions.className = "row-actions";
    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "icon-btn";
    editBtn.textContent = "Ubah";
    editBtn.setAttribute("aria-label", "Ubah: " + historyRowLabel(item));
    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "icon-btn";
    delBtn.textContent = "Hapus";
    delBtn.setAttribute("aria-label", "Hapus: " + historyRowLabel(item));
    if (item.kind === "tx") {
      editBtn.addEventListener("click", function () { openTransactionModal(rec.type, rec.id); });
      delBtn.addEventListener("click", function () { requestDeleteTransaction(rec.id); });
    } else {
      editBtn.addEventListener("click", function () { openTransferModal(rec.id); });
      delBtn.addEventListener("click", function () { requestDeleteTransfer(rec.id); });
    }
    actions.appendChild(editBtn);
    actions.appendChild(delBtn);
    li.appendChild(main);
    li.appendChild(amount);
    li.appendChild(actions);
    list.appendChild(li);
  });
}

function renderAll() {
  ensureDefaultWallet();
  renderHeader();
  renderSummary();
  renderPie();
  renderWallets();
  renderHistory();
}

/* ---------- Modals ---------- */

function focusableIn(modal) {
  return Array.prototype.slice.call(modal.querySelectorAll(
    'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )).filter(function (el) { return el.offsetParent !== null; });
}

function openModal(backdropId) {
  const backdrop = document.getElementById(backdropId);
  if (!backdrop) return;
  if (activeModal && activeModal !== backdrop) closeModal(activeModal, true);
  lastFocusedElement = document.activeElement;
  backdrop.hidden = false;
  activeModal = backdrop;
  document.body.style.overflow = "hidden";
  const modal = backdrop.querySelector(".modal");
  const focusables = focusableIn(modal);
  const firstInput = modal.querySelector("input:not([type=hidden]), select");
  if (firstInput) firstInput.focus();
  else if (focusables.length) focusables[0].focus();
}

function closeModal(backdrop, skipReturnFocus) {
  const target = backdrop || activeModal;
  if (!target) return;
  target.hidden = true;
  if (activeModal === target) activeModal = null;
  document.body.style.overflow = "";
  confirmAction = null;
  if (!skipReturnFocus && lastFocusedElement && typeof lastFocusedElement.focus === "function") {
    lastFocusedElement.focus();
  }
}

document.addEventListener("keydown", function (e) {
  if (!activeModal) return;
  if (e.key === "Escape") {
    e.preventDefault();
    closeModal(activeModal);
    return;
  }
  if (e.key !== "Tab") return;
  const modal = activeModal.querySelector(".modal");
  const focusables = focusableIn(modal);
  if (focusables.length === 0) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
});

document.querySelectorAll(".modal-backdrop").forEach(function (backdrop) {
  backdrop.addEventListener("click", function (e) {
    if (e.target === backdrop) closeModal(backdrop);
  });
});
document.querySelectorAll("[data-close-modal]").forEach(function (btn) {
  btn.addEventListener("click", function () { closeModal(btn.closest(".modal-backdrop")); });
});

function fillSelect(selectEl, options, selectedValue) {
  selectEl.innerHTML = "";
  options.forEach(function (opt) {
    const o = document.createElement("option");
    o.value = opt.value;
    o.textContent = opt.label;
    if (opt.value === selectedValue) o.selected = true;
    selectEl.appendChild(o);
  });
}

function walletOptions() {
  return data.wallets.map(function (w) { return { value: w.id, label: w.name }; });
}

function defaultDateForView() {
  if (viewedMonth === currentMonthKey()) return todayStr();
  return viewedMonth + "-01";
}

/* ---------- Transaction form ---------- */

let txConfirmedOutOfMonth = false;

function openTransactionModal(type, existingId) {
  const existing = existingId ? data.transactions.find(function (t) { return t.id === existingId; }) : null;
  const form = document.getElementById("transactionForm");
  form.reset();
  txConfirmedOutOfMonth = false;
  hideError(document.getElementById("txError"));
  hideWarning(document.getElementById("txWarning"));
  document.getElementById("txSubmit").textContent = "Simpan";

  const effType = existing ? existing.type : type;
  document.getElementById("txId").value = existing ? existing.id : "";
  document.getElementById("txType").value = effType;
  document.getElementById("transactionTitle").textContent =
    (existing ? "Ubah " : "Catat ") + (effType === "expense" ? "Pengeluaran" : "Pemasukan");

  const categoryField = document.getElementById("txCategoryField");
  const categorySelect = document.getElementById("txCategory");
  if (effType === "expense") {
    categoryField.hidden = false;
    const opts = CATEGORIES.map(function (c) { return { value: c, label: c }; });
    const currentCat = existing ? (existing.category || "Lainnya") : "Lainnya";
    if (opts.every(function (o) { return o.value !== currentCat; })) opts.push({ value: currentCat, label: currentCat });
    fillSelect(categorySelect, opts, currentCat);
  } else {
    categoryField.hidden = true;
    fillSelect(categorySelect, CATEGORIES.map(function (c) { return { value: c, label: c }; }), "Lainnya");
  }

  fillSelect(document.getElementById("txWallet"), walletOptions(), existing ? existing.walletId : (data.wallets[0] ? data.wallets[0].id : ""));
  document.getElementById("txAmount").value = existing ? String(existing.amount) : "";
  document.getElementById("txDescription").value = existing ? (existing.description || "") : "";
  document.getElementById("txDate").value = existing ? existing.date : defaultDateForView();
  document.getElementById("txTime").value = existing ? (existing.time || "") : nowTimeStr();
  updateTxWarning();
  openModal("transactionModal");
}

function updateTxWarning() {
  const dateVal = document.getElementById("txDate").value;
  const warningEl = document.getElementById("txWarning");
  if (dateVal && monthKeyFromDate(dateVal) !== viewedMonth) {
    showWarning(warningEl, "Tanggal ini masuk ke " + monthLabel(monthKeyFromDate(dateVal)) + ", bukan " + monthLabel(viewedMonth) + ". Entri akan tampil saat kamu membuka bulan tersebut.");
  } else {
    hideWarning(warningEl);
  }
}

document.getElementById("txDate").addEventListener("change", function () {
  txConfirmedOutOfMonth = false;
  document.getElementById("txSubmit").textContent = "Simpan";
  updateTxWarning();
});

document.getElementById("transactionForm").addEventListener("submit", function (e) {
  e.preventDefault();
  const errorEl = document.getElementById("txError");
  hideError(errorEl);
  const id = document.getElementById("txId").value || null;
  const type = document.getElementById("txType").value === "income" ? "income" : "expense";
  const parsed = parseAmountInput(document.getElementById("txAmount").value, false);
  if (!parsed.ok) {
    showError(errorEl, parsed.error);
    document.getElementById("txAmount").focus();
    return;
  }
  const dateVal = document.getElementById("txDate").value;
  if (!parseDateParts(dateVal)) {
    showError(errorEl, "Tanggal tidak valid. Pilih tanggal yang benar.");
    document.getElementById("txDate").focus();
    return;
  }
  const timeVal = document.getElementById("txTime").value;
  if (!isValidTime(timeVal)) {
    showError(errorEl, "Jam tidak valid. Gunakan format 24 jam, contoh: 19:45.");
    document.getElementById("txTime").focus();
    return;
  }
  const walletId = document.getElementById("txWallet").value;
  if (!walletById(walletId)) {
    showError(errorEl, "Pilih dompet dulu.");
    return;
  }
  const destMonth = monthKeyFromDate(dateVal);
  if (destMonth !== viewedMonth && !txConfirmedOutOfMonth) {
    txConfirmedOutOfMonth = true;
    showWarning(document.getElementById("txWarning"), "Entri ini akan tersimpan di " + monthLabel(destMonth) + ". Tekan Simpan sekali lagi untuk memastikan.");
    document.getElementById("txSubmit").textContent = "Simpan ke " + monthLabel(destMonth);
    return;
  }
  const record = {
    id: id || uid(),
    type: type,
    amount: parsed.value,
    description: document.getElementById("txDescription").value.trim(),
    category: type === "expense" ? document.getElementById("txCategory").value : "Lainnya",
    walletId: walletId,
    date: dateVal,
    time: timeVal === "" ? null : timeVal,
    createdAt: Date.now(),
    seq: data.nextSeq++,
  };
  try {
    if (id) {
      const idx = data.transactions.findIndex(function (t) { return t.id === id; });
      if (idx === -1) throw new Error("Entri tidak ditemukan.");
      record.createdAt = data.transactions[idx].createdAt;
      record.seq = data.transactions[idx].seq;
      data.transactions[idx] = record;
    } else {
      data.transactions.push(record);
    }
    saveData();
  } catch (err) {
    showError(errorEl, "Gagal menyimpan. Coba lagi.");
    return;
  }
  closeModal(document.getElementById("transactionModal"));
  renderAll();
  if (destMonth !== viewedMonth) showToast("Tersimpan di " + monthLabel(destMonth) + ".");
  else showToast(id ? "Entri diperbarui." : "Entri tersimpan.");
});

/* ---------- Transfer form ---------- */

let transferConfirmed = false;

function refreshTransferToOptions() {
  const fromEl = document.getElementById("transferFrom");
  const toEl = document.getElementById("transferTo");
  const prevTo = toEl.value;
  const opts = data.wallets.filter(function (w) { return w.id !== fromEl.value; })
    .map(function (w) { return { value: w.id, label: w.name }; });
  fillSelect(toEl, opts, opts.some(function (o) { return o.value === prevTo; }) ? prevTo : (opts[0] ? opts[0].value : ""));
  const fromWallet = walletById(fromEl.value);
  const editingId = document.getElementById("transferId").value || null;
  document.getElementById("transferFromBalance").textContent = fromWallet
    ? "Saldo " + fromWallet.name + ": " + formatRupiah(walletBalance(fromWallet.id, editingId))
    : "";
}

function openTransferModal(existingId) {
  const existing = existingId ? data.transfers.find(function (t) { return t.id === existingId; }) : null;
  const form = document.getElementById("transferForm");
  form.reset();
  transferConfirmed = false;
  hideError(document.getElementById("transferError"));
  hideWarning(document.getElementById("transferWarning"));
  document.getElementById("transferSubmit").textContent = "Simpan";
  document.getElementById("transferTitle").textContent = existing ? "Ubah Transfer" : "Transfer antar Dompet";
  document.getElementById("transferId").value = existing ? existing.id : "";

  const blocked = !existing && data.wallets.length < 2;
  document.getElementById("transferBlockedNote").hidden = !blocked;
  ["transferFrom", "transferTo", "transferAmount", "transferDescription", "transferDate", "transferTime", "transferSubmit"].forEach(function (fieldId) {
    document.getElementById(fieldId).disabled = blocked;
  });

  fillSelect(document.getElementById("transferFrom"), walletOptions(), existing ? existing.fromWalletId : (data.wallets[0] ? data.wallets[0].id : ""));
  refreshTransferToOptions();
  if (existing) document.getElementById("transferTo").value = existing.toWalletId;
  refreshTransferToOptions();
  if (existing) document.getElementById("transferTo").value = existing.toWalletId;
  document.getElementById("transferAmount").value = existing ? String(existing.amount) : "";
  document.getElementById("transferDescription").value = existing ? (existing.description || "") : "";
  document.getElementById("transferDate").value = existing ? existing.date : defaultDateForView();
  document.getElementById("transferTime").value = existing ? (existing.time || "") : nowTimeStr();
  updateTransferWarning();
  openModal("transferModal");
  if (blocked) showToast("Butuh minimal 2 dompet untuk transfer. Tambah dompet dulu.");
}

function updateTransferWarning() {
  const dateVal = document.getElementById("transferDate").value;
  const warningEl = document.getElementById("transferWarning");
  if (dateVal && monthKeyFromDate(dateVal) !== viewedMonth) {
    showWarning(warningEl, "Tanggal ini masuk ke " + monthLabel(monthKeyFromDate(dateVal)) + ", bukan " + monthLabel(viewedMonth) + ".");
  } else {
    hideWarning(warningEl);
  }
}

document.getElementById("transferFrom").addEventListener("change", function () {
  transferConfirmed = false;
  document.getElementById("transferSubmit").textContent = "Simpan";
  refreshTransferToOptions();
});
document.getElementById("transferDate").addEventListener("change", function () {
  transferConfirmed = false;
  document.getElementById("transferSubmit").textContent = "Simpan";
  updateTransferWarning();
});
document.getElementById("transferAmount").addEventListener("input", function () {
  transferConfirmed = false;
  document.getElementById("transferSubmit").textContent = "Simpan";
});

document.getElementById("transferForm").addEventListener("submit", function (e) {
  e.preventDefault();
  const errorEl = document.getElementById("transferError");
  hideError(errorEl);
  const id = document.getElementById("transferId").value || null;
  if (data.wallets.length < 2) {
    showError(errorEl, "Butuh minimal 2 dompet untuk transfer.");
    return;
  }
  const parsed = parseAmountInput(document.getElementById("transferAmount").value, false);
  if (!parsed.ok) {
    showError(errorEl, parsed.error);
    document.getElementById("transferAmount").focus();
    return;
  }
  const dateVal = document.getElementById("transferDate").value;
  if (!parseDateParts(dateVal)) {
    showError(errorEl, "Tanggal tidak valid. Pilih tanggal yang benar.");
    document.getElementById("transferDate").focus();
    return;
  }
  const timeVal = document.getElementById("transferTime").value;
  if (!isValidTime(timeVal)) {
    showError(errorEl, "Jam tidak valid. Gunakan format 24 jam, contoh: 19:45.");
    document.getElementById("transferTime").focus();
    return;
  }
  const fromId = document.getElementById("transferFrom").value;
  const toId = document.getElementById("transferTo").value;
  if (!fromId || !toId || fromId === toId) {
    showError(errorEl, "Dompet asal dan dompet tujuan harus berbeda.");
    return;
  }
  const warnings = [];
  const destMonth = monthKeyFromDate(dateVal);
  if (destMonth !== viewedMonth) warnings.push("Entri ini akan tersimpan di " + monthLabel(destMonth) + ".");
  const sourceBalance = walletBalance(fromId, id);
  if (parsed.value > sourceBalance) {
    const fromWallet = walletById(fromId);
    warnings.push("Jumlah melebihi saldo " + (fromWallet ? fromWallet.name : "dompet asal") + " (" + formatRupiah(sourceBalance) + "). Saldo boleh minus dan akan ditampilkan apa adanya.");
  }
  if (warnings.length > 0 && !transferConfirmed) {
    transferConfirmed = true;
    showWarning(document.getElementById("transferWarning"), warnings.join(" ") + " Tekan Simpan sekali lagi untuk memastikan.");
    document.getElementById("transferSubmit").textContent = "Simpan saja";
    return;
  }
  const record = {
    id: id || uid(),
    fromWalletId: fromId,
    toWalletId: toId,
    amount: parsed.value,
    description: document.getElementById("transferDescription").value.trim(),
    date: dateVal,
    time: timeVal === "" ? null : timeVal,
    createdAt: Date.now(),
    seq: data.nextSeq++,
  };
  try {
    if (id) {
      const idx = data.transfers.findIndex(function (t) { return t.id === id; });
      if (idx === -1) throw new Error("Transfer tidak ditemukan.");
      record.createdAt = data.transfers[idx].createdAt;
      record.seq = data.transfers[idx].seq;
      data.transfers[idx] = record;
    } else {
      data.transfers.push(record);
    }
    saveData();
  } catch (err) {
    showError(errorEl, "Gagal menyimpan transfer. Coba lagi.");
    return;
  }
  closeModal(document.getElementById("transferModal"));
  renderAll();
  if (destMonth !== viewedMonth) showToast("Transfer tersimpan di " + monthLabel(destMonth) + ".");
  else showToast(id ? "Transfer diperbarui." : "Transfer tersimpan.");
});

/* ---------- Wallet form ---------- */

function openWalletModal(existingId) {
  const existing = existingId ? walletById(existingId) : null;
  const form = document.getElementById("walletForm");
  form.reset();
  hideError(document.getElementById("walletError"));
  document.getElementById("walletId").value = existing ? existing.id : "";
  document.getElementById("walletTitle").textContent = existing ? "Ubah Dompet" : "Tambah Dompet";
  document.getElementById("walletName").value = existing ? existing.name : "";
  document.getElementById("walletInitial").value = existing ? String(existing.initialBalance) : "0";
  openModal("walletModal");
}

document.getElementById("walletForm").addEventListener("submit", function (e) {
  e.preventDefault();
  const errorEl = document.getElementById("walletError");
  hideError(errorEl);
  const id = document.getElementById("walletId").value || null;
  const name = document.getElementById("walletName").value.trim();
  if (!name) {
    showError(errorEl, "Nama dompet wajib diisi.");
    document.getElementById("walletName").focus();
    return;
  }
  const duplicate = data.wallets.some(function (w) {
    return w.id !== id && w.name.trim().toLowerCase() === name.toLowerCase();
  });
  if (duplicate) {
    showError(errorEl, "Nama dompet sudah dipakai. Gunakan nama lain.");
    document.getElementById("walletName").focus();
    return;
  }
  const parsed = parseAmountInput(document.getElementById("walletInitial").value, true);
  if (!parsed.ok) {
    showError(errorEl, parsed.error);
    document.getElementById("walletInitial").focus();
    return;
  }
  try {
    if (id) {
      const wallet = walletById(id);
      if (!wallet) throw new Error("Dompet tidak ditemukan.");
      wallet.name = name;
      wallet.initialBalance = parsed.value;
    } else {
      data.wallets.push({ id: uid(), name: name, initialBalance: parsed.value, createdAt: Date.now() });
    }
    saveData();
  } catch (err) {
    showError(errorEl, "Gagal menyimpan dompet. Coba lagi.");
    return;
  }
  closeModal(document.getElementById("walletModal"));
  renderAll();
  showToast(id ? "Dompet diperbarui." : "Dompet ditambahkan.");
});

/* ---------- Delete flows ---------- */

function openConfirm(title, text, action) {
  document.getElementById("confirmTitle").textContent = title;
  document.getElementById("confirmText").textContent = text;
  confirmAction = action;
  openModal("confirmModal");
}

document.getElementById("confirmDeleteBtn").addEventListener("click", function () {
  const action = confirmAction;
  confirmAction = null;
  closeModal(document.getElementById("confirmModal"));
  if (typeof action === "function") {
    try { action(); } catch (err) { showToast("Gagal menghapus. Coba lagi."); }
  }
});

function requestDeleteTransaction(id) {
  const rec = data.transactions.find(function (t) { return t.id === id; });
  if (!rec) { showToast("Entri tidak ditemukan."); return; }
  openConfirm("Hapus entri ini?", (rec.description || (rec.type === "expense" ? "Pengeluaran" : "Pemasukan")) + " — " + formatRupiah(rec.amount) + ".", function () {
    const idx = data.transactions.findIndex(function (t) { return t.id === id; });
    if (idx === -1) throw new Error("Entri tidak ditemukan.");
    data.transactions.splice(idx, 1);
    saveData();
    renderAll();
    showToast("Entri dihapus.");
  });
}

function requestDeleteTransfer(id) {
  const rec = data.transfers.find(function (t) { return t.id === id; });
  if (!rec) { showToast("Transfer tidak ditemukan."); return; }
  openConfirm("Hapus transfer ini?", "Transfer " + formatRupiah(rec.amount) + " akan dihapus dan saldo dompet kembali seperti sebelum transfer.", function () {
    const idx = data.transfers.findIndex(function (t) { return t.id === id; });
    if (idx === -1) throw new Error("Transfer tidak ditemukan.");
    data.transfers.splice(idx, 1);
    saveData();
    renderAll();
    showToast("Transfer dihapus.");
  });
}

function requestDeleteWallet(id) {
  const wallet = walletById(id);
  if (!wallet) { showToast("Dompet tidak ditemukan."); return; }
  if (walletHasHistory(id)) {
    showToast("Dompet " + wallet.name + " tidak bisa dihapus karena sudah ada riwayat transaksi atau transfer.");
    return;
  }
  openConfirm("Hapus dompet ini?", "Dompet " + wallet.name + " akan dihapus.", function () {
    if (walletHasHistory(id)) throw new Error("Dompet sudah punya riwayat.");
    const idx = data.wallets.findIndex(function (w) { return w.id === id; });
    if (idx === -1) throw new Error("Dompet tidak ditemukan.");
    data.wallets.splice(idx, 1);
    saveData();
    renderAll();
    showToast("Dompet dihapus.");
  });
}

/* ---------- Month navigation ---------- */

function shiftMonth(delta) {
  const m = /^(\d{4})-(\d{2})$/.exec(viewedMonth);
  if (!m) { viewedMonth = currentMonthKey(); renderAll(); return; }
  const d = new Date(Number(m[1]), Number(m[2]) - 1 + delta, 1);
  viewedMonth = d.getFullYear() + "-" + pad2(d.getMonth() + 1);
  renderAll();
}

document.getElementById("prevMonth").addEventListener("click", function () { shiftMonth(-1); });
document.getElementById("nextMonth").addEventListener("click", function () { shiftMonth(1); });
document.getElementById("thisMonthBtn").addEventListener("click", function () {
  viewedMonth = currentMonthKey();
  renderAll();
});

/* ---------- Open actions ---------- */

document.querySelectorAll("[data-open-expense]").forEach(function (btn) {
  btn.addEventListener("click", function () { openTransactionModal("expense", null); });
});
document.querySelectorAll("[data-open-income]").forEach(function (btn) {
  btn.addEventListener("click", function () { openTransactionModal("income", null); });
});
document.getElementById("openTransferBtn").addEventListener("click", function () { openTransferModal(null); });
document.getElementById("addWalletBtn").addEventListener("click", function () { openWalletModal(null); });

/* ---------- Init ---------- */

loadData();
renderAll();
if (!storageAvailable) {
  showToast("Penyimpanan browser tidak tersedia. Data hanya berlaku sementara di halaman ini.");
}

/* ---------- Service worker (PWA) ---------- */

/* Registrasi terjaga: gagal diam-diam bila service worker tidak didukung
   atau sw.js belum tersedia. Tidak mengubah logika aplikasi apa pun. */
if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("./sw.js").catch(function () { /* abaikan */ });
  });
}
