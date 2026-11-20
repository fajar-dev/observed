# Deployment dan operasi

Gunakan [Docker](../installation/docker.md) untuk stack aplikasi + PostgreSQL, atau [build lokal](../installation/local.md) untuk runtime Bun dengan database eksternal.

## Checklist konfigurasi

1. Database dan role aplikasi terpisah dari PostgreSQL administrator.
2. `OBSERVE_SECRET_KEY` tepat 32 byte setelah base64 decode, disimpan tetap dan dibackup.
3. Request yang diteruskan infrastruktur menggunakan host dan skema browser yang benar.
4. Sumber InfluxDB dapat dicapai dari runtime server; browser tidak mengakses credential langsung.
5. Outbound Telegram/provider tersedia jika diaktifkan.
6. Proses aplikasi hidup terus-menerus; scheduler alert selalu aktif.
7. Database, volume, backup, dan akses host dipantau.

Domain dan TLS dikelola infrastruktur di luar aplikasi. Callback OAuth dan atribut Secure cookie mengikuti URL request yang diterima runtime. Host dan skema request harus sesuai alamat yang dibuka browser; aplikasi tidak menyediakan pengaturan domain atau kepercayaan jaringan melalui environment. IP untuk throttle menggunakan alamat client yang diberikan runtime.

## Health dan diagnostik

`GET /api/health` bersifat publik, `Cache-Control: no-store`, dengan body `{"status":"ok"}` (200) atau `{"status":"unavailable"}` (503). Probe memeriksa koneksi database dan kesiapan migrasi. Health tidak membuktikan InfluxDB, Telegram, dan provider OAuth semuanya sehat. Uji koneksi source/tujuan melalui Configuration dan periksa evaluasi alert.

```sh
sh docker/compose.sh ps
sh docker/compose.sh logs --tail=100 app
sh docker/compose.sh logs --tail=100 database
curl --fail http://localhost:3000/api/health
```

Log tidak boleh membocorkan env, URL credential, hash password, token, atau raw cookie. Saat melaporkan masalah, kirim status HTTP, pesan tersanitasi, langkah reproduksi, dan waktu kejadian.

## Multi-instance

Semua instance harus memakai database dan key enkripsi yang sama. Masing-masing memiliki pool koneksi sendiri. Lock per rule mengurangi evaluasi ganda; notifikasi menggunakan PostgreSQL sehingga stream tidak tergantung satu proses. Ini tidak menjamin exactly-once pengiriman Telegram jika crash terjadi di tengah pengiriman eksternal.

Scheduler berjalan pada setiap instance aplikasi. Lock database mengoordinasikan rule agar tidak dievaluasi bersamaan. Gunakan pause/enable pada masing-masing rule untuk mengatur evaluasi; tidak ada sakelar scheduler global. Pertimbangkan beban InfluxDB, jumlah panel/user, refresh, dan interval alert sebelum menambah replica.

## Upgrade

Buat backup database+key, periksa perubahan schema/environment, build versi baru dan jalankan health, uji sign-in, query source, dashboard, serta preview alert. Migrasi otomatis bukan rollback otomatis. Jika perlu kembali ke versi lama, gunakan rencana recovery database yang kompatibel. Jangan melakukan major upgrade PostgreSQL dengan sekadar mengganti tag image pada volume lama.
