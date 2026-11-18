'use strict';

/* createTransaction / updateTransaction / deleteTransaction.
   Pemasukan selalu berkategori "Lainnya" (dipaksa di server, apa pun yang
   dikirim klien). Pengeluaran wajib berkategori dari daftar 9 kategori. */

const {
  badRequest,
  notFound,
  parseAmount,
  parseCategory,
  parseDate,
  parseDescription,
  parseId,
  parseTime,
  parseTransactionType,
} = require('../validation');
const { mapTransaction } = require('./rows');

function assertWalletExists(db, walletId) {
  const row = db.prepare('SELECT id FROM wallets WHERE id = ?').get(walletId);
  if (!row) {
    throw badRequest('Dompet tidak ditemukan. Pilih dompet yang ada.');
  }
}

function parseTransactionBody(body) {
  const type = parseTransactionType(body && body.type);
  const amount = parseAmount(body && body.amount, { allowZero: false });
  const description = parseDescription(body && body.description);
  const category =
    type === 'income'
      ? 'Lainnya'
      : parseCategory(body && body.category, 'Lainnya');
  const walletId = parseId(body && body.walletId, 'ID dompet');
  const date = parseDate(body && body.date);
  const time = parseTime(body && body.time);
  return { type, amount, description, category, walletId, date, time };
}

function findTransactionOrThrow(db, id) {
  const row = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id);
  if (!row) {
    throw notFound('Entri tidak ditemukan.');
  }
  return row;
}

function createTransaction(db, body) {
  const data = parseTransactionBody(body);
  assertWalletExists(db, data.walletId);
  const result = db
    .prepare(
      'INSERT INTO transactions (type, amount, description, category, wallet_id, date, time, created_at) ' +
        'VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    )
    .run(
      data.type,
      data.amount,
      data.description,
      data.category,
      data.walletId,
      data.date,
      data.time,
      Date.now()
    );
  return mapTransaction(findTransactionOrThrow(db, Number(result.lastInsertRowid)));
}

function updateTransaction(db, body) {
  const id = parseId(body && body.id, 'ID entri');
  const data = parseTransactionBody(body);
  findTransactionOrThrow(db, id);
  assertWalletExists(db, data.walletId);
  db.prepare(
    'UPDATE transactions SET type = ?, amount = ?, description = ?, category = ?, wallet_id = ?, date = ?, time = ? WHERE id = ?'
  ).run(
    data.type,
    data.amount,
    data.description,
    data.category,
    data.walletId,
    data.date,
    data.time,
    id
  );
  return mapTransaction(findTransactionOrThrow(db, id));
}

function deleteTransaction(db, body) {
  const id = parseId(body && body.id, 'ID entri');
  findTransactionOrThrow(db, id);
  db.prepare('DELETE FROM transactions WHERE id = ?').run(id);
  return { deleted: true, id };
}

module.exports = { createTransaction, deleteTransaction, updateTransaction };
