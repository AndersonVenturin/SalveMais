-- Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true);

-- Enable RLS on produto table
ALTER TABLE public.produto ENABLE ROW LEVEL SECURITY;

-- Enable RLS on produto_foto table  
ALTER TABLE public.produto_foto ENABLE ROW LEVEL SECURITY;

-- RLS policies for produto table
-- Users can only see their own products
CREATE POLICY "Users can view their own products" 
ON public.produto 
FOR SELECT 
USING (auth.uid()::text = (SELECT user_id::text FROM public.usuario WHERE id = produto.usuario_id));

-- Users can insert their own products
CREATE POLICY "Users can insert their own products" 
ON public.produto 
FOR INSERT 
WITH CHECK (auth.uid()::text = (SELECT user_id::text FROM public.usuario WHERE id = produto.usuario_id));

-- Users can update their own products
CREATE POLICY "Users can update their own products" 
ON public.produto 
FOR UPDATE 
USING (auth.uid()::text = (SELECT user_id::text FROM public.usuario WHERE id = produto.usuario_id));

-- Users can delete their own products
CREATE POLICY "Users can delete their own products" 
ON public.produto 
FOR DELETE 
USING (auth.uid()::text = (SELECT user_id::text FROM public.usuario WHERE id = produto.usuario_id));

-- RLS policies for produto_foto table
-- Users can only see photos of their own products
CREATE POLICY "Users can view photos of their own products" 
ON public.produto_foto 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.produto p
  WHERE p.id = produto_foto.produto_id 
  AND auth.uid()::text = (SELECT user_id::text FROM public.usuario WHERE id = p.usuario_id)
));

-- Users can insert photos for their own products
CREATE POLICY "Users can insert photos for their own products" 
ON public.produto_foto 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.produto p
  WHERE p.id = produto_foto.produto_id 
  AND auth.uid()::text = (SELECT user_id::text FROM public.usuario WHERE id = p.usuario_id)
));

-- Users can update photos of their own products
CREATE POLICY "Users can update photos of their own products" 
ON public.produto_foto 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.produto p
  WHERE p.id = produto_foto.produto_id 
  AND auth.uid()::text = (SELECT user_id::text FROM public.usuario WHERE id = p.usuario_id)
));

-- Users can delete photos of their own products
CREATE POLICY "Users can delete photos of their own products" 
ON public.produto_foto 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.produto p
  WHERE p.id = produto_foto.produto_id 
  AND auth.uid()::text = (SELECT user_id::text FROM public.usuario WHERE id = p.usuario_id)
));

-- Storage policies for product images
CREATE POLICY "Users can view product images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'product-images');

CREATE POLICY "Users can upload product images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'product-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their product images" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'product-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their product images" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'product-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);