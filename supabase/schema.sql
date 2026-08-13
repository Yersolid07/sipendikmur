-- ============================================================
-- SISTEM PENJURIAN BACA MAZMUR GMIM V2
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
  role TEXT NOT NULL CHECK (role IN ('superadmin', 'op_regis', 'op_sesi', 'ip', 'juri')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated can view profiles" ON public.profiles FOR SELECT USING (auth.uid() IS NOT NULL);
-- Note: Service role (API) is used to create users.

-- ============================================================
-- TABLE: settings (Global CMS Config)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  logo_url TEXT,
  nama_penyelenggara TEXT DEFAULT 'BUMOTIK GMIM',
  homepage_title TEXT DEFAULT 'BUMOTIK GMIM',
  homepage_subtitle TEXT DEFAULT 'Sistem Penilaian Baca Mazmur',
  homepage_content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated can view settings" ON public.settings FOR SELECT USING (auth.uid() IS NOT NULL);

-- ============================================================
-- TABLE: events (Lomba/Event)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nama TEXT NOT NULL,
  deskripsi TEXT,
  tanggal DATE,
  lokasi TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('aktif', 'selesai', 'draft')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated can view events" ON public.events FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Superadmin can manage events" ON public.events FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin')
);

-- ============================================================
-- TABLE: kategori (Seri A, B, P/KB, dll) + Jenis Lomba
-- ============================================================
CREATE TABLE IF NOT EXISTS public.kategori (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  nama TEXT NOT NULL,
  jenis_lomba TEXT NOT NULL DEFAULT 'perorangan' CHECK (jenis_lomba IN ('perorangan', 'beregu')),
  deskripsi TEXT,
  urutan INTEGER DEFAULT 1,
  -- Bobot digunakan di VIEW untuk kalkulasi akhir, tapi kita simpan di table agar fleksibel
  maks_interpretasi DECIMAL(5,2),
  maks_artikulasi DECIMAL(5,2),
  maks_penghayatan DECIMAL(5,2),
  maks_penampilan DECIMAL(5,2),
  maks_kekompakan DECIMAL(5,2), -- Khusus Beregu
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.kategori ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated can view kategori" ON public.kategori FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Superadmin can manage kategori" ON public.kategori FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin')
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
  mazmur_bacaan TEXT,
  is_checked_in BOOLEAN DEFAULT FALSE, -- Diatur oleh OpRegis
  status TEXT DEFAULT 'menunggu' CHECK (status IN ('menunggu', 'bersiap', 'tampil', 'dinilai', 'selesai')),
  potongan_nilai DECIMAL(5,2) DEFAULT 0.00,
  keterangan_potongan TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.peserta ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated can view peserta" ON public.peserta FOR SELECT USING (auth.uid() IS NOT NULL);
-- Update dibolehkan untuk Superadmin, OpRegis, OpSesi, IP
CREATE POLICY "Operators can manage peserta" ON public.peserta FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('superadmin', 'op_regis', 'op_sesi', 'ip'))
);

-- ============================================================
-- TABLE: sesi (Kendali Stage oleh OpSesi)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sesi (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  kategori_id UUID NOT NULL REFERENCES public.kategori(id),
  peserta_aktif_id UUID REFERENCES public.peserta(id), -- Peserta yang saat ini tampil (bisa diubah OpSesi bebas)
  nama_sesi TEXT,
  status TEXT DEFAULT 'menunggu' CHECK (status IN ('menunggu', 'berjalan', 'jeda', 'selesai')),
  pengumuman TEXT,
  nilai_dikunci BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.sesi ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated can view sesi" ON public.sesi FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "OpSesi, IP, Superadmin can manage sesi" ON public.sesi FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('superadmin', 'op_sesi', 'ip'))
);

-- ============================================================
-- TABLE: penilaian (Input Juri)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.penilaian (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sesi_id UUID NOT NULL REFERENCES public.sesi(id) ON DELETE CASCADE,
  peserta_id UUID NOT NULL REFERENCES public.peserta(id) ON DELETE CASCADE,
  juri_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Nilai Grade (1-5)
  interpretasi DECIMAL(5,2),
  artikulasi DECIMAL(5,2),
  penghayatan DECIMAL(5,2),
  penampilan DECIMAL(5,2),
  kekompakan DECIMAL(5,2), -- Khusus beregu
  
  perhatian JSONB,
  potongan_perhatian DECIMAL(5,2) DEFAULT 0,
  
  -- Total dinamis di-calculate di frontend atau VIEW
  total DECIMAL(5,2) DEFAULT 0,
  
  catatan TEXT,
  is_submitted BOOLEAN DEFAULT FALSE,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(sesi_id, peserta_id, juri_id)
);

ALTER TABLE public.penilaian ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Juri can view and insert their own penilaian" ON public.penilaian FOR ALL USING (
  juri_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('superadmin', 'ip'))
);

-- ============================================================
-- TABLE: var_requests (Pengajuan VAR oleh Juri/IP)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.var_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  penilaian_id UUID REFERENCES public.penilaian(id) ON DELETE CASCADE,
  peserta_id UUID NOT NULL REFERENCES public.peserta(id),
  requested_by UUID NOT NULL REFERENCES public.profiles(id), -- Bisa Juri atau IP
  requested_role TEXT NOT NULL CHECK (requested_role IN ('juri', 'ip')),
  alasan TEXT NOT NULL,
  lokasi_teks TEXT, -- Menit/teks yang dipertanyakan
  
  -- Jika dari IP, butuh persetujuan Juri
  approved_by_juri_1 BOOLEAN DEFAULT FALSE,
  approved_by_juri_2 BOOLEAN DEFAULT FALSE,
  approved_by_juri_3 BOOLEAN DEFAULT FALSE,
  
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

ALTER TABLE public.var_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated can view VAR" ON public.var_requests FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Juri and IP can insert VAR" ON public.var_requests FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('juri', 'ip', 'superadmin'))
);
CREATE POLICY "Juri, IP and Superadmin can update VAR" ON public.var_requests FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('juri', 'ip', 'superadmin'))
);


-- ============================================================
-- TABLE: activity_logs (Audit Trail)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Only Superadmin can view logs" ON public.activity_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin')
);
CREATE POLICY "System can insert logs" ON public.activity_logs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- VIEW: v_rekap_penilaian (Perhitungan Otomatis Perorangan vs Beregu)
-- ============================================================
DROP VIEW IF EXISTS public.v_rekap_penilaian;
CREATE VIEW public.v_rekap_penilaian AS
SELECT 
  p.id as peserta_id,
  p.nama as nama_peserta,
  p.asal_jemaat,
  p.nomor_undian,
  p.mazmur_bacaan,
  p.potongan_nilai,
  p.is_checked_in,
  k.nama as kategori,
  k.id as kategori_id,
  k.jenis_lomba,
  e.nama as event_nama,
  e.id as event_id,
  COUNT(DISTINCT n.juri_id) as jumlah_juri_menilai,
  
  -- Rata-rata nilai murni dari Juri
  AVG(n.interpretasi) as avg_interpretasi,
  AVG(n.artikulasi) as avg_artikulasi,
  AVG(n.penghayatan) as avg_penghayatan,
  AVG(n.penampilan) as avg_penampilan,
  AVG(n.kekompakan) as avg_kekompakan,
  
  -- Kalkulasi Total (Berdasarkan Jenis Lomba: Perorangan / Beregu) dan Konversi dari Grade (skala 5)
  CAST(
    CASE WHEN k.jenis_lomba = 'perorangan' THEN
      ((COALESCE(AVG(n.interpretasi), 0) / 5) * COALESCE(k.maks_interpretasi, 35)) + 
      ((COALESCE(AVG(n.penghayatan), 0) / 5) * COALESCE(k.maks_penghayatan, 30)) + 
      ((COALESCE(AVG(n.artikulasi), 0) / 5) * COALESCE(k.maks_artikulasi, 25)) + 
      ((COALESCE(AVG(n.penampilan), 0) / 5) * COALESCE(k.maks_penampilan, 10))
    ELSE
      ((COALESCE(AVG(n.kekompakan), 0) / 5) * COALESCE(k.maks_kekompakan, 30)) +
      ((COALESCE(AVG(n.penghayatan), 0) / 5) * COALESCE(k.maks_penghayatan, 25)) +
      ((COALESCE(AVG(n.interpretasi), 0) / 5) * COALESCE(k.maks_interpretasi, 20)) +
      ((COALESCE(AVG(n.artikulasi), 0) / 5) * COALESCE(k.maks_artikulasi, 20)) +
      ((COALESCE(AVG(n.penampilan), 0) / 5) * COALESCE(k.maks_penampilan, 5))
    END 
  AS DECIMAL(10,2)) as avg_total,
  
  -- Nilai Akhir (setelah dikurangi rata-rata potongan perhatian Juri dan potongan pusat IP/Superadmin)
  CAST(
    (CASE WHEN k.jenis_lomba = 'perorangan' THEN
      ((COALESCE(AVG(n.interpretasi), 0) / 5) * COALESCE(k.maks_interpretasi, 35)) + 
      ((COALESCE(AVG(n.penghayatan), 0) / 5) * COALESCE(k.maks_penghayatan, 30)) + 
      ((COALESCE(AVG(n.artikulasi), 0) / 5) * COALESCE(k.maks_artikulasi, 25)) + 
      ((COALESCE(AVG(n.penampilan), 0) / 5) * COALESCE(k.maks_penampilan, 10))
    ELSE
      ((COALESCE(AVG(n.kekompakan), 0) / 5) * COALESCE(k.maks_kekompakan, 30)) +
      ((COALESCE(AVG(n.penghayatan), 0) / 5) * COALESCE(k.maks_penghayatan, 25)) +
      ((COALESCE(AVG(n.interpretasi), 0) / 5) * COALESCE(k.maks_interpretasi, 20)) +
      ((COALESCE(AVG(n.artikulasi), 0) / 5) * COALESCE(k.maks_artikulasi, 20)) +
      ((COALESCE(AVG(n.penampilan), 0) / 5) * COALESCE(k.maks_penampilan, 5))
    END) - COALESCE(AVG(n.potongan_perhatian), 0) - COALESCE(p.potongan_nilai, 0)
  AS DECIMAL(10,2)) as nilai_akhir,
  
  -- Ranking dalam kategori yang sama
  RANK() OVER (
    PARTITION BY k.id 
    ORDER BY (
      (CASE WHEN k.jenis_lomba = 'perorangan' THEN
        ((COALESCE(AVG(n.interpretasi), 0) / 5) * COALESCE(k.maks_interpretasi, 35)) + ((COALESCE(AVG(n.penghayatan), 0) / 5) * COALESCE(k.maks_penghayatan, 30)) + ((COALESCE(AVG(n.artikulasi), 0) / 5) * COALESCE(k.maks_artikulasi, 25)) + ((COALESCE(AVG(n.penampilan), 0) / 5) * COALESCE(k.maks_penampilan, 10))
      ELSE
        ((COALESCE(AVG(n.kekompakan), 0) / 5) * COALESCE(k.maks_kekompakan, 30)) + ((COALESCE(AVG(n.penghayatan), 0) / 5) * COALESCE(k.maks_penghayatan, 25)) + ((COALESCE(AVG(n.interpretasi), 0) / 5) * COALESCE(k.maks_interpretasi, 20)) + ((COALESCE(AVG(n.artikulasi), 0) / 5) * COALESCE(k.maks_artikulasi, 20)) + ((COALESCE(AVG(n.penampilan), 0) / 5) * COALESCE(k.maks_penampilan, 5))
      END) - COALESCE(AVG(n.potongan_perhatian), 0) - COALESCE(p.potongan_nilai, 0)
    ) DESC
  ) as ranking

FROM public.peserta p
JOIN public.kategori k ON p.kategori_id = k.id
JOIN public.events e ON p.event_id = e.id
LEFT JOIN public.penilaian n ON p.id = n.peserta_id AND n.is_submitted = true
GROUP BY p.id, k.id, e.id;

-- ============================================================
-- TRIGGER: Update timestamp on table update
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_peserta_updated_at BEFORE UPDATE ON public.peserta FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sesi_updated_at BEFORE UPDATE ON public.sesi FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_penilaian_updated_at BEFORE UPDATE ON public.penilaian FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
