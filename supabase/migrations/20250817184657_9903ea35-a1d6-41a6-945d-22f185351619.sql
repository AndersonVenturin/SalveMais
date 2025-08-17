-- Remove the current insert policy
DROP POLICY IF EXISTS "Enable insert for registration" ON public.usuario;

-- Create a new policy that allows inserts when user_id is NULL (during registration)
-- or when user_id matches the authenticated user
CREATE POLICY "Allow registration and authenticated inserts" 
ON public.usuario 
FOR INSERT 
WITH CHECK (user_id IS NULL OR auth.uid() = user_id);