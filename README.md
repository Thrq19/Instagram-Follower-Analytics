# 📊 Instagram Follower Analytics

[![Live Demo](https://img.shields.io/badge/Live_Demo-Visit_Website-2ea44f?style=for-the-badge&logo=vercel)](https://thrq-ifa.vercel.app/)

Aplikasi web sederhana namun *powerful* untuk menganalisis data pengikut (followers) dan yang diikuti (following) di Instagram. Temukan siapa yang tidak *follow back* (follback), siapa yang kamu tidak *follback*, dan siapa saja teman *mutual* kamu.

Aplikasi ini aman, responsif, dan mendukung mode gelap (Dark Mode).

---

## 🚀 Fitur Utama

* **Analisis Akurat:** Memproses file JSON resmi dari "Download Information" Instagram.
* **Kategori Lengkap:**
    * 🤝 **Mutuals:** Akun yang saling mengikuti.
    * 💔 **Not Following Back:** Akun yang kamu ikuti, tapi tidak mengikuti balik.
    * 🤷‍♂️ **Not Followed By You:** Akun yang mengikuti kamu, tapi tidak kamu ikuti balik.
* **Export PDF Laporan:** Unduh hasil analisis dalam format PDF yang rapi (mendukung *link* profil aktif).
* **Dark Mode & Light Mode:** Tampilan yang nyaman di mata dengan tema yang bisa diganti.
* **Responsive Design:** Tampilan optimal di Desktop, Tablet, dan Mobile.
* **Privasi Terjamin:** Analisis data dilakukan secara lokal di *browser*. Data hanya dikirim ke server sesaat untuk pembuatan PDF lalu dihapus.

---

## 🛠️ Teknologi yang Digunakan

**Frontend:**
* HTML5
* CSS3 (Custom Properties / CSS Variables)
* Vanilla JavaScript (ES6+)
* Google Analytics (GA4) untuk pelacakan pengunjung.

**Backend (Serverless):**
* Node.js
* Express.js
* `pdf-lib` (untuk generate PDF dengan template kustom)
* Vercel Serverless Functions

---

## 📋 Cara Penggunaan (User Guide)

1.  **Dapatkan Data Instagram:**
    * Buka Instagram > Settings > Your Information and Permissions.
    * Pilih **Download Information**.
    * Pilih format **JSON** (Bukan HTML).
    * Tunggu email dari Instagram dan download file ZIP-nya.
2.  **Upload File:**
    * Buka website [thrq-ifa.vercel.app](https://thrq-ifa.vercel.app/).
    * Ekstrak file ZIP Instagram.
    * Masuk ke folder `followers_and_following`.
    * Upload file `followers_1.json` ke kolom pertama.
    * Upload file `following.json` ke kolom kedua.
3.  **Lihat Hasil:**
    * Klik tombol **"Proses Analisis"**.
    * Jelajahi tab Mutuals, Not Following Back, dll.
4.  **Ekspor:** Klik tombol "Export to PDF" untuk menyimpan laporan.

---

## 💻 Instalasi & Menjalankan secara Lokal

Jika Anda ingin mengembangkan atau menjalankan proyek ini di komputer sendiri:

1.  **Clone Repositori:**
    ```bash
    git clone [https://github.com/username-anda/Instagram-Follower-Analytics.git](https://github.com/username-anda/Instagram-Follower-Analytics.git)
    cd Instagram-Follower-Analytics
    ```

2.  **Instal Dependensi Backend:**
    Masuk ke folder `api` dan instal paket yang dibutuhkan.
    ```bash
    cd api
    npm install
    ```

3.  **Siapkan Font & Template:**
    * Pastikan folder `templates/` ada di *root* proyek (sejajar dengan folder `api`).
    * Pastikan file font (misal `Inter-24pt-Regular.ttf`) ada di dalam folder `api/`.

4.  **Jalankan Server Backend:**
    (Di dalam folder `api`)
    ```bash
    node server.js
    ```
    *Server akan berjalan di http://localhost:3000*

5.  **Jalankan Frontend:**
    Gunakan ekstensi **Live Server** di VS Code atau buka file `index.html` di browser.
    *Pastikan `app.js` mengarah ke `http://localhost:3000/api/generate-pdf` saat testing lokal.*

---

## 🔒 Kebijakan Privasi

* **Pemrosesan Lokal:** Pembacaan file JSON dan logika perbandingan followers dilakukan sepenuhnya di sisi klien (*client-side*) menggunakan JavaScript browser.
* **Penggunaan Server:** Server hanya digunakan untuk fitur **Generate PDF**. Data list username dikirim ke server, diproses menjadi file PDF, dikirim kembali ke user, dan tidak disimpan di database server.

---

## 👤 Author

**Thoriq Ahmad Salahuddin Al Ayubi**

* Instagram: [@thorq.ahmd](https://www.instagram.com/thorq.ahmd/)
* LinkedIn: [Thoriq Ahmad](https://www.linkedin.com/in/thoriq-ahmad-salahuddin-al-ayubi-87b3852b7)

---


&copy; 2024 Instagram Archive Analytics.

