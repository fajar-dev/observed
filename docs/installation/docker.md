# Menjalankan dengan Docker

Stack berisi Observed dan PostgreSQL. Host membutuhkan Docker Engine, Docker Compose v2.20+, dan OpenSSL. Node.js, Bun, dan PostgreSQL lokal tidak diperlukan untuk deployment ini.

## Quick start

Dari root repositori:

```sh
sh docker/setup.sh
sh docker/compose.sh up -d --build --wait
sh docker/compose.sh ps
```

Buka **http://localhost:3000/sign-in**, lalu buat administrator pertama. Tidak ada akun/password bawaan. Migrasi dibuat otomatis; setup tidak dapat diulang setelah selesai.

`setup.sh` membuat `.env.docker` dengan password database/admin berbeda, key enkripsi acak 32 byte, dan permission file 0600. File existing tidak ditimpa. Alternatifnya salin [template](../../docker/.env.example) dan isi secret sendiri. File `.env` development terpisah dan tidak disalin ke image.

## Membuka akses jaringan

Default aplikasi hanya dipublikasikan pada `127.0.0.1:3000`. Untuk akses dari komputer lain, ubah `.env.docker`:

```dotenv
OBSERVE_BIND_ADDRESS=0.0.0.0
OBSERVE_HTTP_PORT=3000
```

Buka alamat server dengan port host yang dipilih. Container tetap mendengarkan port 3000. PostgreSQL tidak mempublikasikan port ke host. Terapkan perubahan:

```sh
sh docker/compose.sh up -d --wait
```

Listener bawaan menggunakan HTTP. Domain dan TLS ditangani infrastruktur di luar aplikasi. Teruskan host dan skema request yang benar agar callback OAuth dan cookie mengikuti alamat browser.

## Sumber sensor dan Telegram

Tidak ada InfluxDB bawaan. Setelah sign-in, tambahkan sumber existing di Configuration. Untuk InfluxDB pada host Docker gunakan `http://host.docker.internal:8086`; mapping host-gateway juga tersedia untuk Linux. Alamat LAN dapat dipakai jika container dapat mencapainya. Cek bind server InfluxDB dan firewall host.

Scheduler alert selalu aktif selama aplikasi berjalan. Pause dapat diatur pada masing-masing rule. Google/Microsoft nonaktif sampai di-enable dan dikonfigurasi. Tujuan Telegram ditambahkan melalui UI, bukan dimasukkan sebagai env global. Lihat [environment](../configuration/environment.md).

## Image, runtime, dan volume

[Dockerfile](../../Dockerfile) menggunakan build multi-stage dan dependency lock. Runtime berisi `.output` serta skrip startup/health, berjalan sebagai user non-root `bun`, filesystem read-only, `/tmp` sementara, dropped capabilities dan no-new-privileges. Konfigurasi rahasia dan dependency build tidak disalin ke image.

PostgreSQL 18 menyimpan data pada named volume `postgres_data` di `/var/lib/postgresql`. Role aplikasi memiliki database/schema tetapi bukan superuser dan tidak dapat membuat role/database. Password administrator terpisah dipakai untuk inisialisasi.

Aplikasi mulai setelah database sehat. Health `/api/health` juga memeriksa kesiapan database/migrasi. Kedua service memakai restart policy dan rotasi log. Image mengikuti arsitektur yang disediakan base image; pengujian container repositori dilakukan pada Linux ARM64, bukan klaim bahwa seluruh platform sudah diuji.

## Operasi harian

```sh
sh docker/compose.sh logs --tail=100 -f app
sh docker/compose.sh restart app
sh docker/backup.sh backups/observed-before-update.dump
sh docker/compose.sh up -d --build --wait
sh docker/compose.sh down
```

`down` mempertahankan volume. `down --volumes` menghapus data. Jangan mengganti key enkripsi saat update. Jangan mengganti major PostgreSQL pada volume existing tanpa migrasi database. Mengubah password env tidak merotasi role database yang sudah diinisialisasi.

[Backup dan restore lengkap](../operations/backup-and-recovery.md) menjelaskan ownership role, matching key, dan pemulihan terkontrol. [Troubleshooting](../operations/troubleshooting.md) menjelaskan masalah network dan startup.

## File environment lain

```sh
sh docker/setup.sh /absolute/path/observed.env
OBSERVE_ENV_FILE=/absolute/path/observed.env sh docker/compose.sh up -d --build --wait
```

`COMPOSE_PROJECT_NAME` memisahkan deployment dan namespace volume. Semua helper harus diarahkan ke file/proyek yang sama untuk operasi stack tersebut. Jangan memakai stack pengujian untuk data produksi.

## Image dengan PostgreSQL eksternal

```sh
docker build -t observed:local .
docker run -d --name observed --restart unless-stopped --init \
  --read-only --tmpfs /tmp:size=64m,mode=1777 \
  --cap-drop ALL --security-opt no-new-privileges:true \
  --add-host host.docker.internal:host-gateway \
  --env-file /absolute/path/to/observed.env \
  -p 127.0.0.1:3000:3000 observed:local
```

Isi env dengan `DATABASE_URL`, `OBSERVE_SECRET_KEY`, dan pengaturan opsional yang dibutuhkan. User database harus dapat membuat/memelihara schema observe. Entrypoint mendukung versi `_FILE` untuk secret sebagaimana [referensi env](../configuration/environment.md); jangan isi plain dan `_FILE` bersamaan, serta pastikan file dapat dibaca UID 1000.

Test runtime Docker dijelaskan pada [pengujian](../development/testing.md). Test tersebut melakukan perubahan database dan restore pada stack terisolasi.
