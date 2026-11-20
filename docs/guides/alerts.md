# Alert sensor

## Membuat rule

Admin dan Editor dapat membuat rule; rule existing memerlukan Edit access untuk diubah atau dievaluasi manual.

1. Buka **Alerts → New alert rule**.
2. Isi nama singkat, summary opsional, severity, sumber, query, dan rentang waktu.
3. Jalankan preview dan pastikan hasil memiliki field numerik yang benar.
4. Pilih field, reducer (`last`, `mean`, `min`, `max`), operator (`gt`, `gte`, `lt`, `lte`), dan threshold.
5. Tentukan interval evaluasi 30–86.400 detik dan pending period 0–86.400 detik.
6. Pilih tujuan Telegram bila diperlukan; daftar kosong tetap mengaktifkan notifikasi dalam aplikasi.
7. Simpan sebagai enabled bila rule siap dievaluasi server.

Preview tidak menyimpan evaluasi produksi dan tidak mengirim notifikasi. **Evaluate now** menjalankan evaluasi sebenarnya dan dapat mengirim notifikasi bila enabled dan tidak mute. Menjalankan manual pada rule paused dapat menguji query, tetapi tidak menghasilkan pengiriman.

## Contoh kondisi

Misalnya query mengembalikan kemiringan dalam derajat. Pilih field `_value`, reducer `last`, operator `gt`, dan threshold yang ditentukan engineer. Jika data berupa rasio, threshold harus menggunakan rasio yang sama; judul “80%” tidak mengubah threshold `80` menjadi `0.8`.

Kosongkan field hanya jika pemilihan otomatis memang sesuai: `_value` numerik diprioritaskan, selain itu evaluator membaca field numerik yang tersedia. Untuk query yang mengembalikan banyak kolom/seri, pilih field eksplisit dan filter sensor agar reducer tidak mencampur pengukuran yang berbeda. `last` memakai timestamp terbaru, termasuk presisi pecahan waktu; tanpa timestamp valid urutan hasil memengaruhi pilihan terakhir.

## State dan pengiriman

| State | Arti |
| --- | --- |
| `normal` | Ada nilai numerik dan kondisi threshold tidak terpenuhi |
| `pending` | Kondisi terpenuhi tetapi durasi pending belum tercapai |
| `firing` | Kondisi terpenuhi dan pending selesai |
| `no_data` | Tidak ada sampel numerik yang dapat dievaluasi |
| `error` | Query gagal atau hasil terpotong |
| Paused (UI) | Rule disabled; scheduler melewati rule |

Pending membutuhkan kondisi yang terus terpenuhi pada evaluasi berikutnya; kondisi normal/no_data/error mereset pending. Interval evaluasi memberi resolusi pengamatan, bukan pengukuran kontinu di antara dua evaluasi.

Firing pertama pada satu episode menghasilkan event firing. Normal setelah episode yang telah diberitahukan menghasilkan recovery. Evaluasi normal pertama tidak membuat recovery. Pending, no_data, dan error bukan recovery. Setiap evaluasi menyimpan histori, maksimal 50 entri terbaru.

## Pause, mute, dan perubahan rule

Pause menghentikan evaluasi terjadwal. Mute sementara tetap mengevaluasi rule tetapi menahan event/notifikasi baru. Gunakan aksi yang tersedia pada menu rule, lalu periksa state dan waktu mute.

Mengubah query, source, range, field, reducer, operator, threshold, atau pending period mereset evaluasi aktif/pending untuk kondisi baru. Perubahan enabled juga mereset pending. Histori bukan audit log tanpa batas.

Scheduler memeriksa rule due setiap 10 detik dan menjalankan kelompok maksimal empat rule secara paralel. Lock PostgreSQL mencegah dua instance mengevaluasi rule sama bersamaan. Scheduler selalu aktif selama proses aplikasi berjalan; browser dashboard tidak perlu terbuka. Kontrol enabled/pause berlaku pada masing-masing rule, bukan lewat environment global.

Untuk memastikan alur bekerja: gunakan source uji, preview normal, ubah sampel terkontrol hingga melewati threshold, tunggu pending, periksa firing di inbox/Telegram, kembalikan sampel, lalu periksa recovery. Jangan mengubah data sensor produksi hanya untuk simulasi.
