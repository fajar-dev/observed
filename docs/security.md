# Keamanan dan batas kepercayaan

## Autentikasi

Password di-hash menggunakan scrypt. Access token JWT HS256 berumur 10 menit, memuat binding sesi dan divalidasi bersama state akun/sesi terkini di database. Signing key diturunkan dari key aplikasi dengan pemisahan penggunaan. Refresh token acak disimpan sebagai hash SHA-256, berotasi, dan replay mencabut sesi. Sesi berumur absolut 30 hari.

Cookie memakai HttpOnly, SameSite Lax dan Secure bila origin HTTPS. Refresh cookie dibatasi path auth. Browser tidak menyimpan token di localStorage. Sign-out/revoke/disable tidak hanya menghapus UI state tetapi mencabut sesi database. Throttle autentikasi disimpan PostgreSQL.

Bootstrap admin satu kali memakai marker database yang persisten. OIDC memverifikasi PKCE/state/nonce/issuer/audience dan identitas provider; tidak menghubungkan akun secara diam-diam berdasarkan email.

## Otorisasi

Middleware memeriksa route/role; PermissionService memeriksa resource; collection dan notifikasi difilter; delete membutuhkan kepemilikan untuk Editor. Jangan mengandalkan route middleware frontend sebagai batas akses.

Semua pengguna sign-in dapat query seluruh source. Model ini tidak mengisolasi raw sensor data antar-tenant. Admin mengendalikan URL sumber dan credential. Koneksi ke jaringan privat memang diperlukan; aplikasi tidak menyediakan sandbox jaringan source. Batasi hak Admin dan network egress sesuai instalasi.

## Secret dan transport

Credential InfluxDB dan token Telegram memakai AES-256-GCM. API tidak mengembalikan plaintext tersimpan. Database backup harus dilindungi bersama key yang dicadangkan terpisah. Belum ada proses rotasi otomatis key yang me-reencrypt semua data.

Mutation API memeriksa Origin/Sec-Fetch-Site; bearer client tetap ditolak jika mengirim Origin yang salah. Body JSON maksimal 2 MiB, remote response maksimal 8 MiB, timeout transport 12 detik, hasil query maksimal 5.000 baris. Remote redirect ditolak.

SQL parameterized dan validasi Zod mengurangi input yang tidak valid. InfluxQL diperiksa read-only, tetapi token InfluxDB read-only tetap wajib sebagai batas privilege nyata; jangan menganggap filter query aplikasi cukup untuk semua kemampuan Flux.

## Operasional

Gunakan host/skema request yang benar, transport HTTPS pada infrastruktur yang sesuai, role database minimum, backup privat, dan least privilege provider/bot. Jangan mencetak secret atau membagikan JSON dashboard yang memuat token dalam query. Docker runtime non-root/read-only bukan pengganti permission resource atau perlindungan host.

Penambahan fitur keamanan harus diuji pada request langsung, akun beda role, grant yang dicabut, sesi kedaluwarsa, dan reconnect stream. Lihat [matriks akses](guides/users-and-permissions.md) serta [test](development/testing.md).
