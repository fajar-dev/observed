# Pengujian dan quality checks

Jalankan dari root repositori setelah dependency dan Nuxt prepare tersedia. Jangan menggunakan database aplikasi aktif. Check yang di-skip karena dependency/environment tidak tersedia harus dilaporkan sebagai skip, bukan pass.

## Pemeriksaan dasar

```sh
bun run lint
bun run typecheck
bun run test
bun run docs:check
bun run audit:architecture --inventory
bun run build
```

Lint mencakup semantic UI dan aturan Tailwind. Typecheck mencakup kontrak Nuxt/TypeScript. Unit test memeriksa aturan auth/permission, layout/refresh/import, query, service, transport, container env, health, serta notifikasi. Build memeriksa output deployable. Architecture audit memeriksa dependency/reachability statis dan larangan notifikasi inline; bukan bukti semua perilaku runtime benar.

`docs:check` memeriksa link lokal Markdown, contoh JSON terhadap schema, environment template, dan katalog endpoint. Perbarui inventory bila source/runtime berubah. Jangan mengandalkan angka jumlah test dari laporan historis sebagai syarat tetap.

## Integrasi PostgreSQL

Buat database terpisah yang namanya berakhiran `_test`. Set `TEST_DATABASE_URL` ke database itu. File integrasi melakukan DROP/recreate schema `observe`; suffix hanya guard, bukan pengganti memastikan database benar.

Jika file memakai database yang sama, jalankan satu per satu agar reset schema tidak balapan:

```sh
export TEST_DATABASE_URL='postgresql://TEST_USER:TEST_PASSWORD@127.0.0.1:5432/observed_test'
(
  set -e
  for spec in tests/integration/*.test.ts; do
    bun test --tsconfig-override .nuxt/tsconfig.server.json "$spec"
  done
)
```

Subshell dengan `set -e` meneruskan kegagalan sebagai exit nonzero. Script `test:integration` tersedia, tetapi jangan menjalankan file yang saling mereset schema secara paralel pada database sama. Cakupan: auth setup/refresh/sesi, persistensi resource/revision, enkripsi, grant, dan notifikasi atomik/filter baca.

## Browser dengan fixture

Server aplikasi harus berjalan, misalnya pada port 3000. Playwright-core menggunakan Chrome lokal: deteksi Chrome macOS, `BROWSER_EXECUTABLE` untuk path eksplisit, atau channel `chrome` yang terinstal. Tidak ada download browser otomatis dari playwright-core.

```sh
BROWSER_BASE_URL=http://localhost:3000 \
  node --test --test-concurrency=1 tests/browser/*.test.mjs
```

Sebagian besar browser tests memock API dengan fixture, memeriksa layout auth, identitas, sidebar aktif, row, kiosk, responsive drag/resize, refresh, modal, dan visualisasi. Screenshot sementara yang dibuat test berada di `/tmp`, bukan artefak untuk commit.

## Browser live: permission dan inbox

Dua test opt-in memakai `PERMISSION_TEST_DATABASE_URL` dan `NOTIFICATION_TEST_DATABASE_URL`. Database harus berakhiran `_test` dan harus sama dengan DATABASE_URL aplikasi uji yang dibuka oleh BROWSER_BASE_URL. Jalankan aplikasi uji dengan key valid dan sumber sensor simulasi. Scheduler juga aktif pada aplikasi uji; gunakan rule paused di luar langkah evaluasi, atau interval panjang sesudah evaluasi manual awal agar pengukuran uji tidak berubah karena evaluasi terjadwal.

```sh
BROWSER_BASE_URL=http://127.0.0.1:3001 \
PERMISSION_TEST_DATABASE_URL='postgresql://TEST_USER:TEST_PASSWORD@127.0.0.1:5432/observed_browser_test' \
NOTIFICATION_TEST_DATABASE_URL='postgresql://TEST_USER:TEST_PASSWORD@127.0.0.1:5432/observed_browser_test' \
node --test --test-concurrency=1 \
  tests/browser/permissions.test.mjs tests/browser/alert-notifications.test.mjs
```

Test menginisialisasi/sign-in akun fixture `notifications@example.test` dengan password uji yang ada di source, membuat resource/account, memasukkan event, dan dapat TRUNCATE notifikasi. Mulai dari database QA baru agar tidak bentrok dengan akun admin berbeda. Test source memakai server sensor simulasi, bukan InfluxDB/Telegram produksi. Jangan arahkan live test ke deployment aktif walaupun hanya ingin screenshot.

## Runtime Docker

Host pengujian memerlukan dependency development, Node.js, dan Chrome selain Docker. Buat environment/stack baru:

```sh
sh docker/setup.sh /tmp/observed-smoke.env
```

Edit file itu: `COMPOSE_PROJECT_NAME=observed-smoke` dan `OBSERVE_HTTP_PORT=3113`. Kemudian:

```sh
OBSERVE_ENV_FILE=/tmp/observed-smoke.env sh docker/compose.sh up -d --build --wait
DOCKER_TEST_URL=http://127.0.0.1:3113 \
DOCKER_TEST_PROJECT=observed-smoke \
DOCKER_TEST_ENV_FILE=/tmp/observed-smoke.env \
node --test tests/docker/runtime.test.mjs
```

Test mewajibkan origin lokal dan project berakhiran `-smoke`. Cakupannya: privilege container, setup/auth, source simulasi via host, query, firing/recovery, SSE, persistensi saat app recreate, health saat database mati, backup/restore, dekripsi credential, dan sign-in browser. Ia tidak mengirim Telegram nyata. Bersihkan hanya stack/volume QA yang dibuat:

```sh
OBSERVE_ENV_FILE=/tmp/observed-smoke.env sh docker/compose.sh down --volumes
```

## Memilih test yang tepat

Perubahan teks/style sederhana cukup lint, docs check, dan inspeksi visual yang relevan. Perubahan kontrak memerlukan typecheck/unit. Perubahan permission/persistensi memerlukan integrasi dan request langsung. Perubahan lifecycle stream/layout memerlukan browser terkait. Pengujian Telegram nyata hanya dilakukan pada tujuan uji dengan otorisasi eksplisit. Hindari menambah test yang hanya menyalin implementasi tanpa memeriksa perilaku yang bermakna.
