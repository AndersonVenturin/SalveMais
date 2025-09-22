-- Remove user_id column from usuario table
ALTER TABLE public.usuario DROP COLUMN user_id;

-- Update the RLS functions to work without user_id
-- Since we can't link to auth.users anymore, we'll need to use email-based authentication
CREATE OR REPLACE FUNCTION public.current_user_can_access_produto(produto_usuario_id bigint)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_user_email text;
  logged_user_id bigint;
BEGIN
  -- Get current user email from app setting (set during login)
  current_user_email := current_setting('app.current_user_email', true);
  
  IF current_user_email IS NULL OR current_user_email = '' THEN
    RETURN false;
  END IF;
  
  -- Find the user ID based on email
  SELECT id INTO logged_user_id
  FROM public.usuario 
  WHERE email = current_user_email;
  
  IF logged_user_id IS NULL THEN
    RETURN false;  
  END IF;
  
  RETURN produto_usuario_id = logged_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.current_user_can_access_produto_foto(foto_produto_id bigint)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_user_email text;
  logged_user_id bigint;
  produto_owner_id bigint;
BEGIN
  -- Get current user email from app setting (set during login)
  current_user_email := current_setting('app.current_user_email', true);
  
  IF current_user_email IS NULL OR current_user_email = '' THEN
    RETURN false;
  END IF;
  
  -- Find the user ID based on email
  SELECT id INTO logged_user_id
  FROM public.usuario 
  WHERE email = current_user_email;
  
  IF logged_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Get the owner of the product
  SELECT p.usuario_id INTO produto_owner_id
  FROM public.produto p
  WHERE p.id = foto_produto_id;
  
  RETURN produto_owner_id = logged_user_id;
END;
$$;