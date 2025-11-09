-- Create secure RPC to fetch user evaluations for given history IDs, scoped to the current user by email
CREATE OR REPLACE FUNCTION public.get_avaliacoes_usuario(
  p_user_email text,
  p_historico_ids bigint[]
)
RETURNS SETOF public.avaliacao_usuario
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT au.*
  FROM public.avaliacao_usuario au
  JOIN public.usuario u ON u.email = p_user_email
  WHERE au.historico_transacao_id = ANY (p_historico_ids)
    AND (au.usuario_origem_id = u.id OR au.usuario_avaliado_id = u.id);
$$;

GRANT EXECUTE ON FUNCTION public.get_avaliacoes_usuario(text, bigint[]) TO anon, authenticated, service_role;