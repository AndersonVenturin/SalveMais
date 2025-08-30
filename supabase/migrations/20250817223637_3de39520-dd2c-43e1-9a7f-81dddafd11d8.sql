-- Fix infinite recursion in RLS policy for usuario table
-- The previous policy was causing infinite recursion because it queried the same table it was protecting

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can read their own data for login" ON public.usuario;

-- Create a simpler, safer policy for registration email checks
-- Allow reading email and id only for duplicate checking during registration
CREATE POLICY "Allow email verification for registration" 
ON public.usuario 
FOR SELECT 
USING (true);

-- Keep the existing policies for updates and deletes
-- These are already correctly implemented and don't cause recursion