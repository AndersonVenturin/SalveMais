-- Re-enable Row Level Security on usuario table
ALTER TABLE public.usuario ENABLE ROW LEVEL SECURITY;

-- Ensure the insertion policy allows registration without authentication
-- This policy allows anyone to insert during registration
DROP POLICY IF EXISTS "Allow all inserts for registration" ON public.usuario;
CREATE POLICY "Allow all inserts for registration" 
ON public.usuario 
FOR INSERT 
WITH CHECK (true);

-- Ensure authenticated users can view their own profile
DROP POLICY IF EXISTS "Users can view their own profile" ON public.usuario;
CREATE POLICY "Users can view their own profile" 
ON public.usuario 
FOR SELECT 
USING (auth.uid() = user_id);

-- Ensure authenticated users can update their own profile
DROP POLICY IF EXISTS "Users can update their own profile" ON public.usuario;
CREATE POLICY "Users can update their own profile" 
ON public.usuario 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Ensure authenticated users can delete their own profile
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.usuario;
CREATE POLICY "Users can delete their own profile" 
ON public.usuario 
FOR DELETE 
USING (auth.uid() = user_id);

-- Verify RLS is now enabled
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'usuario';