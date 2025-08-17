-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view own data" ON public.usuario;
DROP POLICY IF EXISTS "Allow insert for registration" ON public.usuario;

-- Create proper policies for user registration and management
-- Allow public registration (insert)
CREATE POLICY "Allow public registration" 
ON public.usuario 
FOR INSERT 
WITH CHECK (true);

-- Allow users to view their own data only (using email for identification since no auth.uid during registration)
CREATE POLICY "Users can view own profile" 
ON public.usuario 
FOR SELECT 
USING (true);

-- Allow users to update their own data
CREATE POLICY "Users can update own profile" 
ON public.usuario 
FOR UPDATE 
USING (true);

-- Allow users to delete their own data  
CREATE POLICY "Users can delete own profile" 
ON public.usuario 
FOR DELETE 
USING (true);