# Kontrak data dan contoh

Schema Zod di [shared/domain](../../shared/domain) adalah sumber kebenaran. Type TypeScript diturunkan dari schema; validasi frontend saja tidak cukup. API memakai ID UUID, waktu ISO 8601, dan JSON. Properti yang tidak dikenal umumnya dibuang oleh `z.object`; schema import dan beberapa request memakai strict object dan menolak properti tambahan.

## Contoh siap divalidasi

- [dashboard.json](../examples/dashboard.json): definisi dashboard native, satu row, panel time series dan table.
- [query.json](../examples/query.json): request query Flux.
- [alert-rule.json](../examples/alert-rule.json): rule threshold dengan Telegram kosong dan inbox otomatis.
- [permissions.json](../examples/permissions.json): scope Selected untuk dashboard dan alert.

Seluruh ID dan nama sensor pada contoh adalah dummy. Ganti `dataSourceId` dengan ID sumber yang sudah ada; gunakan ID resource aktual saat menyimpan permission. Contoh tidak mengandung credential dan tidak membuat data sensor.

## Dashboard dan panel

Field wajib dashboard: `name`, `description`, `range`, `refresh`, `panels`. Panel wajib: `id`, `title`, `type`, `span`, `dataSourceId`, `query`; `additionalQueries` default kosong. `dataSourceId` nullable untuk draft/panel text, tetapi query panel data memerlukan source valid.

Posisi: `x`, `y`, `height`, `span` dan `columns` (12 atau 24). Row memakai `sections` dengan UUID, title, y, collapsed; panel mengacu `sectionId`. Jangan menggunakan urutan array sebagai pengganti koordinat layout. Update menyertakan revision terkini agar konflik edit terdeteksi.

| Batas | Nilai |
| --- | --- |
| Nama resource | 1–120 karakter setelah trim |
| Description dashboard / note panel | 1.000 karakter maksimum |
| Panel dan section per dashboard | Masing-masing 100 |
| Variable per dashboard | 20, nama unik |
| Query per panel | Satu utama + sembilan tambahan |
| Panjang query | 25.000 karakter |
| Tag dashboard | 20, masing-masing 1–40 karakter |
| Tinggi panel | 2–100 unit grid |
| Lebar panel | 1–24; harus sesuai jumlah kolom layout |
| Opsi decimals | 0–8 |
| Threshold warna | Maksimal 10 |
| Palette | 1–30 warna hex enam digit |

`PanelOptions` mengatur unit, decimals, min/max, fixed/palette/threshold color, reducer, legend placement/list/table/calculations, tooltip, line width/fill/interpolation/stacking, axis, field order/rename/visibility/unit, field-specific appearance, stat modes, table header/cell modes/alignment, dan text. Lihat [panel.ts](../../shared/domain/panel.ts) untuk tipe eksak. JSON lanjutan tidak berarti setiap opsi sudah punya kontrol UI terpisah.

## QueryRequest dan QueryResponse

Request: `dataSourceId`, `query`, `range`; opsional `from`, `to`, `variables`. Relative range: `5m`, `15m`, `30m`, `1h`, `6h`, `24h`, `7d`, `30d`. `from`/`to` harus berpasangan, awal sebelum akhir, maksimum 366 hari.

Response:

```json
{
  "columns": ["_time", "_value", "sensor"],
  "rows": [{"_time": "2026-01-01T00:00:00Z", "_value": 0.12, "sensor": "P2"}],
  "duration": 24,
  "truncated": false,
  "timeRange": {"from": "2025-12-31T23:00:00.000Z", "to": "2026-01-01T00:00:00.000Z"}
}
```

`duration` dalam milidetik. Cell berupa string, number, boolean, atau null. Nilai integer Influx yang tidak aman direpresentasikan sebagai JavaScript Number dipertahankan sebagai string. Batas hasil 5.000 baris; alert menganggap truncated sebagai error.

Refresh dashboard berupa `"auto"` atau angka detik: 0 untuk Off, selainnya 5–86.400. Variable value berupa string atau array string, maksimal 500 nilai dengan panjang masing-masing 500 karakter.

## Alert dan permission

Alert memperluas QueryRequest dengan name, enabled, operator, reducer, field, threshold, interval, serta tujuan Telegram. Summary/severity/folder/pending/mute opsional. Nilai threshold harus finite. Preview menghilangkan field name, enabled, dan telegramDestinationIds dari kontrak rule.

Permission terdiri dari `dashboards` dan `alerts`; masing-masing `{scope, access, grants}`. Scope: `none|selected|all`, access: `view|edit`, grant `{id,access}` maksimal 1.000 ID unik. Admin tidak dibatasi payload; Viewer tidak dapat menaikkan diri ke Edit.

## Notifikasi

Event berisi ID, sequence string, ID/nama alert, nama source, `state: firing|recovered`, value, threshold, operator, occurredAt, readAt dan metadata opsional. Snapshot `{items, unread, cursor}`; update menambahkan `events`. Cursor adalah string digit maksimal bigint PostgreSQL (`9223372036854775807`), bukan Number.

Body API maksimal 2 MiB. Credential source/token Telegram hanya diterima di endpoint konfigurasi; respons memakai `hasSecret`/`hasToken`, tidak mengembalikan secret asli.

## Semantik credential pada API

Pada update source, properti `secret` yang tidak dikirim mempertahankan credential tersimpan; `secret: ""` menghapusnya; string nonkosong menggantinya. Form UI menerjemahkan field kosong menjadi properti yang tidak dikirim, dan checkbox Remove saved credential menjadi string kosong. Jangan menyamakan field kosong pada UI dengan string kosong dalam request API.

Untuk Telegram, `token` yang dihilangkan mempertahankan token tersimpan. String kosong tidak lolos format token. User baru melalui endpoint Users wajib mempunyai password walaupun schema input menjadikan password opsional untuk update; akun OAuth-only dibuat lewat flow provider, bukan dengan menghilangkan password pada create user lokal.
