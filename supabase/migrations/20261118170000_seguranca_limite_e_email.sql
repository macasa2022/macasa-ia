-- ============================================================
-- 1) LIMITE DO PLANO GRATUITO — aplicado só no servidor
--    Antes: o browser do aluno escrevia o próprio contador (podia pô-lo a 0).
--    Agora: só a Edge Function mentor-ai (service_role) mexe no contador.
--    Um exercício = 1 pergunta, mesmo que use vários passos da IA
--    (análise, estratégia, resolução, prática), identificados por session_id.
-- ============================================================
ALTER TABLE public.usage_tracking
  ADD COLUMN IF NOT EXISTS session_id text,
  ADD COLUMN IF NOT EXISTS session_started timestamptz,
  ADD COLUMN IF NOT EXISTS session_calls int NOT NULL DEFAULT 0;

DROP POLICY IF EXISTS "Users can insert their own usage" ON public.usage_tracking;
DROP POLICY IF EXISTS "Users can update their own usage" ON public.usage_tracking;
REVOKE INSERT, UPDATE, DELETE ON public.usage_tracking FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.consume_question(
  _user_id uuid,
  _session text DEFAULT NULL,
  _max int DEFAULT 5,
  _cooldown_hours int DEFAULT 20
)
RETURNS TABLE (ok boolean, used_count int, cooldown_ends timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.usage_tracking%ROWTYPE;
  now_ts timestamptz := now();
BEGIN
  INSERT INTO public.usage_tracking (user_id) VALUES (_user_id) ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO r FROM public.usage_tracking WHERE user_id = _user_id FOR UPDATE;

  -- Período de espera terminado -> recomeça a contagem
  IF r.cooldown_until IS NOT NULL AND r.cooldown_until <= now_ts THEN
    r.question_count := 0;
    r.cooldown_until := NULL;
  END IF;

  -- Passo seguinte do MESMO exercício (até 8 chamadas em 15 min): não conta
  IF _session IS NOT NULL
     AND r.session_id = _session
     AND r.session_started > now_ts - interval '15 minutes'
     AND r.session_calls < 8 THEN
    UPDATE public.usage_tracking
      SET session_calls = r.session_calls + 1,
          question_count = r.question_count,
          cooldown_until = r.cooldown_until
      WHERE user_id = _user_id;
    RETURN QUERY SELECT true, r.question_count, r.cooldown_until;
    RETURN;
  END IF;

  -- Em período de espera -> recusado
  IF r.cooldown_until IS NOT NULL THEN
    RETURN QUERY SELECT false, r.question_count, r.cooldown_until;
    RETURN;
  END IF;

  -- Nova pergunta / novo exercício
  r.question_count := r.question_count + 1;
  IF r.question_count >= _max THEN
    r.cooldown_until := now_ts + make_interval(hours => _cooldown_hours);
  END IF;

  UPDATE public.usage_tracking
    SET question_count = r.question_count,
        cooldown_until = r.cooldown_until,
        session_id = _session,
        session_started = now_ts,
        session_calls = 1
    WHERE user_id = _user_id;

  RETURN QUERY SELECT true, r.question_count, r.cooldown_until;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_question(uuid, text, int, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_question(uuid, text, int, int) TO service_role;

-- ============================================================
-- 2) EMAIL DO PERFIL — o aluno não o pode alterar
--    Antes: mudar o email nas Definições para o de um colega inscrito por uma
--    escola dava (e roubava) o Premium Escola desse colega.
-- ============================================================
CREATE OR REPLACE FUNCTION public.prevent_profile_email_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS DISTINCT FROM OLD.email
     AND auth.role() <> 'service_role'
     AND NOT (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'O email da conta não pode ser alterado aqui.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_profile_email_change ON public.profiles;
CREATE TRIGGER prevent_profile_email_change
  BEFORE UPDATE OF email ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_email_change();
