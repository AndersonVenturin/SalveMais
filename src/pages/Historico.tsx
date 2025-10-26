import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, FileText, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface HistoricoTransacao {
  id: number;
  produto_id: number;
  produto_nome: string;
  tipo_transacao: string;
  usuario_origem_nome: string;
  usuario_destino_nome: string;
  situacao: string;
  data_cadastro: string;
  data_transacao: string | null;
}

const Historico = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [historico, setHistorico] = useState<HistoricoTransacao[]>([]);
  const [historicoExibido, setHistoricoExibido] = useState<HistoricoTransacao[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [nomeProdutoFiltro, setNomeProdutoFiltro] = useState("");
  const [tipoTransacaoFiltro, setTipoTransacaoFiltro] = useState("todos");
  const [dataInicioFiltro, setDataInicioFiltro] = useState("");
  const [dataFimFiltro, setDataFimFiltro] = useState("");
  
  // Tipos de transação
  const [tiposTransacao, setTiposTransacao] = useState<{id: number, nome: string}[]>([]);

  useEffect(() => {
    document.title = "Salve+ - Histórico de Transações";
    checkUser();
    loadTiposTransacao();
  }, []);

  // Aplicar filtros sempre que os dados ou filtros mudarem
  useEffect(() => {
    if (historico.length > 0) {
      aplicarFiltros();
    }
  }, [historico]);

  const checkUser = async () => {
    const localUser = localStorage.getItem('user');
    if (localUser) {
      const userData = JSON.parse(localUser);
      setCurrentUser(userData);
      setLoading(false);
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
        setLoading(false);
      }
    }
  };

  const loadTiposTransacao = async () => {
    const { data, error } = await supabase
      .from('tipo_transacao')
      .select('*')
      .order('nome');

    if (error) {
      console.error("Erro ao carregar tipos de transação:", error);
      return;
    }

    setTiposTransacao(data || []);
  };

  const loadHistorico = async (userId: number) => {
    try {
      setLoading(true);

      // Buscar histórico onde o usuário foi origem ou destino
      const { data: historicoData, error: historicoError } = await (supabase as any)
        .from('historico_transacao')
        .select('*')
        .or(`usuario_origem_id.eq.${userId},usuario_destino_id.eq.${userId}`)
        .order('id', { ascending: false });

      if (historicoError) {
        console.error("Erro ao carregar histórico:", historicoError);
        toast.error("Erro ao carregar histórico de transações");
        return;
      }

      if (!historicoData || historicoData.length === 0) {
        setHistorico([]);
        return;
      }

      // Buscar dados relacionados
      const produtoIds = historicoData.map((h: any) => h.produto_id);
      const tipoTransacaoIds = historicoData.map((h: any) => h.tipo_transacao_id);
      const situacaoIds = historicoData.map((h: any) => h.situacao_id);
      const usuarioIds = [
        ...historicoData.map((h: any) => h.usuario_origem_id),
        ...historicoData.map((h: any) => h.usuario_destino_id)
      ];

      const [
        { data: produtos },
        { data: tiposTransacao },
        { data: situacoes },
        { data: usuarios }
      ] = await Promise.all([
        supabase.from('produto').select('id, nome').in('id', produtoIds),
        supabase.from('tipo_transacao').select('id, nome').in('id', tipoTransacaoIds),
        supabase.from('situacao').select('id, nome').in('id', situacaoIds),
        supabase.from('usuario').select('id, nome').in('id', usuarioIds)
      ]);

      // Mapear dados
      const historicoEnriquecido: HistoricoTransacao[] = historicoData.map((h: any) => {
        const produto = produtos?.find((p: any) => p.id === h.produto_id);
        const tipoTrans = tiposTransacao?.find((t: any) => t.id === h.tipo_transacao_id);
        const situacao = situacoes?.find((s: any) => s.id === h.situacao_id);
        const usuarioOrigem = usuarios?.find((u: any) => u.id === h.usuario_origem_id);
        const usuarioDestino = usuarios?.find((u: any) => u.id === h.usuario_destino_id);

        return {
          id: h.id,
          produto_id: h.produto_id,
          produto_nome: produto?.nome || 'N/A',
          tipo_transacao: tipoTrans?.nome || 'N/A',
          usuario_origem_nome: usuarioOrigem?.nome || 'N/A',
          usuario_destino_nome: usuarioDestino?.nome || 'N/A',
          situacao: situacao?.nome || 'N/A',
          data_cadastro: h.data_cadastro,
          data_transacao: h.data_transacao
        };
      });

      setHistorico(historicoEnriquecido);
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
      toast.error("Erro ao carregar histórico de transações", {
        style: {
          background: '#ef4444',
          color: '#fff',
          border: '1px solid #dc2626'
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const validarDatas = (): boolean => {
    // Se uma data foi informada, a outra também deve ser
    if ((dataInicioFiltro && !dataFimFiltro) || (!dataInicioFiltro && dataFimFiltro)) {
      toast.error("Por favor, informe tanto a data de início quanto a data de fim", {
        style: {
          background: '#ef4444',
          color: '#fff',
          border: '1px solid #dc2626'
        }
      });
      return false;
    }

    // Se ambas foram informadas, validar se início não é maior que fim
    if (dataInicioFiltro && dataFimFiltro) {
      const dataInicio = new Date(dataInicioFiltro);
      const dataFim = new Date(dataFimFiltro);
      
      if (dataInicio > dataFim) {
        toast.error("A data de início não pode ser maior que a data de fim", {
          style: {
            background: '#ef4444',
            color: '#fff',
            border: '1px solid #dc2626'
          }
        });
        return false;
      }
    }

    return true;
  };

  const aplicarFiltros = () => {
    let historicoFiltrado = [...historico];

    // Filtro por nome do produto
    if (nomeProdutoFiltro) {
      historicoFiltrado = historicoFiltrado.filter(h =>
        h.produto_nome.toLowerCase().includes(nomeProdutoFiltro.toLowerCase())
      );
    }

    // Filtro por tipo de transação
    if (tipoTransacaoFiltro && tipoTransacaoFiltro !== "todos") {
      historicoFiltrado = historicoFiltrado.filter(h =>
        h.tipo_transacao === tipoTransacaoFiltro
      );
    }

    // Filtro por período
    if (dataInicioFiltro) {
      historicoFiltrado = historicoFiltrado.filter(h =>
        new Date(h.data_cadastro) >= new Date(dataInicioFiltro)
      );
    }

    if (dataFimFiltro) {
      historicoFiltrado = historicoFiltrado.filter(h =>
        new Date(h.data_cadastro) <= new Date(dataFimFiltro + 'T23:59:59')
      );
    }

    setHistoricoExibido(historicoFiltrado);
  };

  const handleBuscar = async () => {
    if (!currentUser) return;

    // Validar datas antes de buscar
    if (!validarDatas()) {
      return;
    }

    // Se já temos dados carregados, apenas aplicar filtros
    if (historico.length > 0) {
      aplicarFiltros();
      return;
    }

    // Caso contrário, carregar dados do banco
    await loadHistorico(currentUser.id);
  };

  const limparFiltros = () => {
    setNomeProdutoFiltro("");
    setTipoTransacaoFiltro("todos");
    setDataInicioFiltro("");
    setDataFimFiltro("");
    setHistoricoExibido([]);
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
              <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-foreground">Histórico de Transações</h1>
                <p className="text-sm text-muted-foreground">Visualize suas doações e trocas</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Filtros */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filtros de Busca</CardTitle>
            <CardDescription>Filtre o histórico por produto, tipo ou período</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="nomeProduto">Nome do Produto</Label>
                <Input
                  id="nomeProduto"
                  placeholder="Digite o nome..."
                  value={nomeProdutoFiltro}
                  onChange={(e) => setNomeProdutoFiltro(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipoTransacao">Tipo de Transação</Label>
                <Select value={tipoTransacaoFiltro} onValueChange={setTipoTransacaoFiltro}>
                  <SelectTrigger id="tipoTransacao">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {tiposTransacao.map(tipo => (
                      <SelectItem key={tipo.id} value={tipo.nome}>{tipo.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dataInicio">Data Início</Label>
                <Input
                  id="dataInicio"
                  type="date"
                  value={dataInicioFiltro}
                  onChange={(e) => setDataInicioFiltro(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dataFim">Data Fim</Label>
                <Input
                  id="dataFim"
                  type="date"
                  value={dataFimFiltro}
                  onChange={(e) => setDataFimFiltro(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button onClick={handleBuscar}>
                <Search className="h-4 w-4 mr-2" />
                Buscar
              </Button>
              <Button variant="outline" onClick={limparFiltros}>
                Limpar Filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Resultados do Histórico */}
        <div>
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-foreground">
              Transações ({historicoExibido.length})
            </h2>
          </div>
          
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Carregando histórico...</p>
            </div>
          ) : historicoExibido.length === 0 ? (
            <Card>
              <CardContent className="py-8">
                <div className="text-center">
                  <p className="text-muted-foreground">
                    Nenhum histórico encontrado. Use os filtros acima para buscar os históricos.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {historicoExibido.map((item) => (
                <Card key={item.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">{item.produto_nome}</CardTitle>
                    <CardDescription>{item.tipo_transacao}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Origem</p>
                      <p className="font-medium">{item.usuario_origem_nome}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Destino</p>
                      <p className="font-medium">{item.usuario_destino_nome}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Situação</p>
                      <p className="font-medium">{item.situacao}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Data de Cadastro</p>
                      <p className="font-medium">{formatarData(item.data_cadastro)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Data de Transação</p>
                      <p className="font-medium">{formatarData(item.data_transacao)}</p>
                    </div>
                    <Button
                      className="w-full mt-4"
                      onClick={() => navigate(`/historico-detalhado/${item.produto_id}`)}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Ver Detalhes
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Historico;
