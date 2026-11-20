# Mulai menggunakan Observed

## Administrator pertama

1. Jalankan aplikasi dengan [instalasi lokal](../installation/local.md) atau [Docker](../installation/docker.md).
2. Buka `/sign-in` dan buat administrator pertama. Halaman setup hanya tersedia sebelum instalasi diinisialisasi.
3. Tambahkan sumber InfluxDB dari **Configuration → Data sources** dan uji koneksinya.
4. Buat dashboard melalui **Dashboards → New dashboard → Create new**.
5. Tambahkan panel, pilih sumber, tulis/bangun query, jalankan preview, dan atur visualisasi serta unit.
6. Simpan panel dan **Save** dashboard. Perubahan layout belum permanen sebelum dashboard disimpan.
7. Buat rule di **Alerts**, gunakan query numerik yang sudah diverifikasi, preview kondisi, tentukan threshold/jadwal, kemudian simpan.
8. Opsional: tambahkan tujuan Telegram di Configuration dan pilih pada rule.
9. Tambahkan user di **Users**, pilih role, lalu atur akses dashboard/alert melalui **Permissions**.

## Pengguna yang sudah memiliki akun

Sign-in menggunakan password atau provider yang diaktifkan administrator. Buka dashboard yang diizinkan, ubah filter variable/rentang waktu, dan gunakan inspector untuk melihat data sumber. Editor dapat membuat dashboard dan alert sendiri; Viewer hanya membaca resource yang ditugaskan.

Ikon lonceng di header tetap tersedia walaupun belum ada akses alert. Inbox hanya berisi notifikasi alert yang diizinkan. Menu akun membuka **Profile** dan **Sign out**. Search di header membantu membuka halaman/dashboard yang tersedia untuk akun tersebut.

## Contoh alur sensor

Untuk sensor kemiringan pada pier jembatan, buat panel time series berdasarkan field `tilt` dan filter `sensor`. Gunakan unit yang sama dengan data fisik sensor. Buat alert dengan field numerik yang eksplisit, reducer yang sesuai, serta threshold yang telah ditetapkan engineer. Uji preview dan data kosong sebelum mengaktifkan pengiriman.

Data bernama `structure_sensors`, `tilt`, atau `P2` di dokumentasi adalah contoh; ganti sesuai schema InfluxDB Anda. Tidak ada data sensor demo yang otomatis dibuat.
