import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import salveLogo from "@/assets/salve-logo.png";
import emailjs from '@emailjs/browser';

const ConfirmEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const { toast } = useToast();

  const [isExpired, setIsExpired] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const confirmEmail = async () => {
      const token = searchParams.get('token');
      const userId = searchParams.get('userId');
      const expires = searchParams.get('expires');

      if (!token || !userId) {
        setStatus('error');
        setMessage('Link inválido ou expirado.');
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('confirm-email', {
          body: { userId: parseInt(userId), expires }
        });

        // Verificar se houve erro na função (incluindo status 400 para expiração)
        if (error) {
          console.error('Function invoke error:', error);
          throw error;
        }

        // Verificar se a resposta indica sucesso
        if (data && data.success) {
          setStatus('success');
          setMessage('E-mail confirmado com sucesso!');
          toast({
            title: "E-mail confirmado!",
            description: "Sua conta foi ativada com sucesso.",
          });
        } else if (data && data.error) {
          // Erro retornado pela função (incluindo expiração)
          throw new Error(data.error);
        } else {
          throw new Error('Erro desconhecido');
        }
      } catch (error: any) {
        console.error('Erro ao confirmar email:', error);
        setStatus('error');
        
        // Verificar se é erro de expiração
        const errorMessage = error.message || '';
        if (errorMessage.includes('E-mail expirado') || errorMessage.includes('expired')) {
          setIsExpired(true);
          setMessage('E-mail expirado. Solicite o e-mail de ativação novamente.');
          
          // Buscar o email do usuário para reenvio
          const userId = searchParams.get('userId');
          if (userId) {
            try {
              const { data: userData } = await supabase
                .from('usuario')
                .select('email')
                .eq('id', parseInt(userId))
                .single();
              
              if (userData) {
                setUserEmail(userData.email);
              }
            } catch (err) {
              console.error('Erro ao buscar email do usuário:', err);
            }
          }
        } else {
          setMessage(errorMessage || 'Erro ao confirmar e-mail.');
        }
        
        toast({
          title: "Erro na confirmação",
          description: errorMessage || "Não foi possível confirmar o e-mail.",
          variant: "destructive",
        });
      }
    };

    confirmEmail();
  }, [searchParams, toast]);

  const handleResendEmail = async () => {
    if (!userEmail) return;

    try {
      // Buscar dados completos do usuário
      const userId = searchParams.get('userId');
      const { data: userData, error: userError } = await supabase
        .from('usuario')
        .select('nome, email')
        .eq('id', parseInt(userId || '0'))
        .single();

      if (userError || !userData) {
        console.error("Erro ao buscar dados do usuário:", userError);
        throw new Error("Não foi possível encontrar os dados do usuário");
      }

      // Enviar email de confirmação usando EmailJS (igual ao cadastro)
      const confirmationToken = crypto.randomUUID();
      const expirationTime = Date.now() + (5 * 60 * 1000); // 5 minutos
      const confirmationUrl = `${window.location.origin}/confirm-email?token=${confirmationToken}&userId=${userId}&expires=${expirationTime}`;

      const emailParams = {
        to_email: userData.email,
        to_name: userData.nome,
        user_name: userData.nome,
        confirmation_url: confirmationUrl,
        confirmation_link: confirmationUrl,
        reply_to: 'noreply@salve.com',
      };

      console.log('Reenviando email com parâmetros:', emailParams);

      await emailjs.send(
        'service_salve', // Service ID do EmailJS
        'template_salve', // Template ID do EmailJS
        emailParams,
        'Pcq-7YzuNvqGoCb-7' // Public Key do EmailJS
      );

      toast({
        title: "E-mail reenviado!",
        description: "Verifique sua caixa de entrada.",
      });
    } catch (error: any) {
      console.error('Erro ao reenviar email:', error);
      toast({
        title: "Erro ao reenviar",
        description: "Não foi possível reenviar o e-mail.",
        variant: "destructive",
      });
    }
  };

  const handleBackToLogin = () => {
    navigate('/');
  };

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
              Confirmação de E-mail
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {status === 'loading' && 'Confirmando seu e-mail...'}
              {status === 'success' && 'E-mail confirmado com sucesso!'}
              {status === 'error' && 'Erro na confirmação'}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="flex justify-center">
            {status === 'loading' && (
              <Loader className="h-16 w-16 text-primary animate-spin" />
            )}
            {status === 'success' && (
              <CheckCircle className="h-16 w-16 text-green-500" />
            )}
            {status === 'error' && (
              <XCircle className="h-16 w-16 text-destructive" />
            )}
          </div>
          
          <p className="text-muted-foreground">
            {message}
          </p>

          {(status === 'success' || (status === 'error' && !isExpired)) && (
            <Button
              onClick={handleBackToLogin}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Voltar ao Login
            </Button>
          )}

          {status === 'error' && isExpired && userEmail && (
            <div className="space-y-2">
              <Button
                onClick={handleResendEmail}
                className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Reenviar E-mail de Ativação
              </Button>
              <Button
                onClick={handleBackToLogin}
                variant="outline"
                className="w-full h-12"
              >
                Voltar ao Login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ConfirmEmail;