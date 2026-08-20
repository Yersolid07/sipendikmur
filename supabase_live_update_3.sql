-- Hapus constraint lama untuk status tabel events
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'public.events'::regclass
      AND contype = 'c' 
      AND pg_get_constraintdef(oid) LIKE '%status%';

    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.events DROP CONSTRAINT ' || constraint_name;
    END IF;
END $$;

-- Buat constraint baru dengan tambahan 'jeda'
ALTER TABLE public.events ADD CONSTRAINT events_status_check CHECK (status IN ('aktif', 'selesai', 'draft', 'jeda'));
