'use strict';

/* createTransfer / updateTransfer / deleteTransfer.
   Dompet asal dan tujuan harus berbeda. Transfer yang melebihi saldo dompet
   asal DIIZINKAN di server (saldo boleh minus, ditampilkan apa adanya);
   peringatan soal itu adalah urusan klien (confirm-not-block), bukan
   penolakan server. */

const {
  badRequest,
  notFound,
  parseAmount,
  parseDate,
  parseDescription,
  parseId,
  parseTime,
} = require('../validation');
const { mapTransfer } = require('./rows');

function assertWalletExists(db, walletId, label) {
  const row = db.prepare('SELECT id FROM wallets WHERE id = ?').get(walletId);
  if (!row) {
    throw badRequest(label + ' tidak ditemukan. Pilih dompet yang ada.');
  }
}

function parseTransferBody(body) {
  const fromWalletId = parseId(body && body.fromWalletId, 'ID dompet asal');
  const toWalletId = parseId(body && body.toWalletId, 'ID dompet tujuan');
  if (fromWalletId === toWalletId) {
    throw badRequest('Dompet asal dan dompet tujuan harus berbeda.');
  }
  const amount = parseAmount(body && body.amount, { allowZero: false });
  const description = parseDescription(body && body.description);
  const date = parseDate(body && body.date);
  const time = parseTime(body && body.time);
  return { fromWalletId, toWalletId, amount, description, date, time };
}

function findTransferOrThrow(db, id) {
  const row = db.prepare('SELECT * FROM transfers WHERE id = ?').get(id);
  if (!row) {
    throw notFound('Transfer tidak ditemukan.');
  }
  return row;
}

function createTransfer(db, body) {
  const data = parseTransferBody(body);
  assertWalletExists(db, data.fromWalletId, 'Dompet asal');
  assertWalletExists(db, data.toWalletId, 'Dompet tujuan');
  const result = db
    .prepare(
      'INSERT INTO transfers (from_wallet_id, to_wallet_id, amount, description, date, time, created_at) ' +
        'VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
    .run(
      data.fromWalletId,
      data.toWalletId,
      data.amount,
      data.description,
      data.date,
      data.time,
      Date.now()
    );
  return mapTransfer(findTransferOrThrow(db, Number(result.lastInsertRowid)));
}

function updateTransfer(db, body) {
  const id = parseId(body && body.id, 'ID transfer');
  const data = parseTransferBody(body);
  findTransferOrThrow(db, id);
  assertWalletExists(db, data.fromWalletId, 'Dompet asal');
  assertWalletExists(db, data.toWalletId, 'Dompet tujuan');
  db.prepare(
    'UPDATE transfers SET from_wallet_id = ?, to_wallet_id = ?, amount = ?, description = ?, date = ?, time = ? WHERE id = ?'
  ).run(
    data.fromWalletId,
    data.toWalletId,
    data.amount,
    data.description,
    data.date,
    data.time,
    id
  );
  return mapTransfer(findTransferOrThrow(db, id));
}

function deleteTransfer(db, body) {
  const id = parseId(body && body.id, 'ID transfer');
  findTransferOrThrow(db, id);
  db.prepare('DELETE FROM transfers WHERE id = ?').run(id);
  return { deleted: true, id };
}

module.exports = { createTransfer, deleteTransfer, updateTransfer };
