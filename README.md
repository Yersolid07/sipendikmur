<div align="center">
  
  # 🏆 SIPENDIKMUR
  **Sistem Penjurian & Manajemen Lomba GMIM Terpadu**
  
  [![Next.js](https://img.shields.io/badge/Next.js-14+-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
  [![Supabase](https://img.shields.io/badge/Supabase-Realtime-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
  [![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
  
  <p align="center">
    Sipendikmur adalah ekosistem aplikasi berbasis <i>web realtime</i> yang dirancang khusus untuk memodernisasi dan mendigitalkan seluruh alur lomba (seperti Lomba Baca Mazmur, Paduan Suara, dsb) di lingkungan Gereja Masehi Injili di Minahasa (GMIM). 
  </p>

</div>

<br/>

## ✨ Mengapa Sipendikmur?

Sebelumnya, penjurian dilakukan secara manual (menggunakan kertas) atau menggunakan spreadsheet yang lambat, berisiko hilang, dan sulit direkap. 

**Sipendikmur menyelesaikan masalah tersebut dengan:**
- ⚡ **Realtime Sinkronisasi:** Begitu Juri mengirim nilai, IP dan Layar Utama langsung ter-update seketika tanpa perlu *refresh*.
- 🛡️ **Sistem RBAC Ketat:** Mengamankan data dengan membagi peran (*Roles*) secara spesifik dari level *Superadmin* hingga *Juri*.
- 🎥 **Sistem VAR (Video Assistant Referee) / Revisi:** Juri dapat mengajukan revisi nilai jika terjadi kesalahan input, namun diawasi dan disetujui penuh oleh Inspektur Pertandingan.
- 📱 **Mobile Friendly:** UI Penilaian Juri didesain khusus agar nyaman ditekan menggunakan tablet/iPad.

---

## 🏗️ Arsitektur Sistem & Teknologi

Sipendikmur dibangun di atas *stack* modern dan <i>serverless</i> untuk skalabilitas tinggi saat lomba berskala besar:

1. **Frontend:** [Next.js](https://nextjs.org/) (App Router) + React + TypeScript.
2. **Styling:** [Tailwind CSS](https://tailwindcss.com/) dengan UI <i>Glassmorphism</i> elegan beraksen warna Emas/Krem (Khas GMIM).
3. **Backend & Database:** [Supabase](https://supabase.com/) (PostgreSQL) berperan sebagai Backend-as-a-Service. Menggunakan fitur **Supabase Realtime** via WebSockets untuk komunikasi antar klien (misal: Sesi dimulai -> Layar Juri langsung berubah).
4. **Hosting:** [Vercel](https://vercel.com/) untuk <i>edge network deployment</i> dan CI/CD otomatis.

---

## 👥 Sistem Peran (Role-Based Access Control)

Aplikasi ini menggunakan 6 jenis *Role* yang bekerja saling berkesinambungan membentuk satu *pipeline* lomba yang sempurna.

### 1. 👑 Superadmin (Manajemen Induk)
Memegang kendali penuh atas sistem *database* dasar.
- Membuat dan mengelola **Event** baru.
- Menentukan **Kategori Lomba** (misal: Seri A, Seri B) beserta detail Kriteria Penilaian dan bobot maksimal.
- Membuat akun untuk panitia dan Juri.

### 2. 🛡️ Inspektur Pertandingan / IP (Admin Monitor)
Bertugas sebagai pengawas utama berjalannya perlombaan.
- Memantau *Live Dashboard* progres juri dan peserta (Berapa yang sudah tampil, sedang tampil, dan belum tampil).
- Mengontrol validasi akhir dan **Mengunci Nilai** (*Lock*) untuk menghindari perubahan sepihak dari juri.
- Menangani notifikasi permintaan **VAR (Revisi Nilai)** dari juri dan memberikan izin pembukaan nilai kembali.

### 3. 📝 Operator Registrasi (OpRegis)
Menangani pendataan peserta sebelum perlombaan dimulai.
- Menambah data peserta (Nama, Nomor Undian, Asal Jemaat, Bacaan Mazmur).
- **Import Massal** data peserta menggunakan file Excel/CSV.
- Manajemen *edit* dan verifikasi kedatangan peserta.

### 4. 🎤 Operator Sesi (OpSesi)
Pemandu jalannya acara (biasanya MC atau panitia pemanggil).
- Menentukan siapa peserta yang akan "Naik Panggung" (*Set Active*).
- Menekan tombol **Mulai Sesi**, yang secara instan akan memunculkan formulir nilai di tablet seluruh Juri, dan memunculkan profil peserta di Layar Utama.
- Mengakhiri sesi penampilan peserta.

### 5. ⚖️ Juri
Mengeksekusi penilaian dari bangku juri menggunakan Tablet/iPad.
- Sistem **Grade Based** (Grade 1 - 5) untuk memudahkan pemberian nilai, lalu sistem akan mengonversinya secara proporsional.
- Memberikan catatan rinci (10 Aspek wajib) jika melakukan potongan (Penalti/Perhatian: *Clear text = Tidak*).
- Indikator *Realtime* **Progress Juri**: Mengetahui apakah rekan juri lainnya sudah selesai mensubmit nilai atau belum.
- Sistem *Drafting*: Nilai akan tersimpan sementara meski terputus jaringan.
- Memiliki tombol **Ajukan VAR** untuk merevisi kesalahan input (Harus disetujui IP).

### 6. 🖥️ Layar Utama (Live Screen)
Tampilan khusus untuk *Projector* atau *Videotron* yang diarahkan ke penonton/jemaat.
- Menampilkan nama peserta yang sedang tampil, nomor undian, dan kategori.
- (Opsional) Menampilkan *Live Score* (Total Nilai Akhir) secara otomatis setelah seluruh Juri mensubmit nilainya dan IP menutup sesi.

---

## 🚀 Alur Kerja Sistem (Workflow Lomba)

Berikut adalah siklus hidup satu penampilan peserta dari awal hingga selesai:

1. **Registrasi:** *OpRegis* menginput data Peserta 01.
2. **Pemanggilan:** *OpSesi* menetapkan Peserta 01 sebagai *Active Peserta* dan menekan tombol **"Mulai Penampilan"**.
3. **Realtime Broadcast:** Tablet *Juri* dan *Layar Utama* berkedip dan langsung menampilkan form & profil Peserta 01 tanpa perlu di-*refresh*.
4. **Penilaian:** *Juri* menilai. Ketika juri menekan **Kirim**, layar IP mendapat *update* progres (misal: 1/3 Juri Selesai).
5. **Review IP:** Setelah ke-3 juri mengirim nilai, *IP* memeriksa dan **Mengunci** nilai. Layar *OpSesi* akan menunjukkan bahwa sesi tersebut telah selesai dan siap memanggil Peserta 02.
6. **(Edge Case) VAR:** Jika Juri 1 sadar ia salah menekan tombol, ia mengajukan VAR. *IP* mendapat notifikasi (setelah semua juri lain selesai), *IP* membuka kuncinya, form Juri 1 terbuka kembali, diedit, lalu di-*submit* ulang.

---

## 🎨 UI/UX Highlights
- **Sistem *Glassmorphism* & Modern Modal:** Semua <i>popup</i> dan <i>modal</i> menggunakan efek *backdrop-blur* dan *opacity* elegan agar UI tidak terasa kaku.
- **Warna Identitas GMIM:** Aplikasi dibalut dengan warna kebesaran Krem (*Cream/Vanilla*) dan Emas/Amber, berpadu dengan aksen merah gelap klasik (*Maroon*).
- ***Bug-Free Scroll Lock*:** Pengelolaan modal *fixed* tanpa *scroll lock bug* bawaan *browser mobile*, memastikan halaman panjang tidak akan tersendat saat *modal* terbuka.

---

## 💻 Panduan Instalasi Lokal (Developer)

1. **Clone repositori ini:**
   ```bash
   git clone https://github.com/Yersolid07/sipendikmur.git
   cd sipendikmur
   ```

2. **Install Dependensi:**
   ```bash
   npm install
   # atau
   yarn install
   ```

3. **Konfigurasi Environment:**
   Salin file `.env.example` ke `.env.local` dan masukkan kunci rahasia Supabase Anda:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Jalankan Server Development:**
   ```bash
   npm run dev
   ```
   Aplikasi dapat diakses di `http://localhost:3000`.

---
<div align="center">
  <i>Dibuat dengan dedikasi tinggi untuk memajukan sistem paduan suara dan seni budaya gereja. Soli Deo Gloria.</i>
</div>
