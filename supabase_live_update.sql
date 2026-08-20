-- Add nilai_akhir to peserta
ALTER TABLE public.peserta ADD COLUMN IF NOT EXISTS nilai_akhir DECIMAL(8,3) DEFAULT NULL;

-- Add live_settings to events
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS live_settings JSONB DEFAULT '{"show_leaderboard": false, "sort_by": "kategori"}';

-- Update RLS for events
DROP POLICY IF EXISTS "Public can view active events" ON public.events;
CREATE POLICY "Public can view active events" ON public.events FOR SELECT USING (status = 'aktif');

-- Update RLS for kategori
DROP POLICY IF EXISTS "Public can view kategori" ON public.kategori;
CREATE POLICY "Public can view kategori" ON public.kategori FOR SELECT USING (true);

-- Update RLS for peserta
DROP POLICY IF EXISTS "Public can view peserta" ON public.peserta;
CREATE POLICY "Public can view peserta" ON public.peserta FOR SELECT USING (true);

-- Fix view v_rekap_penilaian to use peserta.nilai_akhir directly
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
  
  -- Nilai Akhir diambil dari tabel peserta yang sudah dikalkulasi akurat oleh sistem (termasuk JSON catatan_aspek)
  p.nilai_akhir,
  
  -- Ranking dalam kategori yang sama
  RANK() OVER (
    PARTITION BY k.id 
    ORDER BY p.nilai_akhir DESC NULLS LAST
  ) as ranking

FROM public.peserta p
JOIN public.kategori k ON p.kategori_id = k.id
JOIN public.events e ON p.event_id = e.id
LEFT JOIN public.penilaian n ON p.id = n.peserta_id AND n.is_submitted = true
GROUP BY p.id, k.id, e.id;
