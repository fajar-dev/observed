# Panduan agent Observed

Baca [docs/ai/README.md](docs/ai/README.md) sebagai konteks AI, [arsitektur](docs/architecture/overview.md), dan panduan fitur yang terkait sebelum mengubah kode. Dokumentasi lengkap untuk pengguna dan pengembang berada di [docs/README.md](docs/README.md). Instruksi pengguna pada tugas aktif menentukan scope perubahan.

## Aturan kerja

- Pertahankan brand Observed untuk monitoring sensor struktur, logo AMTI, dan sistem UI existing. Gunakan Nuxt UI serta semantic tokens, bukan ukuran utility numerik/arbitrary baru.
- Business rules berada di application service/shared pure functions; database/HTTP di adapter, dependency dirangkai di `server/bootstrap`. Route dan view tetap tipis.
- Admin penuh; Editor dapat membuat resource dan memperoleh grant Edit yang dapat dicabut; existing resource mengikuti permission. Viewer membaca resource yang ditugaskan. Semua user sign-in dapat query semua sumber.
- Notifikasi mengikuti akses alert tanpa ACL terpisah. Jaga session revocation, refresh rotation, marker setup sekali, enkripsi credential, dashboard revision, layout desktop/mobile, dan notification cursor bigint sebagai string.
- Jangan membaca/mencetak secret `.env`, mengirim notifikasi nyata, menjalankan test destruktif pada database aktif, atau push/deploy kecuali scope tugas mengizinkan. Gunakan database pengujian terisolasi.
- Jangan menghidupkan kembali fitur yang dihapus (Playground, import ID Grafana, star/share, source ACL) tanpa permintaan eksplisit.
- Perbarui dokumen/kontrak/contoh saat perilaku berubah. Jalankan checks sesuai [testing](docs/development/testing.md), `bun run docs:check`, dan regenerate inventory bila source berubah. Laporkan hasil aktual dan batas verifikasi.
