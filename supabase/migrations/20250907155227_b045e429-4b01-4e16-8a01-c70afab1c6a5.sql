-- Criar uma função de segurança para verificar se o usuário atual pode acessar um produto
CREATE OR REPLACE FUNCTION public.current_user_can_access_produto(produto_usuario_id bigint)
RETURNS BOOLEAN AS $$
DECLARE
  current_auth_user_id uuid;
  user_exists boolean;
BEGIN
  -- Obter o ID do usuário autenticado do Supabase Auth
  current_auth_user_id := auth.uid();
  
  -- Se não há usuário autenticado, retornar false
  IF current_auth_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Verificar se existe um usuário na tabela usuario com esse user_id e id
  SELECT EXISTS(
    SELECT 1 
    FROM public.usuario 
    WHERE id = produto_usuario_id 
    AND user_id = current_auth_user_id
  ) INTO user_exists;
  
  RETURN user_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Recriar as políticas RLS usando a função de segurança
DROP POLICY IF EXISTS "Users can insert their own products" ON public.produto;
DROP POLICY IF EXISTS "Users can update their own products" ON public.produto;
DROP POLICY IF EXISTS "Users can delete their own products" ON public.produto;

-- Política para INSERT - permite inserir produtos se o usuário autenticado for o dono
CREATE POLICY "Users can insert their own products" 
ON public.produto 
FOR INSERT 
WITH CHECK (public.current_user_can_access_produto(usuario_id));

-- Política para UPDATE - permite atualizar produtos se o usuário autenticado for o dono
CREATE POLICY "Users can update their own products" 
ON public.produto 
FOR UPDATE 
USING (public.current_user_can_access_produto(usuario_id));

-- Política para DELETE - permite deletar produtos se o usuário autenticado for o dono
CREATE POLICY "Users can delete their own products" 
ON public.produto 
FOR DELETE 
USING (public.current_user_can_access_produto(usuario_id));

-- Também ajustar as políticas para produto_foto
DROP POLICY IF EXISTS "Users can insert photos for their own products" ON public.produto_foto;
DROP POLICY IF EXISTS "Users can update photos of their own products" ON public.produto_foto;
DROP POLICY IF EXISTS "Users can delete photos of their own products" ON public.produto_foto;

-- Função para verificar acesso às fotos dos produtos
CREATE OR REPLACE FUNCTION public.current_user_can_access_produto_foto(foto_produto_id bigint)
RETURNS BOOLEAN AS $$
DECLARE
  current_auth_user_id uuid;
  user_exists boolean;
BEGIN
  current_auth_user_id := auth.uid();
  
  IF current_auth_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  SELECT EXISTS(
    SELECT 1 
    FROM public.produto p
    JOIN public.usuario u ON u.id = p.usuario_id
    WHERE p.id = foto_produto_id 
    AND u.user_id = current_auth_user_id
  ) INTO user_exists;
  
  RETURN user_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Políticas para produto_foto
CREATE POLICY "Users can insert photos for their own products" 
ON public.produto_foto 
FOR INSERT 
WITH CHECK (public.current_user_can_access_produto_foto(produto_id));

CREATE POLICY "Users can update photos of their own products" 
ON public.produto_foto 
FOR UPDATE 
USING (public.current_user_can_access_produto_foto(produto_id));

CREATE POLICY "Users can delete photos of their own products" 
ON public.produto_foto 
FOR DELETE 
USING (public.current_user_can_access_produto_foto(produto_id));