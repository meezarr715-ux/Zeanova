# Zeanova Library

Aplikasi web lengkap untuk mendownload media dari YouTube, TikTok, Spotify, Instagram, dan mengubah gambar menjadi link menggunakan Catbox.

## Fitur

- **Beranda**: Pengenalan web dengan thumbnail dan statistik.
- **Downloader**: 4 platform (YouTube, TikTok, Spotify, Instagram).
- **Convert**: Upload gambar ke Catbox dengan progress bar dan riwayat link.
- **Laporan Bug**: Tautan ke Google Forms.

## Instalasi

1. Clone repositori ini.
2. Jalankan `npm install` untuk menginstal dependensi.
3. Jalankan `npm start` atau `npm run dev`.
4. Buka `http://localhost:3000` di browser.

## Struktur Proyek

zeanova-library/
├── package.json
├── server.js
├── downloader/
│ ├── youtube.js
│ ├── tiktok.js
│ ├── spotify.js
│ ├── instagram.js
│ └── catbox.js
├── public/
│ ├── index.html
│ ├── style.css
│ └── script.js
└── README.md
