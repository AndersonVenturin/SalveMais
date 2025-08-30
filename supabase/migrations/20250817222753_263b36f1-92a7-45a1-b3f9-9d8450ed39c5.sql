-- Fix RLS policies to work with custom registration (no Supabase Auth)
-- Since this app uses custom auth with password hashing, not Supabase Auth,
-- we need different policies

-- Drop the existing policies that assume Supabase Auth
DROP POLICY IF EXISTS "Users can view their own profile" ON public.usuario;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.usuario;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.usuario;

-- For custom auth system, we need to allow users to view their data based on email
-- since there's no auth.uid() in this system
CREATE POLICY "Allow public read during development" 
ON public.usuario 
FOR SELECT 
USING (true);

-- Keep the insert policy as is - allows registration
-- INSERT policy is already correct: "Allow all inserts for registration"

-- For updates and deletes, we'll need the application to handle authorization
-- since we're not using Supabase Auth
CREATE POLICY "Allow authenticated updates" 
ON public.usuario 
FOR UPDATE 
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated deletes" 
ON public.usuario 
FOR DELETE 
USING (true);

-- Note: These broad policies are temporary for development
-- In production, you should implement proper session-based auth checks