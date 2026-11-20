# Configuration: Telegram

Telegram bersifat opsional. Setiap alert tetap menghasilkan notifikasi dalam aplikasi untuk pengguna yang memiliki akses alert, tanpa konfigurasi tujuan terpisah.

## Membuat tujuan

1. Siapkan bot Telegram melalui BotFather dan simpan token secara privat.
2. Mulai percakapan dengan bot atau tambahkan bot ke grup/channel tujuan serta berikan hak mengirim pesan.
3. Buka **Configuration → Telegram destinations → Add Telegram destination**.
4. Isi nama, chat ID numerik (termasuk ID grup negatif) atau `@username` yang didukung, dan token bot.
5. Simpan, lalu gunakan aksi pengujian pada tujuan tersebut. Pengujian ini benar-benar mengirim pesan Telegram.
6. Pada editor alert pilih satu atau beberapa tujuan, lalu simpan rule.

Aplikasi mendukung banyak tujuan dan maksimal 20 tujuan unik per rule. Penambahan tujuan di Configuration tidak otomatis memilihnya untuk setiap rule.

## Edit dan pengiriman

Token tersimpan tidak ditampilkan kembali. Field token kosong saat edit mempertahankan token lama. Tujuan yang masih digunakan rule tidak dapat dihapus sampai referensinya dilepas.

Pesan firing dan recovery memuat nama alert, sumber, nilai, operator/threshold, waktu kejadian, serta severity/summary jika tersedia. Pesan memakai HTML yang di-escape; waktu pesan diformat WIB. Nilai mengikuti hasil numerik query, bukan konversi unit otomatis dari judul alert.

Kegagalan Telegram dicatat sebagai delivery error pada evaluasi. Aplikasi mencoba lagi pada evaluasi berikutnya untuk tujuan yang belum berhasil; notifikasi dalam aplikasi tidak mensyaratkan keberhasilan Telegram. Pengiriman eksternal tidak mempunyai jaminan exactly-once bila proses berhenti setelah Telegram menerima pesan tetapi sebelum status disimpan.

## Jika pesan tidak masuk

Periksa token, chat ID, apakah bot sudah di-start, keanggotaan/hak kirim grup atau channel, koneksi keluar server ke Telegram, status enabled rule, pending period, mute, dan hasil query. Preview hanya menguji kondisi dan tidak mengirim notifikasi. Lihat [siklus alert](../guides/alerts.md).
