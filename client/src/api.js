// Pembungkus fetch untuk API JSON: POST /api/<namaAction>.
// Semua error server (pesan Bahasa Indonesia) dilempar sebagai Error agar
// komponen menampilkannya secara eksplisit. Tidak ada penyimpanan lokal:
// klien hanya bicara ke API.

export class ApiRequestError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
  }
}

export async function callAction(actionName, body) {
  let response;
  try {
    response = await fetch('/api/' + actionName, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
    });
  } catch (err) {
    throw new ApiRequestError('Tidak bisa terhubung ke server. Pastikan server sedang berjalan.', 0);
  }
  let payload = null;
  try {
    payload = await response.json();
  } catch (err) {
    throw new ApiRequestError('Server mengembalikan jawaban yang tidak bisa dibaca.', response.status);
  }
  if (!response.ok || !payload || payload.ok !== true) {
    const message =
      (payload && payload.error) || 'Terjadi kesalahan di server (HTTP ' + response.status + ').';
    throw new ApiRequestError(message, response.status);
  }
  return payload.data;
}

export const api = {
  getMonthData: (month) => callAction('getMonthData', { month }),
  createTransaction: (body) => callAction('createTransaction', body),
  updateTransaction: (body) => callAction('updateTransaction', body),
  deleteTransaction: (id) => callAction('deleteTransaction', { id }),
  createWallet: (body) => callAction('createWallet', body),
  updateWallet: (body) => callAction('updateWallet', body),
  deleteWallet: (id) => callAction('deleteWallet', { id }),
  createTransfer: (body) => callAction('createTransfer', body),
  updateTransfer: (body) => callAction('updateTransfer', body),
  deleteTransfer: (id) => callAction('deleteTransfer', { id }),
  setBudget: (body) => callAction('setBudget', body),
};
