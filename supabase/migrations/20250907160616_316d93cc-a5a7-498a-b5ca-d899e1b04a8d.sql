-- Corrigir o search_path das funções de segurança
CREATE OR REPLACE FUNCTION public.current_user_can_access_produto(produto_usuario_id bigint)
RETURNS BOOLEAN AS $$
DECLARE
  current_auth_user_id uuid;
  logged_user_id bigint;
BEGIN
  current_auth_user_id := auth.uid();
  
  IF current_auth_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  SELECT id INTO logged_user_id
  FROM public.usuario 
  WHERE user_id = current_auth_user_id;
  
  IF logged_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN produto_usuario_id = logged_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = '';

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
  
  SELECT id INTO logged_user_id
  FROM public.usuario 
  WHERE user_id = current_auth_user_id;
  
  IF logged_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  SELECT p.usuario_id INTO produto_owner_id
  FROM public.produto p
  WHERE p.id = foto_produto_id;
  
  RETURN produto_owner_id = logged_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = '';