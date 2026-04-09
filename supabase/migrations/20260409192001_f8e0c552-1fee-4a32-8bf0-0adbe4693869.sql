-- Drop the overly permissive SELECT policy on email_verification_codes
DROP POLICY IF EXISTS "Anyone can read verification codes" ON public.email_verification_codes;

-- Only service role should read verification codes
CREATE POLICY "Service role can read verification codes"
  ON public.email_verification_codes
  FOR SELECT
  TO public
  USING (auth.role() = 'service_role');
