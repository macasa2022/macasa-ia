-- ============================================================
-- 1) CONVERSAS DO TUTOR
-- ============================================================
CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title      text NOT NULL DEFAULT 'Conversa',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user ON public.chat_conversations (user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            text NOT NULL CHECK (role IN ('user', 'assistant')),
  content         text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conv ON public.chat_messages (conversation_id, created_at);

ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_conversations TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_conversations, public.chat_messages TO service_role;

CREATE POLICY "Own conversations - select" ON public.chat_conversations FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Own conversations - insert" ON public.chat_conversations FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Own conversations - update" ON public.chat_conversations FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Own conversations - delete" ON public.chat_conversations FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Own messages - select" ON public.chat_messages FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Own messages - insert" ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.chat_conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid()));
CREATE POLICY "Own messages - delete" ON public.chat_messages FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ============================================================
-- 2) PLANOS DE ESTUDO (gerados pela IA a partir do histórico)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.study_plans (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan       jsonb NOT NULL,
  done       text[] NOT NULL DEFAULT '{}',   -- ids das tarefas concluídas
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_study_plans_user ON public.study_plans (user_id, created_at DESC);

ALTER TABLE public.study_plans ENABLE ROW LEVEL SECURITY;
GRANT SELECT, UPDATE (done), DELETE ON public.study_plans TO authenticated;
GRANT ALL ON public.study_plans TO service_role;
-- (o plano é criado pela Edge Function mentor-ai; o aluno só marca tarefas como feitas)
CREATE POLICY "Own plans - select" ON public.study_plans FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Own plans - update" ON public.study_plans FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Own plans - delete" ON public.study_plans FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ============================================================
-- 3) PREMIUM PAGO — última confirmação do Stripe (evita consultar o Stripe em cada pergunta)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.stripe_premium_cache (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  premium    boolean NOT NULL,
  checked_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stripe_premium_cache ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.stripe_premium_cache TO service_role;  -- sem acesso direto para alunos

-- ============================================================
-- 4) SESSÕES: uma sessão ativa por conta, com transferência entre dispositivos
--    - device_id: identificador do navegador (vários separadores = o mesmo navegador)
--    - Expira por inatividade e por duração máxima (regras na Edge Function session-guard)
--    - Mudar de rede/IP NÃO conta para nada.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.active_sessions (
  user_id      uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id    text NOT NULL,
  device_label text,
  started_at   timestamptz NOT NULL DEFAULT now(),
  last_seen    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.active_sessions TO service_role;
GRANT SELECT ON public.active_sessions TO authenticated;
CREATE POLICY "Own active session - select" ON public.active_sessions FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Registo de acessos (para o aluno ver e para o admin analisar indícios de partilha)
CREATE TABLE IF NOT EXISTS public.session_events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind         text NOT NULL,   -- login | transfer | logout | revoke_others | expired | suspended | reactivated
  device_id    text,
  device_label text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_session_events_user ON public.session_events (user_id, created_at DESC);
ALTER TABLE public.session_events ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.session_events TO authenticated;
GRANT ALL ON public.session_events TO service_role;
CREATE POLICY "Own session events - select" ON public.session_events FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins view session events" ON public.session_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Dispositivos já vistos (o aviso por email só é enviado para dispositivos novos)
CREATE TABLE IF NOT EXISTS public.known_devices (
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id    text NOT NULL,
  device_label text,
  first_seen   timestamptz NOT NULL DEFAULT now(),
  last_seen    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, device_id)
);
ALTER TABLE public.known_devices ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.known_devices TO service_role;
GRANT SELECT ON public.known_devices TO authenticated;
CREATE POLICY "Own devices - select" ON public.known_devices FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins view devices" ON public.known_devices FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Suspensão: SÓ por decisão de um admin, depois de analisar (nunca automática)
CREATE TABLE IF NOT EXISTS public.account_suspensions (
  user_id      uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  reason       text,
  suspended_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  suspended_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.account_suspensions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON public.account_suspensions TO authenticated;
GRANT ALL ON public.account_suspensions TO service_role;
CREATE POLICY "Own suspension - select" ON public.account_suspensions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins view suspensions" ON public.account_suspensions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins suspend" ON public.account_suspensions FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND user_id <> auth.uid());
CREATE POLICY "Admins reactivate" ON public.account_suspensions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
