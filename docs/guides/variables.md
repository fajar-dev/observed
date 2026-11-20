# Variable dashboard

Variable memungkinkan satu dashboard digunakan untuk beberapa sensor, lokasi, bucket, atau sumber. Tambahkan melalui **Dashboard settings → Variables**, lalu Save dashboard. Nama harus diawali huruf, diikuti huruf/angka/underscore, maksimum 60 karakter dan bukan nama object JavaScript yang dicadangkan. Nama harus unik dalam dashboard.

| Type | Isi |
| --- | --- |
| `custom` | Daftar pilihan statis |
| `constant` | Nilai tetap untuk interpolasi |
| `query` | Pilihan dari hasil query sumber |
| `datasource` | Memilih satu ID sumber InfluxDB |
| `textbox` | Nilai yang dimasukkan pengguna |
| `interval` | Daftar nilai durasi seperti `10s`, `1m` |

Isi label singkat, type, nilai/query, default, serta Multi-value atau Include All jika diperlukan. Source variable hanya boleh satu sumber, tidak multi. Opsi `hidden` tersedia pada kontrak JSON; tidak semua properti kontrak memiliki kontrol UI.

## Contoh

Buat variable `sensor` dengan nilai `P1`, `P2`, `P3`. Gunakan dalam Flux:

```flux
|> filter(fn: (r) => r.sensor == "$sensor")
```

Untuk banyak nilai, equality Flux yang didukung diubah menjadi membership `contains`. Untuk selector regex:

```flux
|> filter(fn: (r) => r.sensor =~ /^${sensor:regex}$/)
```

Variable di dalam string/regex di-escape sesuai konteks. `${name:json}` menghasilkan JSON; `${name:pipe}` menggabungkan nilai dengan `|`; `${name:raw}` hanya melepas quote untuk satu nilai numerik/durasi/boolean yang lolos validasi. Jangan memakai raw untuk menyisipkan potongan query arbitrer.

## Resolusi

Query variable bisa bergantung pada variable lain. Resolver menyelesaikan dependency lebih dahulu dan melaporkan cycle atau nilai yang belum tersedia. Hasil query dijadikan pilihan string unik, maksimum 500 nilai; kolom umum seperti `_value`, `value`, `name`, dan `host` diprioritaskan dibanding kolom waktu. Periksa hasil resolver bila pilihan yang muncul tidak sesuai harapan.

Include All menggunakan seluruh pilihan aktual, bukan wildcard SQL mentah. Pilihan pengguna dibawa melalui parameter `var-<name>` pada URL bersama state waktu. Panel yang memakai source variable menyimpan nama variable pada `dataSourceVariable`; nilai variable harus ID sumber yang valid.

Macro waktu yang didukung: `$__interval`, `$__interval_ms`, `$__from`, `$__to`, `$__range`, `$__range_s`, `$__range_ms`, serta `${__from:date:iso}` dan `${__to:date:iso}`. Macro yang tidak dikenal tidak otomatis menjadi fitur Grafana lengkap. Alert tidak mempunyai resolver variable dashboard otomatis; gunakan query alert yang mandiri atau nilai eksplisit melalui kontrak query.
