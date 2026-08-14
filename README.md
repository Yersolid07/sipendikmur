# Sistem Penjurian GMIM — Sistem Penjurian Baca Mazmur GMIM

Sistem penjurian digital untuk lomba Baca Mazmur GMIM.

## 🏗️ Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript
- **Styling**: Tailwind CSS + Custom Design System (Navy + Gold)
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL + Auth)
- **Export**: jsPDF + XLSX

## 🚀 Setup & Instalasi

### 1. Clone & Install

```bash
cd sipendikmur
npm install
```

### 2. Setup Supabase

1. Buat akun di [supabase.com](https://supabase.com)
2. Buat project baru
3. Pergi ke **SQL Editor** dan jalankan isi file `supabase/schema.sql`
4. Copy URL dan anon key dari **Settings → API**

### 3. Environment Variables

Buat file `.env.local` (copy dari `.env.local.example`):

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
```

> ⚠️ `SUPABASE_SERVICE_ROLE_KEY` hanya digunakan di server-side API routes untuk membuat akun juri. Jangan expose ke client!

### 4. Buat Akun Admin Pertama

Di Supabase Dashboard → **Authentication → Users**, buat user baru dengan email dan password. Lalu di **SQL Editor**:

```sql
UPDATE public.profiles SET role = 'admin' WHERE email = 'admin@email.com';
```

### 5. Jalankan

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000)

---

## 👥 Role System

| Role | Akses |
|------|-------|
| **admin** | Full access — semua fitur |
| **inspektur** | Sama dengan admin |
| **juri** | Hanya panel penilaian |

## 📊 Kriteria Penilaian

| Kriteria | Bobot Maksimal |
|----------|---------------|
| Interpretasi | 25 |
| Artikulasi | 22 |
| Penghayatan | 20 |
| Penampilan | 18 |
| **Total** | **85** |

## 🔄 Alur Sistem

```
Admin/IP Login → Buat Event → Tambah Peserta → Tambah Kategori
                                    ↓
Juri Login → Panel Penilaian (menunggu peserta diaktifkan)
                                    ↓
Admin: Aktifkan Peserta Tampil → Juri Input Nilai → Submit
                                    ↓
Admin: Monitor Real-time → Kunci Nilai → Rekap & Export
```

## 📁 Struktur Folder

```
src/
├── app/
│   ├── login/          # Halaman login
│   ├── dashboard/      # Panel Juri
│   ├── admin/          # Panel Admin/IP
│   └── api/admin/      # API routes admin
├── components/
│   ├── juri/           # Komponen panel juri
│   ├── admin/          # Komponen panel admin
│   └── shared/         # Navbar, dll
├── lib/supabase/       # Supabase clients
└── types/              # TypeScript types
supabase/
└── schema.sql          # Database schema
```

## 🛠️ Fitur

### Panel Juri
- ✅ Login aman
- ✅ Lihat peserta yang sedang tampil (real-time)
- ✅ Input nilai per kriteria dengan slider
- ✅ Preset nilai cepat (60%, 70%, 80%, 90%, 100%)
- ✅ Simpan draft nilai
- ✅ Submit nilai (locked setelah submit)
- ✅ Lihat hasil final & ranking
- ✅ Review nilai sendiri
- ✅ Ganti password

### Panel Inspektur/Admin
- ✅ Kelola event lomba
- ✅ Kelola data peserta (CRUD + potongan nilai)
- ✅ Kelola akun juri (buat akun, reset password)
- ✅ Kontrol sesi (aktifkan peserta tampil)
- ✅ Kirim pengumuman ke semua juri
- ✅ Kunci nilai setelah peserta selesai
- ✅ Monitor nilai real-time dari semua juri
- ✅ Rekap akhir dengan ranking
- ✅ Export Excel (.xlsx)
- ✅ Export PDF (dengan logo header)
