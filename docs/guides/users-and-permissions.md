# User, role, dan permission

Role membatasi jenis tindakan. Permission menentukan dashboard dan alert mana yang dapat diakses. Keduanya diperiksa server; menyembunyikan tombol UI saja bukan otorisasi.

## Matriks akses

| Tindakan | Admin | Editor | Viewer |
| --- | --- | --- | --- |
| Membuat dashboard/alert | Ya | Ya, tanpa perlu akses resource existing | Tidak |
| Membaca resource existing | Semua | Sesuai View/Edit grant | Sesuai View grant |
| Mengubah/evaluate alert existing | Semua | Memerlukan Edit grant | Tidak |
| Menghapus dashboard/alert | Semua | Hanya miliknya sendiri dan masih Edit | Tidak |
| Melihat sumber dan menjalankan query | Ya | Ya, semua sumber | Ya, semua sumber |
| Mengubah/test koneksi sumber/Telegram | Ya | Tidak | Tidak |
| Mengelola user/permission | Ya | Tidak | Tidak |
| Mengelola folder secara langsung | Ya | Tidak | Tidak |
| Membaca notifikasi | Semua alert | Mengikuti akses alert | Mengikuti akses alert |
| Mengelola profil/sesi sendiri | Ya | Ya | Ya |

Editor otomatis menerima grant Edit yang bisa dicabut untuk resource yang baru dibuatnya. Grant disimpan bersama resource dalam transaksi yang sama. Pembuat tidak mempunyai bypass permanen setelah grant dicabut. Resource lama tanpa `createdBy` hanya dapat dihapus Admin.

## Menambah user

Buka **Users → Add user**, isi nama, email, role, status enabled, dan password untuk akun lokal baru. Password memakai 12–128 karakter. Password opsional pada edit berarti tidak mengganti password existing; pembuatan user lokal melalui Users tetap mewajibkan password. User baru selain Admin mulai tanpa akses dashboard/alert existing; sumber tetap bisa di-query. User OAuth baru juga mulai sebagai Viewer jika signup provider diizinkan.

## Mengatur permission

Buka menu user → **Permissions**. Atur Dashboard dan Alert secara terpisah:

- **No access**: tidak ada resource existing yang tersedia.
- **Selected resources**: pilih ID resource dan level View/Edit masing-masing.
- **All resources**: level dasar untuk seluruh resource, termasuk resource baru; grant per item dapat mengubah levelnya.

Viewer tetap dibatasi View walaupun payload meminta Edit. Admin selalu memiliki semua akses. Tidak ada permission source, notification, folder inheritance, team, atau multi-organization.

Menyimpan permission mencabut sesi target user sehingga akses diperbarui pada sign-in berikutnya. Perubahan password, role/email tertentu, atau menonaktifkan user juga mencabut sesi sesuai kebijakan auth. User tidak dapat menonaktifkan/menghapus/menurunkan role dirinya sendiri melalui administrasi; Admin aktif terakhir dilindungi.

## Catatan pemisahan data

Membatasi dashboard tidak menyembunyikan raw data InfluxDB dari pengguna yang sign-in, karena seluruh pengguna memang diizinkan query semua sumber. Jangan memakai model ini untuk tenant yang harus saling terisolasi pada level data sensor. Pisahkan deployment/database/sumber atau desain otorisasi data khusus bila kebutuhan tersebut muncul.
