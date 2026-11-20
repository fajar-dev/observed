# Panduan untuk AI coding agent

Dokumen ini adalah konteks kerja repositori, bukan permintaan untuk mengimplementasikan seluruh ide di dalam dokumentasi. Baca [AGENTS.md](../../AGENTS.md) dahulu. Instruksi eksplisit pengguna dalam tugas aktif menentukan scope; dokumentasi menjelaskan perilaku existing.

## Urutan membaca

1. [Pengenalan dan batas produk](../introduction.md).
2. [Arsitektur](../architecture/overview.md) dan [database](../architecture/database.md).
3. [Permission](../guides/users-and-permissions.md), [security](../security.md), [UI](../reference/branding-and-ui.md).
4. Schema `shared/domain` serta controller/service feature terkait.
5. Test feature terkait dan [cara menjalankannya](../development/testing.md).
6. [Katalog API](../reference/api.md), contoh JSON, dan inventory sebagai indeks, bukan pengganti membaca source.

## Peta perubahan

| Permintaan | Mulai memeriksa |
| --- | --- |
| Dashboard/header/kiosk | `app/features/dashboards`, shared dashboard/layout utils |
| Drag/resize/row | DashboardGrid, DashboardPanelGrid, useDashboardSections, shared layout utils |
| Query/No data | `app/features/queries`, `server/features/queries`, DataSourceService |
| Import JSON | DashboardImportDialog, useDashboardImport, dashboard-json-importer, import-appearance |
| Alert/Telegram | `server/features/alerts`, `server/features/telegram`, `app/features/alerts` |
| Inbox/toast/SSE | `app/features/notifications`, `server/features/notifications`, notification migrations |
| User/auth/OAuth | `app/features/auth`, `server/features/auth`, authorization middleware |
| Akses resource | `shared/domain/permissions.ts`, PermissionService, permission repository dan controller collection |
| Form/modal/tab/style | `app/app.config.ts`, `app/assets/styles`, komponen bersama |
| Database | `server/platform/database`, feature-specific repositories, migrations |
| Runtime/Docker | Dockerfile, compose.yaml, `docker`, health feature |
| Branding/meta | `shared/config/product.ts`, SEO helpers, nuxt.config |

## Invariants yang harus dipertahankan

- Identitas Observed, sensor struktur, logo AMTI; jangan mengubah sidebar/header/palette tanpa scope yang jelas.
- Admin penuh; Editor bisa create, existing Edit sesuai grant, delete milik sendiri dengan Edit; Viewer read saja. Semua user boleh query seluruh source.
- Notifikasi mengikuti akses alert, bell tetap terlihat untuk akun tanpa alert. Tidak ada notification ACL/source ACL terpisah.
- Setup admin sekali secara atomik, session revocation nyata, refresh rotation/replay protection, OAuth tidak auto-link email.
- Secret tidak keluar API, plaintext tidak masuk log/fixture/Git. Key konsisten dengan data terenkripsi.
- Dashboard revision, posisi 12/24 kolom, row membership dan layout desktop tidak hilang akibat mobile.
- Kiosk mempertahankan toolbar/variable/time/refresh/exit; menyembunyikan edit/actions dan shell global.
- Firing/recovery berbasis transisi, no_data/error bukan recovery, preview tidak mengirim notifikasi. Scheduler selalu aktif; pause berlaku per rule. Jangan menambahkan kembali sakelar environment scheduler atau pengaturan domain/jaringan aplikasi.
- Cursor notification bigint tetap string, replay permission-aware, cleanup stream saat logout.
- Nuxt UI dan semantic tokens; toast tanpa progress; tidak menambah UAlert.
- Tidak menghidupkan kembali Playground, Grafana ID import, atau star/share tanpa permintaan fitur baru yang eksplisit.

## Workflow agent

Periksa status/diff sebelum bekerja. Baca file terkait dengan pencarian terarah; jangan menyimpulkan dari nama class atau laporan audit lama. Buat perubahan terkecil yang menyelesaikan scope secara menyeluruh, termasuk service/UI/schema/docs bila perlu. Jangan melakukan rewrite lintas domain untuk perubahan copy kecil.

Jangan membaca/mencetak `.env` untuk mencari contoh credential. Jangan menjalankan integration/live browser/container tests pada database produksi. Semua simulasi yang membuat rule atau mengirim Telegram memerlukan sumber/tujuan uji atau instruksi eksplisit pengguna. Jangan push/deploy/reset/drop data tanpa scope yang mengizinkan.

Jalankan lint/type/unit dan test terarah sesuai perubahan. Laporkan check yang benar-benar dijalankan, skip, kegagalan dan batas yang belum diverifikasi. Untuk bug, reproduksi dengan fixture yang mewakili input asli tanpa menyalin data rahasia.

Jika schema/source berubah, perbarui API/kontrak/panduan terkait, lalu `bun run docs:check` dan `bun run audit:architecture --inventory`. Jangan mengarang fitur, jaminan kompatibilitas Grafana, atau hasil pengujian. Daftar inventaris mendeteksi reachability statis, bukan bukti seluruh perilaku benar.
