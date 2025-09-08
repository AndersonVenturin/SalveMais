-- Recriar a função de segurança para verificar se o usuário atual pode acessar um produto
-- A função deve verificar se o usuario_id do produto corresponde ao id do usuário logado na tabela usuario
DROP FUNCTION IF EXISTS public.current_user_can_access_produto(bigint);

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

-- Recriar a função para produto_foto também
DROP FUNCTION IF EXISTS public.current_user_can_access_produto_foto(bigint);

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