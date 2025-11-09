-- Create avaliacao_produto table
CREATE TABLE public.avaliacao_produto (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  historico_transacao_id BIGINT NOT NULL REFERENCES public.historico_transacao(id) ON DELETE CASCADE,
  produto_id BIGINT NOT NULL REFERENCES public.produto(id) ON DELETE CASCADE,
  usuario_origem_id BIGINT NOT NULL REFERENCES public.usuario(id) ON DELETE CASCADE,
  usuario_destino_id BIGINT NOT NULL REFERENCES public.usuario(id) ON DELETE CASCADE,
  avaliacao INTEGER NOT NULL CHECK (avaliacao >= 1 AND avaliacao <= 5),
  observacao TEXT,
  data_transacao TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  data_cadastro TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now()
);

-- Create avaliacao_usuario table
CREATE TABLE public.avaliacao_usuario (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  historico_transacao_id BIGINT NOT NULL REFERENCES public.historico_transacao(id) ON DELETE CASCADE,
  usuario_origem_id BIGINT NOT NULL REFERENCES public.usuario(id) ON DELETE CASCADE,
  usuario_avaliado_id BIGINT NOT NULL REFERENCES public.usuario(id) ON DELETE CASCADE,
  avaliacao INTEGER NOT NULL CHECK (avaliacao >= 1 AND avaliacao <= 5),
  observacao TEXT,
  data_cadastro TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on avaliacao_produto
ALTER TABLE public.avaliacao_produto ENABLE ROW LEVEL SECURITY;

-- Enable RLS on avaliacao_usuario
ALTER TABLE public.avaliacao_usuario ENABLE ROW LEVEL SECURITY;

-- RLS Policies for avaliacao_produto
CREATE POLICY "Users can view product evaluations they're involved in"
ON public.avaliacao_produto
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.usuario u
    WHERE (u.id = avaliacao_produto.usuario_origem_id OR u.id = avaliacao_produto.usuario_destino_id)
      AND u.email = current_setting('app.current_user_email', true)
  )
);

CREATE POLICY "Users can create product evaluations as origem"
ON public.avaliacao_produto
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.usuario u
    WHERE u.id = avaliacao_produto.usuario_origem_id
      AND u.email = current_setting('app.current_user_email', true)
  )
);

-- RLS Policies for avaliacao_usuario
CREATE POLICY "Users can view user evaluations they're involved in"
ON public.avaliacao_usuario
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.usuario u
    WHERE (u.id = avaliacao_usuario.usuario_origem_id OR u.id = avaliacao_usuario.usuario_avaliado_id)
      AND u.email = current_setting('app.current_user_email', true)
  )
);

CREATE POLICY "Users can create user evaluations as origem"
ON public.avaliacao_usuario
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.usuario u
    WHERE u.id = avaliacao_usuario.usuario_origem_id
      AND u.email = current_setting('app.current_user_email', true)
  )
);

-- Create indexes for better performance
CREATE INDEX idx_avaliacao_produto_historico ON public.avaliacao_produto(historico_transacao_id);
CREATE INDEX idx_avaliacao_produto_produto ON public.avaliacao_produto(produto_id);
CREATE INDEX idx_avaliacao_usuario_historico ON public.avaliacao_usuario(historico_transacao_id);
CREATE INDEX idx_avaliacao_usuario_avaliado ON public.avaliacao_usuario(usuario_avaliado_id);