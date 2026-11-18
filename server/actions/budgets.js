'use strict';

/* setBudget — dipertahankan agar arsitektur sama dengan app Muse, meskipun
   UI tidak menampilkan kontrol budget (sesuai penyederhanaan v14).
   Upsert: satu budget per (bulan, kategori). */

const {
  badRequest,
  parseAmount,
  parseCategory,
  parseMonth,
} = require('../validation');
const { mapBudget } = require('./rows');

function setBudget(db, body) {
  const month = parseMonth(body && body.month);
  const category = parseCategory(body && body.category, null);
  if (!category) {
    throw badRequest('Kategori tidak valid.');
  }
  const amount = parseAmount(body && body.amount, {
    allowZero: true,
    label: 'Budget',
  });
  db.prepare(
    'INSERT INTO budgets (month, category, amount) VALUES (?, ?, ?) ' +
      'ON CONFLICT (month, category) DO UPDATE SET amount = excluded.amount'
  ).run(month, category, amount);
  const row = db
    .prepare('SELECT * FROM budgets WHERE month = ? AND category = ?')
    .get(month, category);
  return mapBudget(row);
}

module.exports = { setBudget };
