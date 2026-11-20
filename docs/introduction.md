# Pengenalan

Observed membantu civil engineer, kontraktor, dan pemilik struktur membaca metrik sensor IoT melalui dashboard yang dapat disesuaikan. Data pengukuran tetap berada di InfluxDB; Observed menyimpan konfigurasi, akun, permission, histori evaluasi, dan notifikasi di PostgreSQL.

## Kemampuan saat ini

| Area | Kemampuan |
| --- | --- |
| Data | Banyak sumber InfluxDB; Flux dan InfluxQL sesuai API server sumber |
| Dashboard | Banyak panel, row accordion, drag/resize desktop, tampilan mobile, folder, tag, variable, rentang waktu, refresh, versi, kiosk |
| Visualisasi | Time series, area, bar, metric, gauge, bar gauge, pie, table, text |
| Portabilitas | Import/export JSON Observed; konversi sebagian format dashboard Grafana klasik dari file JSON |
| Alert | Query numerik, reducer, threshold, pending period, jadwal evaluasi, pause, mute, histori |
| Notifikasi | Inbox otomatis sesuai akses alert, toast realtime, Telegram opsional dengan banyak tujuan |
| Akun | Setup admin sekali, password, JWT dan refresh token, sesi, Google/Microsoft opsional |
| Akses | Admin, Editor, Viewer; permission View/Edit per dashboard dan alert |

## Batas produk

- Observed membaca data sensor, bukan gateway ingest atau pengganti penyimpanan time series. Pengiriman sensor ke InfluxDB dilakukan sistem di luar aplikasi.
- Belum ada katalog aset/sensor, pemetaan BIM, acknowledgement alert, escalation policy, laporan PDF, atau plugin visualisasi pihak ketiga.
- Tidak tersedia import melalui ID/URL Grafana, playground terpisah, star, atau share publik. Query ditulis di editor panel dan alert.
- Kompatibilitas JSON Grafana terbatas pada query, layout, variable, dan opsi yang didukung converter. Plugin, transformasi, serta schema lain perlu diperiksa manual.
- Permission dashboard/alert membatasi resource tersebut. Semua pengguna yang sign-in tetap bisa membaca metadata sumber dan menjalankan query ke semua sumber.
- Threshold adalah konfigurasi pemantauan. Interpretasi keselamatan struktur dan penentuan ambang dilakukan pihak yang berkompeten; aplikasi tidak menghitung sertifikasi kelayakan struktur.

Lanjutkan ke [alur awal](guides/getting-started.md) atau [instalasi](installation/local.md).
