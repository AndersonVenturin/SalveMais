-- Create RLS policy to allow inserting new users during registration
CREATE POLICY "Allow user creation during registration" 
ON public.usuario 
FOR INSERT 
WITH CHECK (true);

-- Also create a policy to allow users to view their own data
CREATE POLICY "Users can view their own data" 
ON public.usuario 
FOR SELECT 
USING (user_id = auth.uid());

-- Allow users to update their own data
CREATE POLICY "Users can update their own data" 
ON public.usuario 
FOR UPDATE 
USING (user_id = auth.uid());