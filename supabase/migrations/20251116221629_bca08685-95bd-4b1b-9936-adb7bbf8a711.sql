-- Add consumo_c02 column to tipo_produto table
ALTER TABLE public.tipo_produto 
ADD COLUMN consumo_c02 numeric DEFAULT 0;