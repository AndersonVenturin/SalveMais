import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, MessageSquare, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { ptBR } from "date-fns/locale";

interface Solicitacao {
  id: number;
  produto_id: number;
  tipo_transacao_id: number;
  observacao: string;
  produto_troca_id?: number;
  usuario_origem_id: number;
  usuario_destino_id: number;
  data_cadastro: string;
  observacao_resposta?: string;
  situacao_id: number;
  data_transacao?: string;
  tipo: 'received' | 'sent'; // received = user owns product, sent = user made request
  produto: {
    nome: string;
    quantidade: number;
  };
  usuario_origem: {
    nome: string;
  };
  usuario_destino?: {
    nome: string;
  };
  tipo_transacao: {
    nome: string;
  };
  situacao: {
    nome: string;
  };
  produto_troca?: {
    nome: string;
  };
}

const Solicitacoes = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [solicitacoesEnviadas, setSolicitacoesEnviadas] = useState<Solicitacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSolicitacao, setSelectedSolicitacao] = useState<Solicitacao | null>(null);
  const [observacaoResposta, setObservacaoResposta] = useState("");
  const [processando, setProcessando] = useState(false);
  const [produtoTrocaModal, setProdutoTrocaModal] = useState(false);
  const [produtoTrocaDetalhes, setProdutoTrocaDetalhes] = useState<any>(null);

  useEffect(() => {
    document.title = "Salve+ - Solicitações";
  }, []);

  useEffect(() => {
    const checkUser = async () => {
      const localUser = localStorage.getItem('user');
      if (localUser) {
        const userData = JSON.parse(localUser);
        setCurrentUser(userData);
        return;
      }

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
      
      setCurrentUser(userData);
    };

    checkUser();
  }, [navigate]);

  useEffect(() => {
    if (!currentUser?.id) return;
    
    console.log('Solicitacoes - currentUser:', currentUser);

    const fetchSolicitacoes = async () => {
      try {
        setLoading(true);

        // Get all situation IDs
        const { data: situacoes, error: situacaoError } = await supabase
          .from('situacao')
          .select('id, nome');

        if (situacaoError) throw situacaoError;

        const situacaoPendente = situacoes?.find(s => s.nome.toLowerCase().includes('pendente'));
        if (!situacaoPendente) return;

        // 1. Fetch RECEIVED requests (for current user's products) - only pending
        const { data: receivedRequests, error: receivedError } = await (supabase as any)
          .from('historico_transacao')
          .select('*')
          .eq('situacao_id', situacaoPendente.id);

        if (receivedError) throw receivedError;

        // Filter and enrich received requests
        const enrichedReceivedRequests: any[] = [];
        
        for (const request of receivedRequests || []) {
          // Get product info
          const { data: produto } = await supabase
            .from('produto')
            .select('nome, quantidade, usuario_id')
            .eq('id', request.produto_id)
            .single();

          // Skip if product doesn't belong to current user
          if (!produto || produto.usuario_id !== currentUser.id) continue;

          // Get origin user info
          const { data: usuarioOrigem } = await supabase
            .from('usuario')
            .select('nome')
            .eq('id', request.usuario_origem_id)
            .single();

          // Get transaction type
          const { data: tipoTransacao } = await supabase
            .from('tipo_transacao')
            .select('nome')
            .eq('id', request.tipo_transacao_id)
            .single();

          // Get situacao
          const situacao = situacoes?.find(s => s.id === request.situacao_id);

          // Get exchange product if exists
          let produtoTroca = null;
          if (request.produto_troca_id) {
            const { data: troca } = await supabase
              .from('produto')
              .select('nome')
              .eq('id', request.produto_troca_id)
              .single();
            produtoTroca = troca;
          }

          enrichedReceivedRequests.push({
            ...request,
            tipo: 'received',
            produto,
            usuario_origem: usuarioOrigem,
            tipo_transacao: tipoTransacao,
            situacao,
            produto_troca: produtoTroca
          });
        }

        // 2. Fetch SENT requests (where current user is origem) - all statuses
        const { data: sentRequests, error: sentError } = await (supabase as any)
          .from('historico_transacao')
          .select('*')
          .eq('usuario_origem_id', currentUser.id)
          .neq('situacao_id', situacaoPendente.id); // Only non-pending (responded) requests

        if (sentError) throw sentError;

        // Check which sent requests are already read
        let unreadSentRequestIds: number[] = [];
        if (sentRequests && sentRequests.length > 0) {
          // Ensure RLS context for SELECT on notificacao_lida
          await supabase.rpc('set_user_context', { user_email: currentUser.email });

          const { data: readNotifications, error: readError } = await (supabase as any)
            .from('notificacao_lida')
            .select('historico_transacao_id')
            .eq('usuario_id', currentUser.id)
            .in('historico_transacao_id', sentRequests.map((r: any) => r.id));

          if (readError) throw readError;

          const readTransactionIds = new Set(readNotifications?.map((r: any) => r.historico_transacao_id) || []);
          unreadSentRequestIds = sentRequests
            .filter((r: any) => !readTransactionIds.has(r.id))
            .map((r: any) => r.id);
        }

        // Filter to show only unread sent requests
        const unreadSentRequests = sentRequests?.filter((r: any) => unreadSentRequestIds.includes(r.id)) || [];

        // Enrich sent requests
        const enrichedSentRequests: any[] = [];
        
        for (const request of unreadSentRequests) {
          // Get product info
          const { data: produto } = await supabase
            .from('produto')
            .select('nome, quantidade, usuario_id')
            .eq('id', request.produto_id)
            .single();

          // Get destination user info
          const { data: usuarioDestino } = await supabase
            .from('usuario')
            .select('nome')
            .eq('id', request.usuario_destino_id)
            .single();

          // Get transaction type
          const { data: tipoTransacao } = await supabase
            .from('tipo_transacao')
            .select('nome')
            .eq('id', request.tipo_transacao_id)
            .single();

          // Get situacao
          const situacao = situacoes?.find(s => s.id === request.situacao_id);

          // Get exchange product if exists
          let produtoTroca = null;
          if (request.produto_troca_id) {
            const { data: troca } = await supabase
              .from('produto')
              .select('nome')
              .eq('id', request.produto_troca_id)
              .single();
            produtoTroca = troca;
          }

          enrichedSentRequests.push({
            ...request,
            tipo: 'sent',
            produto,
            usuario_destino: usuarioDestino,
            tipo_transacao: tipoTransacao,
            situacao,
            produto_troca: produtoTroca
          });
        }

        setSolicitacoes(enrichedReceivedRequests);
        setSolicitacoesEnviadas(enrichedSentRequests);

        // Mark notifications as read (only for unread sent requests)
        const unreadSentTransactionIds = enrichedSentRequests.map(req => req.id);
        
        if (unreadSentTransactionIds.length > 0) {
          await markNotificationsAsRead(unreadSentTransactionIds);
          
          // Wait a bit for the database to process the inserts, then remove from list
          setTimeout(() => {
            setSolicitacoesEnviadas([]);
          }, 500);
        }
      } catch (error) {
        console.error('Error fetching requests:', error);
        toast({
          title: "Erro",
          description: "Erro ao carregar solicitações.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSolicitacoes();
  }, [currentUser?.id, toast]);

  const markNotificationsAsRead = async (transactionIds: number[]) => {
    try {
      // Set user context for RLS
      await supabase.rpc('set_user_context', { user_email: currentUser.email });

      // Insert read notifications for each transaction
      const readNotifications = transactionIds.map(transactionId => ({
        usuario_id: currentUser.id,
        historico_transacao_id: transactionId,
        data_leitura: new Date().toISOString()
      }));

      const { error } = await (supabase as any)
        .from('notificacao_lida')
        .upsert(readNotifications, { 
          onConflict: 'usuario_id,historico_transacao_id',
          ignoreDuplicates: true 
        });

      if (error) {
        console.error('Error marking notifications as read:', error);
      }
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const handleVerDetalhesProdutoTroca = async (produtoTrocaId: number) => {
    try {
      const { data: produto, error } = await supabase
        .from('produto')
        .select(`
          id,
          nome,
          descricao,
          quantidade,
          uf,
          municipio,
          contato,
          data_insercao,
          tipo_produto:tipo_produto_id(nome),
          tipo_transacao:tipo_transacao_id(nome),
          produto_foto(foto)
        `)
        .eq('id', produtoTrocaId)
        .single();

      if (error) throw error;

      setProdutoTrocaDetalhes(produto);
      setProdutoTrocaModal(true);
    } catch (error) {
      console.error('Error fetching product details:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar detalhes do produto.",
        variant: "destructive",
      });
    }
  };

  const handleResponderSolicitacao = async (acao: 'confirmar' | 'recusar') => {
    if (!selectedSolicitacao) return;

    if (observacaoResposta.length > 1000) {
      toast({
        title: "Erro",
        description: "A observação deve ter no máximo 1000 caracteres.",
        variant: "destructive",
      });
      return;
    }

    try {
      setProcessando(true);

      // Check if transaction is still pending
      const { data: currentRequest, error: checkError } = await (supabase as any)
        .from('historico_transacao')
        .select('situacao_id')
        .eq('id', selectedSolicitacao.id)
        .single();

      if (checkError) throw checkError;

      if (currentRequest.situacao_id !== 1) {
        toast({
          title: "Erro",
          description: "Transação já finalizada.",
          variant: "destructive",
        });
        return;
      }

      // If confirming, check product quantity first
      if (acao === 'confirmar') {
        const { data: produtoAtual, error: produtoError } = await supabase
          .from('produto')
          .select('quantidade')
          .eq('id', selectedSolicitacao.produto_id)
          .single();

        if (produtoError) throw produtoError;

        if (produtoAtual.quantidade <= 0) {
          toast({
            title: "Erro",
            description: "Produto indisponível. Verifique a quantidade configurada.",
            variant: "destructive",
          });
          return;
        }

        // Update product quantity
        const { error: updateProdutoError } = await supabase
          .from('produto')
          .update({
            quantidade: produtoAtual.quantidade - 1
          })
          .eq('id', selectedSolicitacao.produto_id);

        if (updateProdutoError) throw updateProdutoError;
      }

      // Get SP timezone current datetime
      const spDateTime = formatInTimeZone(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd HH:mm:ss');

      // Get situation ID (2 for concluída, 3 for recusada)
      const situacaoId = acao === 'confirmar' ? 2 : 3;

      // Update the request
      const { error: updateError } = await (supabase as any)
        .from('historico_transacao')
        .update({
          situacao_id: situacaoId,
          observacao_resposta: observacaoResposta,
          data_transacao: spDateTime
        })
        .eq('id', selectedSolicitacao.id);

      if (updateError) throw updateError;

      toast({
        title: "Sucesso",
        description: `Solicitação ${acao === 'confirmar' ? 'confirmada' : 'recusada'} com sucesso.`,
      });

      // Remove from list
      setSolicitacoes(prev => prev.filter(s => s.id !== selectedSolicitacao.id));
      setSelectedSolicitacao(null);
      setObservacaoResposta("");
    } catch (error) {
      console.error('Error responding to request:', error);
      toast({
        title: "Erro",
        description: "Erro ao processar solicitação.",
        variant: "destructive",
      });
    } finally {
      setProcessando(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Carregando...</p>
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
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">Solicitações</h1>
              <p className="text-sm text-muted-foreground">Gerencie as solicitações dos seus produtos</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center">
            <p className="text-muted-foreground">Carregando solicitações...</p>
          </div>
        ) : solicitacoes.length === 0 && solicitacoesEnviadas.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Nenhuma solicitação
            </h3>
            <p className="text-muted-foreground">
              Você não possui solicitações no momento.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Solicitações Recebidas (Pendentes) */}
            {solicitacoes.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4 text-foreground">Solicitações Recebidas</h2>
                <div className="space-y-4">
                  {solicitacoes.map((solicitacao) => (
                    <Card key={solicitacao.id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">
                              Seu produto "{solicitacao.produto.nome}" recebeu uma solicitação.
                            </CardTitle>
                            <CardDescription className="mt-2">
                              <div className="space-y-1">
                                <p>
                                  <strong>Solicitante:</strong>{' '}
                                  <button
                                    onClick={() => navigate(`/perfil-usuario/${solicitacao.usuario_origem_id}`)}
                                    className="text-primary hover:underline font-medium"
                                  >
                                    {solicitacao.usuario_origem.nome}
                                  </button>
                                </p>
                                <p><strong>Tipo:</strong> {solicitacao.tipo_transacao.nome}</p>
                                <p><strong>Data:</strong> {format(new Date(solicitacao.data_cadastro), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}</p>
                              </div>
                            </CardDescription>
                          </div>
                          <Badge variant="secondary">
                            {solicitacao.tipo_transacao.nome}
                          </Badge>
                        </div>
                      </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {solicitacao.observacao && (
                      <div>
                        <p className="text-sm font-medium mb-1">Observação:</p>
                        <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                          {solicitacao.observacao}
                        </p>
                      </div>
                    )}
                    
                    {solicitacao.produto_troca && (
                      <div>
                        <p className="text-sm font-medium mb-1">Produto oferecido em troca:</p>
                        <p className="text-sm">{solicitacao.produto_troca.nome}</p>
                      </div>
                    )}

                    <div className="flex gap-2 justify-start">
                      {solicitacao.produto_troca_id && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleVerDetalhesProdutoTroca(solicitacao.produto_troca_id!)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver detalhes
                        </Button>
                      )}
                      
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={() => setSelectedSolicitacao(solicitacao)}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Confirmar
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Confirmar Solicitação</DialogTitle>
                            <DialogDescription>
                              Confirme a solicitação de {solicitacao.tipo_transacao.nome.toLowerCase()} do produto "{solicitacao.produto.nome}".
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium">Observação (opcional)</label>
                              <Textarea
                                placeholder="Digite uma mensagem para o solicitante..."
                                value={observacaoResposta}
                                onChange={(e) => setObservacaoResposta(e.target.value)}
                                maxLength={1000}
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                {1000 - observacaoResposta.length} caracteres restantes
                              </p>
                            </div>
                          </div>
                          <DialogFooter>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setSelectedSolicitacao(null);
                                  setObservacaoResposta("");
                                }}
                              >
                                Cancelar
                              </Button>
                            </DialogTrigger>
                            <Button
                              className="bg-blue-600 hover:bg-blue-700"
                              onClick={() => handleResponderSolicitacao('confirmar')}
                              disabled={processando}
                            >
                              {processando ? "Processando..." : "Confirmar"}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="destructive"
                            onClick={() => setSelectedSolicitacao(solicitacao)}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Recusar
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Recusar Solicitação</DialogTitle>
                            <DialogDescription>
                              Recuse a solicitação de {solicitacao.tipo_transacao.nome.toLowerCase()} do produto "{solicitacao.produto.nome}".
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium">Observação (opcional)</label>
                              <Textarea
                                placeholder="Digite o motivo da recusa..."
                                value={observacaoResposta}
                                onChange={(e) => setObservacaoResposta(e.target.value)}
                                maxLength={1000}
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                {1000 - observacaoResposta.length} caracteres restantes
                              </p>
                            </div>
                          </div>
                          <DialogFooter>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setSelectedSolicitacao(null);
                                  setObservacaoResposta("");
                                }}
                              >
                                Cancelar
                              </Button>
                            </DialogTrigger>
                            <Button
                              variant="destructive"
                              onClick={() => handleResponderSolicitacao('recusar')}
                              disabled={processando}
                            >
                              {processando ? "Processando..." : "Recusar"}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
                </div>
              </div>
            )}

            {/* Solicitações Enviadas (com resposta) */}
            {solicitacoesEnviadas.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4 text-foreground">Suas Solicitações</h2>
                <div className="space-y-4">
                  {solicitacoesEnviadas.map((solicitacao) => (
                    <Card key={`sent-${solicitacao.id}`} className="hover:shadow-md transition-shadow border-l-4 border-l-blue-500">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">
                              Sua solicitação para o produto "{solicitacao.produto.nome}" recebeu uma atualização
                            </CardTitle>
                            <CardDescription className="mt-2">
                              <div className="space-y-1">
                                <p>
                                  <strong>Proprietário:</strong>{' '}
                                  <button
                                    onClick={() => navigate(`/perfil-usuario/${solicitacao.usuario_destino_id}`)}
                                    className="text-primary hover:underline font-medium"
                                  >
                                    {solicitacao.usuario_destino?.nome}
                                  </button>
                                </p>
                                <p><strong>Tipo:</strong> {solicitacao.tipo_transacao.nome}</p>
                                <p><strong>Status:</strong> {solicitacao.situacao.nome}</p>
                                <p><strong>Data da solicitação:</strong> {format(new Date(solicitacao.data_cadastro), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}</p>
                                {solicitacao.data_transacao && (
                                  <p><strong>Data da resposta:</strong> {format(new Date(solicitacao.data_transacao), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}</p>
                                )}
                              </div>
                            </CardDescription>
                          </div>
                          <Badge variant={solicitacao.situacao.nome.toLowerCase().includes('concluída') ? "default" : "destructive"}>
                            {solicitacao.situacao.nome}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {solicitacao.observacao && (
                            <div>
                              <p className="text-sm font-medium mb-1">Sua observação:</p>
                              <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                                {solicitacao.observacao}
                              </p>
                            </div>
                          )}
                          
                          {solicitacao.produto_troca && (
                            <div>
                              <p className="text-sm font-medium mb-1">Produto que você ofereceu em troca:</p>
                              <p className="text-sm">{solicitacao.produto_troca.nome}</p>
                            </div>
                          )}

                          {solicitacao.observacao_resposta && (
                            <div>
                              <p className="text-sm font-medium mb-1">Resposta do proprietário:</p>
                              <p className="text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950/20 p-3 rounded-md border-l-4 border-l-blue-500">
                                {solicitacao.observacao_resposta}
                              </p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Modal de Detalhes do Produto de Troca */}
        <Dialog open={produtoTrocaModal} onOpenChange={setProdutoTrocaModal}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Detalhes do Produto Oferecido</DialogTitle>
              <DialogDescription>
                Informações completas sobre o produto oferecido em troca
              </DialogDescription>
            </DialogHeader>
            {produtoTrocaDetalhes && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Informações do produto */}
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Nome do produto</p>
                      <p className="text-lg font-semibold">{produtoTrocaDetalhes.nome}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Descrição</p>
                      <p className="text-sm bg-muted/50 p-3 rounded-md">{produtoTrocaDetalhes.descricao}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Quantidade</p>
                        <p className="text-base">{produtoTrocaDetalhes.quantidade}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Tipo</p>
                        <p className="text-base">{produtoTrocaDetalhes.tipo_produto?.nome}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Estado</p>
                        <p className="text-base">{produtoTrocaDetalhes.uf}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Município</p>
                        <p className="text-base">{produtoTrocaDetalhes.municipio}</p>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Contato</p>
                      <p className="text-base">{produtoTrocaDetalhes.contato}</p>
                    </div>
                  </div>
                  
                  {/* Fotos do produto */}
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-3">Fotos</p>
                    {produtoTrocaDetalhes.produto_foto && produtoTrocaDetalhes.produto_foto.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2">
                        {produtoTrocaDetalhes.produto_foto.slice(0, 4).map((foto: any, index: number) => (
                          <div key={index} className="aspect-square rounded-lg overflow-hidden bg-muted/50">
                            <img
                              src={foto.foto}
                              alt={`Foto ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="aspect-square rounded-lg bg-muted/50 flex items-center justify-center">
                        <p className="text-sm text-muted-foreground">Nenhuma foto disponível</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setProdutoTrocaModal(false)}
              >
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default Solicitacoes;