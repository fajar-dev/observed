# Sign-in, profil, dan provider

## Password dan setup

Setup administrator hanya tersedia sekali sebelum database diinisialisasi. Tidak ada pendaftaran lokal publik, akun default, atau alur email forgot-password. Administrator mengelola akun/reset password melalui Users. Logout tidak membuka setup kembali.

Sign-in memakai email/password. Akses browser disimpan dalam cookie HttpOnly, bukan localStorage. Access JWT berlaku 10 menit; refresh token opaque berotasi dengan sesi absolut 30 hari. Refresh token yang dipakai ulang mencabut sesi terkait. Sign out mencabut sesi saat ini dan membersihkan cookie.

## Profile

Menu akun → **Profile** menyediakan perubahan nama, password lokal dengan current password, daftar metode sign-in yang terhubung, serta browser sessions. Email ditampilkan read-only pada profil pribadi. Perubahan password mencabut sesi dan meminta sign-in kembali. Form akun memakai dua kolom pada layar lebar dan satu kolom pada mobile. Daftar Active sessions berada pada bagian tersendiri selebar halaman, menempatkan sesi saat ini paling atas, serta menampilkan 10 sesi per halaman. Revoke session dapat dilakukan untuk sesi lain atau sesi saat ini; revoke sesi saat ini langsung keluar.

## Preferensi notifikasi

Di Profile → Notifications, switch **Alert pop-ups** aktif secara default untuk akun baru maupun existing. Perubahan langsung disimpan per akun tanpa menekan Save changes. Saat dimatikan, hanya pop-up firing/recovery yang dihentikan; inbox, unread count, pembaruan alert, toast hasil aksi biasa, dan pengiriman Telegram tetap berjalan. Pilihan tersimpan setelah sign-in ulang. Browser/sesi lain membaca pilihan tersimpan saat memperbarui data akun atau reload.

## Google dan Microsoft

Administrator menyiapkan aplikasi OAuth web confidential pada provider, lalu mengisi environment dan restart Observed. Daftarkan callback sesuai alamat aplikasi yang dibuka browser. Alamat ini mengikuti request dan tidak memerlukan environment domain:

```text
<URL_APLIKASI>/api/observe/auth/oauth/google/callback
<URL_APLIKASI>/api/observe/auth/oauth/microsoft/callback
```

Google membutuhkan client ID/secret dan email terverifikasi dari ID token. Microsoft membutuhkan client ID/secret, UUID tenant tertentu, serta claim `email` yang valid; akun tenant lain ditolak. Aplikasi tidak mendukung tenant `common` atau `organizations` pada implementasi ini. Tombol provider hanya muncul jika `OBSERVE_<PROVIDER>_ENABLED=true`; enabled tanpa credential lengkap menyebabkan konfigurasi gagal.

Secara default identitas baru tidak membuat akun otomatis. Pengguna existing sign-in lokal terlebih dahulu, buka **Profile → Sign-in methods**, lalu hubungkan provider. Identitas diikat ke provider dan subject, bukan otomatis ditautkan hanya karena email sama. Email yang bentrok membutuhkan linking eksplisit.

`OBSERVE_OAUTH_ALLOW_SIGNUP=true` mengizinkan identitas baru membuat Viewer setelah setup admin. Administrator masih perlu memberi permission resource. Menonaktifkan provider di env menghentikan sign-in melalui provider itu; pastikan administrator mempunyai metode sign-in lain sebelum menonaktifkannya. UI saat ini tidak menyediakan unlink provider.

OIDC memakai authorization code, PKCE S256, state, nonce, dan pemeriksaan ID token. Token provider tidak dijadikan credential sumber sensor dan tidak disimpan sebagai sesi refresh Observed. Konfigurasi OAuth bukan proses setup administrator pertama.
