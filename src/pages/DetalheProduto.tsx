import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Package, MapPin, User, Clock, Edit, Save, X, Upload, Trash2, History, Star } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import salveLogo from "@/assets/salve-logo.png";
import { ufs, fetchMunicipios } from "@/lib/location-data";
import imageCompression from 'browser-image-compression';
import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import { StarRating } from "@/components/StarRating";

interface AvaliacaoProduto {
  id: number;
  avaliacao: number;
  observacao: string | null;
  data_cadastro: string;
  usuario_origem_id: number;
  usuario_origem_nome?: string;
}

interface TipoProduto {
  id: number;
  nome: string;
}

interface TipoTransacao {
  id: number;
  nome: string;
}

interface ProdutoDetalhes {
  id: number;
  nome: string;
  descricao: string;
  quantidade: number;
  uf: string;
  municipio: string;
  contato: string;
  data_insercao: string;
  usuario_id: number;
  tipo_produto_id: number;
  tipo_transacao_id: number;
  tipo_produto: { nome: string };
  tipo_transacao: { nome: string };
  usuario: { nome: string };
  produto_foto: { foto: string }[];
}

interface HistoricoTransacao {
  id: number;
  tipo_transacao_id: number;
  situacao_id: number;
  usuario_origem_id: number;
  usuario_destino_id: number;
  data_cadastro: string;
  data_transacao: string | null;
  observacao: string | null;
  observacao_resposta: string | null;
  tipo_transacao_nome: string;
  situacao_nome: string;
  usuario_origem_nome: string;
  usuario_destino_nome: string;
}

const DetalheProduto = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromPage = searchParams.get('from');
  const [produto, setProduto] = useState<ProdutoDetalhes | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [newImage, setNewImage] = useState<string>('');
  
  // Form states for editing
  const [editData, setEditData] = useState({
    nome: '',
    descricao: '',
    quantidade: 0,
    uf: '',
    municipio: '',
    contato: '',
    tipo_produto_id: 0,
    tipo_transacao_id: 0
  });
  
  const [tiposProduto, setTiposProduto] = useState<TipoProduto[]>([]);
  const [tiposTransacao, setTiposTransacao] = useState<TipoTransacao[]>([]);
  const [municipiosDisponiveis, setMunicipiosDisponiveis] = useState<string[]>([]);
  const [showSolicitacaoModal, setShowSolicitacaoModal] = useState(false);
  const [showDoacaoModal, setShowDoacaoModal] = useState(false);
  const [observacao, setObservacao] = useState('');
  const [showTrocaModal, setShowTrocaModal] = useState(false);
  const [observacaoTroca, setObservacaoTroca] = useState('');
  const [produtoSelecionadoTroca, setProdutoSelecionadoTroca] = useState<number | null>(null);
  const [meusProdutos, setMeusProdutos] = useState<ProdutoDetalhes[]>([]);
  const [historicoTransacoes, setHistoricoTransacoes] = useState<HistoricoTransacao[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [avaliacoesProduto, setAvaliacoesProduto] = useState<AvaliacaoProduto[]>([]);
  const [loadingAvaliacoes, setLoadingAvaliacoes] = useState(false);

  useEffect(() => {
    document.title = "Salve+ - Detalhes do produto";
    
    // Get current user from localStorage
    const localUser = localStorage.getItem('user');
    if (localUser) {
      const userData = JSON.parse(localUser);
      setCurrentUser(userData);
      console.log('Current user loaded:', userData);
    }
    
    if (id) {
      carregarDadosIniciais();
    }
  }, [id]);

  useEffect(() => {
    if (currentUser && id) {
      carregarProduto();
      carregarMeusProdutos();
    }
  }, [currentUser, id]);

  useEffect(() => {
    if (id) {
      console.log('[Avaliações] useEffect disparado para id:', id);
      carregarAvaliacoesProduto();
    }
  }, [id]);

  useEffect(() => {
    if (isOwner && id) {
      carregarHistoricoTransacoes();
    }
  }, [isOwner, id]);

  useEffect(() => {
    const loadMunicipios = async () => {
      if (editData.uf) {
        const municipios = await fetchMunicipios(editData.uf);
        setMunicipiosDisponiveis(municipios);
      }
    };
    
    loadMunicipios();
  }, [editData.uf]);

  const carregarDadosIniciais = async () => {
    try {
      // Carregar tipos de produto
      const { data: tiposProdutoData, error: tiposProdutoError } = await supabase
        .from('tipo_produto')
        .select('*')
        .order('nome');

      if (tiposProdutoError) throw tiposProdutoError;
      setTiposProduto(tiposProdutoData || []);

      // Carregar tipos de transação
      const { data: tiposTransacaoData, error: tiposTransacaoError } = await supabase
        .from('tipo_transacao')
        .select('*')
        .order('nome');

      if (tiposTransacaoError) throw tiposTransacaoError;
      setTiposTransacao(tiposTransacaoData || []);

    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error);
    }
  };

  const carregarMeusProdutos = async () => {
    if (!currentUser?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('produto')
        .select(`
          *,
          tipo_produto!inner (nome),
          tipo_transacao!inner (nome),
          usuario!inner (nome),
          produto_foto (foto)
        `)
        .eq('usuario_id', currentUser.id)
        .gte('quantidade', 1)
        .order('nome');

      if (error) throw error;
      setMeusProdutos(data || []);
    } catch (error) {
      console.error('Erro ao carregar meus produtos:', error);
    }
  };

  const carregarAvaliacoesProduto = async () => {
    if (!id) return;
    
    console.log('[Avaliações] Iniciando carga para produto_id:', id);
    setLoadingAvaliacoes(true);
    try {
      const { data, error } = await supabase
        .from('avaliacao_produto')
        .select('*')
        .eq('produto_id', parseInt(id))
        .order('data_cadastro', { ascending: false });

      if (error) throw error;
      console.log('[Avaliações] Recebidas', data?.length || 0, 'avaliações:', data);

      // Enriquecer com nome dos usuários
      const avaliacoesEnriquecidas = await Promise.all(
        (data || []).map(async (avaliacao: any) => {
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

      setAvaliacoesProduto(avaliacoesEnriquecidas);
    } catch (error) {
      console.error('Erro ao carregar avaliações:', error);
    } finally {
      setLoadingAvaliacoes(false);
    }
  };

  const carregarHistoricoTransacoes = async () => {
    if (!id) return;
    
    setLoadingHistorico(true);
    try {
      const { data: historicoData, error } = await (supabase
        .from('historico_transacao' as any)
        .select('id, tipo_transacao_id, situacao_id, usuario_origem_id, usuario_destino_id, data_cadastro, data_transacao, observacao, observacao_resposta')
        .eq('produto_id', parseInt(id))
        .order('id', { ascending: false }) as any);

      if (error) throw error;

      // Enriquecer os dados com informações relacionadas
      const historicoEnriquecido: HistoricoTransacao[] = await Promise.all(
        (historicoData || []).map(async (item: any) => {
          // Buscar tipo de transação
          const { data: tipoTransacao } = await supabase
            .from('tipo_transacao')
            .select('nome')
            .eq('id', item.tipo_transacao_id)
            .maybeSingle();

          // Buscar situação
          const { data: situacao } = await supabase
            .from('situacao')
            .select('nome')
            .eq('id', item.situacao_id)
            .maybeSingle();

          // Buscar usuário origem
          const { data: usuarioOrigem } = await supabase
            .from('usuario')
            .select('nome')
            .eq('id', item.usuario_origem_id)
            .maybeSingle();

          // Buscar usuário destino
          const { data: usuarioDestino } = await supabase
            .from('usuario')
            .select('nome')
            .eq('id', item.usuario_destino_id)
            .maybeSingle();

          return {
            id: item.id,
            tipo_transacao_id: item.tipo_transacao_id,
            situacao_id: item.situacao_id,
            usuario_origem_id: item.usuario_origem_id,
            usuario_destino_id: item.usuario_destino_id,
            data_cadastro: item.data_cadastro,
            data_transacao: item.data_transacao,
            observacao: item.observacao,
            observacao_resposta: item.observacao_resposta,
            tipo_transacao_nome: tipoTransacao?.nome || '-',
            situacao_nome: situacao?.nome || '-',
            usuario_origem_nome: usuarioOrigem?.nome || '-',
            usuario_destino_nome: usuarioDestino?.nome || '-',
          };
        })
      );

      setHistoricoTransacoes(historicoEnriquecido);
    } catch (error) {
      console.error('Erro ao carregar histórico de transações:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar histórico de transações",
        variant: "destructive",
      });
    } finally {
      setLoadingHistorico(false);
    }
  };

  const carregarProduto = async () => {
    try {
      const { data, error } = await supabase
        .from('produto')
        .select(`
          *,
          tipo_produto!inner (nome),
          tipo_transacao!inner (nome),
          usuario!inner (nome),
          produto_foto (foto)
        `)
        .eq('id', parseInt(id!))
        .single();

      if (error) throw error;

      console.log('Product loaded:', data);
      console.log('Current user ID:', currentUser?.id, 'Product owner ID:', data.usuario_id);
      
      setProduto(data);
      
      // Check if current user is the owner
      const userIsOwner = currentUser && currentUser.id === data.usuario_id;
      setIsOwner(userIsOwner);
      console.log('User is owner:', userIsOwner);
      
      if (userIsOwner) {
        // Initialize edit data
        setEditData({
          nome: data.nome,
          descricao: data.descricao,
          quantidade: data.quantidade,
          uf: data.uf,
          municipio: data.municipio,
          contato: data.contato,
          tipo_produto_id: data.tipo_produto_id,
          tipo_transacao_id: data.tipo_transacao_id
        });
        // Set current image if exists
        if (data.produto_foto && data.produto_foto.length > 0) {
          setNewImage(data.produto_foto[0].foto);
        }
      }
      
    } catch (error) {
      console.error('Erro ao carregar produto:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar detalhes do produto",
        variant: "destructive",
      });
      handleBackNavigation();
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Configurações de compressão
      const options = {
        maxSizeMB: 0.1, // 100KB
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: file.type
      };

      // Comprimir a imagem
      const compressedFile = await imageCompression(file, options);
      
      // Verificar o tamanho após compressão
      if (compressedFile.size > 100 * 1024) { // 100KB
        toast({
          title: "Erro",
          description: "O tamanho da foto é maior que o limite permitido.",
          variant: "destructive",
        });
        return;
      }

      // Converter para base64
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setNewImage(e.target.result as string);
        }
      };
      reader.readAsDataURL(compressedFile);

    } catch (error) {
      console.error('Erro ao processar imagem:', error);
      toast({
        title: "Erro",
        description: "Falha ao registrar a foto. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    try {
      // Get current time in São Paulo timezone
      const saoPauloTime = formatInTimeZone(new Date(), 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ss.SSSXXX");
      
      const { error } = await supabase
        .from('produto')
        .update({
          nome: editData.nome,
          descricao: editData.descricao,
          quantidade: editData.quantidade,
          uf: editData.uf,
          municipio: editData.municipio,
          contato: editData.contato,
          tipo_produto_id: editData.tipo_produto_id,
          tipo_transacao_id: editData.tipo_transacao_id,
          data_alteracao: saoPauloTime
        })
        .eq('id', parseInt(id!));

      if (error) throw error;

      // Update image if changed
      if (newImage && newImage !== (produto?.produto_foto?.[0]?.foto || '')) {
        // Delete existing photo if exists
        if (produto?.produto_foto && produto.produto_foto.length > 0) {
          await supabase
            .from('produto_foto')
            .delete()
            .eq('produto_id', parseInt(id!));
        }

        // Add new photo if provided
        if (newImage) {
          const { error: fotoError } = await supabase
            .from('produto_foto')
            .insert({
              produto_id: parseInt(id!),
              foto: newImage,
              data_insercao: saoPauloTime
            });

          if (fotoError) {
            console.error('Erro ao salvar foto:', fotoError);
            toast({
              title: "Erro",
              description: "Falha ao registrar a foto. Tente novamente.",
              variant: "destructive",
            });
            return;
          }
        }
      }

      toast({
        title: "Sucesso",
        description: "Produto atualizado com sucesso!",
      });

      setIsEditing(false);
      carregarProduto(); // Reload data
    } catch (error) {
      console.error('Erro ao atualizar produto:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar produto",
        variant: "destructive",
      });
    }
  };

  const handleSolicitarProduto = (tipoTransacaoId: number, tipoTransacaoNome: string) => {
    if (tipoTransacaoNome.toLowerCase() === 'doação') {
      // Close first modal and open donation modal
      setShowSolicitacaoModal(false);
      setShowDoacaoModal(true);
      setObservacao('');
    } else if (tipoTransacaoNome.toLowerCase() === 'troca') {
      // Close first modal and open troca modal
      setShowSolicitacaoModal(false);
      setShowTrocaModal(true);
      setObservacaoTroca('');
      setProdutoSelecionadoTroca(null);
    } else {
      // For other transaction types, proceed directly
      setShowSolicitacaoModal(false);
      
      toast({
        title: "Solicitação enviada!",
        description: `Sua solicitação de ${tipoTransacaoNome.toLowerCase()} foi enviada ao proprietário do produto.`,
      });
      
      console.log('Solicitação de produto:', {
        produtoId: produto?.id,
        tipoTransacaoId,
        tipoTransacaoNome,
        usuarioOrigemId: currentUser?.id,
        usuarioDestinoId: produto?.usuario_id,
        observacao: ''
      });
    }
  };

  const handleConfirmarDoacao = async () => {
    try {
      // Check if the requested product is still available
      const { data: produtoAtual, error } = await supabase
        .from('produto')
        .select('quantidade')
        .eq('id', produto?.id)
        .single();

      if (error) throw error;

      if (!produtoAtual || produtoAtual.quantidade < 1) {
        toast({
          title: "Produto não está mais disponível.",
          variant: "destructive",
        });
        setShowDoacaoModal(false);
        return;
      }

      // Get the pendente situation ID
      const { data: situacaoPendentes, error: situacaoError } = await supabase
        .from('situacao')
        .select('id')
        .ilike('nome', 'pendente');

      if (situacaoError) throw situacaoError;

      const situacaoPendente = situacaoPendentes?.[0];
      if (!situacaoPendente) {
        throw new Error('Situação pendente não encontrada');
      }

      // Check if there's already a pending request for this product by this user
      const { data: existingRequest, error: existingError } = await supabase
        .from('historico_transacao' as any)
        .select('id')
        .eq('produto_id', produto?.id)
        .eq('usuario_origem_id', currentUser?.id)
        .eq('situacao_id', situacaoPendente.id)
        .maybeSingle();

      if (existingError) throw existingError;

      if (existingRequest) {
        toast({
          title: "Solicitação já existe",
          description: "Já existe uma solicitação pendente para este produto. Aguarde o retorno do proprietário.",
          variant: "destructive",
        });
        return;
      }

      // Insert into historico_transacao using direct SQL
      const { error: historicoError } = await supabase
        .from('historico_transacao' as any)
        .insert({
          produto_id: produto?.id,
          tipo_transacao_id: tiposTransacao.find(t => t.nome.toLowerCase() === 'doação')?.id,
          observacao: observacao,
          produto_troca_id: null,
          usuario_origem_id: currentUser?.id,
          usuario_destino_id: produto?.usuario_id,
          data_transacao: null,
          data_cadastro: formatInTimeZone(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd HH:mm:ss'),
          situacao_id: situacaoPendente.id,
          observacao_resposta: null
        });

      if (historicoError) throw historicoError;

      // Close modal and show success message
      setShowDoacaoModal(false);
      
      toast({
        title: "Solicitação enviada!",
        description: "Sua solicitação de doação foi enviada ao proprietário do produto.",
      });
    } catch (error) {
      console.error('Erro ao confirmar doação:', error);
      toast({
        title: "Erro",
        description: "Erro ao processar solicitação de doação.",
        variant: "destructive",
      });
    }
  };

  const handleConfirmarTroca = async () => {
    if (!produtoSelecionadoTroca) {
      toast({
        title: "Erro",
        description: "Selecione um produto para oferecer em troca.",
        variant: "destructive",
      });
      return;
    }

    try {
      // First check if the product being offered for exchange is still available
      const { data: produtoOfertaAtual, error: ofertaError } = await supabase
        .from('produto')
        .select('quantidade')
        .eq('id', produtoSelecionadoTroca)
        .single();

      if (ofertaError) throw ofertaError;

      if (!produtoOfertaAtual || produtoOfertaAtual.quantidade < 1) {
        toast({
          title: "Produto oferecido em troca não está mais disponível.",
          variant: "destructive",
        });
        // Don't close the dialog, let user select another product
        return;
      }

      // Then check if the requested product is still available
      const { data: produtoAtual, error } = await supabase
        .from('produto')
        .select('quantidade')
        .eq('id', produto?.id)
        .single();

      if (error) throw error;

      if (!produtoAtual || produtoAtual.quantidade < 1) {
        toast({
          title: "Produto não está mais disponível.",
          variant: "destructive",
        });
        setShowTrocaModal(false);
        return;
      }

      // Get the pendente situation ID
      const { data: situacaoPendentes, error: situacaoError } = await supabase
        .from('situacao')
        .select('id')
        .ilike('nome', 'pendente');

      if (situacaoError) throw situacaoError;

      const situacaoPendente = situacaoPendentes?.[0];
      if (!situacaoPendente) {
        throw new Error('Situação pendente não encontrada');
      }

      // Check if there's already a pending request for this product by this user
      const { data: existingRequest, error: existingError } = await supabase
        .from('historico_transacao' as any)
        .select('id')
        .eq('produto_id', produto?.id)
        .eq('usuario_origem_id', currentUser?.id)
        .eq('situacao_id', situacaoPendente.id)
        .maybeSingle();

      if (existingError) throw existingError;

      if (existingRequest) {
        toast({
          title: "Solicitação já existe",
          description: "Já existe uma solicitação pendente para este produto. Aguarde o retorno do proprietário.",
          variant: "destructive",
        });
        return;
      }

      // Insert into historico_transacao
      const { error: historicoError } = await supabase
        .from('historico_transacao' as any)
        .insert({
          produto_id: produto?.id,
          tipo_transacao_id: tiposTransacao.find(t => t.nome.toLowerCase() === 'troca')?.id,
          observacao: observacaoTroca,
          produto_troca_id: produtoSelecionadoTroca,
          usuario_origem_id: currentUser?.id,
          usuario_destino_id: produto?.usuario_id,
          data_transacao: null,
          data_cadastro: formatInTimeZone(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd HH:mm:ss'),
          situacao_id: situacaoPendente.id,
          observacao_resposta: null
        });

      if (historicoError) throw historicoError;

      // Close modal and show success message
      setShowTrocaModal(false);
      
      toast({
        title: "Solicitação enviada!",
        description: "Sua solicitação de troca foi enviada ao proprietário do produto.",
      });
    } catch (error) {
      console.error('Erro ao confirmar troca:', error);
      toast({
        title: "Erro",
        description: "Erro ao processar solicitação de troca.",
        variant: "destructive",
      });
    }
  };

  const handleSolicitarProdutoDirecto = () => {
    if (!produto) return;
    
    const tipoTransacao = produto.tipo_transacao.nome.toLowerCase();
    
    if (tipoTransacao === 'doação') {
      setShowDoacaoModal(true);
      setObservacao('');
    } else if (tipoTransacao === 'troca') {
      setShowTrocaModal(true);
      setObservacaoTroca('');
      setProdutoSelecionadoTroca(null);
    } else {
      // For other transaction types, show a generic success message
      toast({
        title: "Solicitação enviada!",
        description: `Sua solicitação de ${produto.tipo_transacao.nome.toLowerCase()} foi enviada ao proprietário do produto.`,
      });
    }
  };

  const handleCancelarSolicitacao = () => {
    // Close all modals and reset states
    setShowSolicitacaoModal(false);
    setShowDoacaoModal(false);
    setShowTrocaModal(false);
    setObservacao('');
    setObservacaoTroca('');
    setProdutoSelecionadoTroca(null);
  };

  const handleBackNavigation = () => {
    console.log('Back navigation - fromPage:', fromPage);
    if (fromPage === 'meus-produtos') {
      navigate('/meus-produtos');
    } else {
      navigate('/buscar-produtos');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Package className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Carregando detalhes do produto...</p>
        </div>
      </div>
    );
  }

  if (!produto) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p>Produto não encontrado</p>
          <Button onClick={handleBackNavigation} className="mt-4">
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  const isDisponivel = produto.quantidade > 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={handleBackNavigation}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <img 
              src={salveLogo} 
              alt="Salve+" 
              className="h-8 w-auto"
            />
            <div className="flex-1">
              <h1 className="text-lg font-bold text-foreground">
                {isOwner && isEditing ? "Editar Produto" : "Detalhes do Produto"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isOwner && isEditing ? "Modifique as informações do produto" : "Informações completas do produto"}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {isOwner ? (
            // Owner view with tabs
            <Tabs defaultValue="detalhes" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
                <TabsTrigger value="historico">Histórico</TabsTrigger>
              </TabsList>

              {/* Detalhes Tab */}
              <TabsContent value="detalhes">
                <Card>
            {/* Product Image */}
            {isOwner && isEditing ? (
              <div className="w-full p-6">
                <Label className="font-medium mb-2 block">Foto do Produto</Label>
                {newImage ? (
                  <div className="space-y-4">
                    <div className="w-full flex justify-center">
                      <img
                        src={newImage}
                        alt="Preview"
                        className="w-[70%] h-auto object-contain max-h-80 rounded-lg"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('image-upload')?.click()}
                        className="flex-1"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Alterar Foto
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setNewImage('')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div 
                    className="w-full h-64 bg-muted rounded-lg flex flex-col items-center justify-center border-2 border-dashed cursor-pointer hover:bg-muted/50"
                    onClick={() => document.getElementById('image-upload')?.click()}
                  >
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Clique para adicionar uma foto</p>
                  </div>
                )}
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
            ) : (
              (produto?.produto_foto && produto.produto_foto.length > 0) ? (
                <div className="w-full flex justify-center overflow-hidden rounded-t-lg">
                  <img
                    src={produto.produto_foto[0].foto}
                    alt={produto.nome}
                    className="w-[70%] h-auto object-contain max-h-80"
                  />
                </div>
              ) : (
                <div className="w-full h-64 bg-muted rounded-t-lg flex items-center justify-center">
                  <Package className="h-16 w-16 text-muted-foreground" />
                </div>
              )
            )}

            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {isOwner && isEditing && (
                    <Label className="font-medium mb-2 block">Nome do Produto</Label>
                  )}
                  <CardTitle className="text-2xl">
                    {isOwner && isEditing ? (
                      <Input
                        value={editData.nome}
                        onChange={(e) => setEditData(prev => ({ ...prev, nome: e.target.value }))}
                        className="text-2xl font-semibold"
                      />
                    ) : (
                      produto.nome
                    )}
                  </CardTitle>
                </div>
                <Badge 
                  variant={isDisponivel ? "default" : "destructive"}
                  className={isDisponivel ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
                >
                  {isDisponivel ? "Disponível" : "Indisponível"}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Description */}
              <div>
                <h3 className="font-semibold mb-2">Descrição</h3>
                {isOwner && isEditing ? (
                  <Textarea
                    value={editData.descricao}
                    onChange={(e) => setEditData(prev => ({ ...prev, descricao: e.target.value }))}
                    rows={3}
                  />
                ) : (
                  <p className="text-muted-foreground">{produto.descricao}</p>
                )}
              </div>

              {/* Product Details */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="font-medium">Tipo de Produto</Label>
                  {isOwner && isEditing ? (
                    <Select
                      value={editData.tipo_produto_id.toString()}
                      onValueChange={(value) => setEditData(prev => ({ ...prev, tipo_produto_id: parseInt(value) }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {tiposProduto.map((tipo) => (
                          <SelectItem key={tipo.id} value={tipo.id.toString()}>
                            {tipo.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span>{produto.tipo_produto.nome}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="font-medium">Tipo de Transação</Label>
                  {isOwner && isEditing ? (
                    <Select
                      value={editData.tipo_transacao_id.toString()}
                      onValueChange={(value) => setEditData(prev => ({ ...prev, tipo_transacao_id: parseInt(value) }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {tiposTransacao.map((tipo) => (
                          <SelectItem key={tipo.id} value={tipo.id.toString()}>
                            {tipo.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span>{produto.tipo_transacao.nome}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="font-medium">Estado (UF)</Label>
                  {isOwner && isEditing ? (
                    <Select
                      value={editData.uf}
                      onValueChange={(value) => setEditData(prev => ({ ...prev, uf: value, municipio: '' }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ufs.map((estado) => (
                          <SelectItem key={estado.sigla} value={estado.sigla}>
                            {estado.nome} ({estado.sigla})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{produto.uf}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="font-medium">Município</Label>
                  {isOwner && isEditing ? (
                    <Select
                      value={editData.municipio}
                      onValueChange={(value) => setEditData(prev => ({ ...prev, municipio: value }))}
                      disabled={!editData.uf}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={editData.uf ? "Selecione o município" : "Selecione primeiro o estado"} />
                      </SelectTrigger>
                      <SelectContent>
                        {municipiosDisponiveis.map((municipio) => (
                          <SelectItem key={municipio} value={municipio}>
                            {municipio}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span>{produto.municipio}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="font-medium">Quantidade</Label>
                  {isOwner && isEditing ? (
                    <Input
                      type="number"
                      value={editData.quantidade}
                      onChange={(e) => setEditData(prev => ({ ...prev, quantidade: parseInt(e.target.value) || 0 }))}
                      min="0"
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <span>{produto.quantidade}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="font-medium">Cadastrado por</Label>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <button
                      onClick={() => navigate(`/perfil-usuario/${produto.usuario_id}`)}
                      className="text-primary hover:underline font-medium"
                    >
                      {produto.usuario.nome}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="font-medium">Data do Cadastro</Label>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{formatInTimeZone(new Date(produto.data_insercao), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm')}</span>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-2">
                <Label className="font-medium">Contato</Label>
                {isOwner && isEditing ? (
                  <Input
                    value={editData.contato}
                    onChange={(e) => setEditData(prev => ({ ...prev, contato: e.target.value }))}
                  />
                ) : (
                  <p className="text-muted-foreground">{produto.contato}</p>
                )}
              </div>

              {/* Action Buttons */}
              {isOwner && isEditing ? (
                <div className="flex gap-4 pt-4">
                  <Button onClick={handleSave} className="flex-1">
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Alterações
                  </Button>
                  <Button variant="outline" onClick={() => setIsEditing(false)} className="flex-1">
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                </div>
              ) : isOwner && !isEditing ? (
                <div className="pt-4">
                  <Button onClick={() => setIsEditing(true)} className="w-full">
                    <Edit className="h-4 w-4 mr-2" />
                    Editar Produto
                  </Button>
                </div>
              ) : (
                !isOwner && isDisponivel && (
                  <div className="pt-4">
                    <Button 
                      onClick={handleSolicitarProdutoDirecto} 
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Solicitar Produto
                    </Button>

                    {/* Donation Modal */}
                    <Dialog open={showDoacaoModal} onOpenChange={setShowDoacaoModal}>
                      <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                          <DialogTitle className="text-center text-xl font-semibold">
                            Solicitar Produto - Doação
                          </DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="observacao" className="text-sm font-medium">
                              Observação (opcional)
                            </Label>
                            <Textarea
                              id="observacao"
                              value={observacao}
                              onChange={(e) => {
                                const newValue = e.target.value;
                                if (newValue.length <= 1000) {
                                  setObservacao(newValue);
                                }
                              }}
                              placeholder="Adicione uma observação sobre sua solicitação..."
                              rows={4}
                              className="resize-none"
                            />
                            <div className="text-xs text-muted-foreground text-right">
                              {1000 - observacao.length} caracteres restantes
                            </div>
                          </div>
                          <div className="flex gap-3 pt-2">
                            <Button
                              onClick={handleConfirmarDoacao}
                              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              Confirmar
                            </Button>
                            <Button
                              onClick={handleCancelarSolicitacao}
                              variant="outline"
                              className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
                            >
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {/* Troca Modal */}
                    <Dialog open={showTrocaModal} onOpenChange={setShowTrocaModal}>
                      <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                          <DialogTitle className="text-center text-xl font-semibold">
                            Solicitar Produto - Troca
                          </DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="space-y-3">
                            <Label className="text-sm font-medium">
                              Escolha um produto seu para oferecer em troca:
                            </Label>
                            <Select
                              value={produtoSelecionadoTroca?.toString() || ''}
                              onValueChange={(value) => setProdutoSelecionadoTroca(parseInt(value))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione um produto para troca" />
                              </SelectTrigger>
                              <SelectContent>
                                {meusProdutos.map((produto) => (
                                  <SelectItem key={produto.id} value={produto.id.toString()}>
                                    {produto.nome}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="observacaoTroca" className="text-sm font-medium">
                              Observação (opcional)
                            </Label>
                            <Textarea
                              id="observacaoTroca"
                              value={observacaoTroca}
                              onChange={(e) => {
                                const newValue = e.target.value;
                                if (newValue.length <= 1000) {
                                  setObservacaoTroca(newValue);
                                }
                              }}
                              placeholder="Adicione uma observação sobre sua solicitação de troca..."
                              rows={4}
                              className="resize-none"
                            />
                            <div className="text-xs text-muted-foreground text-right">
                              {1000 - observacaoTroca.length} caracteres restantes
                            </div>
                          </div>

                          <div className="flex gap-3 pt-2">
                            <Button
                              onClick={handleConfirmarTroca}
                              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              Confirmar
                            </Button>
                            <Button
                              onClick={handleCancelarSolicitacao}
                              variant="outline"
                              className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
                            >
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                )
              )}

              {/* Avaliações do Produto */}
              {!isEditing && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">Avaliações do Produto ({avaliacoesProduto.length})</h3>
                    {avaliacoesProduto.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                        <span className="font-semibold">
                          Nota: {(avaliacoesProduto.reduce((acc, av) => acc + av.avaliacao, 0) / avaliacoesProduto.length).toFixed(1)}/5
                        </span>
                      </div>
                    )}
                  </div>
                  {loadingAvaliacoes ? (
                    <div className="text-center py-4">
                      <p className="text-muted-foreground">Carregando avaliações...</p>
                    </div>
                  ) : avaliacoesProduto.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-muted-foreground">Este produto ainda não possui avaliações.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {avaliacoesProduto.map((avaliacao) => (
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
                </div>
              )}
            </CardContent>
          </Card>
              </TabsContent>

              {/* Histórico Tab */}
              <TabsContent value="historico">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl">Histórico Completo de Transações</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Todas as transações relacionadas a este produto onde você participou
                    </p>
                  </CardHeader>
                  <CardContent>
                    {loadingHistorico ? (
                      <div className="text-center py-8">
                        <Package className="h-8 w-8 animate-spin mx-auto mb-4" />
                        <p className="text-muted-foreground">Carregando histórico...</p>
                      </div>
                    ) : historicoTransacoes.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">Nenhuma transação registrada para este produto.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {historicoTransacoes.map((transacao) => (
                          <Card key={transacao.id} className="border bg-card">
                            <CardContent className="pt-6">
                              <div className="grid grid-cols-2 gap-6">
                                {/* Row 1: Tipo de Transação e Situação */}
                                <div>
                                  <p className="text-sm text-muted-foreground mb-1">Tipo de Transação</p>
                                  <p className="font-medium">{transacao.tipo_transacao_nome}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground mb-1">Situação</p>
                                  <Badge variant={
                                    transacao.situacao_nome.toLowerCase() === 'pendente' ? 'secondary' :
                                    transacao.situacao_nome.toLowerCase() === 'aprovada' || transacao.situacao_nome.toLowerCase() === 'concluída' ? 'default' :
                                    'destructive'
                                  }>
                                    {transacao.situacao_nome}
                                  </Badge>
                                </div>

                                {/* Row 2: Usuário Origem e Usuário Destino */}
                                <div>
                                  <p className="text-sm text-muted-foreground mb-1">Usuário Origem</p>
                                  <p className="font-medium">{transacao.usuario_origem_nome}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground mb-1">Usuário Destino</p>
                                  <p className="font-medium">{transacao.usuario_destino_nome}</p>
                                </div>

                                {/* Row 3: Data de Cadastro e Data de Transação */}
                                <div>
                                  <p className="text-sm text-muted-foreground mb-1">Data de Cadastro</p>
                                  <p className="font-medium">
                                    {formatInTimeZone(new Date(transacao.data_cadastro), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm')}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground mb-1">Data de Transação</p>
                                  <p className="font-medium">
                                    {transacao.data_transacao 
                                      ? formatInTimeZone(new Date(transacao.data_transacao), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm')
                                      : '-'
                                    }
                                  </p>
                                </div>
                              </div>

                              {/* Observação (full width) */}
                              {transacao.observacao && (
                                <div className="mt-4">
                                  <p className="text-sm text-muted-foreground mb-1">Observação</p>
                                  <p className="font-medium">{transacao.observacao}</p>
                                </div>
                              )}

                              {/* Resposta (full width) */}
                              {transacao.observacao_resposta && (
                                <div className="mt-4">
                                  <p className="text-sm text-muted-foreground mb-1">Resposta</p>
                                  <p className="font-medium">{transacao.observacao_resposta}</p>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            // Non-owner view without tabs
            <Card>
              {/* Product Image */}
              {(produto?.produto_foto && produto.produto_foto.length > 0) ? (
                <div className="w-full flex justify-center overflow-hidden rounded-t-lg">
                  <img
                    src={produto.produto_foto[0].foto}
                    alt={produto.nome}
                    className="w-[70%] h-auto object-contain max-h-80"
                  />
                </div>
              ) : (
                <div className="w-full h-64 bg-muted rounded-t-lg flex items-center justify-center">
                  <Package className="h-16 w-16 text-muted-foreground" />
                </div>
              )}

              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-2xl">{produto.nome}</CardTitle>
                  </div>
                  <Badge 
                    variant={isDisponivel ? "default" : "destructive"}
                    className={isDisponivel ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
                  >
                    {isDisponivel ? "Disponível" : "Indisponível"}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Description */}
                <div>
                  <h3 className="font-semibold mb-2">Descrição</h3>
                  <p className="text-muted-foreground">{produto.descricao}</p>
                </div>

                {/* Product Details */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="font-medium">Tipo de Produto</Label>
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span>{produto.tipo_produto.nome}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="font-medium">Tipo de Transação</Label>
                    <div className="flex items-center gap-2">
                      <span>{produto.tipo_transacao.nome}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="font-medium">Estado (UF)</Label>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{produto.uf}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="font-medium">Município</Label>
                    <div className="flex items-center gap-2">
                      <span>{produto.municipio}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="font-medium">Quantidade</Label>
                    <div className="flex items-center gap-2">
                      <span>{produto.quantidade}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="font-medium">Cadastrado por</Label>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <button
                        onClick={() => navigate(`/perfil-usuario/${produto.usuario_id}`)}
                        className="text-primary hover:underline font-medium"
                      >
                        {produto.usuario.nome}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="font-medium">Data do Cadastro</Label>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{formatInTimeZone(new Date(produto.data_insercao), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm')}</span>
                    </div>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-2">
                  <Label className="font-medium">Contato</Label>
                  <p className="text-muted-foreground">{produto.contato}</p>
                </div>

                {/* Action Button for non-owner */}
                {isDisponivel && (
                  <div className="pt-4">
                    <Button 
                      onClick={handleSolicitarProdutoDirecto} 
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Solicitar Produto
                    </Button>

                    {/* Donation Modal */}
                    <Dialog open={showDoacaoModal} onOpenChange={setShowDoacaoModal}>
                      <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                          <DialogTitle className="text-center text-xl font-semibold">
                            Solicitar Produto - Doação
                          </DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="observacao" className="text-sm font-medium">
                              Observação (opcional)
                            </Label>
                            <Textarea
                              id="observacao"
                              value={observacao}
                              onChange={(e) => {
                                const newValue = e.target.value;
                                if (newValue.length <= 1000) {
                                  setObservacao(newValue);
                                }
                              }}
                              placeholder="Adicione uma observação sobre sua solicitação..."
                              rows={4}
                              className="resize-none"
                            />
                            <div className="text-xs text-muted-foreground text-right">
                              {1000 - observacao.length} caracteres restantes
                            </div>
                          </div>
                          <div className="flex gap-3 pt-2">
                            <Button
                              onClick={handleConfirmarDoacao}
                              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              Confirmar
                            </Button>
                            <Button
                              onClick={handleCancelarSolicitacao}
                              variant="outline"
                              className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
                            >
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {/* Troca Modal */}
                    <Dialog open={showTrocaModal} onOpenChange={setShowTrocaModal}>
                      <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                          <DialogTitle className="text-center text-xl font-semibold">
                            Solicitar Produto - Troca
                          </DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="space-y-3">
                            <Label className="text-sm font-medium">
                              Escolha um produto seu para oferecer em troca:
                            </Label>
                            <Select
                              value={produtoSelecionadoTroca?.toString() || ''}
                              onValueChange={(value) => setProdutoSelecionadoTroca(parseInt(value))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione um produto para troca" />
                              </SelectTrigger>
                              <SelectContent>
                                {meusProdutos.map((produto) => (
                                  <SelectItem key={produto.id} value={produto.id.toString()}>
                                    {produto.nome}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="observacaoTroca" className="text-sm font-medium">
                              Observação (opcional)
                            </Label>
                            <Textarea
                              id="observacaoTroca"
                              value={observacaoTroca}
                              onChange={(e) => {
                                const newValue = e.target.value;
                                if (newValue.length <= 1000) {
                                  setObservacaoTroca(newValue);
                                }
                              }}
                              placeholder="Adicione uma observação sobre sua solicitação de troca..."
                              rows={4}
                              className="resize-none"
                            />
                            <div className="text-xs text-muted-foreground text-right">
                              {1000 - observacaoTroca.length} caracteres restantes
                            </div>
                          </div>

                          <div className="flex gap-3 pt-2">
                            <Button
                              onClick={handleConfirmarTroca}
                              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              Confirmar
                            </Button>
                            <Button
                              onClick={handleCancelarSolicitacao}
                              variant="outline"
                              className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
                            >
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}

                {/* Avaliações do Produto */}
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">Avaliações do Produto ({avaliacoesProduto.length})</h3>
                    {avaliacoesProduto.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                        <span className="font-semibold">
                          Nota: {(avaliacoesProduto.reduce((acc, av) => acc + av.avaliacao, 0) / avaliacoesProduto.length).toFixed(1)}/5
                        </span>
                      </div>
                    )}
                  </div>
                  {loadingAvaliacoes ? (
                    <div className="text-center py-4">
                      <p className="text-muted-foreground">Carregando avaliações...</p>
                    </div>
                  ) : avaliacoesProduto.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-muted-foreground">Este produto ainda não possui avaliações.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {avaliacoesProduto.map((avaliacao) => (
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
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default DetalheProduto;