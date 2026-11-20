# Troubleshooting

| Gejala | Periksa dan tindakan |
| --- | --- |
| `Set a 32-byte base64 OBSERVE_SECRET_KEY` | Gunakan hasil `openssl rand -base64 32`; bukan string 32 karakter biasa. Pastikan env benar-benar dimuat runtime. Pertahankan key lama jika database sudah berisi credential. |
| Health 503 / database operation failed | URL database, network, role/password, hak schema, kapasitas koneksi, dan log PostgreSQL. Health memicu readiness/migrasi. |
| Setup muncul/tidak muncul tidak sesuai | Pastikan aplikasi memakai database yang dimaksud. Setup selesai tersimpan permanen; restart atau logout bukan reset. |
| HTTP 403 dari script | Mutation cookie membutuhkan Origin yang sesuai atau sinyal same-origin; gunakan Bearer untuk API non-browser. Permission resource tetap berlaku. |
| Sign-in kembali setelah perubahan akses | Permission/password/role dapat mencabut sesi; ini perilaku yang disengaja. |
| Google/Microsoft tidak muncul | Flag enabled harus persis `true`, restart proses; cek konfigurasi provider dan callback origin. |
| OAuth ditolak walau email sama | Tidak ada auto-link berdasarkan email. Hubungkan provider dari Profile saat sudah sign-in lokal. Cek tenant dan claim email. |
| Credential gagal setelah restore | Pastikan key enkripsi sama dengan saat backup. Mengganti key bukan migrasi credential. |
| InfluxDB timeout | Test dari jaringan runtime/container, bukan hanya browser/host. Cek URL, firewall, token, server, range dan agregasi. Transport dibatasi 12 detik. |
| InfluxDB di host tidak dapat dicapai Docker | Gunakan `host.docker.internal`, bukan localhost container; cek bind service dan host firewall. |
| Dashboard `No data` | Periksa waktu/timestamp sensor, bucket, measurement/field/tag, pemetaan source, variable, bahasa query. Buka Check panel data dan inspector. |
| Dashboard import berbeda | Baca warnings. Format plugin/transformasi Grafana tertentu tidak didukung; perbaiki query dan appearance secara manual. |
| Chart/legend/tabel terpotong | Cukupkan tinggi/lebar panel, ringkas label seri, ubah penempatan legend, kurangi seri, periksa scroll lokal. Untuk bug gunakan fixture serupa tanpa secret. |
| Data truncated | Lebih dari 5.000 baris; tambah filter/agregasi atau persempit range. Alert menganggapnya error. |
| Dashboard save conflict 409 | Ada revision lebih baru. Simpan draft terpisah bila perlu, reload, gabungkan perubahan. |
| Source/tujuan tidak dapat dihapus | Masih direferensikan dashboard/alert; lepaskan referensi terlebih dahulu. |
| Alert belum firing | Cek enabled, numeric field, unit threshold, reducer, pending, interval, query, dan waktu server. |
| Alert berhenti dievaluasi | Cek proses server hidup, scheduler enabled, readiness database dan lock/evaluasi yang sedang berjalan. |
| Tidak ada recovery | Harus pernah firing yang diberitahukan lalu evaluasi normal. no_data/error/pending bukan recovery. Mute menahan pengiriman. |
| Inbox kosong | Belum ada transisi atau user tidak mendapat View access rule; bell tetap ada untuk pengguna sign-in. |
| Toast lama muncul ulang | Periksa cursor/reconnect dan state session; histori awal seharusnya silent. Jangan ubah sequence bigint menjadi Number. |
| Telegram gagal | Test destination mengirim pesan nyata. Cek token/chat ID, bot sudah di-start/berhak kirim, egress, enabled/mute, dan deliveryError. |
| Refresh otomatis tidak berjalan saat edit | Timer dihentikan saat edit/tab tersembunyi. Off juga mematikannya; jadwal alert terpisah. |

## Urutan investigasi

Mulai dari health dan sesi, lalu permission, koneksi source, query mentah, hasil inspector, baru pemetaan visualisasi. Untuk alert pisahkan keberhasilan evaluasi dari pengiriman Telegram. Catat langkah reproduksi dan log tersanitasi; jangan melampirkan `.env`, cookie, token, atau dump database produksi ke issue.

Prosedur test ada di [pengujian](../development/testing.md), dan rollback data di [backup/recovery](backup-and-recovery.md).
