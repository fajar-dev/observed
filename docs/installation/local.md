# Instalasi lokal

## Prasyarat

Siapkan Git, Bun sesuai `packageManager` di [package.json](../../package.json) (saat ini 1.4.4), Node.js yang kompatibel dengan dependency Nuxt untuk tooling, dan PostgreSQL. Deployment Docker menggunakan PostgreSQL 18. Gunakan [Docker](docker.md) bila tidak ingin memasang database lokal.

Sediakan instance InfluxDB yang berisi data sensor. Aplikasi tidak membuat bucket maupun memasukkan sample sensor secara otomatis.

## Menjalankan

Dari root repositori:

```sh
bun install --frozen-lockfile
cp .env.example .env
openssl rand -base64 32
```

Simpan hasil perintah terakhir sebagai `OBSERVE_SECRET_KEY` di `.env`. Jangan memasukkan secret ke Git. Siapkan database dengan role khusus. Contoh melalui `psql` sebagai administrator PostgreSQL:

```sql
CREATE ROLE observed LOGIN;
\password observed
CREATE DATABASE observed OWNER observed;
```

Isi konfigurasi dengan password yang dibuat. Karakter khusus pada bagian password URL harus di-percent-encode:

```dotenv
DATABASE_URL=postgresql://observed:YOUR_URL_ENCODED_PASSWORD@127.0.0.1:5432/observed
OBSERVE_SECRET_KEY=YOUR_32_BYTE_BASE64_KEY
```

```sh
bun run dev
```

Buka `http://localhost:3000/sign-in`, isi nama, email, dan password administrator pertama (12–128 karakter). Setup tersimpan permanen di database dan tidak dibuka kembali setelah restart. Tidak ada setup token atau akun bawaan.

Migrasi dijalankan otomatis saat database pertama kali digunakan, termasuk melalui health check. Role aplikasi harus dapat membuat dan memelihara schema `observe`. Setelah sign-in, lanjutkan ke [Configuration](../configuration/data-sources.md).

## Build produksi tanpa Docker

```sh
bun run build
bun --env-file=.env .output/server/index.mjs
```

Hasil build berada di `.output`. `bun run start` menjalankan output tersebut, tetapi environment produksi harus sudah dimuat oleh proses pemanggil; jangan menganggap Nuxt otomatis membaca `.env` saat menjalankan server hasil build. Atur `HOST`/`PORT` atau `NITRO_HOST`/`NITRO_PORT` sesuai kebutuhan listener. Callback autentikasi mengikuti URL request tanpa konfigurasi origin environment.

## Memeriksa kesiapan

```sh
curl --fail http://localhost:3000/api/health
bun run lint
bun run typecheck
bun run test
```

Health yang sukses mengembalikan `{"status":"ok"}`. HTTP 503 berarti aplikasi/database belum siap; lihat [troubleshooting](../operations/troubleshooting.md). Test integrasi menggunakan database terpisah, bukan database aplikasi ini.
