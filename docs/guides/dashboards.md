# Dashboard, layout, row, dan kiosk

## Membaca dashboard

Toolbar menampilkan judul/deskripsi, rentang waktu, refresh manual dan interval refresh. Variable berada dalam area dashboard, di bawah toolbar. Pilihan waktu dapat relatif atau absolut; rentang absolut harus memiliki awal dan akhir yang valid, maksimum 366 hari.

Buka menu panel → **Inspect data** untuk memeriksa hasil query. **Check panel data** pada menu dashboard menjalankan diagnosis variable serta panel, membedakan panel berisi data, kosong, error, dan belum terkonfigurasi.

## Mengedit

1. Pilih **Edit dashboard** jika memiliki Edit access.
2. Gunakan **Add → Add panel** untuk visualisasi atau **Add → Add row** untuk kelompok panel.
3. Pada desktop, seret panel melalui header dan resize melalui handle grid. Grid menyimpan posisi serta tinggi/lebar panel; format 12 atau 24 kolom dipertahankan.
4. Gunakan menu panel untuk edit, duplicate, remove, atau **Move to row**. Menghapus panel dari draft belum menghapus keseluruhan dashboard.
5. Gunakan **Compact layout** melalui menu edit bila ingin merapatkan posisi panel.
6. Pilih **Save** untuk menyimpan atau **Discard** untuk membuang perubahan draft.

Pada mobile panel ditampilkan dalam satu kolom agar terbaca. Susunan mobile tidak boleh dianggap sebagai penggantian koordinat desktop. Gunakan desktop untuk pengaturan drag/resize yang presisi; uji kembali panel yang memiliki banyak seri atau tabel lebar pada kedua viewport.

## Row accordion

Row mengelompokkan panel dan dapat dibuka/ditutup melalui judulnya. Menu row pada mode edit menyediakan pengaturan judul, urutan, dan penghapusan row. Panel dapat dipindahkan antar-row atau ke **No row**. Menghapus row mempertahankan panelnya di dashboard.

Collapse saat melihat dashboard bersifat sementara. Pengaturan row yang disimpan pada mode edit menentukan keadaan awal yang akan digunakan saat dashboard dibuka kembali.

## Settings dan versi

**Dashboard settings** memiliki tab **General**, **Variables**, **Versions**, **JSON**. General mengatur nama, deskripsi singkat, folder, dan tag; variable dijelaskan [terpisah](variables.md).

Perubahan dashboard menggunakan revision untuk mendeteksi edit bersamaan. Jika save mendapat conflict 409, jangan menimpa perubahan pengguna lain: simpan salinan draft bila diperlukan, reload versi terbaru, lalu terapkan ulang perubahan.

Tab Versions menyediakan snapshot sebelumnya (maksimal 100). Memulihkan snapshot memasukkannya ke draft; periksa lalu Save. Dashboard baru belum memiliki snapshot perubahan sampai ada pembaruan. JSON di Settings juga diterapkan ke draft sebelum disimpan.

## Refresh

Pilihan: **Off**, **Auto**, **5s**, **10s**, **30s**, **1m**, **5m**, **15m**, **30m**, **1h**, **2h**, **1d**. Nilai lama yang valid seperti 15 detik masih dapat ditampilkan bila dashboard menyimpannya.

Auto menghitung `ceil(durasi rentang waktu dalam detik / 300)`, dibatasi 5 detik–1 hari. Contoh rentang 1 jam menghasilkan 12 detik. Timer panel berhenti ketika tab browser tersembunyi atau dashboard sedang diedit. Jadwal alert berjalan di server dan terpisah dari refresh dashboard.

## Kiosk

Pilih **Kiosk mode** atau buka dashboard dengan parameter `?kiosk=1`. Sidebar/header aplikasi disembunyikan, tetapi toolbar dashboard, filter variable, rentang waktu, refresh, dan **Exit kiosk** tetap tersedia. Edit dan action menu disembunyikan. Escape menutup overlay terlebih dahulu atau keluar dari kiosk ketika tidak ada overlay aktif. Kiosk tetap memerlukan autentikasi dan permission, bukan link publik.
