-- 0001: Skema awal. Sengaja TANPA kolom time pada transactions dan transfers:
-- kolom time ditambahkan belakangan sebagai nullable lewat 0005_add_time.sql,
-- mencerminkan evolusi app Muse yang diketahui (pencatatan jam ditambahkan
-- setelah fitur bulan dan transfer, tanpa mengarang jam untuk entri lama).
CREATE TABLE IF NOT EXISTS wallets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  initial_balance INTEGER NOT NULL DEFAULT 0 CHECK (initial_balance >= 0),
  created_at INTEGER NOT NULL,
  UNIQUE (name COLLATE NOCASE)
);

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
  amount INTEGER NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Lainnya',
  wallet_id INTEGER NOT NULL REFERENCES wallets (id),
  date TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions (date);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet ON transactions (wallet_id);

CREATE TABLE IF NOT EXISTS transfers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_wallet_id INTEGER NOT NULL REFERENCES wallets (id),
  to_wallet_id INTEGER NOT NULL REFERENCES wallets (id),
  amount INTEGER NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL DEFAULT '',
  date TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  CHECK (from_wallet_id <> to_wallet_id)
);
CREATE INDEX IF NOT EXISTS idx_transfers_date ON transfers (date);

-- Budget per kategori per bulan. UI tidak menampilkan kontrol budget
-- (sesuai penyederhanaan v14), tetapi tabel dan action setBudget dipertahankan
-- agar arsitektur sama dengan app Muse.
CREATE TABLE IF NOT EXISTS budgets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  month TEXT NOT NULL,
  category TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount >= 0),
  UNIQUE (month, category)
);
CREATE INDEX IF NOT EXISTS idx_budgets_month ON budgets (month);
