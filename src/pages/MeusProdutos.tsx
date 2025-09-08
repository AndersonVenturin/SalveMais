import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Package, MapPin, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import salveLogo from "@/assets/salve-logo.png";
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

const MeusProdutos = () => {
  const navigate = useNavigate();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Salve+ - Meus produtos";
    
    carregarMeusProdutos();
  }, []);

  const carregarMeusProdutos = async () => {
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

      // Get user's products
      const { data, error } = await supabase
        .from('produto')
        .select(`
          *,
          tipo_produto!inner (nome),
          tipo_transacao!inner (nome)
        `)
        .eq('usuario_id', userData.id)
        .order('data_insercao', { ascending: false });

      if (error) throw error;

      setProdutos(data || []);

    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar seus produtos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Package className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Carregando seus produtos...</p>
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
              <h1 className="text-lg font-bold text-foreground">Meus Produtos</h1>
              <p className="text-sm text-muted-foreground">Gerencie seus produtos cadastrados</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">
            Seus Produtos ({produtos.length} produtos encontrados)
          </h2>
          <Button onClick={() => navigate('/cadastrar-produto')}>
            <Package className="h-4 w-4 mr-2" />
            Novo Produto
          </Button>
        </div>
        
        {produtos.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                Você ainda não cadastrou nenhum produto.
              </p>
              <Button onClick={() => navigate('/cadastrar-produto')}>
                <Package className="h-4 w-4 mr-2" />
                Cadastrar Primeiro Produto
              </Button>
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
                  <div className="space-y-2 text-sm mb-4">
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
                      <span className={produto.quantidade > 0 ? "text-green-600" : "text-red-600"}>
                        {produto.quantidade} {produto.quantidade > 0 ? "(Disponível)" : "(Indisponível)"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-medium">Cadastrado em:</span>
                      <span>{formatInTimeZone(new Date(produto.data_insercao), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm')}</span>
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white" 
                    onClick={() => navigate(`/produto/${produto.id}?from=meus-produtos`)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Ver Produto
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default MeusProdutos;