import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Search, MapPin, Package, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import salveLogo from "@/assets/salve-logo.png";
import { ufs, fetchMunicipios } from "@/lib/location-data";
import { formatInTimeZone } from 'date-fns-tz';

interface Produto {
  id: number;
  nome: string;
  descricao: string;
  quantidade: number;
  uf: string;
  municipio: string;
  tipo_produto: { nome: string };
  tipo_transacao: { nome: string };
  data_insercao: string;
}

interface TipoProduto {
  id: number;
  nome: string;
}

interface TipoTransacao {
  id: number;
  nome: string;
}

const BuscarProdutos = () => {
  const navigate = useNavigate();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [tiposProduto, setTiposProduto] = useState<TipoProduto[]>([]);
  const [tiposTransacao, setTiposTransacao] = useState<TipoTransacao[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Filtros
  const [nomeFiltro, setNomeFiltro] = useState("");
  const [tipoProdutoFiltro, setTipoProdutoFiltro] = useState("");
  const [tipoTransacaoFiltro, setTipoTransacaoFiltro] = useState("");
  const [ufFiltro, setUfFiltro] = useState("");
  const [municipioFiltro, setMunicipioFiltro] = useState("");
  
  const [municipiosDisponiveis, setMunicipiosDisponiveis] = useState<string[]>([]);

  useEffect(() => {
    document.title = "Salve+ - Buscar produtos";
    
    carregarDadosIniciais();
  }, []);

  useEffect(() => {
    const loadMunicipios = async () => {
      if (ufFiltro) {
        const municipios = await fetchMunicipios(ufFiltro);
        setMunicipiosDisponiveis(municipios);
        setMunicipioFiltro("");
      }
    };
    
    loadMunicipios();
  }, [ufFiltro]);

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
      toast({
        title: "Erro",
        description: "Erro ao carregar dados iniciais",
        variant: "destructive",
      });
    }
  };

  const buscarProdutos = async () => {
    // Validar filtros
    const temFiltros = nomeFiltro || tipoProdutoFiltro || tipoTransacaoFiltro || ufFiltro || municipioFiltro;
    if (!temFiltros) {
      toast({
        title: "Filtros obrigatórios",
        description: "Informe pelo menos um filtro.",
        variant: "destructive",
      });
      return;
    }

    // Validar nome com pelo menos 3 caracteres
    if (nomeFiltro && nomeFiltro.trim().length < 3) {
      toast({
        title: "Nome muito curto",
        description: "Digite pelo menos 3 caracteres na busca por nome.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Get current user from localStorage
      const localUser = localStorage.getItem('user');
      if (!localUser) {
        toast({
          title: "Erro",
          description: "Usuário não autenticado",
          variant: "destructive",
        });
        navigate('/');
        return;
      }

      const userData = JSON.parse(localUser);

      let query = supabase
        .from('produto')
        .select(`
          *,
          tipo_produto!inner (nome),
          tipo_transacao!inner (nome)
        `);

      // Exclude own products
      query = query.neq('usuario_id', userData.id);

      // Aplicar filtros
      if (nomeFiltro) {
        query = query.ilike('nome', `%${nomeFiltro}%`);
      }
      
      if (tipoProdutoFiltro) {
        query = query.eq('tipo_produto_id', parseInt(tipoProdutoFiltro));
      }
      
      if (tipoTransacaoFiltro) {
        query = query.eq('tipo_transacao_id', parseInt(tipoTransacaoFiltro));
      }
      
      if (ufFiltro) {
        query = query.eq('uf', ufFiltro);
      }
      
      if (municipioFiltro) {
        query = query.eq('municipio', municipioFiltro);
      }

      const { data, error } = await query.order('data_insercao', { ascending: false });

      if (error) throw error;

      setProdutos(data || []);
      
      if (!data || data.length === 0) {
        toast({
          title: "Nenhum produto encontrado",
          description: "Tente ajustar os filtros de busca",
        });
      }

    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      toast({
        title: "Erro",
        description: "Erro ao buscar produtos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const limparFiltros = () => {
    setNomeFiltro("");
    setTipoProdutoFiltro("");
    setTipoTransacaoFiltro("");
    setUfFiltro("");
    setMunicipioFiltro("");
    setProdutos([]);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <img 
              src={salveLogo} 
              alt="Salve+" 
              className="h-8 w-auto"
            />
            <div>
              <h1 className="text-lg font-bold text-foreground">Buscar Produtos</h1>
              <p className="text-sm text-muted-foreground">Encontre produtos cadastrados</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Filtros */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Filtros de Busca</CardTitle>
            <CardDescription>Use os filtros abaixo para refinar sua busca</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome do Produto</Label>
                <Input
                  id="nome"
                  placeholder="Digite o nome do produto"
                  value={nomeFiltro}
                  onChange={(e) => setNomeFiltro(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo-produto">Tipo de Produto</Label>
                <Select value={tipoProdutoFiltro} onValueChange={setTipoProdutoFiltro}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposProduto.map((tipo) => (
                      <SelectItem key={tipo.id} value={tipo.id.toString()}>
                        {tipo.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo-transacao">Tipo de Transação</Label>
                <Select value={tipoTransacaoFiltro} onValueChange={setTipoTransacaoFiltro}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposTransacao.map((tipo) => (
                      <SelectItem key={tipo.id} value={tipo.id.toString()}>
                        {tipo.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="uf">Estado (UF)</Label>
                <Select value={ufFiltro} onValueChange={setUfFiltro}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {ufs.map((estado) => (
                      <SelectItem key={estado.sigla} value={estado.sigla}>
                        {estado.nome} ({estado.sigla})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="municipio">Município</Label>
                <Select value={municipioFiltro} onValueChange={setMunicipioFiltro} disabled={!ufFiltro}>
                  <SelectTrigger>
                    <SelectValue placeholder={ufFiltro ? "Selecione o município" : "Selecione primeiro o estado"} />
                  </SelectTrigger>
                  <SelectContent>
                    {municipiosDisponiveis.map((municipio) => (
                      <SelectItem key={municipio} value={municipio}>
                        {municipio}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <Button onClick={buscarProdutos} disabled={loading}>
                <Search className="h-4 w-4 mr-2" />
                {loading ? "Buscando..." : "Buscar"}
              </Button>
              <Button variant="outline" onClick={limparFiltros}>
                Limpar Filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Resultados */}
        <div>
          <h2 className="text-xl font-semibold mb-4">
            Resultados ({produtos.length} produtos encontrados)
          </h2>
          
          {produtos.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Nenhum produto encontrado. Use os filtros acima para buscar produtos.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {produtos.map((produto) => (
                <Card key={produto.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">{produto.nome}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {produto.descricao}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Tipo:</span>
                        <span>{produto.tipo_produto.nome}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Transação:</span>
                        <span>{produto.tipo_transacao.nome}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{produto.municipio} - {produto.uf}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Quantidade:</span>
                        <span>{produto.quantidade}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Cadastrado em:</span>
                        <span>{formatInTimeZone(new Date(produto.data_insercao), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm')}</span>
                      </div>
                    </div>
                    
                    <Button 
                      className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white" 
                      variant="outline"
                      onClick={() => navigate(`/produto/${produto.id}`)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
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

export default BuscarProdutos;