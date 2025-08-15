import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import bcrypt from "bcryptjs";
import salveLogo from "@/assets/salve-logo.png";

const LoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      console.log("Tentando fazer login com:", email);
      
      // Buscar usuário pelo email
      const { data: usuario, error: fetchError } = await supabase
        .from('usuario')
        .select('*')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();

      console.log("Resultado da busca:", { usuario, fetchError });

      if (fetchError) {
        console.error("Erro ao buscar usuário:", fetchError);
        toast({
          title: "Erro no login",
          description: "Erro interno. Tente novamente.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      if (!usuario) {
        console.log("Usuário não encontrado");
        toast({
          title: "Erro no login",
          description: "E-mail ou senha incorretos.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Verificar se o token está ativo (email confirmado)
      if (!(usuario as any).token_ativo) {
        console.log("Token não ativo");
        toast({
          title: "Email não confirmado",
          description: "Verifique seu e-mail e clique no link de confirmação.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Verificar senha
      console.log("Verificando senha...");
      const senhaValida = await bcrypt.compare(password, usuario.senha);
      console.log("Senha válida:", senhaValida);

      if (!senhaValida) {
        console.log("Senha inválida");
        toast({
          title: "Erro no login",
          description: "E-mail ou senha incorretos.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Login bem-sucedido
      console.log("Login realizado com sucesso para:", usuario.nome);
      toast({
        title: "Login realizado com sucesso!",
        description: `Bem-vindo de volta, ${usuario.nome}!`,
      });
      
      // Aqui você pode armazenar o usuário no localStorage ou context
      localStorage.setItem('user', JSON.stringify({
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email
      }));
      
      // Redirecionar para dashboard ou página principal
      // navigate("/dashboard");
      
    } catch (error: any) {
      console.error("Erro no login:", error);
      toast({
        title: "Erro no login",
        description: error.message || "Ocorreu um erro ao fazer login",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-lg border-0 bg-card">
        <CardHeader className="space-y-4 text-center pb-8">
          <div className="flex justify-center">
            <img 
              src={salveLogo} 
              alt="Salve+" 
              className="h-20 w-auto"
            />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl font-bold text-foreground">
              Entre na sua conta
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Digite seu e-mail e senha para acessar
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">
                E-mail
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12 border-border focus:ring-primary"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-foreground">
                Senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-12 border-border focus:ring-primary"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 h-4 w-4 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-muted-foreground">Lembrar de mim</span>
              </label>
              <button
                type="button"
                className="text-sm text-primary hover:text-primary/80 transition-colors"
              >
                Esqueceu a senha?
              </button>
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-all duration-200 shadow-sm hover:shadow-md"
              disabled={isLoading}
            >
              {isLoading ? "Entrando..." : "Entrar"}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              Não tem uma conta?{" "}
              <button
                type="button"
                onClick={() => navigate("/register")}
                className="text-primary hover:text-primary/80 transition-colors font-medium"
              >
                Cadastre-se
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginForm;