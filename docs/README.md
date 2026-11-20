# Dokumentasi Observed

Observed adalah aplikasi dashboard sensor untuk structural health monitoring pada bangunan, jembatan, dan struktur lainnya. Dokumentasi ini mengikuti implementasi di repositori, bukan daftar fitur yang direncanakan. Label menu ditulis sesuai UI berbahasa Inggris; penjelasan menggunakan bahasa Indonesia.

## Jalur membaca

| Pembaca | Mulai dari | Lanjutkan ke |
| --- | --- | --- |
| Pengguna | [Pengenalan](introduction.md), [mulai menggunakan](guides/getting-started.md) | Dashboard, panel, alert, notifikasi |
| Administrator | [Instalasi](installation/local.md), [Docker](installation/docker.md) | Configuration, akun, permission, operasi |
| Pengembang | [Arsitektur](architecture/overview.md), [kontribusi](development/contributing.md) | Database, API, kontrak, pengujian |
| AI coding agent | [Panduan AI](ai/README.md), [aturan repositori](../AGENTS.md) | Peta kode, invariants, prosedur verifikasi |

## Pengenalan dan instalasi

- [Tujuan, kemampuan, dan batasan](introduction.md)
- [Instalasi lokal dan build produksi](installation/local.md)
- [Docker: aplikasi dan PostgreSQL](installation/docker.md)
- [Referensi environment](configuration/environment.md)
- [Configuration: InfluxDB](configuration/data-sources.md)
- [Configuration: Telegram](configuration/telegram.md)

## Panduan pengguna

1. [Alur awal dan navigasi](guides/getting-started.md)
2. [Overview dan daftar dashboard](guides/overview-and-library.md)
3. [Dashboard, row, layout, versi, dan kiosk](guides/dashboards.md)
4. [Panel, query, visualisasi, dan inspector](guides/panels-and-queries.md)
5. [Variable dashboard](guides/variables.md)
6. [Import dan export JSON](guides/json-import.md)
7. [Alert sensor](guides/alerts.md)
8. [Notifikasi dalam aplikasi](guides/notifications.md)
9. [User, role, dan permission](guides/users-and-permissions.md)
10. [Sign-in, profil, sesi, Google, dan Microsoft](guides/authentication.md)

## Referensi pengembang

- [Arsitektur dan alur request](architecture/overview.md)
- [Database dan migrasi](architecture/database.md)
- [API HTTP dan katalog seluruh endpoint](reference/api.md)
- [Kontrak data, batas input, dan contoh](reference/data-contracts.md)
- [Branding dan sistem UI](reference/branding-and-ui.md)
- [Inventaris source yang dihasilkan audit](reference/source-inventory.json)
- [Contoh dashboard](examples/dashboard.json), [query](examples/query.json), [alert](examples/alert-rule.json), [permission](examples/permissions.json)

## Operasi dan pengembangan

- [Deployment dan health](operations/deployment.md)
- [Backup dan recovery](operations/backup-and-recovery.md)
- [Troubleshooting](operations/troubleshooting.md)
- [Keamanan dan batas kepercayaan](security.md)
- [Workflow kontribusi](development/contributing.md)
- [Pengujian dan quality checks](development/testing.md)
- [Menambah fitur dengan arsitektur yang ada](development/extension-guide.md)
- [Panduan AI dan peta perubahan](ai/README.md)

## Memelihara dokumentasi

Setiap perubahan perilaku harus memperbarui panduan terkait, kontrak, dan contoh. Jalankan `bun run docs:check` untuk memeriksa link lokal, contoh JSON terhadap schema, dan kelengkapan katalog endpoint. Regenerasi inventaris dengan `bun run audit:architecture --inventory`. Hasil test adalah bukti untuk revisi yang diuji; dokumentasi tidak menjamin semua deployment atau semua dashboard Grafana kompatibel.
