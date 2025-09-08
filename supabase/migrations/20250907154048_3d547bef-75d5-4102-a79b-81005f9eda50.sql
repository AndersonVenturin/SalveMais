-- Ensure users can insert and update their own products
-- First, drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Users can insert their own products" ON public.produto;
DROP POLICY IF EXISTS "Users can update their own products" ON public.produto;

-- Create INSERT policy for products - users can insert products for themselves
CREATE POLICY "Users can insert their own products" 
ON public.produto 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.usuario 
    WHERE usuario.id = produto.usuario_id 
    AND usuario.user_id = auth.uid()
  )
);

-- Create UPDATE policy for products - users can update their own products
CREATE POLICY "Users can update their own products" 
ON public.produto 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 
    FROM public.usuario 
    WHERE usuario.id = produto.usuario_id 
    AND usuario.user_id = auth.uid()
  )
);

-- Also ensure produto_foto policies are correct
DROP POLICY IF EXISTS "Users can insert photos for their own products" ON public.produto_foto;
DROP POLICY IF EXISTS "Users can update photos of their own products" ON public.produto_foto;

-- Create INSERT policy for product photos
CREATE POLICY "Users can insert photos for their own products" 
ON public.produto_foto 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.produto p
    JOIN public.usuario u ON u.id = p.usuario_id
    WHERE p.id = produto_foto.produto_id 
    AND u.user_id = auth.uid()
  )
);

-- Create UPDATE policy for product photos
CREATE POLICY "Users can update photos of their own products" 
ON public.produto_foto 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 
    FROM public.produto p
    JOIN public.usuario u ON u.id = p.usuario_id
    WHERE p.id = produto_foto.produto_id 
    AND u.user_id = auth.uid()
  )
);