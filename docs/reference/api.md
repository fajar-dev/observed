# API HTTP

Base path aplikasi adalah `/api/observe`. API menggunakan JSON dengan ID UUID. Tidak ada OpenAPI/Swagger yang dihasilkan saat ini; katalog berikut memetakan seluruh file handler yang ada. Label `:id` dan `:provider` adalah parameter path, bukan literal URL.

## Autentikasi dan origin

Browser menggunakan cookie HttpOnly. Script dapat mengirim `Authorization: Bearer <accessToken>` yang diperoleh dari sign-in/setup. Respons sign-in/refresh berisi `{user, accessToken, expiresIn: 600}`; refresh token hanya dikirim melalui cookie, bukan response JSON.

Mutation tanpa bearer membutuhkan Origin yang sama dengan URL request atau sinyal same-origin yang didukung middleware. Bearer tidak mengabaikan larangan Origin yang salah/cross-site. Route public auth tetap memakai origin guard untuk mutation.

Contoh sign-in (gunakan akun uji, payload disimpan privat, tidak dicommit):

```sh
curl --request POST http://localhost:3000/api/observe/auth/sign-in \
  --header 'Origin: http://localhost:3000' \
  --header 'Content-Type: application/json' \
  --data-binary @/absolute/private/sign-in.json
```

Isi file berupa `{"email":"engineer@example.test","password":"YOUR_PASSWORD"}`. Respons dan header cookie mengandung credential sesi; jangan menyalinnya ke log/issue. Untuk refresh client non-browser, simpan cookie dari respons sign-in dalam cookie jar privat lalu kirim kembali pada `/auth/refresh`; bearer access token saja tidak menggantikan refresh cookie.

Untuk menjalankan query, set variabel shell `OBSERVED_ACCESS_TOKEN` secara privat dengan access token aktif:

```sh
curl --request POST http://localhost:3000/api/observe/queries \
  --header "Authorization: Bearer $OBSERVED_ACCESS_TOKEN" \
  --header 'Content-Type: application/json' \
  --data-binary @docs/examples/query.json
```

Ganti ID sumber pada salinan contoh sebelum request. Semua endpoint selain health/auth public memerlukan sesi aktif. Tidak ada anonymous dashboard API atau API key permanen.

## Kontrak dan hasil

Referensi schema utama: [auth](../../shared/domain/auth.ts), [source](../../shared/domain/data-source.ts), [dashboard](../../shared/domain/dashboard.ts), [panel](../../shared/domain/panel.ts), [query](../../shared/domain/query.ts), [alert](../../shared/domain/alert-rule.ts), [variable](../../shared/domain/variable.ts), [permission](../../shared/domain/permissions.ts), [notification](../../shared/domain/notification.ts). Body mengikuti schema tanpa wrapper tambahan kecuali disebutkan pada tabel.

Collection umumnya mengembalikan array; get/create/update mengembalikan record sesuai handler. Jangan mengasumsikan semua aksi memakai envelope `data`. Snapshot notification memakai `{items, unread, cursor, events}`. `auth/session` mengembalikan `{user, canRefresh}` untuk bootstrap browser, sedangkan `auth/me` memerlukan autentikasi.

| HTTP status | Makna umum |
| --- | --- |
| 400 | Body bukan JSON valid |
| 401 | Sesi/token tidak valid atau kedaluwarsa |
| 403 | Role/permission/origin tidak mengizinkan |
| 404 | Resource atau provider tidak tersedia |
| 409 | Konflik revision, lock sedang dipakai, nama duplikat, atau resource masih direferensikan |
| 413 | Body melebihi 2 MiB |
| 422 | Payload, UUID, variable atau rentang waktu tidak valid |
| 429 | Throttle autentikasi |
| 502 | Koneksi/respons layanan remote gagal |
| 503 | Konfigurasi/database/provider belum siap |

Error mengikuti format H3, dengan statusCode/statusMessage dan detail tersanitasi bila tersedia. Jangan bergantung pada stack trace. Respons API terproteksi menggunakan Cache-Control no-store. Tidak ada pagination umum untuk semua collection; notifikasi memakai cursor, versi dan history mempunyai retensi khusus.

## Katalog endpoint

Aturan singkat: **Signed-in** = semua role yang terautentikasi; **Create** = Admin/Editor; **View/Edit** = level resource, dibatasi role; **Delete** = Admin atau creator dengan Edit. Admin memiliki akses penuh. Membaca source tidak memerlukan resource grant. Nama tujuan Telegram yang tersedia untuk Editor/Viewer difilter sesuai kebutuhan alert; chatId dikosongkan untuk non-Admin.

| Endpoint | Akses | Payload / hasil / efek | Source |
| --- | --- | --- | --- |
| `GET /api/health` | Publik | Readiness database/migrasi; 200 ok atau 503 unavailable | [handler](../../server/api/health.get.ts) |
| `POST /api/observe/alert-rules/:id/evaluate` | Edit alert | Evaluasi aktual; enabled/unmuted dapat mengirim notifikasi; tanpa body | [handler](../../server/api/observe/alert-rules/[id]/evaluate.post.ts) |
| `DELETE /api/observe/alert-rules/:id` | Delete alert | Hapus rule dengan lock evaluasi | [handler](../../server/api/observe/alert-rules/[id].delete.ts) |
| `GET /api/observe/alert-rules/:id` | View alert | Satu AlertRule | [handler](../../server/api/observe/alert-rules/[id].get.ts) |
| `PUT /api/observe/alert-rules/:id` | Edit alert | Body alertRuleSchema; ubah rule dan reset state bila kondisi berubah | [handler](../../server/api/observe/alert-rules/[id].put.ts) |
| `GET /api/observe/alert-rules` | Signed-in, daftar difilter | AlertRule[] yang diizinkan | [handler](../../server/api/observe/alert-rules/index.get.ts) |
| `POST /api/observe/alert-rules` | Create alert | Body alertRuleSchema; buat rule | [handler](../../server/api/observe/alert-rules/index.post.ts) |
| `POST /api/observe/alert-rules/preview` | Create alert | Body alertPreviewSchema; hasil evaluasi dan queryResult; tidak mengirim | [handler](../../server/api/observe/alert-rules/preview.post.ts) |
| `GET /api/observe/auth/config` | Publik | Konfigurasi setupRequired dan provider aktif | [handler](../../server/api/observe/auth/config.get.ts) |
| `GET /api/observe/auth/me` | Signed-in | AuthUser saat ini beserta permission | [handler](../../server/api/observe/auth/me.get.ts) |
| `GET /api/observe/auth/oauth/:provider/callback` | Provider aktif; linking butuh sesi | Callback authorization code OIDC | [handler](../../server/api/observe/auth/oauth/[provider]/callback.get.ts) |
| `GET /api/observe/auth/oauth/:provider` | Provider aktif; linking butuh sesi | Redirect provider; ?link=1 untuk hubungkan akun saat sign-in | [handler](../../server/api/observe/auth/oauth/[provider]/index.get.ts) |
| `PUT /api/observe/auth/notification-preferences` | Signed-in, akun sendiri | Body {realtimeAlertToasts: boolean}; simpan preferensi toast dan kembalikan AuthUser tanpa mencabut sesi | [handler](../../server/api/observe/auth/notification-preferences.put.ts) |
| `PUT /api/observe/auth/profile` | Signed-in | Body profileSchema; update nama/password akun sendiri | [handler](../../server/api/observe/auth/profile.put.ts) |
| `GET /api/observe/auth/providers` | Signed-in | Provider identity yang terhubung ke akun | [handler](../../server/api/observe/auth/providers.get.ts) |
| `POST /api/observe/auth/refresh` | Refresh cookie aktif | Rotasi refresh token; tanpa body; cookie diperbarui | [handler](../../server/api/observe/auth/refresh.post.ts) |
| `GET /api/observe/auth/session` | Publik | Bootstrap sesi; {user, canRefresh} | [handler](../../server/api/observe/auth/session.get.ts) |
| `DELETE /api/observe/auth/sessions` | Signed-in | Body {id: UUID}; revoke sesi sendiri | [handler](../../server/api/observe/auth/sessions.delete.ts) |
| `GET /api/observe/auth/sessions` | Signed-in | Daftar sesi sendiri | [handler](../../server/api/observe/auth/sessions.get.ts) |
| `POST /api/observe/auth/setup` | Publik, hanya sebelum setup selesai | Body setupSchema: name/email/password; membuat Admin pertama | [handler](../../server/api/observe/auth/setup.post.ts) |
| `POST /api/observe/auth/sign-in` | Publik | Body signInSchema: email/password; sesi dan cookie | [handler](../../server/api/observe/auth/sign-in.post.ts) |
| `POST /api/observe/auth/sign-out` | Publik, origin diperiksa | Cabut sesi bila ada dan hapus cookie | [handler](../../server/api/observe/auth/sign-out.post.ts) |
| `DELETE /api/observe/dashboard-folders/:id` | Admin | Hapus folder jika tidak direferensikan | [handler](../../server/api/observe/dashboard-folders/[id].delete.ts) |
| `GET /api/observe/dashboard-folders` | Signed-in, daftar difilter | Folder yang relevan dengan resource yang terlihat | [handler](../../server/api/observe/dashboard-folders/index.get.ts) |
| `POST /api/observe/dashboard-folders` | Admin | Body {name}; buat folder | [handler](../../server/api/observe/dashboard-folders/index.post.ts) |
| `POST /api/observe/dashboard-imports/check` | Create dashboard | Body dashboardSchema; diagnosis variable/panel draft sebelum import | [handler](../../server/api/observe/dashboard-imports/check.post.ts) |
| `POST /api/observe/dashboard-imports/preview` | Create dashboard | Body {document: JSON, dataSourceId: UUID|null}; konversi/preview, belum menyimpan dashboard | [handler](../../server/api/observe/dashboard-imports/preview.post.ts) |
| `POST /api/observe/dashboards/:id/diagnostics` | View dashboard | Diagnosis query/variable dashboard tersimpan; tanpa body | [handler](../../server/api/observe/dashboards/[id]/diagnostics.post.ts) |
| `POST /api/observe/dashboards/:id/restore-import` | Edit dashboard | Body {dataSourceId: UUID|null, restorePanelOptions?: boolean}; perbaiki hasil import | [handler](../../server/api/observe/dashboards/[id]/restore-import.post.ts) |
| `GET /api/observe/dashboards/:id/versions` | View dashboard | Snapshot versi sebelumnya | [handler](../../server/api/observe/dashboards/[id]/versions.get.ts) |
| `DELETE /api/observe/dashboards/:id` | Delete dashboard | Hapus dashboard dan relasi terkait | [handler](../../server/api/observe/dashboards/[id].delete.ts) |
| `GET /api/observe/dashboards/:id` | View dashboard | Satu Dashboard | [handler](../../server/api/observe/dashboards/[id].get.ts) |
| `PUT /api/observe/dashboards/:id` | Edit dashboard | Body dashboardSchema termasuk revision terkini; update/version | [handler](../../server/api/observe/dashboards/[id].put.ts) |
| `GET /api/observe/dashboards` | Signed-in, daftar difilter | Dashboard[] yang diizinkan | [handler](../../server/api/observe/dashboards/index.get.ts) |
| `POST /api/observe/dashboards` | Create dashboard | Body dashboardSchema; create dan grant creator atomik | [handler](../../server/api/observe/dashboards/index.post.ts) |
| `POST /api/observe/data-sources/:id/test` | Admin | Test query koneksi sumber tersimpan | [handler](../../server/api/observe/data-sources/[id]/test.post.ts) |
| `DELETE /api/observe/data-sources/:id` | Admin | Hapus jika tidak direferensikan | [handler](../../server/api/observe/data-sources/[id].delete.ts) |
| `PUT /api/observe/data-sources/:id` | Admin | Body dataSourceSchema; secret dihilangkan = pertahankan, secret string kosong = hapus | [handler](../../server/api/observe/data-sources/[id].put.ts) |
| `GET /api/observe/data-sources` | Signed-in | Metadata DataSource[] tanpa secret | [handler](../../server/api/observe/data-sources/index.get.ts) |
| `POST /api/observe/data-sources` | Admin | Body dataSourceSchema; simpan koneksi | [handler](../../server/api/observe/data-sources/index.post.ts) |
| `GET /api/observe/notifications` | Signed-in, mengikuti alert | Snapshot/update dengan ?after=cursor opsional | [handler](../../server/api/observe/notifications/index.get.ts) |
| `POST /api/observe/notifications/read` | Signed-in, mengikuti alert | Body {id: UUID} atau {through: cursor}; mark read milik user | [handler](../../server/api/observe/notifications/read.post.ts) |
| `GET /api/observe/notifications/stream` | Signed-in, mengikuti alert | SSE event notifications; ?after=cursor opsional | [handler](../../server/api/observe/notifications/stream.get.ts) |
| `POST /api/observe/queries` | Signed-in, semua source | Body querySchema; hasil QueryResponse, maksimal 5.000 baris | [handler](../../server/api/observe/queries/index.post.ts) |
| `POST /api/observe/telegram-destinations/:id/test` | Admin | Kirim pesan test nyata | [handler](../../server/api/observe/telegram-destinations/[id]/test.post.ts) |
| `DELETE /api/observe/telegram-destinations/:id` | Admin | Hapus jika tidak direferensikan | [handler](../../server/api/observe/telegram-destinations/[id].delete.ts) |
| `PUT /api/observe/telegram-destinations/:id` | Admin | Body telegramDestinationSchema; token kosong mempertahankan tersimpan | [handler](../../server/api/observe/telegram-destinations/[id].put.ts) |
| `GET /api/observe/telegram-destinations` | Signed-in, metadata difilter | Daftar tujuan tanpa token; chatId disamarkan untuk non-Admin | [handler](../../server/api/observe/telegram-destinations/index.get.ts) |
| `POST /api/observe/telegram-destinations` | Admin | Body telegramDestinationSchema; token diperlukan untuk tujuan baru | [handler](../../server/api/observe/telegram-destinations/index.post.ts) |
| `GET /api/observe/users/:id/permissions` | Admin | UserPermissions: baca atau ganti grant; save mencabut sesi target | [handler](../../server/api/observe/users/[id]/permissions.get.ts) |
| `PUT /api/observe/users/:id/permissions` | Admin | UserPermissions: baca atau ganti grant; save mencabut sesi target | [handler](../../server/api/observe/users/[id]/permissions.put.ts) |
| `DELETE /api/observe/users/:id` | Admin | Hapus akun; guard diri sendiri/Admin terakhir | [handler](../../server/api/observe/users/[id].delete.ts) |
| `PUT /api/observe/users/:id` | Admin | Body userInputSchema; ubah akun | [handler](../../server/api/observe/users/[id].put.ts) |
| `GET /api/observe/users` | Admin | Daftar akun | [handler](../../server/api/observe/users/index.get.ts) |
| `POST /api/observe/users` | Admin | Body userInputSchema; buat akun | [handler](../../server/api/observe/users/index.post.ts) |
| `POST /api/observe/variables/resolve` | Signed-in, semua source | Body variableResolutionSchema; selections/variables/values/errors | [handler](../../server/api/observe/variables/resolve.post.ts) |

## SSE dan replay

`GET /api/observe/notifications/stream?after=<cursor>` mengirim frame bernama `notifications`. Payload mengikuti NotificationUpdate. Client menyimpan cursor string dan mengirimkannya ketika reconnect. Tanpa cursor, snapshot histori diambil sebagai keadaan awal, bukan alasan mengeluarkan toast histori satu per satu. Server memeriksa akses pada setiap pembacaan dan mengirim heartbeat berkala; fallback menggunakan GET notifications.

## Menambah endpoint

Perbarui policy role/resource, controller, client, schema, test, dan baris katalog ini dalam perubahan yang sama. `bun run docs:check` membandingkan signature METHOD/path tabel dengan file handler agar endpoint tidak terlupakan. Detail response aksi khusus tetap harus dicocokkan dengan handler/service yang ditautkan, bukan ditebak dari nama route.
