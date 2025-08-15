import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import salveLogo from "@/assets/salve-logo.png";

const ConfirmEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    const confirmEmail = async () => {
      const token = searchParams.get('token');
      const userId = searchParams.get('userId');

      if (!token || !userId) {
        setStatus('error');
        setMessage('Link inválido ou expirado.');
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('confirm-email', {
          body: { userId: parseInt(userId) }
        });

        if (error) {
          throw error;
        }

        if (data.success) {
          setStatus('success');
          setMessage('E-mail confirmado com sucesso!');
          toast({
            title: "E-mail confirmado!",
            description: "Sua conta foi ativada com sucesso.",
          });
        } else {
          throw new Error(data.error || 'Erro desconhecido');
        }
      } catch (error: any) {
        console.error('Erro ao confirmar email:', error);
        setStatus('error');
        setMessage(error.message || 'Erro ao confirmar e-mail.');
        toast({
          title: "Erro na confirmação",
          description: error.message || "Não foi possível confirmar o e-mail.",
          variant: "destructive",
        });
      }
    };

    confirmEmail();
  }, [searchParams, toast]);

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

          {(status === 'success' || status === 'error') && (
            <Button
              onClick={handleBackToLogin}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Voltar ao Login
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ConfirmEmail;