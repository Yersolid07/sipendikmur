-- Tambahkan kolom is_juri_penilai (default true)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_juri_penilai BOOLEAN DEFAULT true;
