# Database dan migrasi

PostgreSQL menyimpan state aplikasi dalam schema `observe`. Data sensor time series tetap di InfluxDB. Struktur memadukan metadata relasional, foreign key, dan JSONB untuk konfigurasi panel/alert yang fleksibel.

## Tabel aktif

| Tabel | Isi utama |
| --- | --- |
| `schema_migrations` | Versi migrasi yang telah diterapkan |
| `data_sources` | Koneksi InfluxDB; ciphertext credential |
| `telegram_destinations` | Chat ID dan ciphertext token bot |
| `dashboard_folders` | Nama folder unik, termasuk normalisasi huruf |
| `dashboards` | Metadata, definition JSONB, revision, `created_by` |
| `dashboard_versions` | Snapshot versi sebelumnya |
| `dashboard_data_sources` | Referensi sumber untuk integritas dashboard |
| `alert_rules` | Konfigurasi JSONB, runtime JSONB, enabled, jadwal due, creator |
| `alert_rule_destinations` | Relasi banyak tujuan Telegram per alert |
| `users` | Identitas akun, role, status, hash password opsional, preferensi realtime alert toast |
| `auth_setup` | Marker singleton setup admin sudah selesai |
| `auth_identities` | Binding provider + subject ke user |
| `auth_sessions` | Sesi, expiry, revoke, user agent |
| `auth_refresh_tokens` | Hash refresh token dan status consumed |
| `auth_throttles` | Counter upaya autentikasi |
| `user_access` | Scope dan level dasar dashboard/alert per user |
| `user_dashboard_permissions` | Grant per dashboard |
| `user_alert_permissions` | Grant per alert |
| `alert_notifications` | Snapshot firing/recovered dan sequence bigint |
| `notification_reads` | Waktu baca per user dan notifikasi |

Sumber DDL: [workspace-schema](../../server/platform/database/workspace-schema.ts), [auth](../../server/platform/database/migrations/authentication.ts), [permission](../../server/platform/database/migrations/permissions.ts), [notification](../../server/platform/database/migrations/notifications.ts). Tidak ada ACL data source atau notification terpisah pada model aktif.

## Relasi dan penghapusan

Dashboard/alert menyimpan creator nullable; menghapus user mengosongkan creator melalui `ON DELETE SET NULL`, bukan menghapus konfigurasi struktur. Relasi source/tujuan yang masih digunakan menahan penghapusan. Grant resource dan snapshot dashboard version ikut terhapus bersama resource sesuai foreign key.

`alert_notifications.alert_rule_id` sengaja tidak memiliki FK ke rule: snapshot histori tetap tersimpan ketika rule dihapus. Akses baca histori tetap difilter berdasarkan model permission. Read receipt terkait user dan event dengan cascade.

## Transaksi dan concurrency

- Query SQL menggunakan parameter; pemetaan tabel resource dikontrol kode, bukan interpolasi input pengguna.
- Create resource dan grant Edit pembuat disimpan dalam transaksi.
- Update dashboard memeriksa revision serta menyimpan snapshot versi sebelumnya secara atomik.
- Lock advisory per rule mencegah evaluasi bersamaan. Pool lock terpisah menjaga koneksi lock selama operasi berlangsung.
- Penyimpanan evaluasi dan event notifikasi dalam aplikasi berbagi transaksi. Urutan event dijaga agar replay cursor tidak melewatkan commit yang datang terlambat.

Pool utama maksimum 12 koneksi dan pool lock maksimum empat per instance, dengan timeout koneksi lima detik. Perhitungkan jumlah replica terhadap kapasitas PostgreSQL.

## Migrasi

[PostgresDatabase.ready](../../server/platform/database/database.ts) menjalankan migrasi otomatis melalui satu initialization promise per proses. Migrasi memakai transaksi dan advisory lock schema, sehingga startup beberapa instance tidak menjalankan perubahan schema bersamaan. Kegagalan membatalkan transaksi dan initialization dapat dicoba lagi.

Normalisasi data lama dan migrasi bernomor yang sudah ada adalah bagian implementasi, bukan panduan instalasi lama yang perlu dijalankan manual. Jangan menghapus marker setup atau schema_migrations untuk “memperbaiki” login. Tidak ada CLI rollback schema otomatis.

Saat menambah migrasi: gunakan nomor baru, SQL idempotent yang tepat, guard untuk data backfill satu kali, serta test fresh database dan database versi sebelumnya. Jangan mengedit migrasi historis untuk mengubah arti data tanpa migrasi transisi. Backup sebelum upgrade; downgrade binary tidak otomatis membatalkan schema.

## Retensi dan backup

Versi dashboard menyimpan maksimal 100 snapshot dan histori evaluasi per rule maksimal 50. Notifikasi bukan ring buffer yang otomatis dibatasi 50 di database; 50 adalah batas daftar inbox. Belum ada job retensi notifikasi configurable. Rencanakan pemeliharaan database sesuai volume event.

Backup harus menyertakan database dan key enkripsi yang sesuai, disimpan terpisah secara aman. [Prosedur backup/recovery](../operations/backup-and-recovery.md) mencakup restore ownership dan verifikasi credential.

Migrasi 10 menambahkan `users.realtime_alert_toasts BOOLEAN NOT NULL DEFAULT true`. Preferensi merupakan pilihan tampilan per user, bukan permission notifikasi. Update preferensi tidak mencabut sesi dan tidak mengubah grant alert.
