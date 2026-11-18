'use strict';

/* Validasi bersama sisi server. Semua pesan dalam Bahasa Indonesia.
   Aturan jumlah: bilangan bulat Rupiah saja. Desimal, minus, dan huruf
   ditolak secara eksplisit — tidak pernah dibersihkan diam-diam. */

const CATEGORIES = [
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

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function badRequest(message) {
  return new ApiError(400, message);
}

function notFound(message) {
  return new ApiError(404, message);
}

function conflict(message) {
  return new ApiError(409, message);
}

/* Terima string mentah (apa adanya dari form) atau angka JSON yang sudah
   berupa bilangan bulat aman. String "50.000", "-100", "12,5" ditolak. */
function parseAmount(raw, options) {
  const allowZero = Boolean(options && options.allowZero);
  const label = (options && options.label) || 'Jumlah';

  if (typeof raw === 'number') {
    if (!Number.isSafeInteger(raw)) {
      throw badRequest(label + ' harus bilangan bulat Rupiah tanpa koma atau titik desimal.');
    }
    if (raw < 0) {
      throw badRequest(label + ' tidak boleh negatif.');
    }
    if (!allowZero && raw <= 0) {
      throw badRequest(label + ' harus lebih dari Rp0.');
    }
    return raw;
  }

  if (typeof raw !== 'string') {
    throw badRequest(label + ' wajib diisi.');
  }
  const text = raw.trim().replace(/\s+/g, '');
  if (text === '') {
    throw badRequest(label + ' wajib diisi.');
  }
  if (text.includes('-')) {
    throw badRequest(label + ' tidak boleh negatif. Tulis angka Rupiah tanpa tanda minus.');
  }
  if (text.includes('.') || text.includes(',')) {
    throw badRequest(label + ' harus bilangan bulat Rupiah tanpa koma atau titik desimal.');
  }
  if (!/^\d+$/.test(text)) {
    throw badRequest(label + ' hanya boleh berisi angka.');
  }
  const value = Number(text);
  if (!Number.isSafeInteger(value)) {
    throw badRequest(label + ' terlalu besar.');
  }
  if (!allowZero && value <= 0) {
    throw badRequest(label + ' harus lebih dari Rp0.');
  }
  return value;
}

function parseDate(raw) {
  if (typeof raw !== 'string') {
    throw badRequest('Tanggal tidak valid. Pilih tanggal yang benar.');
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!m) {
    throw badRequest('Tanggal tidak valid. Pilih tanggal yang benar.');
  }
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) {
    throw badRequest('Tanggal tidak valid. Pilih tanggal yang benar.');
  }
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) {
    throw badRequest('Tanggal tidak valid. Pilih tanggal yang benar.');
  }
  return raw;
}

function parseMonth(raw) {
  if (typeof raw !== 'string') {
    throw badRequest('Bulan tidak valid. Gunakan format YYYY-MM.');
  }
  const m = /^(\d{4})-(\d{2})$/.exec(raw);
  if (!m) {
    throw badRequest('Bulan tidak valid. Gunakan format YYYY-MM.');
  }
  const mo = Number(m[2]);
  if (mo < 1 || mo > 12) {
    throw badRequest('Bulan tidak valid. Gunakan format YYYY-MM.');
  }
  return raw;
}

/* Jam kosong ("" / null / undefined) berarti tidak ada jam: disimpan NULL.
   Jam yang diisi harus HH:MM 24 jam yang valid; "25:99" ditolak. */
function parseTime(raw) {
  if (raw === '' || raw === null || raw === undefined) {
    return null;
  }
  if (typeof raw !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(raw)) {
    throw badRequest('Jam tidak valid. Gunakan format 24 jam, contoh: 19:45.');
  }
  return raw;
}

function parseDescription(raw) {
  if (raw === null || raw === undefined) {
    return '';
  }
  if (typeof raw !== 'string') {
    throw badRequest('Keterangan harus berupa teks.');
  }
  const text = raw.trim();
  if (text.length > 500) {
    throw badRequest('Keterangan terlalu panjang (maksimal 500 karakter).');
  }
  return text;
}

function parseWalletName(raw) {
  if (typeof raw !== 'string') {
    throw badRequest('Nama dompet wajib diisi.');
  }
  const name = raw.trim();
  if (name === '') {
    throw badRequest('Nama dompet wajib diisi.');
  }
  if (name.length > 80) {
    throw badRequest('Nama dompet terlalu panjang (maksimal 80 karakter).');
  }
  return name;
}

function parseId(raw, label) {
  const name = label || 'ID';
  let value = raw;
  if (typeof value === 'string') {
    if (!/^\d+$/.test(value.trim())) {
      throw badRequest(name + ' tidak valid.');
    }
    value = Number(value.trim());
  }
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    throw badRequest(name + ' tidak valid.');
  }
  return value;
}

function parseCategory(raw, fallback) {
  if (raw === null || raw === undefined || raw === '') {
    return fallback;
  }
  if (typeof raw !== 'string' || !CATEGORIES.includes(raw)) {
    throw badRequest('Kategori tidak valid.');
  }
  return raw;
}

function parseTransactionType(raw) {
  if (raw !== 'expense' && raw !== 'income') {
    throw badRequest('Jenis transaksi tidak valid.');
  }
  return raw;
}

module.exports = {
  ApiError,
  CATEGORIES,
  badRequest,
  conflict,
  notFound,
  parseAmount,
  parseCategory,
  parseDate,
  parseDescription,
  parseId,
  parseMonth,
  parseTime,
  parseTransactionType,
  parseWalletName,
};
