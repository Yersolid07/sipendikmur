-- Menambahkan kolom tampilkan_nilai pada tabel sesi
ALTER TABLE public.sesi ADD COLUMN IF NOT EXISTS tampilkan_nilai BOOLEAN DEFAULT FALSE;

-- Mengubah kolom penilaian_id pada tabel var_requests agar boleh NULL
ALTER TABLE public.var_requests ALTER COLUMN penilaian_id DROP NOT NULL;
