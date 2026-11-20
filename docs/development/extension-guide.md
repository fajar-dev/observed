# Menambah fitur

## Menambah kemampuan domain/API

1. Cari feature terdekat melalui [peta AI](../ai/README.md), jangan membuat domain paralel.
2. Tetapkan schema request/response di `shared/domain`, termasuk default, batas dan enum.
3. Tambahkan fungsi murni atau service method. Bila perlu dependency eksternal, nyatakan port dan implementasikan adapter; inject melalui composition root.
4. Tambahkan repository method dan migrasi jika persistensi berubah. Pertimbangkan lock/transaksi, cascade, dan revision.
5. Buat handler tipis di `server/api`, gunakan validateBody/resourceId dan principal.
6. Update policy role dan resource permission jika endpoint baru. Tidak boleh ada bypass hanya karena path belum dikenali aturan lama.
7. Tambahkan akses client/composable serta UI menggunakan pola loading/error/success yang sudah ada.
8. Uji perilaku bermakna, dokumentasikan endpoint dan kontrak, lalu regenerate inventory.

## Visualisasi baru

Tambah identifier/schema serta katalog visualisasi, pemetaan output di QueryVisualization/QueryChart, opsi panel, default, preview editor, dan converter import bila relevan. Uji seri kosong, null, nilai besar/kecil, banyak label, resize, mobile, legend panjang, field override dan CSV inspector. Jangan mengubah unit data diam-diam agar chart terlihat cocok.

## Perubahan layout

Gunakan fungsi layout bersama dan adapter GridStack. Pertahankan ID panel, row membership, koordinat desktop, columns 12/24, ukuran, serta round-trip save/import/export. Uji row collapsed, panel pindah row, remove row yang mempertahankan panel, compact, mobile dan kiosk. Jangan menyimpan layout satu kolom mobile di atas desktop secara otomatis.

## Perubahan notifikasi/alert

Bedakan evaluasi dari delivery. Tambahkan transition rule dalam evaluator/service, lalu uji pending, no_data/error, duplicate evaluation, mute/pause, firing sekali, recovery, kegagalan satu tujuan, dan retry. Event in-app tetap atomik dengan evaluasi dan permission mengikuti alert. Hindari menambah notification ACL/source ACL tanpa keputusan produk eksplisit.

## Integrasi/provider baru

Pisahkan config server dan identity flow dari UI. Validasi provider claims, expiry, state/linking, dan perbedaan akun. Jangan menyimpan provider tokens tanpa kebutuhan. UI toggle bukan pengganti server authorization.

## Dokumentasi dan rollback

Setiap fitur baru harus menerangkan tujuan, langkah penggunaan, akses, input/output, error, batasan dan cara mengujinya. Untuk schema data tentukan pemulihan dari backup atau migrasi lanjutan; jangan menjanjikan rollback otomatis yang tidak diimplementasikan.
