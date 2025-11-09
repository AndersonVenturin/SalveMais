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
import { AvaliacaoModal } from "@/components/AvaliacaoModal";
import { StarRating } from "@/components/StarRating";

interface HistoricoItem {
  id: number;
  tipo_transacao: string;
  usuario_origem_nome: string;
  usuario_destino_nome: string;
  usuario_origem_id: number;
  usuario_destino_id: number;
  situacao: string;
  data_cadastro: string;
  data_transacao: string | null;
  observacao: string | null;
  observacao_resposta: string | null;
  produto_id: number;
  tem_avaliacao: boolean;
  usuario_atual_ja_avaliou: boolean;
  avaliacao_produto?: {
    avaliacao: number;
    observacao: string | null;
    data_transacao: string;
    usuario_avaliador_nome: string;
  };
  avaliacoes_usuario: Array<{
    avaliacao: number;
    observacao: string | null;
    usuario_avaliador_nome: string;
    usuario_avaliado_nome: string;
  }>;
}

const HistoricoDetalhado = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [produto, setProduto] = useState<any>(null);
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [avaliacaoModalOpen, setAvaliacaoModalOpen] = useState(false);
  const [selectedHistoricoId, setSelectedHistoricoId] = useState<number | null>(null);

  useEffect(() => {
    document.title = "Salve+ - Histórico Detalhado do Produto";
    checkUser();
  }, []);

  const checkUser = async () => {
    const localUser = localStorage.getItem('user');
    if (localUser) {
      const userData = JSON.parse(localUser);
      setCurrentUser(userData);
      loadHistorico(userData.id, userData.email);
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
        loadHistorico(userData.id, userData.email);
      }
    }
  };

  const loadHistorico = async (userId: number, userEmail: string) => {
    try {
      setLoading(true);

      // Configurar o contexto do usuário para RLS
      await supabase.rpc('set_user_context', { 
        user_email: userEmail
      });

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

      // Buscar avaliações existentes
      const historicoIds = historicoData.map((h: any) => h.id);
      
      console.log('📋 IDs do histórico para buscar avaliações:', historicoIds);
      
      const [
        { data: tiposTransacao },
        { data: situacoes },
        { data: usuarios },
        { data: avaliacoesProduto, error: errorAvalProduto },
        { data: avaliacoesUsuario, error: errorAvalUsuario }
      ] = await Promise.all([
        supabase.from('tipo_transacao').select('id, nome').in('id', tipoTransacaoIds),
        supabase.from('situacao').select('id, nome').in('id', situacaoIds),
        supabase.from('usuario').select('id, nome').in('id', usuarioIds),
        supabase.from('avaliacao_produto').select('*').in('historico_transacao_id', historicoIds),
        supabase.rpc('get_avaliacoes_usuario', {
          p_user_email: userEmail,
          p_historico_ids: historicoIds
        })
      ]);

      console.log('⭐ Avaliações de produto encontradas:', avaliacoesProduto);
      console.log('👤 Avaliações de usuário encontradas:', avaliacoesUsuario);
      
      if (errorAvalProduto) {
        console.error('❌ Erro ao buscar avaliações de produto:', errorAvalProduto);
      }
      
      if (errorAvalUsuario) {
        console.error('❌ Erro ao buscar avaliações de usuário:', errorAvalUsuario);
      }

      // Mapear dados
      const historicoEnriquecido: HistoricoItem[] = historicoData.map((h: any) => {
        const tipoTrans = tiposTransacao?.find((t: any) => t.id === h.tipo_transacao_id);
        const situacao = situacoes?.find((s: any) => s.id === h.situacao_id);
        const usuarioOrigem = usuarios?.find((u: any) => u.id === h.usuario_origem_id);
        const usuarioDestino = usuarios?.find((u: any) => u.id === h.usuario_destino_id);
        const avaliacaoProd = avaliacoesProduto?.find((a: any) => a.historico_transacao_id === h.id);
        
        // Buscar TODAS as avaliações de usuário para esta transação
        const avaliacoesUsu = avaliacoesUsuario?.filter((a: any) => a.historico_transacao_id === h.id) || [];

        // Verificar se o usuário atual já avaliou esta transação
        const usuarioAtualJaAvaliou = (avaliacaoProd && avaliacaoProd.usuario_origem_id === userId) || 
                                       avaliacoesUsu.some((a: any) => a.usuario_origem_id === userId);

        // Buscar nome do avaliador do produto
        const avaliadorProdutoNome = avaliacaoProd 
          ? usuarios?.find((u: any) => u.id === avaliacaoProd.usuario_origem_id)?.nome || 'N/A'
          : '';

        // Mapear todas as avaliações de usuário com os nomes
        const avaliacoesUsuarioMapeadas = avaliacoesUsu.map((avalUsu: any) => {
          const avaliadorNome = usuarios?.find((u: any) => u.id === avalUsu.usuario_origem_id)?.nome || 'N/A';
          const avaliadoNome = usuarios?.find((u: any) => u.id === avalUsu.usuario_avaliado_id)?.nome || 'N/A';
          
          return {
            avaliacao: avalUsu.avaliacao,
            observacao: avalUsu.observacao,
            usuario_avaliador_nome: avaliadorNome,
            usuario_avaliado_nome: avaliadoNome
          };
        });

        // Debug: verificar se as avaliações foram encontradas
        if (avaliacaoProd || avaliacoesUsu.length > 0) {
          console.log(`Histórico ${h.id} - Avaliação Produto:`, avaliacaoProd, 'Avaliações Usuário:', avaliacoesUsu);
          console.log(`Usuário atual (${userId}) já avaliou:`, usuarioAtualJaAvaliou);
        }

        return {
          id: h.id,
          tipo_transacao: tipoTrans?.nome || 'N/A',
          usuario_origem_nome: usuarioOrigem?.nome || 'N/A',
          usuario_destino_nome: usuarioDestino?.nome || 'N/A',
          usuario_origem_id: h.usuario_origem_id,
          usuario_destino_id: h.usuario_destino_id,
          situacao: situacao?.nome || 'N/A',
          data_cadastro: h.data_cadastro,
          data_transacao: h.data_transacao,
          observacao: h.observacao,
          observacao_resposta: h.observacao_resposta,
          produto_id: h.produto_id,
          tem_avaliacao: !!(avaliacaoProd || avaliacoesUsu.length > 0),
          usuario_atual_ja_avaliou: usuarioAtualJaAvaliou,
          avaliacao_produto: avaliacaoProd ? {
            avaliacao: avaliacaoProd.avaliacao,
            observacao: avaliacaoProd.observacao,
            data_transacao: avaliacaoProd.data_transacao,
            usuario_avaliador_nome: avaliadorProdutoNome
          } : undefined,
          avaliacoes_usuario: avaliacoesUsuarioMapeadas
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

  const formatarDataSemHora = (data: string | null) => {
    if (!data) return 'N/A';
    try {
      return format(new Date(data), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return 'N/A';
    }
  };

  const handleAvaliar = (historicoId: number) => {
    setSelectedHistoricoId(historicoId);
    setAvaliacaoModalOpen(true);
  };

  const handleSubmitAvaliacao = async (data: {
    dataTransacao: Date;
    avaliacaoProduto: number;
    observacaoProduto: string;
    avaliacaoUsuario: number;
    observacaoUsuario: string;
  }) => {
    if (!selectedHistoricoId || !currentUser) return;

    try {
      const historicoItem = historico.find(h => h.id === selectedHistoricoId);
      if (!historicoItem) return;

      // Determinar quem é o outro usuário (quem será avaliado)
      const outroUsuarioId = historicoItem.usuario_origem_id === currentUser.id 
        ? historicoItem.usuario_destino_id 
        : historicoItem.usuario_origem_id;

      // Usar função do banco que bypassa RLS com SECURITY DEFINER
      const { error } = await supabase.rpc('create_avaliacao', {
        p_user_email: currentUser.email,
        p_historico_transacao_id: selectedHistoricoId,
        p_produto_id: historicoItem.produto_id,
        p_usuario_origem_id: currentUser.id,
        p_usuario_destino_id: outroUsuarioId,
        p_avaliacao_produto: data.avaliacaoProduto,
        p_observacao_produto: data.observacaoProduto || null,
        p_data_transacao: data.dataTransacao.toISOString(),
        p_avaliacao_usuario: data.avaliacaoUsuario,
        p_observacao_usuario: data.observacaoUsuario || null
      });

      if (error) {
        console.error("Erro ao salvar avaliação:", error);
        toast.error("Erro ao salvar avaliação");
        return;
      }

      toast.success("Avaliação enviada com sucesso!");
      setAvaliacaoModalOpen(false);
      setSelectedHistoricoId(null);
      
      // Aguardar um momento e recarregar histórico
      setTimeout(() => {
        loadHistorico(currentUser.id, currentUser.email);
      }, 500);
    } catch (error) {
      console.error("Erro ao enviar avaliação:", error);
      toast.error("Erro ao enviar avaliação");
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

                        {/* Avaliações existentes */}
                        {item.avaliacao_produto && (
                          <div className="md:col-span-2 border-t pt-4">
                            <p className="text-sm font-semibold mb-2">
                              Avaliação do Produto - por {item.avaliacao_produto.usuario_avaliador_nome}
                            </p>
                            <div className="space-y-2">
                              <StarRating rating={item.avaliacao_produto.avaliacao || 0} onRatingChange={() => {}} readonly />
                              {item.avaliacao_produto.data_transacao && (
                                <p className="text-xs text-muted-foreground">
                                  Data de recebimento: {formatarDataSemHora(item.avaliacao_produto.data_transacao)}
                                </p>
                              )}
                              {item.avaliacao_produto.observacao && (
                                <p className="text-sm text-muted-foreground">{item.avaliacao_produto.observacao}</p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Avaliações de usuários */}
                        {item.avaliacoes_usuario && item.avaliacoes_usuario.length > 0 && (
                          <div className="md:col-span-2 border-t pt-4">
                            <p className="text-sm font-semibold mb-3">Avaliações dos Usuários</p>
                            <div className="space-y-4">
                              {item.avaliacoes_usuario.map((avalUsu, index) => (
                                <div key={index} className="bg-muted/30 rounded-lg p-3 space-y-2">
                                  <p className="text-sm font-medium">
                                    {avalUsu.usuario_avaliador_nome} avaliou {avalUsu.usuario_avaliado_nome}
                                  </p>
                                  <StarRating rating={avalUsu.avaliacao || 0} onRatingChange={() => {}} readonly />
                                  {avalUsu.observacao && (
                                    <p className="text-sm text-muted-foreground">{avalUsu.observacao}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Botão Avaliar - apenas para transações concluídas que o usuário atual ainda não avaliou */}
                        {(item.situacao.toLowerCase() === 'concluída' || item.situacao.toLowerCase() === 'concluida') 
                          && !item.usuario_atual_ja_avaliou && (
                          <div className="md:col-span-2 border-t pt-4">
                            <Button onClick={() => handleAvaliar(item.id)} size="sm" className="w-auto">
                              Avaliar
                            </Button>
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

      {/* Modal de Avaliação */}
      <AvaliacaoModal
        open={avaliacaoModalOpen}
        onClose={() => {
          setAvaliacaoModalOpen(false);
          setSelectedHistoricoId(null);
        }}
        onSubmit={handleSubmitAvaliacao}
        isProductOwner={currentUser?.id === produto?.usuario_id}
        usuarioAvaliadoNome={
          selectedHistoricoId 
            ? historico.find(h => h.id === selectedHistoricoId)?.usuario_origem_id === currentUser?.id
              ? historico.find(h => h.id === selectedHistoricoId)?.usuario_destino_nome
              : historico.find(h => h.id === selectedHistoricoId)?.usuario_origem_nome
            : undefined
        }
      />
    </div>
  );
};

export default HistoricoDetalhado;
