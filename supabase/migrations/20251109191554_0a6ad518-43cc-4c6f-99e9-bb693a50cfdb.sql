-- Atualizar política de visualização de avaliações de usuário
-- Permitir que qualquer pessoa veja as avaliações recebidas (público)
DROP POLICY IF EXISTS "Users can view user evaluations they're involved in" ON public.avaliacao_usuario;

CREATE POLICY "Public can view user evaluations"
ON public.avaliacao_usuario
FOR SELECT
USING (true);
