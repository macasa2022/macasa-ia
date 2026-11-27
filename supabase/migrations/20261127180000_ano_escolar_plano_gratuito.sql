-- ============================================================
-- Ano escolar no plano gratuito: só o admin o muda.
--   - O aluno gratuito define o ano no registo (primeira vez) e,
--     se passar de ano, contacta o administrador.
--   - Premium (manual, escola ou Stripe) e admin podem mudar.
-- ============================================================
CREATE OR REPLACE FUNCTION public.enforce_school_year_policy()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.ano_escolar IS NOT DISTINCT FROM OLD.ano_escolar THEN
    RETURN NEW;
  END IF;
  -- Edge Functions (service_role) e admins
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  -- Primeira definição (registo)
  IF OLD.ano_escolar IS NULL OR btrim(OLD.ano_escolar) = '' THEN
    RETURN NEW;
  END IF;
  -- Premium: atribuído pelo admin / escola, ou pago (cache do Stripe < 24 h)
  IF public.is_premium_user(NEW.user_id) OR EXISTS (
    SELECT 1 FROM public.stripe_premium_cache c
    WHERE c.user_id = NEW.user_id AND c.premium AND c.checked_at > now() - interval '24 hours'
  ) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'No plano gratuito, o ano escolar só pode ser alterado pelo administrador.'
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS enforce_school_year_policy_trg ON public.profiles;
CREATE TRIGGER enforce_school_year_policy_trg
  BEFORE UPDATE OF ano_escolar ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_school_year_policy();

-- O admin passa a poder atualizar perfis de outros utilizadores (ex.: ano escolar).
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
CREATE POLICY "Admins can update profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
