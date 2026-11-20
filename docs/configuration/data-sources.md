# Configuration: InfluxDB

Hanya Administrator dapat menambah, mengubah, menguji, dan menghapus koneksi. Semua pengguna yang sudah sign-in dapat melihat metadata sumber dan menjalankan query. Tidak ada permission per data source.

## Menambah koneksi

1. Buka **Configuration → Data sources → Add data source**.
2. Isi nama yang menjelaskan sumber sensor atau lokasi struktur.
3. Isi base URL InfluxDB, misalnya `http://192.168.10.20:8086`. Jangan tambahkan `/api/v2/query`, credential URL, parameter, atau fragment.
4. Pilih bahasa query yang benar, lalu isi bucket/database dan credential yang sesuai.
5. Simpan dan gunakan **Test connection** pada daftar sumber.

| Field | Flux | InfluxQL |
| --- | --- | --- |
| URL | Server yang menyediakan API `/api/v2/query` | Server yang menyediakan API `/query` |
| Organization | Wajib | Dapat kosong |
| Bucket/database | Bucket default | Database default |
| Username | Tidak diperlukan untuk token Flux | Isi untuk Basic authentication |
| Credential | Token yang dapat membaca bucket | Token, atau password ketika username diisi |

Observed tidak mengaktifkan dukungan Flux pada server yang tidak menyediakannya. Untuk InfluxQL pada deployment InfluxDB yang memerlukan mapping DBRP, mapping tersebut harus disiapkan di server InfluxDB.

## Mengubah dan menghapus

Credential tidak dikembalikan API. Pada edit, membiarkan credential kosong mempertahankan credential tersimpan; gunakan kontrol penghapusan credential bila ingin mengosongkannya. Jangan menyalin nilai placeholder sebagai credential baru. Secret disimpan terenkripsi di PostgreSQL.

Sumber yang masih direferensikan dashboard atau alert tidak dapat dihapus; pindahkan/hapus referensinya dahulu. Pemilihan source variable juga perlu diperiksa sebelum menghapus sumber.

## Koneksi dari Docker

`localhost` di container bukan komputer host. Untuk InfluxDB di host Docker gunakan `http://host.docker.internal:8086`. Untuk sumber LAN gunakan alamat LAN yang dapat dicapai container. Pastikan service InfluxDB menerima koneksi dari interface yang sesuai.

## Batas query

Transport remote memiliki timeout 12 detik dan batas respons 8 MiB. Hasil query dibatasi 5.000 baris, disertai `truncated`. Gunakan filter measurement, field, sensor, range pendek, dan agregasi server. Alert menolak hasil terpotong agar tidak mengambil keputusan dari data parsial.

Gunakan credential InfluxDB dengan hak baca minimum. Filter baca InfluxQL adalah pertahanan tambahan; credential upstream tetap batas keamanan utama, termasuk untuk Flux. Contoh query ada di [panduan panel](../guides/panels-and-queries.md).
