import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, User, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import salveLogo from "@/assets/salve-logo.png";
import { formatInTimeZone } from "date-fns-tz";
import { StarRating } from "@/components/StarRating";

interface Usuario {
  id: number;
  nome: string;
  email: string;
}

interface AvaliacaoUsuario {
  id: number;
  avaliacao: number;
  observacao: string | null;
  data_cadastro: string;
  usuario_origem_id: number;
  usuario_origem_nome?: string;
}

const PerfilUsuario = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoUsuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [mediaAvaliacoes, setMediaAvaliacoes] = useState<number>(0);

  useEffect(() => {
    document.title = "Salve+ - Perfil do Usuário";
    if (id) {
      carregarDados();
    }
  }, [id]);

  const carregarDados = async () => {
    try {
      // Carregar dados do usuário
      const { data: usuarioData, error: usuarioError } = await supabase
        .from('usuario')
        .select('id, nome, email')
        .eq('id', parseInt(id!))
        .single();

      if (usuarioError) throw usuarioError;
      setUsuario(usuarioData);

      // Carregar avaliações do usuário (onde ele foi avaliado)
      const { data: avaliacoesData, error: avaliacoesError } = await supabase
        .from('avaliacao_usuario')
        .select('*')
        .eq('usuario_avaliado_id', parseInt(id!))
        .order('data_cadastro', { ascending: false });

      if (avaliacoesError) throw avaliacoesError;

      // Enriquecer com nome dos usuários que avaliaram
      const avaliacoesEnriquecidas = await Promise.all(
        (avaliacoesData || []).map(async (avaliacao: any) => {
          const { data: usuario } = await supabase
            .from('usuario')
            .select('nome')
            .eq('id', avaliacao.usuario_origem_id)
            .maybeSingle();

          return {
            ...avaliacao,
            usuario_origem_nome: usuario?.nome || 'Anônimo'
          };
        })
      );

      setAvaliacoes(avaliacoesEnriquecidas);

      // Calcular média das avaliações
      if (avaliacoesEnriquecidas.length > 0) {
        const soma = avaliacoesEnriquecidas.reduce((acc, av) => acc + av.avaliacao, 0);
        setMediaAvaliacoes(soma / avaliacoesEnriquecidas.length);
      }

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar perfil do usuário",
        variant: "destructive",
      });
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <User className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Carregando perfil...</p>
        </div>
      </div>
    );
  }

  if (!usuario) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p>Usuário não encontrado</p>
          <Button onClick={() => navigate(-1)} className="mt-4">
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <img 
              src={salveLogo} 
              alt="Salve+" 
              className="h-8 w-auto"
            />
            <div className="flex-1">
              <h1 className="text-lg font-bold text-foreground">Perfil do Usuário</h1>
              <p className="text-sm text-muted-foreground">
                Informações e avaliações
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Informações do Usuário */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-8 w-8 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-2xl">{usuario.nome}</CardTitle>
                  {avaliacoes.length > 0 && (
                    <div className="flex items-center gap-2 mt-2">
                      <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                      <span className="text-lg font-semibold">
                        {mediaAvaliacoes.toFixed(1)}/5
                      </span>
                      <span className="text-sm text-muted-foreground">
                        ({avaliacoes.length} {avaliacoes.length === 1 ? 'avaliação' : 'avaliações'})
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Avaliações */}
          <Card>
            <CardHeader>
              <CardTitle>Avaliações Recebidas</CardTitle>
            </CardHeader>
            <CardContent>
              {avaliacoes.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Este usuário ainda não possui avaliações.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {avaliacoes.map((avaliacao) => (
                    <Card key={avaliacao.id} className="border bg-muted/30">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium text-sm">{avaliacao.usuario_origem_nome}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatInTimeZone(new Date(avaliacao.data_cadastro), 'America/Sao_Paulo', 'dd/MM/yyyy')}
                            </p>
                          </div>
                          <StarRating rating={avaliacao.avaliacao} onRatingChange={() => {}} readonly={true} />
                        </div>
                        {avaliacao.observacao && (
                          <p className="text-sm text-muted-foreground mt-2">{avaliacao.observacao}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default PerfilUsuario;
