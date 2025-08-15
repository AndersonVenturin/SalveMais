-- Habilitar RLS na tabela usuario
ALTER TABLE public.usuario ENABLE ROW LEVEL SECURITY;

-- Criar tabela de perfis para seguir as melhores práticas do Supabase
CREATE TABLE public.profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  email text NOT NULL UNIQUE,
  preferencias text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Habilitar RLS na tabela profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para a tabela usuario
-- Usuários podem inserir na tabela usuario (para registro)
CREATE POLICY "Allow insert for registration" 
ON public.usuario 
FOR INSERT 
TO anon 
WITH CHECK (true);

-- Usuários autenticados podem ver apenas seus próprios dados
CREATE POLICY "Users can view own data" 
ON public.usuario 
FOR SELECT 
TO authenticated 
USING (false); -- Desabilitar select na tabela usuario, usar profiles

-- Políticas RLS para a tabela profiles
-- Usuários podem ver apenas seu próprio perfil
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- Usuários podem inserir apenas seu próprio perfil
CREATE POLICY "Users can insert own profile" 
ON public.profiles 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Usuários podem atualizar apenas seu próprio perfil
CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Criar função para atualizar timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar timestamp automaticamente na tabela profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Função para criar perfil automaticamente quando usuário se registra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nome, email, preferencias)
  VALUES (NEW.id, 
          COALESCE(NEW.raw_user_meta_data->>'nome', ''), 
          NEW.email,
          COALESCE(NEW.raw_user_meta_data->>'preferencias', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar perfil automaticamente
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();