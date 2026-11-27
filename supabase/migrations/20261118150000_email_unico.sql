-- ============================================================
-- Um email = uma conta.
-- Variantes que chegam à mesma caixa de correio contam como o mesmo email:
--   - maiúsculas/minúsculas e espaços
--   - "+etiqueta"  (ana+fisica@exemplo.pt  -> ana@exemplo.pt)
--   - pontos no Gmail (a.n.a@gmail.com     -> ana@gmail.com; googlemail.com = gmail.com)
-- ============================================================

CREATE OR REPLACE FUNCTION public.canonical_email(_email text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN _email IS NULL OR position('@' IN _email) = 0 THEN lower(trim(_email))
    ELSE (
      SELECT CASE
        WHEN d IN ('gmail.com', 'googlemail.com')
          THEN replace(split_part(l, '+', 1), '.', '') || '@gmail.com'
        ELSE split_part(l, '+', 1) || '@' || d
      END
      FROM (
        SELECT split_part(lower(trim(_email)), '@', 1) AS l,
               split_part(lower(trim(_email)), '@', 2) AS d
      ) parts
    )
  END;
$$;

-- Verifica se o email (ou uma variante) já tem conta. Só para as Edge Functions.
CREATE OR REPLACE FUNCTION public.email_is_registered(_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE public.canonical_email(u.email) = public.canonical_email(_email)
  );
$$;

REVOKE ALL ON FUNCTION public.email_is_registered(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.email_is_registered(text) TO service_role;

-- Bloqueio na própria base de dados: mesmo que alguém chame a API de registo
-- diretamente (sem passar pelo código de verificação), a conta duplicada é recusada.
CREATE OR REPLACE FUNCTION public.prevent_duplicate_canonical_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NEW.email IS NOT NULL AND EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id <> NEW.id
      AND public.canonical_email(u.email) = public.canonical_email(NEW.email)
  ) THEN
    RAISE EXCEPTION 'Este email já está registado.' USING ERRCODE = '23505';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_duplicate_canonical_email ON auth.users;
CREATE TRIGGER prevent_duplicate_canonical_email
  BEFORE INSERT OR UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.prevent_duplicate_canonical_email();
