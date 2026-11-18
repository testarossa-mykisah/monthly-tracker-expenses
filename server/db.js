'use strict';

/* Lapisan database SQLite (node:sqlite, tanpa dependensi).
   File database: data/tracker.db di root proyek, dibuat saat pertama jalan.
   Untuk pengujian, lokasi bisa diubah lewat env:
     DB_PATH=/tmp/xxx/tracker.db  (path file persis, prioritas tertinggi)
     DATA_DIR=/tmp/xxx           (direktori; file tracker.db di dalamnya)
   File data tidak pernah di-commit (lihat .gitignore). */

const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const PROJECT_ROOT = path.resolve(__dirname, '..');

function resolveDbPath() {
  if (process.env.DB_PATH) {
    return path.resolve(process.env.DB_PATH);
  }
  const dataDir = process.env.DATA_DIR
    ? path.resolve(process.env.DATA_DIR)
    : path.join(PROJECT_ROOT, 'data');
  return path.join(dataDir, 'tracker.db');
}

let db = null;
let dbPath = null;

function getDbPath() {
  return dbPath;
}

function openDb() {
  if (db) {
    return db;
  }
  dbPath = resolveDbPath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  db = new DatabaseSync(dbPath);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA busy_timeout = 5000;');
  runMigrations(db);
  return db;
}

function runMigrations(database) {
  database.exec(
    'CREATE TABLE IF NOT EXISTS _migrations (' +
      'name TEXT PRIMARY KEY, ' +
      'applied_at INTEGER NOT NULL' +
      ');'
  );
  const applied = new Set(
    database.prepare('SELECT name FROM _migrations').all().map((row) => row.name)
  );
  const dir = path.join(__dirname, 'migrations');
  const files = fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.sql'))
    .sort();
  const insert = database.prepare(
    'INSERT INTO _migrations (name, applied_at) VALUES (?, ?)'
  );
  for (const file of files) {
    if (applied.has(file)) {
      continue;
    }
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    try {
      database.exec('BEGIN;');
      database.exec(sql);
      insert.run(file, Date.now());
      database.exec('COMMIT;');
    } catch (err) {
      try {
        database.exec('ROLLBACK;');
      } catch (rollbackErr) {
        /* Database sudah di luar transaksi; abaikan. */
      }
      throw err;
    }
  }
}

function closeDb() {
  if (db) {
    try {
      db.close();
    } catch (err) {
      /* Menutup koneksi yang sudah tertutup: abaikan. */
    }
    db = null;
    dbPath = null;
  }
}

/* Dompet default: dibuat saat belum ada dompet sama sekali, sama seperti
   perilaku app Muse (ensureDefaultWallet). Dipanggil saat server mulai dan
   di setiap getMonthData, sehingga menghapus dompet terakhir lalu memuat
   ulang akan memunculkan kembali Tunai Rp0. */
function ensureDefaultWallet(database) {
  const row = database.prepare('SELECT COUNT(*) AS n FROM wallets').get();
  if (row && row.n === 0) {
    database
      .prepare('INSERT INTO wallets (name, initial_balance, created_at) VALUES (?, 0, ?)')
      .run('Tunai', Date.now());
  }
}

module.exports = {
  PROJECT_ROOT,
  closeDb,
  ensureDefaultWallet,
  getDbPath,
  openDb,
  resolveDbPath,
  runMigrations,
};
