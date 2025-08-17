-- Remove the conflicting policies first
DROP POLICY IF EXISTS "Allow user creation during registration" ON public.usuario;
DROP POLICY IF EXISTS "Users can view their own data" ON public.usuario;
DROP POLICY IF EXISTS "Users can update their own data" ON public.usuario;

-- Remove existing conflicting policies
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.usuario;
DROP POLICY IF EXISTS "Users can view own profile" ON public.usuario;
DROP POLICY IF EXISTS "Users can update own profile" ON public.usuario;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.usuario;

-- Create a permissive insert policy for user registration
CREATE POLICY "Enable insert for registration" 
ON public.usuario 
FOR INSERT 
WITH CHECK (true);

-- Create policies for authenticated users to manage their own data
CREATE POLICY "Users can view their own profile" 
ON public.usuario 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.usuario 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profile" 
ON public.usuario 
FOR DELETE 
USING (auth.uid() = user_id);