-- Add event_id to activity_logs for easier filtering by Subadmin
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES public.events(id) ON DELETE CASCADE;

-- Drop old policy if exists
DROP POLICY IF EXISTS "Admins can view logs" ON public.activity_logs;

-- Recreate policy to allow subadmins to view only their event logs, and superadmin to view all
CREATE POLICY "Admins can view logs" ON public.activity_logs FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND (
      p.role = 'superadmin' OR 
      (p.role = 'subadmin' AND (public.activity_logs.event_id = p.event_id OR p.event_id IS NULL))
    )
  )
);
