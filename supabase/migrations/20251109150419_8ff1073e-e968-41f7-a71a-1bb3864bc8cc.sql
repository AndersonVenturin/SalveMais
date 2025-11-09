-- Criar função para definir o contexto do usuário
CREATE OR REPLACE FUNCTION public.set_user_context(user_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.current_user_email', user_email, false);
END;
$$;