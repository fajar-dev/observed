# Import dan export JSON

## Import

1. Buka **Dashboards → New dashboard → Import JSON**.
2. Pilih file/paste JSON dashboard. Aplikasi menerima definisi Observed serta bagian format dashboard Grafana klasik yang dikenali converter.
3. Pilih sumber tujuan. Periksa pemetaan sumber pada panel, bahasa query, variable bucket/server/sensor, dan peringatan converter.
4. Jalankan pemeriksaan data yang tersedia di dialog. Perbaiki sumber/query/variable yang error sebelum menyimpan.
5. Buat dashboard, buka hasilnya, periksa nilai, unit, legend, tabel, dan susunan panel.

Import dari ID Grafana atau URL katalog tidak tersedia. File JSON tidak menyertakan credential sumber. Sumber dengan nama sama di instalasi lain belum tentu mempunyai ID sama.

## Apa yang perlu diverifikasi

Converter berusaha membawa posisi/ukuran panel, row, query, variable, warna, unit, legend, threshold, dan opsi tabel yang didukung schema Observed. Hasilnya tidak dijamin sama persis untuk setiap dashboard Grafana. Plugin visualisasi, transformasi kompleks, expression, sumber non-InfluxDB, atau format schema lain dapat memerlukan penyusunan ulang manual. Baca warnings, jangan hanya mengandalkan preview gambar.

`No data` biasanya berarti rentang waktu, bucket, measurement, field/tag, variable, atau bahasa sumber tidak cocok. Tampilan kosong bukan alasan untuk menambahkan data sensor fiktif. Gunakan **Check panel data** dan inspector untuk mengetahui penyebab.

## Export dan perubahan JSON

Menu dashboard → **Export JSON** mengunduh konfigurasi. **Dashboard settings → JSON** memungkinkan mengedit definisi draft, memvalidasi, lalu Save. Contoh native yang sederhana ada di [dashboard.json](../examples/dashboard.json). Ganti seluruh ID sumber contoh sebelum menggunakannya.

Import menyimpan dokumen asal pada `importMetadata` agar perbaikan pemetaan/appearance dapat merujuk dokumen tersebut. Fitur perbaikan import membutuhkan Edit access dan menghasilkan pembaruan/versi dashboard; periksa hasilnya setelah diterapkan.

Body API maksimal 2 MiB. `sourceDocument` maksimal 1.500.000 karakter dan masing-masing query maksimal 25.000 karakter. Jangan menaruh token atau secret di query/JSON dashboard: export dan pengguna yang memiliki View access dapat membacanya.
