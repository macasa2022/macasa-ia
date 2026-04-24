-- 1. School clients table (escolas convertidas em cliente)
CREATE TABLE public.school_clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  contact_request_id UUID REFERENCES public.contact_requests(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.school_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view school clients"
  ON public.school_clients FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert school clients"
  ON public.school_clients FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update school clients"
  ON public.school_clients FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete school clients"
  ON public.school_clients FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_school_clients_updated_at
  BEFORE UPDATE ON public.school_clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. School premium members (emails de alunos com acesso premium via escola)
CREATE TABLE public.school_premium_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_client_id UUID NOT NULL REFERENCES public.school_clients(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  user_id UUID,
  added_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT school_premium_members_email_unique UNIQUE (email)
);

CREATE INDEX idx_school_premium_members_school ON public.school_premium_members(school_client_id);
CREATE INDEX idx_school_premium_members_user ON public.school_premium_members(user_id);
CREATE INDEX idx_school_premium_members_email ON public.school_premium_members(lower(email));

ALTER TABLE public.school_premium_members ENABLE ROW LEVEL SECURITY;

-- Admins manage everything
CREATE POLICY "Admins can view all members"
  ON public.school_premium_members FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert members"
  ON public.school_premium_members FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update members"
  ON public.school_premium_members FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete members"
  ON public.school_premium_members FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Users can view their own membership (to know they have access)
CREATE POLICY "Users can view their own school membership"
  ON public.school_premium_members FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 3. Function to check if user is a school premium member (SECURITY DEFINER, safe in RLS)
CREATE OR REPLACE FUNCTION public.is_school_premium(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.school_premium_members
    WHERE user_id = _user_id
  );
$$;

-- 4. Trigger to auto-link members when a profile is created or email updated
CREATE OR REPLACE FUNCTION public.link_school_member_on_profile_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NOT NULL THEN
    UPDATE public.school_premium_members
    SET user_id = NEW.user_id
    WHERE lower(email) = lower(NEW.email)
      AND (user_id IS NULL OR user_id <> NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER link_school_member_after_profile_insert
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.link_school_member_on_profile_change();

CREATE TRIGGER link_school_member_after_profile_email_update
  AFTER UPDATE OF email ON public.profiles
  FOR EACH ROW
  WHEN (NEW.email IS DISTINCT FROM OLD.email)
  EXECUTE FUNCTION public.link_school_member_on_profile_change();

-- 5. Backfill: link any existing profiles whose email matches future members (no-op now, but safe)
-- (Will be auto-handled when admins add members via the edge function)