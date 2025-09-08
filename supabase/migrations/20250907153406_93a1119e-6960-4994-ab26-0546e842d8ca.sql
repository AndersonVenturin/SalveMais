-- Add SELECT policy for produto table to allow all users to view products
CREATE POLICY "Everyone can view products" 
ON public.produto 
FOR SELECT 
USING (true);

-- Update SELECT policy for produto_foto table to allow all users to view product photos
DROP POLICY "Users can view photos of their own products" ON public.produto_foto;

CREATE POLICY "Everyone can view product photos" 
ON public.produto_foto 
FOR SELECT 
USING (true);