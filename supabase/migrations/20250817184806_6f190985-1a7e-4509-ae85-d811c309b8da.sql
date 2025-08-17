-- Check if RLS is enabled and create a simpler policy
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'usuario';

-- Drop the current insert policy
DROP POLICY IF EXISTS "Allow registration and authenticated inserts" ON public.usuario;

-- Create a completely permissive insert policy for now to allow registration
CREATE POLICY "Allow all inserts for registration" 
ON public.usuario 
FOR INSERT 
WITH CHECK (true);

-- Verify the policy was created
SELECT policyname, cmd, with_check FROM pg_policies WHERE tablename = 'usuario' AND cmd = 'INSERT';