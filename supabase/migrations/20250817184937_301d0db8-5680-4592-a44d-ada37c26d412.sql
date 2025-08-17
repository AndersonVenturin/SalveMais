-- Temporarily disable RLS to allow registration
ALTER TABLE public.usuario DISABLE ROW LEVEL SECURITY;

-- Check if RLS is now disabled
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'usuario';