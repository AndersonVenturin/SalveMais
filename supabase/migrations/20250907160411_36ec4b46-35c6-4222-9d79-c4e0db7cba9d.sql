-- Primeiro, remover todas as políticas que dependem das funções
DROP POLICY IF EXISTS "Users can insert their own products" ON public.produto;
DROP POLICY IF EXISTS "Users can update their own products" ON public.produto;
DROP POLICY IF EXISTS "Users can delete their own products" ON public.produto;
DROP POLICY IF EXISTS "Users can insert photos for their own products" ON public.produto_foto;
DROP POLICY IF EXISTS "Users can update photos of their own products" ON public.produto_foto;
DROP POLICY IF EXISTS "Users can delete photos of their own products" ON public.produto_foto;

-- Agora remover as funções
DROP FUNCTION IF EXISTS public.current_user_can_access_produto(bigint);
DROP FUNCTION IF EXISTS public.current_user_can_access_produto_foto(bigint);

-- Recriar a função de segurança corrigida
CREATE OR REPLACE FUNCTION public.current_user_can_access_produto(produto_usuario_id bigint)
RETURNS BOOLEAN AS $$
DECLARE
  current_auth_user_id uuid;
  logged_user_id bigint;
BEGIN
  -- Obter o ID do usuário autenticado do Supabase Auth
  current_auth_user_id := auth.uid();
  
  -- Se não há usuário autenticado, retornar false
  IF current_auth_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Buscar o ID do usuário na tabela usuario usando o user_id do Supabase Auth
  SELECT id INTO logged_user_id
  FROM public.usuario 
  WHERE user_id = current_auth_user_id;
  
  -- Se não encontrou o usuário na tabela usuario, retornar false
  IF logged_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Verificar se o usuario_id do produto é o mesmo do usuário logado
  RETURN produto_usuario_id = logged_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Recriar a função para produto_foto
CREATE OR REPLACE FUNCTION public.current_user_can_access_produto_foto(foto_produto_id bigint)
RETURNS BOOLEAN AS $$
DECLARE
  current_auth_user_id uuid;
  logged_user_id bigint;
  produto_owner_id bigint;
BEGIN
  current_auth_user_id := auth.uid();
  
  IF current_auth_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Buscar o ID do usuário na tabela usuario
  SELECT id INTO logged_user_id
  FROM public.usuario 
  WHERE user_id = current_auth_user_id;
  
  IF logged_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Buscar o owner do produto através da foto
  SELECT p.usuario_id INTO produto_owner_id
  FROM public.produto p
  WHERE p.id = foto_produto_id;
  
  -- Verificar se o usuário logado é o dono do produto
  RETURN produto_owner_id = logged_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Recriar as políticas RLS
CREATE POLICY "Users can insert their own products" 
ON public.produto 
FOR INSERT 
WITH CHECK (public.current_user_can_access_produto(usuario_id));

CREATE POLICY "Users can update their own products" 
ON public.produto 
FOR UPDATE 
USING (public.current_user_can_access_produto(usuario_id));

CREATE POLICY "Users can delete their own products" 
ON public.produto 
FOR DELETE 
USING (public.current_user_can_access_produto(usuario_id));

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