# monthly-tracker-expenses

Tracker Pengeluaran Bulanan — versi standalone dalam Bahasa Indonesia dan Rupiah.

Catat pemasukan, pengeluaran, dompet, dan transfer antar dompet. Tampilan dan rumusnya sama dengan versi app Muse, tetapi versi ini berdiri sendiri dan datanya tersimpan di browser.

## Cara membuka

Buka `index.html` langsung di browser, atau deploy repo ini sebagai situs statis (misalnya GitHub Pages, Vercel, atau Netlify). Tidak perlu build dan tidak perlu server.

## Cara kerja data

- Data tersimpan di `localStorage` browser dengan kunci `monthly-tracker-expenses:v1`.
- Data mulai kosong, kecuali satu dompet `Tunai` dengan saldo awal Rp0 yang dibuat otomatis saat belum ada dompet.
- Data tidak tersinkron antar perangkat atau antar browser, dan tidak terhubung ke app Muse.
- Menghapus data browser bisa menghapus data tracker ini.

## Rumus

- **Jumlah Uang** = total saldo awal semua dompet + pemasukan di bulan yang dipilih.
- **Sisa** = Jumlah Uang − pengeluaran di bulan yang dipilih.
- **Saldo dompet** dihitung sepanjang waktu: saldo awal + semua pemasukan − semua pengeluaran + semua transfer masuk − semua transfer keluar.
- Transfer tidak pernah mengubah Jumlah Uang atau Sisa.

## Fitur

- Navigasi bulan tanpa batas, dengan tombol `Bulan ini` saat sedang melihat bulan lain.
- Form Pengeluaran (dengan dropdown kategori), Pemasukan, dan Transfer, masing-masing dengan Tanggal dan Jam (24 jam, default jam perangkat saat form dibuka).
- Riwayat bulan yang dipilih, diurutkan dari tanggal terbaru, lalu jam terbaru.
- Pie chart pengeluaran per kategori dalam persentase, lengkap dengan legenda.
- Dompet bisa ditambah, diubah, dan dihapus. Dompet yang sudah punya riwayat tidak bisa dihapus.
- Peringatan saat tanggal entri masuk ke bulan lain, dan saat transfer melebihi saldo dompet asal. Keduanya tetap bisa disimpan setelah dikonfirmasi.
- Bahasa halaman `id`, zoom tetap diizinkan, target sentuh minimal 44px, dan modal bisa ditutup dengan Escape.

## File

- `index.html` — struktur halaman dan form.
- `styles.css` — gaya flat lime, hitam, dan pale mint dengan Plus Jakarta Sans.
- `app.js` — seluruh logika tracker dan penyimpanan lokal.

## Catatan

Versi ini dibuat ulang sebagai aplikasi statis untuk GitHub. Perubahan di app Muse tidak otomatis masuk ke sini, dan sebaliknya.
