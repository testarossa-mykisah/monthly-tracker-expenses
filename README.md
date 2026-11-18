# monthly-tracker-expenses

Tracker Pengeluaran Bulanan — aplikasi fullstack dalam Bahasa Indonesia dan Rupiah.

Catat pemasukan, pengeluaran, dompet, dan transfer antar dompet. Versi ini
adalah rebuild yang setia pada app Muse (tracker v14): struktur proyek,
model data, nama action, rumus, guard, dan tampilannya disamakan. Ini
**bukan** salinan kode sumber app Muse — kode sumber artifact Muse tidak
tersedia sebagai file dan tidak bisa di-copy — melainkan penulisan ulang
dari spesifikasi perilaku yang sama.

## Menjalankan

Persyaratan: Node.js >= 22.5 (memakai `node:sqlite` bawaan). Tanpa
dependensi, tanpa build step, tanpa `npm install`.

```sh
node server/index.js
# atau:
npm start
```

Lalu buka http://127.0.0.1:3000 di browser.

Env yang didukung:

| Variabel | Default | Keterangan |
| --- | --- | --- |
| `PORT` | `3000` | Port HTTP. |
| `HOST` | `127.0.0.1` | Alamat bind. Server hanya mendengarkan lokal secara default. |
| `DATA_DIR` | `<proyek>/data` | Direktori file database (`tracker.db` di dalamnya). |
| `DB_PATH` | — | Path file database persis; mengalahkan `DATA_DIR`. |

Database SQLite dibuat otomatis saat server pertama kali berjalan. File
`data/` tidak di-commit (lihat `.gitignore`).

> Catatan keamanan: aplikasi ini untuk pemakaian lokal satu pengguna, tanpa
> login. Jangan mengeksposnya ke internet tanpa lapisan auth di depannya.

## Arsitektur

```
.
├── package.json            # zero dependencies, start: node server/index.js
├── server/
│   ├── index.js            # HTTP stdlib: file statis + API JSON
│   ├── db.js               # node:sqlite, runner migrasi, dompet default
│   ├── validation.js       # validasi bersama (jumlah/waktu/tanggal/nama)
│   ├── migrations/         # 0001 skema awal, 0005 kolom time (nullable)
│   └── actions/            # satu modul per kelompok action
│       ├── index.js        # registri nama action -> handler
│       ├── getMonthData.js # ringkasan + riwayat + saldo (dihitung server)
│       ├── transactions.js # create/update/delete transaction
│       ├── wallets.js      # create/update/delete wallet
│       ├── transfers.js    # create/update/delete transfer
│       ├── budgets.js      # setBudget (tanpa UI, cerminan artifact)
│       └── rows.js         # pemetaan baris + saldo sepanjang waktu
└── client/                 # tanpa framework, ES modules, tanpa build
    ├── index.html
    ├── styles.css          # flat lime/hitam/pale, Plus Jakarta Sans
    └── src/
        ├── main.js         # entry: state bulan, render, alur hapus
        ├── api.js          # fetch POST /api/<action>
        ├── format.js       # format Rupiah/tanggal/bulan + kategori
        ├── modal.js        # Escape/backdrop/focus trap/scroll lock
        └── components/     # MonthNav, SummaryCard, PieChart, WalletList,
                            # HistoryList, TransactionModal, TransferModal,
                            # WalletModal, ConfirmDialog, Toast
```

Klien hanya bicara ke API; tidak ada `localStorage` sebagai penyimpanan.
Semua total dan saldo dihitung di server (`getMonthData`). Klien
menampilkan error API secara eksplisit (banner halaman, pesan form, toast).

Perbedaan penyimpanan dibanding app Muse: app Muse memakai database
terkelola milik runtime Muse; versi ini memakai file SQLite lokal
(`data/tracker.db`). Data tidak tersinkron ke app Muse dan sebaliknya.

## API

Semua endpoint: `POST /api/<namaAction>` dengan badan JSON, jawaban JSON
`{ "ok": true, "data": ... }` atau `{ "ok": false, "error": "..." }`
(pesan error dalam Bahasa Indonesia, kode HTTP yang sesuai: 400 validasi,
404 tidak ditemukan, 409 konflik seperti nama duplikat / hapus dompet
berisi riwayat).

| Action | Badan | Keterangan |
| --- | --- | --- |
| `getMonthData` | `{ month: "YYYY-MM" }` | Ringkasan bulan + transaksi/transfer bulan itu + dompet (saldo sepanjang waktu) + history terurut + budgets. Juga memastikan dompet `Tunai` Rp0 ada saat belum ada dompet. |
| `createTransaction` | `{ type, amount, description, category, walletId, date, time }` | `type`: `expense`/`income`. Pemasukan dipaksa berkategori `Lainnya`. |
| `updateTransaction` | `{ id, ... }` | Field sama seperti create. |
| `deleteTransaction` | `{ id }` | — |
| `createWallet` | `{ name, initialBalance }` | Nama unik (tanpa membedakan huruf). Saldo awal >= 0. |
| `updateWallet` | `{ id, name, initialBalance }` | — |
| `deleteWallet` | `{ id }` | Ditolak bila dompet punya riwayat transaksi/transfer. |
| `createTransfer` | `{ fromWalletId, toWalletId, amount, description, date, time }` | Asal != tujuan. Melebihi saldo asal diizinkan (peringatan hanya di klien). |
| `updateTransfer` | `{ id, ... }` | Field sama seperti create. |
| `deleteTransfer` | `{ id }` | Saldo kembali seperti sebelum transfer. |
| `setBudget` | `{ month, category, amount }` | Upsert budget per (bulan, kategori). Tanpa UI. |

`amount` boleh dikirim sebagai string mentah dari form (`"50000"`) atau
angka JSON bilangan bulat. String seperti `"50.000"`, `"-100"`, atau
`"12,5"` ditolak server — tidak pernah dibersihkan diam-diam. `time`
boleh kosong/`null` (disimpan NULL, ditampilkan hanya tanggalnya);
jam yang diisi harus `HH:MM` 24 jam yang valid.

## Skema database

- `wallets(id, name UNIQUE NOCASE, initial_balance, created_at)`
- `transactions(id, type, amount, description, category, wallet_id, date, time NULL, created_at)`
- `transfers(id, from_wallet_id, to_wallet_id, amount, description, date, time NULL, created_at)`
- `budgets(id, month, category, amount, UNIQUE(month, category))`
- `_migrations(name, applied_at)` — pelacak migrasi internal.

### Migrasi

- `0001_create_tables.sql` — keempat tabel di atas, dengan `transactions`
  dan `transfers` **tanpa** kolom `time`.
- `0005_add_time.sql` — menambah kolom `time` nullable di kedua tabel.

Tidak ada file `0002`–`0004`: penomoran `0005` disengaja untuk
mencerminkan evolusi app Muse yang diketahui (kolom jam ditambahkan
belakangan sebagai nullable, tanpa mengarang jam untuk entri lama), dan
tidak ada langkah perantara yang bisa dibuktikan. Mengarang file migrasi
perantara berarti mengarang riwayat. Runner migrasi di `server/db.js`
bersifat idempotent: migrasi yang sudah tercatat dilewati, sehingga
restart server aman dan data bertahan.

## Rumus

- **Jumlah Uang** = total saldo awal semua dompet + pemasukan di bulan yang dipilih.
- **Sisa** = Jumlah Uang − pengeluaran di bulan yang dipilih.
- **Saldo dompet** dihitung sepanjang waktu: saldo awal + semua pemasukan − semua pengeluaran + semua transfer masuk − semua transfer keluar.
- Transfer tidak pernah mengubah Jumlah Uang atau Sisa.

## Fitur

- Navigasi bulan tanpa batas, dengan tombol `Bulan ini` saat sedang melihat bulan lain.
- Form Pengeluaran (dropdown kategori, hanya untuk pengeluaran), Pemasukan, dan Transfer, masing-masing dengan Tanggal dan Jam (24 jam, default jam perangkat saat form dibuka, bisa diubah).
- Riwayat bulan yang dipilih: tanggal terbaru dulu, lalu jam terbaru; entri tanpa jam terakhir dalam harinya; transfer menyatu dalam urutan yang sama.
- Pie chart pengeluaran per kategori dalam persentase, lengkap dengan legenda.
- Dompet bisa ditambah, diubah, dan dihapus. Dompet yang sudah punya riwayat tidak bisa dihapus.
- Peringatan saat tanggal entri masuk ke bulan lain dan saat transfer melebihi saldo dompet asal. Keduanya tetap bisa disimpan setelah dikonfirmasi.
- Bahasa halaman `id`, zoom tetap diizinkan, target sentuh minimal 44px, modal bisa ditutup dengan Escape, dan animasi menghormati `prefers-reduced-motion`.

## Catatan

Perubahan di app Muse tidak otomatis masuk ke sini, dan sebaliknya.
Kedua versi adalah codebase yang terpisah dengan perilaku yang disamakan.
