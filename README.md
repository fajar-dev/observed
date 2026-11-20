# Observed

Observed adalah aplikasi dashboard untuk **structural health monitoring**. Aplikasi ini membantu civil engineer, kontraktor, dan pemilik bangunan atau jembatan memantau metrik sensor IoT dari berbagai sumber InfluxDB dalam satu tampilan.

Dashboard dapat disesuaikan melalui panel visualisasi, filter sensor, row accordion, layout drag/resize, dan mode kiosk. Rule alert memantau threshold sensor serta mengirim notifikasi dalam aplikasi secara realtime dan ke beberapa tujuan Telegram. Akun menggunakan role Admin, Editor, atau Viewer dengan akses per dashboard dan alert.

Observed menggunakan Nuxt, Nuxt UI, Bun, dan PostgreSQL untuk konfigurasi aplikasi. Data pengukuran tetap berada di InfluxDB.

## Jalankan dengan Docker

Siapkan Docker Engine, Docker Compose v2.20+, dan OpenSSL, lalu jalankan dari root repositori:

```sh
sh docker/setup.sh
sh docker/compose.sh up -d --build --wait
```

Buka **http://localhost:3000/sign-in** dan buat administrator pertama. Stack menjalankan Observed dan PostgreSQL. InfluxDB menggunakan sumber yang sudah Anda miliki.

## Dokumentasi

Baca **[dokumentasi lengkap](docs/README.md)** untuk panduan pengguna, pengembang, dan AI coding agent. Detail deployment, konfigurasi port, backup, dan restore tersedia di **[panduan Docker](docs/installation/docker.md)**.
