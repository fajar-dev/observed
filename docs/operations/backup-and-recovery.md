# Backup dan recovery

## Yang disimpan

Backup PostgreSQL mencakup konfigurasi source/Telegram, dashboard/versi, alert/evaluasi, akun, permission, sesi, dan notifikasi. Backup ini tidak mencakup metrik di InfluxDB; database sensor membutuhkan kebijakan backup sendiri.

Simpan `OBSERVE_SECRET_KEY` yang cocok dengan backup. Tanpa key itu credential terenkripsi tidak dapat dibaca. Lindungi backup karena mengandung hash akun, sesi, dan konfigurasi sensitif meskipun credential sumber terenkripsi.

## Docker

```sh
sh docker/backup.sh
sh docker/backup.sh backups/observed-before-update.dump
```

Helper memakai `pg_dump` custom format tanpa ownership/ACL, file privat, publish setelah sukses, dan menolak overwrite. Direktori backup diabaikan Git. Salin backup ke penyimpanan terpisah sesuai kebijakan operasi; file di disk host yang sama belum cukup untuk pemulihan kehilangan host.

Restore berikut mengganti isi database yang dituju. Pastikan stack dan dump yang dipilih benar, serta matching key sudah dikonfigurasi:

```sh
sh docker/compose.sh stop app
sh docker/compose.sh exec -T database sh -c \
  'exec pg_restore --clean --if-exists --single-transaction --exit-on-error --no-owner --no-acl --username="$POSTGRES_USER" --role="$OBSERVE_DB_USER" --dbname="$POSTGRES_DB"' \
  < backups/observed-before-update.dump
sh docker/compose.sh up -d --wait app
```

Untuk deployment baru, jalankan database dahulu, restore, lalu app. Role restore memastikan objek dimiliki role aplikasi agar migrasi selanjutnya tetap dapat berjalan.

## Database eksternal

Gunakan fasilitas backup PostgreSQL milik infrastruktur atau `pg_dump --format=custom --no-owner --no-acl` dengan role/PGPASSFILE yang tepat. Hindari password pada command line/log. Hentikan writer aplikasi ketika restore dan restore sebagai role pemilik schema. Gunakan client PostgreSQL yang kompatibel dengan versi server.

## Uji pemulihan

1. Pulihkan ke database terpisah, bukan database aktif.
2. Gunakan key yang sesuai. Sebelum menjalankan aplikasi hasil restore untuk verifikasi, pause rule pada database salinan tersebut (lihat perintah di bawah) agar tidak mengirim pesan tanpa sengaja.
3. Periksa health dan sign-in.
4. Periksa jumlah/isi dashboard, permission, notifikasi, dan versi.
5. Uji dekripsi credential melalui query source yang diketahui.
6. Uji scheduler/delivery hanya pada source/tujuan uji terkontrol.

Menghapus user atau marker setup bukan prosedur recovery admin. Jika seluruh akses admin hilang, gunakan backup yang diketahui dan bantuan pengelola database; jangan membuka bootstrap publik pada database berisi konfigurasi produksi. Catat durasi recovery dan target kehilangan data yang dapat diterima di prosedur operasional instalasi Anda.

Untuk database salinan yang terisolasi, jalankan sebagai pemilik schema melalui psql **sebelum** server aplikasi uji dijalankan:

```sql
UPDATE observe.alert_rules SET enabled = false;
```

Ini hanya untuk salinan pemulihan/QA. Jangan menjalankannya pada database aktif kecuali memang bermaksud mem-pause seluruh rule. Setelah verifikasi, aktifkan hanya rule yang ingin diuji lewat UI.
