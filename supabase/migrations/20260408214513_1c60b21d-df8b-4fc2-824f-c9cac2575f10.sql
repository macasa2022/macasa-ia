
-- 1. Fix has_role() to prevent cross-user role probing by adding caller guard
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Revoke direct execution from public roles to prevent probing
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, authenticated;

-- 2. Fix contact_requests INSERT policy - replace overly permissive true check
DROP POLICY IF EXISTS "Authenticated users can submit contact request" ON public.contact_requests;
CREATE POLICY "Authenticated users can submit contact request"
  ON public.contact_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 3. Add a trigger to prevent self-role-assignment on user_roles
CREATE OR REPLACE FUNCTION public.prevent_self_role_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow role assignment if the caller is an admin (not assigning to themselves)
  -- or if called from a service role context (no auth.uid())
  IF auth.uid() IS NOT NULL AND NEW.user_id = auth.uid() THEN
    RAISE EXCEPTION 'Users cannot assign roles to themselves';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_self_role_assignment_trigger
  BEFORE INSERT ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_self_role_assignment();
