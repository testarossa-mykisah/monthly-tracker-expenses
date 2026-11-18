'use strict';

/* Pemetaan baris SQLite (snake_case) ke bentuk JSON API (camelCase),
   plus perhitungan saldo dompet sepanjang waktu. */

function mapWallet(row, balance) {
  return {
    id: row.id,
    name: row.name,
    initialBalance: row.initial_balance,
    balance: balance,
    createdAt: row.created_at,
  };
}

function mapTransaction(row) {
  return {
    id: row.id,
    type: row.type,
    amount: row.amount,
    description: row.description,
    category: row.category,
    walletId: row.wallet_id,
    date: row.date,
    time: row.time === undefined ? null : row.time,
    createdAt: row.created_at,
  };
}

function mapTransfer(row) {
  return {
    id: row.id,
    fromWalletId: row.from_wallet_id,
    toWalletId: row.to_wallet_id,
    amount: row.amount,
    description: row.description,
    date: row.date,
    time: row.time === undefined ? null : row.time,
    createdAt: row.created_at,
  };
}

function mapBudget(row) {
  return {
    id: row.id,
    month: row.month,
    category: row.category,
    amount: row.amount,
  };
}

/* Saldo sepanjang waktu per dompet:
   saldo awal + semua pemasukan - semua pengeluaran
   + semua transfer masuk - semua transfer keluar.
   excludeTransferId dipakai klien saat memperingatkan transfer yang sedang
   diubah: saldo dihitung seolah transfer itu belum ada. Di server, parameter
   ini hanya dipakai oleh helper; tidak ada endpoint yang membutuhkannya. */
function computeWalletBalances(db, excludeTransferId) {
  const wallets = db.prepare('SELECT * FROM wallets ORDER BY id ASC').all();
  const balances = new Map();
  for (const wallet of wallets) {
    balances.set(wallet.id, wallet.initial_balance);
  }
  const txs = db
    .prepare('SELECT wallet_id, type, amount FROM transactions')
    .all();
  for (const tx of txs) {
    if (!balances.has(tx.wallet_id)) {
      continue;
    }
    balances.set(
      tx.wallet_id,
      balances.get(tx.wallet_id) + (tx.type === 'income' ? tx.amount : -tx.amount)
    );
  }
  const transfers = db
    .prepare('SELECT id, from_wallet_id, to_wallet_id, amount FROM transfers')
    .all();
  for (const tr of transfers) {
    if (excludeTransferId && tr.id === excludeTransferId) {
      continue;
    }
    if (balances.has(tr.from_wallet_id)) {
      balances.set(tr.from_wallet_id, balances.get(tr.from_wallet_id) - tr.amount);
    }
    if (balances.has(tr.to_wallet_id)) {
      balances.set(tr.to_wallet_id, balances.get(tr.to_wallet_id) + tr.amount);
    }
  }
  return balances;
}

/* Urutan riwayat: tanggal terbaru dulu, lalu jam terbaru dalam hari yang
   sama, entri tanpa jam terakhir dalam harinya, lalu yang terbaru dibuat
   dulu (id terbesar = terakhir dibuat). */
const HISTORY_ORDER_SQL =
  'date DESC, CASE WHEN time IS NULL THEN 1 ELSE 0 END ASC, time DESC, id DESC';

module.exports = {
  HISTORY_ORDER_SQL,
  computeWalletBalances,
  mapBudget,
  mapTransaction,
  mapTransfer,
  mapWallet,
};
