# Referensi environment

Environment server dibaca di [configuration.ts](../../server/bootstrap/configuration.ts), modul auth, dan plugin scheduler. Variabel ini tidak boleh dimasukkan ke payload frontend. Prefix `OBSERVE_` adalah nama konfigurasi teknis yang dipertahankan walaupun nama produk Observed.

## Aplikasi

| Variabel | Default/perilaku | Kegunaan |
| --- | --- | --- |
| `DATABASE_URL` | Wajib | URL `postgresql://` atau `postgres://` database aplikasi |
| `OBSERVE_SECRET_KEY` | Wajib | Base64 yang menghasilkan tepat 32 byte; enkripsi credential dan derivasi signing key JWT |
| `OBSERVE_GOOGLE_ENABLED` | Hanya `true` mengaktifkan | Menampilkan/mengaktifkan sign-in Google |
| `OBSERVE_GOOGLE_CLIENT_ID` | Kosong | Client ID Google |
| `OBSERVE_GOOGLE_CLIENT_SECRET` | Kosong | Client secret Google |
| `OBSERVE_MICROSOFT_ENABLED` | Hanya `true` mengaktifkan | Menampilkan/mengaktifkan sign-in Microsoft |
| `OBSERVE_MICROSOFT_CLIENT_ID` | Kosong | Client ID Microsoft |
| `OBSERVE_MICROSOFT_CLIENT_SECRET` | Kosong | Client secret Microsoft |
| `OBSERVE_MICROSOFT_TENANT_ID` | Kosong | UUID tenant tertentu; bukan `common` atau `organizations` |
| `OBSERVE_OAUTH_ALLOW_SIGNUP` | Hanya `true` mengaktifkan | Mengizinkan identitas OAuth baru membuat akun Viewer setelah setup admin |
| `HOST`, `PORT` | Diatur runtime | Binding server hasil build |
| `NITRO_HOST`, `NITRO_PORT` | Diatur runtime | Pengaturan listener Nitro; container menggunakan port 3000 |
| `NODE_ENV` | Diatur runtime/build | Mode runtime Node-compatible |

`OBSERVE_SETUP_TOKEN` dan `MONITORING_SECRET_KEY` tidak digunakan implementasi saat ini. Simpan key enkripsi tetap sama selama umur data; pergantian key tanpa migrasi credential bukan prosedur rotasi yang tersedia.

## Khusus Docker

Template lengkap ada di [docker/.env.example](../../docker/.env.example).

| Variabel | Default | Fungsi |
| --- | --- | --- |
| `COMPOSE_PROJECT_NAME` | `observed` | Nama stack dan namespace volume |
| `OBSERVE_IMAGE` | `observed:local` | Tag image aplikasi |
| `BUN_VERSION` | `1.4.4` | Argumen build Docker |
| `POSTGRES_DB` | `observed` | Database aplikasi |
| `POSTGRES_HOST` | `database` pada entrypoint | Host database untuk penyusunan URL; Compose menetapkannya internal ke service database |
| `POSTGRES_PORT` | `5432` pada entrypoint | Port database internal, bukan port HTTP host |
| `POSTGRES_USER` | `observed` | Role aplikasi yang dibuat saat init |
| `POSTGRES_PASSWORD` | Dibuat setup | Password role aplikasi |
| `POSTGRES_ADMIN_PASSWORD` | Dibuat setup | Password administrator PostgreSQL, berbeda dari role aplikasi |
| `OBSERVE_HTTP_PORT` | `3000` | Port host yang dipublikasikan |
| `OBSERVE_BIND_ADDRESS` | `127.0.0.1` | Interface host |
| `OBSERVE_ENV_FILE` | `.env.docker` | Lokasi environment yang dibaca helper shell |

Entrypoint image dapat memuat `DATABASE_URL_FILE`, `POSTGRES_PASSWORD_FILE`, `OBSERVE_SECRET_KEY_FILE`, `OBSERVE_GOOGLE_CLIENT_SECRET_FILE`, dan `OBSERVE_MICROSOFT_CLIENT_SECRET_FILE`. Pilih nilai langsung atau versi `_FILE`, jangan keduanya. File harus terbaca UID 1000. Jika tidak disuplai langsung, URL database container dirangkai dari variabel PostgreSQL dengan encoding URL.

## Testing

Environment pengujian (`TEST_DATABASE_URL`, `BROWSER_BASE_URL`, `BROWSER_EXECUTABLE`, `NOTIFICATION_TEST_DATABASE_URL`, `PERMISSION_TEST_DATABASE_URL`, dan `DOCKER_TEST_*`) dijelaskan di [pengujian](../development/testing.md). Environment pengujian tidak menjadi konfigurasi aplikasi produksi.

Restart/recreate proses aplikasi setelah mengubah environment. Pada PostgreSQL yang sudah diinisialisasi, mengubah password di env tidak otomatis mengubah password role database.

## Request dan evaluasi alert

Domain/TLS ditangani infrastruktur di luar aplikasi. Callback OAuth dan cookie mengikuti URL request; tidak ada konfigurasi origin atau trust jaringan di environment. Scheduler alert selalu berjalan selama server hidup. Enable/pause diatur per rule pada UI Alerts.
