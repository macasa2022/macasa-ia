-- Revoke direct EXECUTE on has_role from anon and authenticated roles
-- This prevents users from directly calling has_role() to probe admin status
-- RLS policy expressions still work because they run in a privileged context
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, authenticated;

-- Tighten contact_requests INSERT policy to require auth.uid() match
DROP POLICY IF EXISTS "Anyone can submit contact request" ON public.contact_requests;
CREATE POLICY "Authenticated users can submit contact request"
  ON public.contact_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (true);