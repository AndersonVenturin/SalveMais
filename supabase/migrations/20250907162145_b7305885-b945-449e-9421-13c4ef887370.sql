-- Corrigir a ligação entre auth.users e usuario
UPDATE public.usuario 
SET user_id = au.id
FROM auth.users au 
WHERE usuario.email = au.email 
AND usuario.user_id IS NULL;

-- Verificar se a correção funcionou
SELECT u.id, u.email, u.user_id, au.id as auth_id 
FROM public.usuario u 
JOIN auth.users au ON u.user_id = au.id;