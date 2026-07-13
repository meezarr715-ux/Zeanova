# Zeanova Library

Aplikasi web untuk mendownload media dari YouTube, TikTok, Spotify, Instagram, dan mengubah gambar menjadi link menggunakan Catbox.

## Fitur

- **Beranda**: Pengenalan web dengan thumbnail dan statistik.
- **Downloader**: YouTube (MP3/MP4), TikTok (HD/WM/Audio & Slide Foto), Spotify (single track), Instagram (Foto & Video).
- **Convert**: Upload gambar ke Catbox otomatis dengan riwayat 10 link terakhir (hilang setelah 30 detik atau refresh).
- **Laporan Bug**: Tautan ke Google Forms.

## Deploy ke Vercel

1. Clone repositori.
2. Jalankan `npm install`.
3. Pastikan `vercel.json` dan `api/index.js` sudah ada.
4. Deploy dengan `vercel --prod`.

## Struktur Proyek

zeanova-library/
├── api/
│ └── index.js
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
├── package.json
├── vercel.json
└── README.md
