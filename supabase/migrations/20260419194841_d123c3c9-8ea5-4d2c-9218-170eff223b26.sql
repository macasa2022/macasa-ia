-- Enum for request status
CREATE TYPE public.subject_change_status AS ENUM ('Pendente', 'Aprovado', 'Rejeitado');

-- Main table
CREATE TABLE public.subject_change_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  user_name TEXT,
  current_subject TEXT NOT NULL,
  requested_subject TEXT NOT NULL,
  motivo TEXT,
  status public.subject_change_status NOT NULL DEFAULT 'Pendente',
  admin_notes TEXT,
  decided_by UUID,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_scr_user ON public.subject_change_requests(user_id, created_at DESC);
CREATE INDEX idx_scr_status ON public.subject_change_requests(status, created_at DESC);

ALTER TABLE public.subject_change_requests ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own requests"
  ON public.subject_change_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own requests"
  ON public.subject_change_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all requests"
  ON public.subject_change_requests FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update requests"
  ON public.subject_change_requests FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Validation trigger: 1 request per 30 days, no concurrent pending
CREATE OR REPLACE FUNCTION public.validate_subject_change_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pending_count INT;
  last_decision TIMESTAMPTZ;
BEGIN
  -- Block if there's already a pending request
  SELECT COUNT(*) INTO pending_count
  FROM public.subject_change_requests
  WHERE user_id = NEW.user_id AND status = 'Pendente';

  IF pending_count > 0 THEN
    RAISE EXCEPTION 'Já tens um pedido pendente. Aguarda a decisão antes de submeter outro.';
  END IF;

  -- Block if last decision was less than 30 days ago
  SELECT MAX(decided_at) INTO last_decision
  FROM public.subject_change_requests
  WHERE user_id = NEW.user_id AND decided_at IS NOT NULL;

  IF last_decision IS NOT NULL AND last_decision > (now() - interval '30 days') THEN
    RAISE EXCEPTION 'Só podes submeter um pedido a cada 30 dias. Próximo pedido disponível em %.', to_char(last_decision + interval '30 days', 'DD/MM/YYYY');
  END IF;

  -- Validate that current and requested are different
  IF NEW.current_subject = NEW.requested_subject THEN
    RAISE EXCEPTION 'A disciplina pedida tem de ser diferente da atual.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_subject_change_request
  BEFORE INSERT ON public.subject_change_requests
  FOR EACH ROW EXECUTE FUNCTION public.validate_subject_change_request();

-- updated_at trigger
CREATE TRIGGER trg_subject_change_requests_updated_at
  BEFORE UPDATE ON public.subject_change_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();