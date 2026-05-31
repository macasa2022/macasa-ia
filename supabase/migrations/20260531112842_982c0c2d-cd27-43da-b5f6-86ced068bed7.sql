
-- ============================================================
-- F1: Bloquear alteração de disciplinas_favoritas pelo próprio
--     utilizador após o onboarding inicial.
--     Só pode mudar via:
--       - service_role (edge function decide-subject-change)
--       - admin
--       - primeira definição (onboarding, quando ainda está vazio)
-- ============================================================
CREATE OR REPLACE FUNCTION public.enforce_subject_change_policy()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_count INT;
BEGIN
  -- service_role bypasses (edge functions)
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- admins bypass
  IF auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  -- If column unchanged, allow
  IF NEW.disciplinas_favoritas IS NOT DISTINCT FROM OLD.disciplinas_favoritas THEN
    RETURN NEW;
  END IF;

  -- Allow first-time set (onboarding): old value empty/null
  old_count := COALESCE(array_length(OLD.disciplinas_favoritas, 1), 0);
  IF old_count = 0 THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Alteração de disciplina requer aprovação admin. Submete um pedido em Definições.'
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS enforce_subject_change_policy_trg ON public.profiles;
CREATE TRIGGER enforce_subject_change_policy_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_subject_change_policy();

-- ============================================================
-- F2: Vincular contact_requests ao utilizador autenticado.
--     Impede que um aluno submeta pedidos forjando emails/escolas
--     de terceiros.
-- ============================================================
ALTER TABLE public.contact_requests
  ADD COLUMN IF NOT EXISTS submitted_by uuid;

CREATE INDEX IF NOT EXISTS idx_contact_requests_submitted_by
  ON public.contact_requests(submitted_by);

-- Substituir policy permissiva
DROP POLICY IF EXISTS "Authenticated users can submit contact request" ON public.contact_requests;

CREATE POLICY "Users submit own contact request"
  ON public.contact_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    submitted_by = auth.uid()
    AND lower(email) = lower(COALESCE((auth.jwt() ->> 'email'), ''))
  );
