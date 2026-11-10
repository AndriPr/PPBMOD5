# SCRIPT VIDEO TUGAS PENGGANTI PRAKTIKUM MODUL 5 (PPB 2026)
**Topik:** React Progressive Web App (PWA) II  
**Estimasi Durasi Total:** 8 – 11 Menit  

---

### PERSIAPAN SEBELUM RECORDING (CEK INI DULU):
1. Buka project di VS Code dan jalankan `npm run dev`.
2. Buka browser di `http://localhost:5173/`.
3. Buka tab browser lain ke dashboard **Supabase** milikmu (tunjukkan tabel `products`, `reviews`, `favorites`).
4. Siapkan software perekam layar (OBS / tombol **Windows + Alt + R** bawaan laptop).

---

## 1. PEMBUKAAN & IDENTITAS DIRI (~45 detik)

> **[AKSI LAYAR]:**  
> Tampilkan wajah di webcam atau buka halaman utama aplikasi Bore & Barrel di laptop.

> **[BACA INI]:**  
> "Halo semuanya, selamat malam kepada asisten praktikum Pengembangan Perangkat Bergerak tahun 2026.  
> 
> Perkenalkan nama saya **[Nama Lengkap Kamu]**, NIM **[NIM Kamu]**, dari **Shift [Shift Kamu]**, **Kelompok [Kelompok Kamu]**.  
> 
> Pada kesempatan kali ini, saya membuat video ini sebagai tugas pengganti praktikum Modul 5 mengenai **React Progressive Web App (PWA) II**.  
> 
> Di video ini saya akan mendemonstrasikan langkah percobaan sesuai modul, integrasi database Supabase pribadi, fitur paginasi, pembuktian lazy load dan query caching, serta penjelasan kode fitur sharelink. Mari kita mulai."

---

## 2. DATABASE SUPABASE PRIBADI (KETENTUAN POIN 5) (~1.5 menit)

> **[AKSI LAYAR]:**  
> Pindah ke browser tab Supabase kamu (perlihatkan tabel `products`, `reviews`, `favorites`). Lalu buka file `.env` dan `src/config/api.js` di VS Code.

> **[BACA INI]:**  
> "Sesuai ketentuan poin ke-5 tugas pengganti, saya tidak menggunakan shared API modul, melainkan sudah membuat dan mengintegrasikan database Supabase pribadi saya sendiri.  
> 
> Bisa dilihat di dashboard Supabase saya, terdapat tiga tabel utama yaitu **products** untuk inventaris katalog, **reviews** untuk ulasan, dan **favorites** untuk bookmark barang.  
> 
> Kemudian pada source code di file **.env**, URL dan Anon Key sudah diarahkan ke project Supabase milik saya sendiri.  
> 
> Komunikasi datanya ditangani oleh **Axios** di `src/config/api.js`, lengkap dengan interceptor yang otomatis menyematkan apikey dan token otorisasi pada setiap request jaringan."

---

## 3. LANGKAH PERCOBAAN & FITUR PWA (KETENTUAN POIN 1) (~1.5 menit)

> **[AKSI LAYAR]:**  
> Buka web di browser. Tekan **F12** -> pilih tab **Application** -> klik menu **Service Workers** dan **Manifest**. Tunjukkan banner install PWA di kanan bawah.

> **[BACA INI]:**  
> "Selanjutnya untuk langkah percobaan sesuai instruksi modul, aplikasi ini dikembangkan dengan ReactJS dan build tool Vite.  
> 
> Untuk kapabilitas PWA, proyek menggunakan pustaka **vite-plugin-pwa**.  
> 
> Jika kita inspect di tab **Application**, bisa kita lihat **Service Worker** sudah aktif dan terdaftar dengan baik. Pada tab **Manifest**, metadata seperti nama 'Bore & Barrel', warna tema, dan icon aplikasi 192 serta 512 piksel sudah terpasang.  
> 
> Di pojok bawah juga tersedia badge instalasi PWA untuk memasang aplikasi ke home screen perangkat desktop maupun smartphone secara luring. Proyek ini juga sudah berhasil di-build dan siap di-deploy ke Vercel."

---

## 4. DEMONSTRASI & KODE PAGINASI (KETENTUAN POIN 4) (~1.5 menit)

> **[AKSI LAYAR]:**  
> Di halaman katalog, scroll ke bawah ke bagian tombol navigasi [<- Prev] [1] [2] [Next ->]. Klik tombol halaman 2, lalu klik tombol halaman 1. Buka file `src/pages/Catalog.jsx` di VS Code.

> **[BACA INI]:**  
> "Untuk ketentuan poin ke-4 yaitu **Paginasi**.  
> 
> Pada katalog ini, saya membatasi tampilan menjadi **6 produk per halaman** agar proses rendering antarmuka tetap ringan dan cepat.  
> 
> Bisa kita lihat di bawah katalog terdapat kontrol navigasi: Previous, nomor halaman, dan Next. Saat saya klik halaman kedua, daftar produk langsung berganti dengan cepat tanpa reload seluruh halaman.  
> 
> Pada kodenya di `src/pages/Catalog.jsx`, saya menggunakan state `currentPage` dan `itemsPerPage`. Data produk yang tampil dihitung secara dinamis menggunakan `useMemo` dengan teknik pemotongan atau slicing array berdasarkan halaman aktif."

---

## 5. PEMBUKTIAN LAZY LOAD (KETENTUAN POIN 2) (~2 menit)

> **[AKSI LAYAR]:**  
> Tekan **F12** -> tab **Network** -> klik filter **Img** -> reload halaman. Perlihatkan request gambar hanya yang ada di posisi atas layar. Kemudian scroll ke bawah perlahan-lahan, tunjukkan request gambar baru muncul bertahap di Network tab.

> **[BACA INI]:**  
> "Masuk ke poin ke-2, yaitu pembuktian **Lazy Load** pada gambar katalog.  
> 
> Tujuannya adalah menunda pemuatan gambar sampai elemen tersebut benar-benar muncul di layar saat pengguna melakukan scroll, sehingga menghemat kuota dan mempercepat loading awal.  
> 
> Mari kita amati di tab Network dengan filter `Img`:  
> Saat halaman baru dimuat, browser hanya meminta gambar untuk produk yang berada di area atas.  
> 
> Ketika saya mulai scroll ke bawah secara bertahap... perhatikan di tab Network, request gambar baru dieksekusi satu per satu sesuai posisi kartu di layar.  
> 
> Implementasinya ada di komponen `src/components/common/LazyImage.jsx` yang menggunakan **IntersectionObserver** untuk memantau kemunculan elemen di viewport sebelum tag `<img>` aktif dimuat."

---

## 6. PEMBUKTIAN QUERY CACHING (KETENTUAN POIN 2) (~1.5 menit)

> **[AKSI LAYAR]:**  
> Di tab Network (pastikan opsi 'Disable cache' TIDAK dicentang), reload halaman katalog. Arahkan mouse ke kolom **Size** yang bertuliskan **(disk cache)** atau **(ServiceWorker)**. Tunjukkan file `src/utils/queryCache.js` dan `vite.config.js` di VS Code.

> **[BACA INI]:**  
> "Masih di poin ke-2, selanjutnya adalah **Query Caching**.  
> 
> Caching bertujuan menyimpan hasil permintaan data dan aset agar akses berikutnya tidak membebani server dan responsnya seketika.  
> 
> Buktinya bisa kita lihat di tab Network:  
> Setelah gambar pernah dimuat, ketika halaman saya reload ulang, ukuran pada kolom Size menampilkan status **(disk cache)** atau **from ServiceWorker**. Ini artinya gambar langsung disajikan dari memori lokal komputer tanpa download ulang dari server.  
> 
> Di sisi kode, hal ini diatur oleh runtime caching Workbox di `vite.config.js` dengan strategi `CacheFirst`, serta modul `src/utils/queryCache.js` yang meng-cache respon JSON dari API selama 5 menit."

---

## 7. PENJELASAN KODE FITUR SHARELINK (KETENTUAN POIN 3) (~1.5 menit)

> **[AKSI LAYAR]:**  
> Klik tombol Share (ikon share) pada salah satu produk -> muncul feedback 'Link Copied'. Buka tab baru di browser -> paste linknya (misal: `?gun=1`) -> tekan Enter -> tunjukkan bahwa aplikasi **langsung otomatis membuka halaman detail dari produk itu**. Lalu buka file `src/App.jsx`.

> **[BACA INI]:**  
> "Ketentuan poin ke-3 adalah **Sharelink Button** untuk setiap katalog.  
> 
> Di setiap kartu produk pada `GunCard.jsx` dan halaman detail, terdapat tombol Share. Saat diklik, sistem membuat link spesifik berformat parameter `?gun=ID_PRODUK` dan menyalinnya ke clipboard.  
> 
> Fitur ini sudah mendukung deep-linking. Sebagai contoh, ketika link ini saya buka di tab baru, aplikasi langsung otomatis mendeteksi parameter tersebut dan menampilkan halaman detail barang yang bersangkutan.  
> 
> Kodenya ada di `src/App.jsx` pada hook `useEffect`, di mana sistem membaca `URLSearchParams` saat inisialisasi aplikasi. Jika ada parameter 'gun', sistem langsung mengambil datanya dan mengarahkan tampilan ke mode detail."

---

## 8. PENUTUP (~30 detik)

> **[AKSI LAYAR]:**  
> Tampilkan kembali halaman muka aplikasi atau webcam.

> **[BACA INI]:**  
> "Sekian presentasi dan demonstrasi tugas pengganti praktikum Modul 5 mengenai Progressive Web App dari saya. Seluruh poin mulai dari integrasi database mandiri, PWA, paginasi, lazy load, query caching, hingga fitur sharelink telah berhasil diimplementasikan dengan baik.  
> 
> Terima kasih banyak atas perhatian dari kakak-kakak asisten laboratorium. Selamat malam dan wassalamu’alaikum warahmatullahi wabarakatuh."

---

### INFORMASI PENGUMPULAN DI YOUTUBE:
- **Format Judul Video:**
  `Tugas Pengganti Praktikum PPB Modul 5 - [Nama Kamu] - [Shift] - [Kelompok]`
- **Format Komentar:**
  `NAMA_KELXX_LINK YOUTUBE`
