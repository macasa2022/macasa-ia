-- Add status enum
DO $$ BEGIN
  CREATE TYPE public.contact_request_status AS ENUM ('Novo', 'Em análise', 'Contactado', 'Convertido', 'Rejeitado');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add new columns
ALTER TABLE public.contact_requests
  ADD COLUMN IF NOT EXISTS status public.contact_request_status NOT NULL DEFAULT 'Novo',
  ADD COLUMN IF NOT EXISTS notas text,
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT now();

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_contact_requests_updated_at ON public.contact_requests;
CREATE TRIGGER update_contact_requests_updated_at
BEFORE UPDATE ON public.contact_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Allow admins to update contact requests (status & notes)
DROP POLICY IF EXISTS "Admins can update contact requests" ON public.contact_requests;
CREATE POLICY "Admins can update contact requests"
ON public.contact_requests
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Index for fast ordering
CREATE INDEX IF NOT EXISTS idx_contact_requests_created_at ON public.contact_requests (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_requests_status ON public.contact_requests (status);