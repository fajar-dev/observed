# Branding dan sistem UI

## Identitas

Nama produk **Observed**. Gunakan bahasa pemantauan sensor struktur: dashboard sensor, structural trends, threshold alert, source, struktur, bangunan, dan jembatan. Pengguna utamanya engineer sipil, kontraktor, dan pemilik struktur. Logo AMTI tetap dipakai; perubahan copy tidak mengganti logo.

Identitas terpusat di [product.ts](../../shared/config/product.ts). Metadata global di [nuxt.config.ts](../../nuxt.config.ts) dan metadata halaman melalui helper SEO. Aplikasi merupakan console privat dengan `noindex, nofollow`, bukan landing page publik.

Hindari istilah “workspace” pada copy UI, nama monitoring lama, klaim sensor ingest otomatis, atau fitur yang belum ada. Identifier internal `WorkspaceApi`, `WorkspacePage`, dan `createWorkspace` tidak harus diubah hanya untuk menyesuaikan teks produk.

## Aturan visual

- Pertahankan logo, sidebar, header, palette biru, background putih, dan container fluid.
- Gunakan komponen Nuxt UI, konfigurasi bersama di [app.config.ts](../../app/app.config.ts), serta primitive yang sudah ada sebelum membuat komponen custom.
- Ukuran komponen menggunakan `xs`, `sm`, `md`, `lg`, `xl`. Spacing/dimensi memakai token semantic dari [tokens.css](../../app/assets/styles/tokens.css), bukan angka/arbitrary utility per halaman.
- Toolbar/filter/action biasanya `sm`; field form `md`. Semua input/select/textarea yang memerlukan isian memiliki label, placeholder bermakna, dan pesan validasi.
- Tab horizontal memakai variant link bergaris. Menu action memakai ikon titik tiga vertikal dan alignment kanan.
- Modal biasa hanya title, tanpa deskripsi title serta garis pemisah header/footer. Gunakan padding global yang ringkas. Modal/slideover memakai overlay tipis dan blur subtle. Editor fullscreen mempertahankan struktur kerja editor.
- Toast melalui helper bersama, dengan title singkat dan description yang menjelaskan hasil atau langkah berikutnya; keduanya wajib pada kontrak helper. Pesan sukses tidak boleh menyatakan koneksi sudah teruji jika hanya menyimpan konfigurasi. Tanpa progress/loading toast. Jangan menambah `UAlert` atau banner error paralel untuk alur yang sudah memakai toast.
- Empty state singkat, dengan CTA jika role dapat membuat resource. Hindari statistik footer atau paragraf penjelasan panjang yang mengulang UI.

Typography: Inter untuk body/form, Manrope untuk heading/metric, JetBrains Mono untuk query/kode. Gunakan tebal huruf dari hierarchy token; jangan semua label dijadikan bold. Diagram/chart harus mempunyai area untuk axis, legend dan tabel yang dapat scroll secara lokal, tanpa overflow halaman.

## Verifikasi UI

Uji desktop, mobile, judul panjang, banyak seri, tabel lebar, empty state, permission terbatas, keyboard focus, modal close, dan kiosk. Perubahan style lintas aplikasi sebaiknya pada token/konfigurasi komponen, bukan override per view. Aturan lint semantic UI berada di [semantic-ui.mjs](../../tooling/eslint/semantic-ui.mjs).
