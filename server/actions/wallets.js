'use strict';

/* createWallet / updateWallet / deleteWallet.
   Nama wajib unik tanpa membedakan huruf besar/kecil. Hapus ditolak bila
   dompet punya riwayat transaksi atau transfer apa pun. */

const {
  conflict,
  notFound,
  parseAmount,
  parseId,
  parseWalletName,
} = require('../validation');
const { computeWalletBalances, mapWallet } = require('./rows');

function findWalletOrThrow(db, id) {
  const row = db.prepare('SELECT * FROM wallets WHERE id = ?').get(id);
  if (!row) {
    throw notFound('Dompet tidak ditemukan.');
  }
  return row;
}

function assertNameAvailable(db, name, excludeId) {
  const row = db
    .prepare('SELECT id FROM wallets WHERE lower(name) = lower(?) AND id <> ?')
    .get(name, excludeId || 0);
  if (row) {
    throw conflict('Nama dompet sudah dipakai. Gunakan nama lain.');
  }
}

function walletWithBalance(db, id) {
  const row = findWalletOrThrow(db, id);
  const balances = computeWalletBalances(db, null);
  return mapWallet(row, balances.get(row.id) || 0);
}

function createWallet(db, body) {
  const name = parseWalletName(body && body.name);
  const initialBalance = parseAmount(body && body.initialBalance, {
    allowZero: true,
    label: 'Saldo awal',
  });
  assertNameAvailable(db, name, null);
  const result = db
    .prepare('INSERT INTO wallets (name, initial_balance, created_at) VALUES (?, ?, ?)')
    .run(name, initialBalance, Date.now());
  return walletWithBalance(db, Number(result.lastInsertRowid));
}

function updateWallet(db, body) {
  const id = parseId(body && body.id, 'ID dompet');
  const name = parseWalletName(body && body.name);
  const initialBalance = parseAmount(body && body.initialBalance, {
    allowZero: true,
    label: 'Saldo awal',
  });
  findWalletOrThrow(db, id);
  assertNameAvailable(db, name, id);
  db.prepare('UPDATE wallets SET name = ?, initial_balance = ? WHERE id = ?').run(
    name,
    initialBalance,
    id
  );
  return walletWithBalance(db, id);
}

function deleteWallet(db, body) {
  const id = parseId(body && body.id, 'ID dompet');
  const wallet = findWalletOrThrow(db, id);
  const txCount = db
    .prepare('SELECT COUNT(*) AS n FROM transactions WHERE wallet_id = ?')
    .get(id).n;
  const transferCount = db
    .prepare(
      'SELECT COUNT(*) AS n FROM transfers WHERE from_wallet_id = ? OR to_wallet_id = ?'
    )
    .get(id, id).n;
  if (txCount > 0 || transferCount > 0) {
    throw conflict(
      'Dompet ' +
        wallet.name +
        ' tidak bisa dihapus karena sudah ada riwayat transaksi atau transfer.'
    );
  }
  db.prepare('DELETE FROM wallets WHERE id = ?').run(id);
  return { deleted: true, id };
}

module.exports = { createWallet, deleteWallet, updateWallet };
