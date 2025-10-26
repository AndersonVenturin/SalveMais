import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface HistoricoItem {
  id: number;
  tipo_transacao: string;
  usuario_origem_nome: string;
  usuario_destino_nome: string;
  situacao: string;
  data_cadastro: string;
  data_transacao: string | null;
  observacao: string | null;
  observacao_resposta: string | null;
}

const HistoricoDetalhado = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [produto, setProduto] = useState<any>(null);
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Salve+ - Histórico Detalhado do Produto";
    checkUser();
  }, []);

  const checkUser = async () => {
    const localUser = localStorage.getItem('user');
    if (localUser) {
      const userData = JSON.parse(localUser);
      setCurrentUser(userData);
      loadHistorico(userData.id);
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/');
        return;
      }
      
      const { data: userData } = await supabase
        .from('usuario')
        .select('*')
        .eq('email', user.email)
        .single();
      
      if (userData) {
        setCurrentUser(userData);
        loadHistorico(userData.id);
      }
    }
  };

  const loadHistorico = async (userId: number) => {
    try {
      setLoading(true);

      // Buscar informações do produto
      const { data: produtoData, error: produtoError } = await supabase
        .from('produto')
        .select('*')
        .eq('id', Number(id))
        .single();

      if (produtoError) {
        console.error("Erro ao carregar produto:", produtoError);
        toast.error("Erro ao carregar informações do produto");
        return;
      }

      setProduto(produtoData);

      // Buscar histórico completo do produto onde o usuário foi origem ou destino
      const { data: historicoData, error: historicoError } = await (supabase as any)
        .from('historico_transacao')
        .select('*')
        .eq('produto_id', Number(id))
        .or(`usuario_origem_id.eq.${userId},usuario_destino_id.eq.${userId}`)
        .order('id', { ascending: false });

      if (historicoError) {
        console.error("Erro ao carregar histórico:", historicoError);
        toast.error("Erro ao carregar histórico do produto");
        return;
      }

      if (!historicoData || historicoData.length === 0) {
        setHistorico([]);
        return;
      }

      // Buscar dados relacionados
      const tipoTransacaoIds = historicoData.map((h: any) => h.tipo_transacao_id);
      const situacaoIds = historicoData.map((h: any) => h.situacao_id);
      const usuarioIds = [
        ...historicoData.map((h: any) => h.usuario_origem_id),
        ...historicoData.map((h: any) => h.usuario_destino_id)
      ];

      const [
        { data: tiposTransacao },
        { data: situacoes },
        { data: usuarios }
      ] = await Promise.all([
        supabase.from('tipo_transacao').select('id, nome').in('id', tipoTransacaoIds),
        supabase.from('situacao').select('id, nome').in('id', situacaoIds),
        supabase.from('usuario').select('id, nome').in('id', usuarioIds)
      ]);

      // Mapear dados
      const historicoEnriquecido: HistoricoItem[] = historicoData.map((h: any) => {
        const tipoTrans = tiposTransacao?.find((t: any) => t.id === h.tipo_transacao_id);
        const situacao = situacoes?.find((s: any) => s.id === h.situacao_id);
        const usuarioOrigem = usuarios?.find((u: any) => u.id === h.usuario_origem_id);
        const usuarioDestino = usuarios?.find((u: any) => u.id === h.usuario_destino_id);

        return {
          id: h.id,
          tipo_transacao: tipoTrans?.nome || 'N/A',
          usuario_origem_nome: usuarioOrigem?.nome || 'N/A',
          usuario_destino_nome: usuarioDestino?.nome || 'N/A',
          situacao: situacao?.nome || 'N/A',
          data_cadastro: h.data_cadastro,
          data_transacao: h.data_transacao,
          observacao: h.observacao,
          observacao_resposta: h.observacao_resposta
        };
      });

      setHistorico(historicoEnriquecido);
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
      toast.error("Erro ao carregar histórico do produto");
    } finally {
      setLoading(false);
    }
  };

  const formatarData = (data: string | null) => {
    if (!data) return 'N/A';
    try {
      return format(new Date(data), "dd/MM/yyyy HH:mm", { locale: ptBR });
    } catch {
      return 'N/A';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/historico')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-foreground">Histórico Detalhado</h1>
                <p className="text-sm text-muted-foreground">
                  {produto ? produto.nome : 'Carregando...'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Informações do Produto */}
        {produto && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Informações do Produto</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div>
                  <p className="text-sm text-muted-foreground">Nome</p>
                  <p className="font-medium">{produto.nome}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Descrição</p>
                  <p className="font-medium">{produto.descricao}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Quantidade Atual</p>
                  <p className="font-medium">{produto.quantidade}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Localização</p>
                  <p className="font-medium">{produto.municipio} - {produto.uf}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Histórico Completo */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico Completo de Transações</CardTitle>
            <CardDescription>
              Todas as transações relacionadas a este produto onde você participou
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Carregando histórico...</p>
              </div>
            ) : historico.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Nenhuma transação encontrada</p>
              </div>
            ) : (
              <div className="space-y-4">
                {historico.map((item) => (
                  <Card key={item.id}>
                    <CardContent className="pt-6">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <p className="text-sm text-muted-foreground">Tipo de Transação</p>
                          <p className="font-medium">{item.tipo_transacao}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Situação</p>
                          <Badge 
                            className={
                              item.situacao.toLowerCase() === 'concluída' || item.situacao.toLowerCase() === 'concluida'
                                ? 'bg-blue-600 hover:bg-blue-700'
                                : item.situacao.toLowerCase() === 'recusada'
                                ? 'bg-red-600 hover:bg-red-700'
                                : item.situacao.toLowerCase() === 'pendente'
                                ? 'bg-yellow-600 hover:bg-yellow-700'
                                : ''
                            }
                          >
                            {item.situacao}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Usuário Origem</p>
                          <p className="font-medium">{item.usuario_origem_nome}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Usuário Destino</p>
                          <p className="font-medium">{item.usuario_destino_nome}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Data de Cadastro</p>
                          <p className="font-medium">{formatarData(item.data_cadastro)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Data de Transação</p>
                          <p className="font-medium">{formatarData(item.data_transacao)}</p>
                        </div>
                        {item.observacao && (
                          <div className="md:col-span-2">
                            <p className="text-sm text-muted-foreground">Observação</p>
                            <p className="font-medium">{item.observacao}</p>
                          </div>
                        )}
                        {item.observacao_resposta && (
                          <div className="md:col-span-2">
                            <p className="text-sm text-muted-foreground">Resposta</p>
                            <p className="font-medium">{item.observacao_resposta}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default HistoricoDetalhado;
