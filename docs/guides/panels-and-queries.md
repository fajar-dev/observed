# Panel, query, dan visualisasi

## Editor panel

Editor add/edit panel menampilkan query dan preview bersama pengaturan panel. Pilih sumber InfluxDB, gunakan builder untuk menemukan measurement/field/tag atau tulis query langsung. Jalankan query dengan tombol run atau `Ctrl+Enter`/`Cmd+Enter`. Query bahasa Flux/InfluxQL harus cocok dengan sumber; mengganti label bahasa tidak mengonversi sintaks server.

Panel mendukung query utama dan maksimal sembilan query tambahan. Permintaan preview sebelumnya dibatalkan saat digantikan agar hasil lama tidak menimpa pilihan baru. Simpan panel ke draft, kemudian Save dashboard untuk persistensi.

## Contoh Flux

```flux
from(bucket: v.defaultBucket)
  |> range(start: v.timeRangeStart, stop: v.timeRangeStop)
  |> filter(fn: (r) => r._measurement == "structure_sensors")
  |> filter(fn: (r) => r._field == "tilt" and r.sensor == "P2")
  |> aggregateWindow(every: v.windowPeriod, fn: mean, createEmpty: false)
```

Server menyediakan `v.defaultBucket`, `v.timeRangeStart`, `v.timeRangeStop`, dan `v.windowPeriod`. Window agregasi diturunkan dari rentang waktu untuk sekitar 300 interval, minimum satu detik. Pastikan Flux import berada sebelum deklarasi option; client menambahkan prelude setelah import.

## Contoh InfluxQL

```sql
SELECT mean("tilt") AS "tilt"
FROM "structure_sensors"
WHERE $timeFilter AND "sensor" = 'P2'
GROUP BY time($__interval), "sensor" fill(null)
```

`$timeFilter` dan `$__interval` diganti server. Query metadata seperti `SHOW MEASUREMENTS LIMIT 100` berguna untuk discovery. InfluxQL diperiksa sebagai query baca; gunakan credential read-only upstream juga.

## Memilih tampilan

| Tampilan | Penggunaan |
| --- | --- |
| Time series / Area | Perubahan sensor terhadap waktu |
| Bar chart | Perbandingan nilai/seri |
| Metric | Nilai hasil reducer, misalnya nilai terakhir |
| Gauge / Bar gauge | Nilai pada min/max yang ditetapkan |
| Pie chart | Proporsi nilai positif yang relevan |
| Table | Inspeksi baris/field hasil query |
| Text | Catatan teks pada dashboard; bukan HTML bebas |

Atur title, note, unit, decimals, min/max, reducer, legend, warna, threshold, dan pengaturan field sesuai visualisasi. Sebagian pengaturan lanjutan tersedia melalui JSON, bukan seluruhnya sebagai kontrol editor. Schema lengkap ada di [kontrak data](../reference/data-contracts.md).

Unit tidak disimpulkan dari judul. Persentase rasio 0–1 berbeda dari nilai 0–100; pilih format yang sesuai data. Threshold warna panel tidak otomatis membuat alert. Untuk banyak seri gunakan legend di kanan atau tabel legend seperlunya; beri tinggi panel cukup. Tabel dapat menggulir di dalam panel untuk menjaga kolom tetap terbaca.

## Query inspector

Menu panel → **Inspect data** membuka **Query inspector** dengan tab bergaris: **Stats**, **Query**, **JSON**, **Data**. Stats menjelaskan durasi, jumlah baris/query, dan batas hasil. Data menampilkan tabel dan **Download CSV**. Inspector memperlihatkan query yang dikirim dari panel; jangan menganggapnya trace lengkap seluruh statement/interpolasi server.

Hasil maksimal 5.000 baris per query. Jika `truncated=true`, kurangi range atau lakukan agregasi/filter di InfluxDB. Selalu periksa kolom waktu, field numerik, label seri, dan kemungkinan nilai null sebelum mengubah format panel untuk memperbaiki data yang salah.
