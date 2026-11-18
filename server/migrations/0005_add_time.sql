-- 0005: Tambah kolom time (nullable) pada transactions dan transfers.
-- Entri lama tetap NULL: tidak ada jam palsu. Entri tanpa jam ditampilkan
-- hanya tanggalnya dan diurutkan terakhir dalam harinya.
-- Penomoran 0005 disengaja: migrasi ini mencerminkan langkah evolusi app Muse
-- yang diketahui (jam ditambahkan belakangan). Tidak ada file 0002-0004 karena
-- tidak ada langkah perantara yang bisa dibuktikan; mengarangnya berarti
-- mengarang riwayat. Lihat README bagian "Migrasi".
ALTER TABLE transactions ADD COLUMN time TEXT;
ALTER TABLE transfers ADD COLUMN time TEXT;
