CREATE TABLE public.email_verification_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '5 minutes'),
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_verification_codes ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (edge function uses service role, but allow reads for verification)
CREATE POLICY "Anyone can read verification codes"
  ON public.email_verification_codes
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Cleanup old codes periodically - index for performance
CREATE INDEX idx_email_verification_codes_email ON public.email_verification_codes (email, created_at DESC);