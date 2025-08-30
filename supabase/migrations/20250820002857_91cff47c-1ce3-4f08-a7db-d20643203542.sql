-- Habilitar RLS no storage.objects para corrigir os ERRORs críticos
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;