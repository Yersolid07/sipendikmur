-- ============================================================
-- SISTEM PENJURIAN BACA MAZMUR GMIM
-- Supabase PostgreSQL Schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLE: profiles (extends Supabase auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nama TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'juri', 'inspektur')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'inspektur'))
  );

-- ============================================================
-- TABLE: events (Lomba/Event)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nama TEXT NOT NULL,
  deskripsi TEXT,
  tanggal DATE,
  lokasi TEXT,
  status TEXT NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif', 'selesai', 'draft')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated can view events" ON public.events
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin can manage events" ON public.events
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'inspektur'))
  );

-- ============================================================
-- TABLE: kategori (Seri A, A1, B, dst.)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.kategori (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  nama TEXT NOT NULL,           -- "Seri A", "Seri B", "Anak-anak", dll.
  deskripsi TEXT,
  urutan INTEGER DEFAULT 1,
  -- Bobot maksimal per kriteria
  maks_interpretasi DECIMAL(5,2) DEFAULT 25.00,
  maks_artikulasi DECIMAL(5,2) DEFAULT 22.00,
  maks_penghayatan DECIMAL(5,2) DEFAULT 20.00,
  maks_penampilan DECIMAL(5,2) DEFAULT 18.00,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.kategori ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated can view kategori" ON public.kategori
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin can manage kategori" ON public.kategori
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'inspektur'))
  );

-- ============================================================
-- TABLE: peserta
-- ============================================================
CREATE TABLE IF NOT EXISTS public.peserta (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  kategori_id UUID NOT NULL REFERENCES public.kategori(id) ON DELETE CASCADE,
  nama TEXT NOT NULL,
  asal_jemaat TEXT NOT NULL,
  nomor_undian INTEGER,
  mazmur_bacaan TEXT,             -- Mazmur yang diundi untuk dibaca
  status TEXT DEFAULT 'menunggu' CHECK (status IN ('menunggu', 'tampil', 'selesai')),
  potongan_nilai DECIMAL(5,2) DEFAULT 0.00,  -- Pengurangan (misal: tidak hadir ibadah)
  keterangan_potongan TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.peserta ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated can view peserta" ON public.peserta
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin can manage peserta" ON public.peserta
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'inspektur'))
  );

-- ============================================================
-- TABLE: sesi (Sesi pertandingan aktif)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sesi (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  kategori_id UUID NOT NULL REFERENCES public.kategori(id) ON DELETE CASCADE,
  peserta_aktif_id UUID REFERENCES public.peserta(id),  -- Peserta yang sedang tampil
  nama_sesi TEXT,
  status TEXT DEFAULT 'menunggu' CHECK (status IN ('menunggu', 'berjalan', 'jeda', 'selesai')),
  pengumuman TEXT,              -- Pengumuman dari inspektur ke juri
  nilai_dikunci BOOLEAN DEFAULT FALSE,  -- Lock nilai setelah sesi selesai
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.sesi ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated can view sesi" ON public.sesi
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin can manage sesi" ON public.sesi
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'inspektur'))
  );

-- ============================================================
-- TABLE: penilaian (Nilai dari Juri per Peserta)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.penilaian (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sesi_id UUID NOT NULL REFERENCES public.sesi(id) ON DELETE CASCADE,
  peserta_id UUID NOT NULL REFERENCES public.peserta(id) ON DELETE CASCADE,
  juri_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- Nilai per kriteria
  interpretasi DECIMAL(5,2),
  artikulasi DECIMAL(5,2),
  penghayatan DECIMAL(5,2),
  penampilan DECIMAL(5,2),
  -- Computed
  total DECIMAL(6,2) GENERATED ALWAYS AS (
    COALESCE(interpretasi, 0) + COALESCE(artikulasi, 0) +
    COALESCE(penghayatan, 0) + COALESCE(penampilan, 0)
  ) STORED,
  catatan TEXT,
  is_submitted BOOLEAN DEFAULT FALSE,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Satu juri hanya bisa nilai satu kali per peserta per sesi
  UNIQUE (sesi_id, peserta_id, juri_id)
);

ALTER TABLE public.penilaian ENABLE ROW LEVEL SECURITY;
-- Juri bisa lihat dan edit nilai milik sendiri (sebelum submit)
CREATE POLICY "Juri can view own penilaian" ON public.penilaian
  FOR SELECT USING (auth.uid() = juri_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'inspektur'))
  );
CREATE POLICY "Juri can insert own penilaian" ON public.penilaian
  FOR INSERT WITH CHECK (auth.uid() = juri_id);
CREATE POLICY "Juri can update own penilaian before submit" ON public.penilaian
  FOR UPDATE USING (auth.uid() = juri_id AND is_submitted = FALSE);

-- ============================================================
-- TABLE: juri_sesi (Mapping juri ke sesi/event)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.juri_sesi (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  juri_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (event_id, juri_id)
);

ALTER TABLE public.juri_sesi ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated can view juri_sesi" ON public.juri_sesi
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin can manage juri_sesi" ON public.juri_sesi
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'inspektur'))
  );

-- ============================================================
-- VIEWS: Rekap Nilai (untuk ranking)
-- ============================================================
CREATE OR REPLACE VIEW public.v_rekap_penilaian AS
SELECT
  p.id AS peserta_id,
  p.nama AS nama_peserta,
  p.asal_jemaat,
  p.nomor_undian,
  p.mazmur_bacaan,
  p.potongan_nilai,
  k.nama AS kategori,
  k.id AS kategori_id,
  e.nama AS event_nama,
  e.id AS event_id,
  COUNT(pn.juri_id) AS jumlah_juri_menilai,
  ROUND(AVG(pn.interpretasi), 2) AS avg_interpretasi,
  ROUND(AVG(pn.artikulasi), 2) AS avg_artikulasi,
  ROUND(AVG(pn.penghayatan), 2) AS avg_penghayatan,
  ROUND(AVG(pn.penampilan), 2) AS avg_penampilan,
  ROUND(AVG(pn.total), 2) AS avg_total,
  ROUND(AVG(pn.total) - p.potongan_nilai, 2) AS nilai_akhir,
  RANK() OVER (
    PARTITION BY k.id
    ORDER BY (ROUND(AVG(pn.total), 2) - p.potongan_nilai) DESC
  ) AS ranking
FROM public.peserta p
JOIN public.kategori k ON p.kategori_id = k.id
JOIN public.events e ON p.event_id = e.id
LEFT JOIN public.penilaian pn ON pn.peserta_id = p.id AND pn.is_submitted = TRUE
GROUP BY p.id, p.nama, p.asal_jemaat, p.nomor_undian, p.mazmur_bacaan,
         p.potongan_nilai, k.nama, k.id, e.nama, e.id;

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers untuk updated_at
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_events_updated_at BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_peserta_updated_at BEFORE UPDATE ON public.peserta
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_sesi_updated_at BEFORE UPDATE ON public.sesi
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_penilaian_updated_at BEFORE UPDATE ON public.penilaian
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-create profile after signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nama, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nama', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'juri')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- SEED DATA (Contoh)
-- ============================================================

-- Insert example event
-- INSERT INTO public.events (nama, deskripsi, tanggal, lokasi, status)
-- VALUES ('Lomba Baca Mazmur GMIM 2026', 'BUMOTIK - Benang Ungu Mazmur Oikumene Tahunan Integratif Komsit', '2026-08-01', 'GMIM Pusat', 'aktif');
