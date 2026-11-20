# Workflow pengembangan

## Memulai perubahan

1. Baca [pengenalan](../introduction.md), [arsitektur](../architecture/overview.md), dan [aturan UI](../reference/branding-and-ui.md).
2. Jalankan [instalasi lokal](../installation/local.md). Jangan memakai data produksi untuk pengembangan/test.
3. Periksa `git status`, diff existing, serta schema/port/controller yang terkait.
4. Tentukan perilaku yang hendak diubah dan aturan akses sebelum mengubah komponen.
5. Gunakan branch `codex/<nama-perubahan>` untuk pekerjaan agent bila membuat branch baru; ikuti konvensi tim untuk kontribusi manusia.

## Konvensi kode

TypeScript dengan type/schema bersama, nama deskriptif konsisten, error terstruktur, constructor DI untuk service dan adapter. Gunakan fungsi murni untuk transformasi/evaluator. Jangan menambah abstraction/generic repository baru bila kebutuhan sudah dapat ditangani port yang ada.

Feature view mengorkestrasi UI; composable menangani state dan lifecycle; business rules server berada di application service; HTTP handler melakukan validasi dan pemetaan saja. Infrastruktur database/HTTP tetap di adapter. Hapus import/dependency/code yang tidak lagi dipakai setelah perubahan; jangan mempertahankan jalur lama yang menduplikasi perilaku.

Format mengikuti ESLint repositori (termasuk tanpa trailing comma). Komponen Nuxt UI dan semantic token diutamakan. Penamaan endpoint, field JSON, dan kolom SQL yang publik/persisten tidak diganti tanpa migrasi dan pembaruan kontrak.

## Perubahan database dan API

Update schema Zod, service, repository/migrasi, API client, dan UI terkait sebagai satu perubahan koheren. Periksa backward compatibility terhadap data tersimpan dan concurrent update. Body/controller harus tetap memakai helper validasi dan resource ID. Perubahan akses wajib menguji request langsung dan list yang difilter, bukan hanya tombol.

## Sebelum review

Jalankan check sesuai [pengujian](testing.md). Perbarui panduan fitur, API, environment, dan contoh yang berubah. Regenerasi inventory jika source berubah. Periksa diff untuk secret, output build, backup, fixture credential produksi, serta file di luar scope.

Commit dipisah berdasarkan perubahan logis (misalnya domain/API, UI, test, docs), dengan pesan yang menjelaskan hasil. Jangan mengarang hasil test atau menyebut check yang di-skip sebagai pass. Push/deploy hanya sesuai instruksi pemilik pekerjaan.
