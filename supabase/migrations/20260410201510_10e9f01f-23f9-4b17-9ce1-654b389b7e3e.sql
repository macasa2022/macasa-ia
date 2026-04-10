
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT
    CASE
      -- Service role can check any user's role (used by edge functions)
      WHEN auth.role() = 'service_role' THEN
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
      -- Authenticated users can only check their own role
      WHEN auth.uid() = _user_id THEN
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
      -- All other cases return false (no information leak)
      ELSE false
    END
$$;
