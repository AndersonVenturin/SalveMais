-- Update consumo_c02 values for each tipo_produto
UPDATE public.tipo_produto SET consumo_c02 = 40 WHERE nome = 'Eletrônicos';
UPDATE public.tipo_produto SET consumo_c02 = 4 WHERE nome = 'Roupas';
UPDATE public.tipo_produto SET consumo_c02 = 1 WHERE nome = 'Livros';
UPDATE public.tipo_produto SET consumo_c02 = 0.2 WHERE nome = 'Filmes';
UPDATE public.tipo_produto SET consumo_c02 = 0.4 WHERE nome = 'Jogos';
UPDATE public.tipo_produto SET consumo_c02 = 30 WHERE nome = 'Moveis';
UPDATE public.tipo_produto SET consumo_c02 = 2 WHERE nome = 'Outros';