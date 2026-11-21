# Notifikasi dalam aplikasi

Ikon lonceng berada di header setiap pengguna yang sign-in, termasuk akun yang belum diberi akses satu alert pun. Tidak ada konfigurasi channel internal atau permission notifikasi terpisah. Notifikasi otomatis mengikuti alert yang dapat dilihat pengguna.

## Membaca inbox

Klik lonceng untuk melihat daftar firing/recovery terbaru, status belum dibaca, nama alert, sumber, nilai/threshold, dan waktu. Membuka item menandainya telah dibaca; aksi mark all read menerapkan status sampai cursor saat ini. Status baca milik masing-masing user, bukan seluruh pengguna.

Inbox memuat maksimal 50 item terbaru yang diizinkan. Jumlah unread menghitung seluruh item yang belum dibaca, sehingga dapat lebih besar dari panjang daftar. Daftar kosong dapat berarti belum ada event atau belum ada akses rule.

## Realtime

Aplikasi membuka koneksi SSE terautentikasi dan menampilkan toast ketika menerima event baru. Histori awal tidak dimunculkan ulang sebagai toast. Switch **Profile → Notifications → Alert pop-ups** aktif secara default dan dapat dimatikan per akun. Saat dimatikan, toast alert yang masih tampil ditutup dan event berikutnya tetap memperbarui inbox/unread tanpa pop-up. Mengaktifkannya kembali hanya menampilkan toast untuk event baru, bukan memutar ulang event yang diterima saat dimatikan. Jika stream gagal, client menggunakan polling JSON. Sign-out menutup subscription dan membersihkan state/toast akun sebelumnya.

Server membaca event persisten dari PostgreSQL, sehingga beberapa instance aplikasi dapat menyampaikan event yang sama kepada pengguna yang tepat. SSE menggunakan cursor sequence berbentuk string; jangan mengubahnya menjadi JavaScript Number karena dapat kehilangan presisi bigint.

Permission diperiksa pada daftar, replay, dan mark read. Setelah akses suatu alert dicabut, notifikasinya tidak lagi tersedia untuk akun tersebut. Administrator dapat tetap membaca snapshot historis termasuk setelah rule dihapus; akun Selected kehilangan akses jika grant resource sudah hilang.

Kiosk menyembunyikan header global, termasuk lonceng, tetapi tidak menjadikan sesi anonim. Telegram dijelaskan pada [Configuration](../configuration/telegram.md); kegagalan Telegram tidak berarti inbox otomatis gagal.
