-- ============================================================
-- 1) PREMIUM MANUAL (atribuído por um admin, sem Stripe)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.manual_premium_members (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  note       text,
  granted_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.manual_premium_members ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.manual_premium_members TO authenticated;
GRANT INSERT, DELETE ON public.manual_premium_members TO authenticated;
GRANT ALL ON public.manual_premium_members TO service_role;

CREATE POLICY "Users can view own manual premium"
  ON public.manual_premium_members FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all manual premium"
  ON public.manual_premium_members FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can grant manual premium"
  ON public.manual_premium_members FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can revoke manual premium"
  ON public.manual_premium_members FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Premium "não-Stripe": admin, escola ou manual.
CREATE OR REPLACE FUNCTION public.is_premium_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
      OR public.is_school_premium(_user_id)
      OR EXISTS (SELECT 1 FROM public.manual_premium_members WHERE user_id = _user_id);
$$;

-- Premium (escola/manual) pode escolher várias disciplinas nas Definições.
CREATE OR REPLACE FUNCTION public.enforce_subject_change_policy()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_count INT;
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- admins e alunos Premium (escola/manual) não precisam de aprovação
  IF auth.uid() IS NOT NULL AND public.is_premium_user(auth.uid()) THEN
    RETURN NEW;
  END IF;

  IF NEW.disciplinas_favoritas IS NOT DISTINCT FROM OLD.disciplinas_favoritas THEN
    RETURN NEW;
  END IF;

  old_count := COALESCE(array_length(OLD.disciplinas_favoritas, 1), 0);
  IF old_count = 0 THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Alteração de disciplina requer aprovação admin. Submete um pedido em Definições.'
    USING ERRCODE = '42501';
END;
$$;

-- ============================================================
-- 2) HISTÓRICO DE EXERCÍCIOS RESOLVIDOS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.exercise_attempts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject       text,                 -- Matemática | Física | Química
  topic         text,                 -- tema (da análise da IA)
  subtopic      text,
  difficulty    text,                 -- Fácil | Médio | Difícil
  school_year   text,
  mode          text NOT NULL,        -- solve_resolve, solve_hint, ...
  exercise_text text,
  has_image     boolean NOT NULL DEFAULT false,
  result        jsonb,                -- análise, estratégia, solução, prática
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exercise_attempts_user_created
  ON public.exercise_attempts (user_id, created_at DESC);

ALTER TABLE public.exercise_attempts ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, DELETE ON public.exercise_attempts TO authenticated;
GRANT ALL ON public.exercise_attempts TO service_role;

CREATE POLICY "Users can view own attempts"
  ON public.exercise_attempts FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own attempts"
  ON public.exercise_attempts FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own attempts"
  ON public.exercise_attempts FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all attempts"
  ON public.exercise_attempts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
