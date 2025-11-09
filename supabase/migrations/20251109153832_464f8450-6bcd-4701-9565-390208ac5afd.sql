-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Users can view product evaluations they're involved in" ON public.avaliacao_produto;

-- Allow everyone to view product evaluations
CREATE POLICY "Public can view product evaluations"
  ON public.avaliacao_produto
  FOR SELECT
  USING (true);