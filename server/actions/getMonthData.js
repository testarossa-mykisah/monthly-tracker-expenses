'use strict';

/* getMonthData — satu-satunya pembaca utama.
   Menghitung ringkasan bulanan di server dan mengembalikan:
   summary (Jumlah Uang/Sisa bulan yang dipilih), wallets dengan saldo
   sepanjang waktu, transactions + transfers bulan itu, history gabungan
   yang sudah terurut, dan budgets bulan itu. */

const { ensureDefaultWallet } = require('../db');
const { parseMonth } = require('../validation');
const {
  HISTORY_ORDER_SQL,
  computeWalletBalances,
  mapBudget,
  mapTransaction,
  mapTransfer,
  mapWallet,
} = require('./rows');

function getMonthData(db, body) {
  const month = parseMonth(body && body.month);
  ensureDefaultWallet(db);

  const wallets = db.prepare('SELECT * FROM wallets ORDER BY id ASC').all();
  const balances = computeWalletBalances(db, null);
  const totalInitial = wallets.reduce((sum, w) => sum + w.initial_balance, 0);

  const transactions = db
    .prepare(
      'SELECT * FROM transactions WHERE substr(date, 1, 7) = ? ORDER BY ' +
        HISTORY_ORDER_SQL
    )
    .all(month)
    .map(mapTransaction);
  const transfers = db
    .prepare(
      'SELECT * FROM transfers WHERE substr(date, 1, 7) = ? ORDER BY ' +
        HISTORY_ORDER_SQL
    )
    .all(month)
    .map(mapTransfer);

  let income = 0;
  let expense = 0;
  for (const tx of transactions) {
    if (tx.type === 'income') {
      income += tx.amount;
    } else {
      expense += tx.amount;
    }
  }
  // Transfer sengaja tidak masuk ke total bulanan.
  const total = totalInitial + income;
  const summary = {
    month,
    totalInitial,
    income,
    expense,
    total,
    remaining: total - expense,
  };

  const history = [];
  for (const tx of transactions) {
    history.push({ kind: 'transaction', ...tx });
  }
  for (const tr of transfers) {
    history.push({ kind: 'transfer', ...tr });
  }
  history.sort((a, b) => {
    if (a.date !== b.date) {
      return a.date < b.date ? 1 : -1;
    }
    const ta = a.time || '';
    const tb = b.time || '';
    if (ta !== tb) {
      if (ta === '') {
        return 1;
      }
      if (tb === '') {
        return -1;
      }
      return ta < tb ? 1 : -1;
    }
    return b.id - a.id;
  });

  const budgets = db
    .prepare('SELECT * FROM budgets WHERE month = ? ORDER BY category ASC')
    .all(month)
    .map(mapBudget);

  return {
    month,
    summary,
    wallets: wallets.map((w) => mapWallet(w, balances.get(w.id) || 0)),
    transactions,
    transfers,
    history,
    budgets,
  };
}

module.exports = { getMonthData };
