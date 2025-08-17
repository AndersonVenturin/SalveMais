import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MultiSelect, type Option } from "@/components/ui/multi-select";
import { formatInTimeZone } from 'date-fns-tz';
import { Eye, EyeOff, Mail, Lock, User, Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import salveLogo from "@/assets/salve-logo.png";
import { supabase } from "@/integrations/supabase/client";
import bcrypt from "bcryptjs";
import emailjs from '@emailjs/browser';

const registerSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("E-mail inválido"),
  password: z
    .string()
    .min(8, "Senha deve ter pelo menos 8 caracteres")
    .max(20, "Senha deve ter no máximo 20 caracteres")
    .regex(/[a-z]/, "Senha deve conter pelo menos uma letra minúscula")
    .regex(/[A-Z]/, "Senha deve conter pelo menos uma letra maiúscula")
    .regex(/\d/, "Senha deve conter pelo menos um número")
    .regex(/[^a-zA-Z0-9]/, "Senha deve conter pelo menos um caractere especial"),
  preferences: z.array(z.string()).optional(),
});

type RegisterFormData = z.infer<typeof registerSchema>;

const RegisterForm = () => {
  console.log("RegisterForm component rendering...");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const watchedPassword = watch("password", "");

  const passwordValidations = [
    { test: /.{8,20}/, message: "8-20 caracteres" },
    { test: /[a-z]/, message: "Uma letra minúscula" },
    { test: /[A-Z]/, message: "Uma letra maiúscula" },
    { test: /\d/, message: "Um número" },
    { test: /[^a-zA-Z0-9]/, message: "Um caractere especial" },
  ];

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);

    try {
      console.log("Verificando se email já existe:", data.email);
      
      // Verificar se e-mail já existe na tabela usuario
      const { data: existingUsers, error: checkError } = await supabase
        .from('usuario')
        .select('id, email')
        .eq('email', data.email.toLowerCase().trim());

      console.log("Resultado da verificação:", { existingUsers, checkError });

      if (checkError) {
        console.error("Erro ao verificar email:", checkError);
        toast({
          title: "Erro no cadastro",
          description: "Erro ao verificar e-mail. Tente novamente.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Se encontrou algum usuário com este email
      if (existingUsers && existingUsers.length > 0) {
        console.log("Email já existe na base de dados");
        toast({
          title: "Erro no cadastro",
          description: "E-mail já registrado.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      console.log("Email não existe, prosseguindo com o cadastro");

      // Hash da senha antes de salvar
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(data.password, saltRounds);

      // Cadastrar usuário na tabela usuario
      const { data: newUser, error: insertError } = await supabase
        .from('usuario')
        .insert({
          nome: data.name,
          email: data.email.toLowerCase().trim(),
          senha: hashedPassword,
          preferencias: data.preferences ? data.preferences.join(', ') : '',
          data_cadastro: formatInTimeZone(new Date(), 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"),
          token_ativo: false
        })
        .select()
        .single();

      if (insertError) {
        console.error("Erro ao inserir usuário:", insertError);
        throw insertError;
      }

      console.log("Usuário cadastrado com sucesso:", newUser);

      // Enviar email de confirmação usando EmailJS
      try {
        const confirmationToken = crypto.randomUUID();
        const expirationTime = Date.now() + (5 * 60 * 1000); // 5 minutos
        const confirmationUrl = `${window.location.origin}/confirm-email?token=${confirmationToken}&userId=${newUser.id}&expires=${expirationTime}`;

        const emailParams = {
          to_email: data.email.toLowerCase().trim(),
          to_name: data.name,
          user_name: data.name, // Variável adicional para o nome
          confirmation_url: confirmationUrl,
          confirmation_link: confirmationUrl, // Variável adicional para o link
          reply_to: 'noreply@salve.com',
        };

        console.log('Enviando email com parâmetros:', emailParams);

        await emailjs.send(
          'service_salve', // Service ID do EmailJS
          'template_salve', // Template ID do EmailJS
          emailParams,
          'Pcq-7YzuNvqGoCb-7' // Public Key do EmailJS
        );
        
        console.log('Email de confirmação enviado com sucesso');
      } catch (emailError) {
        console.error('Erro ao enviar email:', emailError);
        // Não bloquear o cadastro se o email falhar
      }

      toast({
        title: "Cadastro realizado com sucesso!",
        description: "Confirme seu e-mail.",
      });
      navigate("/");
    } catch (error: any) {
      console.error("Erro no cadastro:", error);
      toast({
        title: "Erro no cadastro",
        description: error.message || "Ocorreu um erro ao criar sua conta",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const preferences: Option[] = [
    { value: "eletronicos", label: "📱 Eletrônicos" },
    { value: "livros", label: "📚 Livros" },
    { value: "filmes", label: "🎬 Filmes" },
    { value: "jogos", label: "🎮 Jogos" },
    { value: "roupas", label: "👕 Roupas" },
    { value: "moveis", label: "🪑 Móveis" },
    { value: "outros", label: "📦 Outros" },
  ];

  const [selectedPreferences, setSelectedPreferences] = useState<string[]>([]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-lg border-0 bg-card">
        <CardHeader className="space-y-4 text-center pb-6">
          <div className="flex justify-center">
            <img 
              src={salveLogo} 
              alt="Salve+" 
              className="h-20 w-auto"
            />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl font-bold text-foreground">
              Crie sua conta
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Preencha os dados para se cadastrar
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-foreground">
                Nome completo
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  placeholder="Digite seu nome completo"
                  className="pl-10 h-12 border-border focus:ring-primary"
                  {...register("name")}
                />
              </div>
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

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
                  className="pl-10 h-12 border-border focus:ring-primary"
                  {...register("email")}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
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
                  className="pl-10 pr-10 h-12 border-border focus:ring-primary"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 h-4 w-4 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
              
              {/* Password strength indicator */}
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">A senha deve conter:</p>
                <div className="grid grid-cols-1 gap-1">
                  {passwordValidations.map((validation, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          validation.test.test(watchedPassword)
                            ? "bg-green-500"
                            : "bg-gray-300"
                        }`}
                      />
                      <span
                        className={`text-xs ${
                          validation.test.test(watchedPassword)
                            ? "text-green-600"
                            : "text-muted-foreground"
                        }`}
                      >
                        {validation.message}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                Preferências <span className="text-muted-foreground">(opcional)</span>
              </Label>
              <div className="flex items-center space-x-2 mb-2">
                <Heart className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Selecione suas preferências:</span>
              </div>
              <MultiSelect
                options={preferences}
                selected={selectedPreferences}
                onChange={(newPreferences) => {
                  setSelectedPreferences(newPreferences);
                  setValue("preferences", newPreferences);
                }}
                placeholder="Selecione suas preferências..."
                className="border-border focus:ring-primary"
              />
              {errors.preferences && (
                <p className="text-sm text-destructive">{errors.preferences.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-all duration-200 shadow-sm hover:shadow-md"
              disabled={isLoading}
            >
              {isLoading ? "Criando conta..." : "Criar conta"}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              Já tem uma conta?{" "}
              <button
                type="button"
                onClick={() => navigate("/")}
                className="text-primary hover:text-primary/80 transition-colors font-medium"
              >
                Faça login
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default RegisterForm;
