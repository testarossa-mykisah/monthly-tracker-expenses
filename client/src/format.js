// Format tampilan + konstanta domain (kategori dan warna pie).
// Validasi di sini hanya untuk umpan balik instan di form; server adalah
// penentu akhir dan semua aturan ditegakkan ulang di server/validation.js.

export const CATEGORIES = [
  'Makanan & Minuman',
  'Transportasi',
  'Belanja',
  'Tagihan & Langganan',
  'Hiburan',
  'Kesehatan',
  'Pendidikan',
  'Rumah Tangga',
  'Lainnya',
];

export const CATEGORY_COLORS = {
  'Makanan & Minuman': '#141414',
  Transportasi: '#7cb518',
  Belanja: '#2a7f62',
  'Tagihan & Langganan': '#c94f6d',
  Hiburan: '#e9a23b',
  Kesehatan: '#4a7fb5',
  Pendidikan: '#8a6d3b',
  'Rumah Tangga': '#6b8e23',
  Lainnya: '#9aa38b',
};

const MONTHS_LONG = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

export function pad2(n) {
  return String(n).padStart(2, '0');
}

function localTodayParts() {
  const d = new Date();
  return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() };
}

export function currentMonthKey() {
  const t = localTodayParts();
  return t.y + '-' + pad2(t.m);
}

export function todayStr() {
  const t = localTodayParts();
  return t.y + '-' + pad2(t.m) + '-' + pad2(t.d);
}

export function nowTimeStr() {
  const d = new Date();
  return pad2(d.getHours()) + ':' + pad2(d.getMinutes());
}

export function monthKeyFromDate(dateStr) {
  return typeof dateStr === 'string' ? dateStr.slice(0, 7) : '';
}

export function monthLabel(monthKey) {
  const m = /^(\d{4})-(\d{2})$/.exec(monthKey || '');
  if (!m) return monthKey || '';
  const idx = Number(m[2]) - 1;
  if (idx < 0 || idx > 11) return monthKey;
  return MONTHS_LONG[idx] + ' ' + m[1];
}

export function parseDateParts(dateStr) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr || '');
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return { y, m: mo, d };
}

export function formatDateDisplay(dateStr) {
  const p = parseDateParts(dateStr);
  if (!p) return dateStr || '';
  return p.d + ' ' + MONTHS_SHORT[p.m - 1] + ' ' + p.y;
}

export function formatRupiah(n) {
  const num = Number(n) || 0;
  const sign = num < 0 ? '-' : '';
  return sign + 'Rp' + Math.abs(num).toLocaleString('id-ID');
}

export function isValidTime(value) {
  if (value === '' || value === null || value === undefined) return true;
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

/* Cerminan aturan server untuk umpan balik instan. Nilai mentah (string)
   tetap dikirim ke server apa adanya; server yang memutuskan. */
export function parseAmountInput(raw, allowZero) {
  const text = String(raw == null ? '' : raw).trim().replace(/\s+/g, '');
  if (text === '') return { ok: false, error: 'Jumlah wajib diisi.' };
  if (/-/.test(text)) {
    return { ok: false, error: 'Jumlah tidak boleh negatif. Tulis angka Rupiah tanpa tanda minus.' };
  }
  if (/[.,]/.test(text)) {
    return { ok: false, error: 'Jumlah harus bilangan bulat Rupiah tanpa koma atau titik desimal.' };
  }
  if (!/^\d+$/.test(text)) return { ok: false, error: 'Jumlah hanya boleh berisi angka.' };
  const value = Number(text);
  if (!Number.isSafeInteger(value)) return { ok: false, error: 'Jumlah terlalu besar.' };
  if (!allowZero && value <= 0) return { ok: false, error: 'Jumlah harus lebih dari Rp0.' };
  return { ok: true, value };
}

export function shiftMonthKey(monthKey, delta) {
  const m = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!m) return currentMonthKey();
  const d = new Date(Number(m[1]), Number(m[2]) - 1 + delta, 1);
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1);
}
