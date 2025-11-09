-- Função para criar avaliações (produto + usuário) em uma única transação
CREATE OR REPLACE FUNCTION public.create_avaliacao(
  p_user_email text,
  p_historico_transacao_id bigint,
  p_produto_id bigint,
  p_usuario_origem_id bigint,
  p_usuario_destino_id bigint,
  p_avaliacao_produto integer,
  p_observacao_produto text,
  p_data_transacao timestamp without time zone,
  p_avaliacao_usuario integer,
  p_observacao_usuario text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Garantir que as políticas RLS reconheçam o usuário
  PERFORM set_config('app.current_user_email', p_user_email, true);

  -- Inserir avaliação do produto
  INSERT INTO public.avaliacao_produto (
    historico_transacao_id,
    produto_id,
    usuario_origem_id,
    usuario_destino_id,
    avaliacao,
    observacao,
    data_transacao,
    data_cadastro
  ) VALUES (
    p_historico_transacao_id,
    p_produto_id,
    p_usuario_origem_id,
    p_usuario_destino_id,
    p_avaliacao_produto,
    p_observacao_produto,
    p_data_transacao,
    now()
  );

  -- Inserir avaliação do usuário
  INSERT INTO public.avaliacao_usuario (
    historico_transacao_id,
    usuario_origem_id,
    usuario_avaliado_id,
    avaliacao,
    observacao,
    data_cadastro
  ) VALUES (
    p_historico_transacao_id,
    p_usuario_origem_id,
    p_usuario_destino_id,
    p_avaliacao_usuario,
    p_observacao_usuario,
    now()
  );
END;
$$;