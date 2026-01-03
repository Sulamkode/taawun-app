# 🤝 Sistem Manajemen Dana Ta'awun (Social Safety Net)

![Status](https://img.shields.io/badge/Status-Active-success)
![Platform](https://img.shields.io/badge/Platform-Google%20Apps%20Script-blue)

## 📖 Deskripsi
Aplikasi web berbasis **Google Apps Script** (Serverless) yang dirancang untuk mengelola dana sosial (Ta'awun). Aplikasi ini mengubah Google Spreadsheet menjadi database yang aman, dilengkapi dengan antarmuka (UI) modern untuk input data dan dashboard real-time.

Proyek ini bertujuan untuk transparansi pengelolaan dana, mencatat pemasukan (sedekah rutin), pengeluaran (santunan/pinjaman), serta memonitor saldo kas dan piutang anggota secara otomatis.

## ✨ Fitur Utama
* **Dashboard Real-time:** Visualisasi saldo kas, total piutang, dan arus kas menggunakan *Chart.js*.
* **Input Data Transaksi:** Form input (IN/OUT) dengan validasi saldo otomatis (mencegah input jika saldo minus).
* **Manajemen Piutang:** Pelacakan otomatis saldo pinjaman per anggota.
* **Laporan Sedekah Rutin:** Fitur pengecekan siapa yang sudah/belum bayar sedekah di bulan tertentu.
* **Bukti Lampiran:** Upload bukti transfer/nota langsung ke Google Drive.

## 🛠️ Teknologi yang Digunakan
* **Backend:** Google Apps Script (JavaScript)
* **Database:** Google Sheets
* **Frontend:** HTML5, CSS3 (Tailwind CSS via CDN)
* **Visualisasi:** Chart.js
* **Icons:** Phosphor Icons

## 🚀 Cara Instalasi (Deployment)

Karena proyek ini berbasis Google Workspace, berikut cara memasangnya:

1.  Buat Google Spreadsheet baru di akun Google Anda.
2.  Buat sheet dengan nama tab: `master` (untuk data anggota) dan `Data` (untuk transaksi).
3.  Buka menu **Extensions** > **Apps Script**.
4.  Salin kode dari folder `src/` repositori ini:
    * Isi `Code.gs` dengan konten dari `src/Code.js`.
    * Buat file HTML baru bernama `Index.html` dan isi dengan konten dari `src/Index.html`.
5.  Simpan dan klik tombol **Deploy** > **New Deployment** > **Web App**.
6.  Set akses ke *"Anyone with Google Account"* atau *"Anyone"* sesuai kebutuhan.

## 📂 Struktur Database (Google Sheets)
Agar aplikasi berjalan lancar, pastikan header kolom di Spreadsheet `Data` adalah:
`Periode | Tgl Transaksi | In/Out | Jenis | Nama | Debit | Kredit | Deskripsi | Link File`

## 🤝 Kontribusi
Pull Request dipersilakan. Untuk perubahan besar, harap buka issue terlebih dahulu untuk mendiskusikan apa yang ingin Anda ubah.

## 📝 Lisensi
[MIT License](LICENSE)
