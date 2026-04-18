-- 1. Track OTP send attempts (rate limit envio)
CREATE TABLE IF NOT EXISTS public.otp_send_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_otp_send_attempts_email_created
  ON public.otp_send_attempts (email, created_at DESC);

ALTER TABLE public.otp_send_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage otp send attempts"
  ON public.otp_send_attempts
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 2. Add attempts counter to verification codes (brute-force protection)
ALTER TABLE public.email_verification_codes
  ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.email_verification_codes
  ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE;