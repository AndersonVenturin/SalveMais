import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Leaf, RefreshCw, Gift, ArrowLeftRight } from "lucide-react";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface ImpactoData {
  doacoes: number;
  trocas: number;
  total: number;
}

interface TipoProduto {
  id: number;
  nome: string;
}

interface CO2PorTipo {
  tipo: string;
  co2_evitado: number;
}

export default function ImpactoAmbiental() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [impacto, setImpacto] = useState<ImpactoData>({ doacoes: 0, trocas: 0, total: 0 });
  const [tiposProduto, setTiposProduto] = useState<TipoProduto[]>([]);
  const [tipoSelecionado, setTipoSelecionado] = useState<string>("todos");
  const [escopoImpacto, setEscopoImpacto] = useState<string>("meu"); // "meu" ou "total"
  const [co2Data, setCo2Data] = useState<CO2PorTipo[]>([]);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadTiposProduto();
      loadImpactoData();
      loadCO2Data();
    }
  }, [currentUser, tipoSelecionado, escopoImpacto]);

  const checkUser = async () => {
    // Verificar se há usuário no localStorage primeiro
    const localUser = localStorage.getItem('user');
    if (localUser) {
      const userData = JSON.parse(localUser);
      setCurrentUser(userData);
      return;
    }

    // Se não há usuário no localStorage, verificar Supabase Auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/');
      return;
    }

    // Buscar dados do usuário na tabela usuario
    const { data: userData } = await supabase
      .from('usuario')
      .select('*')
      .eq('email', user.email)
      .single();
    
    if (userData) {
      setCurrentUser(userData);
    } else {
      navigate('/');
    }
  };

  const loadTiposProduto = async () => {
    try {
      const { data, error } = await supabase
        .from("tipo_produto")
        .select("id, nome")
        .order("nome");

      if (error) throw error;
      setTiposProduto(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar tipos de produto:", error);
    }
  };

  const loadImpactoData = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      // Set user context
      await supabase.rpc("set_user_context", { user_email: currentUser.email });

      // Build query for transactions
      let query = supabase
        .from("historico_transacao")
        .select(`
          id,
          tipo_transacao_id,
          usuario_origem_id,
          usuario_destino_id,
          produto_id,
          produto_troca_id,
          produto!inner(tipo_produto_id)
        `)
        .eq("situacao_id", 2); // Concluída

      // Apply user filter only if "Meu impacto" is selected
      if (escopoImpacto === "meu") {
        query = query.or(`usuario_origem_id.eq.${currentUser.id},usuario_destino_id.eq.${currentUser.id}`);
      }

      const { data: allData, error } = await query;

      if (error) throw error;

      let data = allData;

      // Apply product type filter if selected (considering both main product and exchange product)
      if (tipoSelecionado !== "todos") {
        const filteredData = [];
        for (const transaction of allData || []) {
          const mainProductMatches = transaction.produto?.tipo_produto_id === parseInt(tipoSelecionado);
          
          let exchangeProductMatches = false;
          if (transaction.produto_troca_id) {
            const { data: produtoTroca } = await supabase
              .from("produto")
              .select("tipo_produto_id")
              .eq("id", transaction.produto_troca_id)
              .single();
            
            if (produtoTroca) {
              exchangeProductMatches = produtoTroca.tipo_produto_id === parseInt(tipoSelecionado);
            }
          }

          if (mainProductMatches || exchangeProductMatches) {
            filteredData.push(transaction);
          }
        }
        data = filteredData;
      }

      // Count donations and exchanges
      const doacoes = data?.filter(t => t.tipo_transacao_id === 1).length || 0;
      const trocas = data?.filter(t => t.tipo_transacao_id === 2).length || 0;

      setImpacto({
        doacoes,
        trocas,
        total: doacoes + trocas
      });
    } catch (error: any) {
      console.error("Erro ao carregar dados de impacto:", error);
      toast.error("Erro ao carregar dados de impacto");
    } finally {
      setLoading(false);
    }
  };

  const loadCO2Data = async () => {
    if (!currentUser) return;
    
    try {
      await supabase.rpc("set_user_context", { user_email: currentUser.email });

      // Query to get products with their tipo_produto and consumo_c02
      let query = supabase
        .from("historico_transacao")
        .select(`
          id,
          produto_id,
          produto_troca_id,
          produto!inner(
            tipo_produto_id,
            quantidade,
            tipo_produto!inner(
              nome,
              consumo_c02
            )
          )
        `)
        .eq("situacao_id", 2); // Concluída

      // Apply user filter only if "Meu impacto" is selected
      if (escopoImpacto === "meu") {
        query = query.or(`usuario_origem_id.eq.${currentUser.id},usuario_destino_id.eq.${currentUser.id}`);
      }

      const { data: allData, error } = await query;

      if (error) throw error;

      let data = allData;

      // Apply product type filter if selected (considering both main product and exchange product)
      if (tipoSelecionado !== "todos") {
        const filteredData = [];
        for (const transaction of allData || []) {
          const mainProductMatches = transaction.produto?.tipo_produto_id === parseInt(tipoSelecionado);
          
          let exchangeProductMatches = false;
          if (transaction.produto_troca_id) {
            const { data: produtoTroca } = await supabase
              .from("produto")
              .select("tipo_produto_id")
              .eq("id", transaction.produto_troca_id)
              .single();
            
            if (produtoTroca) {
              exchangeProductMatches = produtoTroca.tipo_produto_id === parseInt(tipoSelecionado);
            }
          }

          if (mainProductMatches || exchangeProductMatches) {
            filteredData.push(transaction);
          }
        }
        data = filteredData;
      }

      // Aggregate CO2 by product type
      const co2ByType: { [key: string]: number } = {};
      
      // Process each transaction
      for (const transaction of data || []) {
        // Process main product - only if matches filter
        const tipoProduto = transaction.produto?.tipo_produto?.nome;
        const tipoProdutoId = transaction.produto?.tipo_produto_id;
        const consumoCo2 = transaction.produto?.tipo_produto?.consumo_c02 || 0;
        
        const mainProductMatches = tipoSelecionado === "todos" || 
          tipoProdutoId === parseInt(tipoSelecionado);
        
        if (tipoProduto && mainProductMatches) {
          if (!co2ByType[tipoProduto]) {
            co2ByType[tipoProduto] = 0;
          }
          co2ByType[tipoProduto] += consumoCo2;
        }

        // Process exchange product if exists
        if (transaction.produto_troca_id) {
          const { data: produtoTroca } = await supabase
            .from("produto")
            .select(`
              tipo_produto_id,
              tipo_produto!inner(
                nome,
                consumo_c02
              )
            `)
            .eq("id", transaction.produto_troca_id)
            .single();

          if (produtoTroca) {
            // Apply product type filter to exchange product as well
            const matchesFilter = tipoSelecionado === "todos" || 
              produtoTroca.tipo_produto_id === parseInt(tipoSelecionado);
            
            if (matchesFilter) {
              const tipoProdutoTroca = produtoTroca.tipo_produto?.nome;
              const consumoCo2Troca = produtoTroca.tipo_produto?.consumo_c02 || 0;

              if (tipoProdutoTroca) {
                if (!co2ByType[tipoProdutoTroca]) {
                  co2ByType[tipoProdutoTroca] = 0;
                }
                co2ByType[tipoProdutoTroca] += consumoCo2Troca;
              }
            }
          }
        }
      }

      // Convert to array format for chart
      const chartData = Object.entries(co2ByType).map(([tipo, co2_evitado]) => ({
        tipo,
        co2_evitado: Number(co2_evitado.toFixed(2))
      })).sort((a, b) => b.co2_evitado - a.co2_evitado);

      setCo2Data(chartData);
    } catch (error: any) {
      console.error("Erro ao carregar dados de CO2:", error);
      toast.error("Erro ao carregar dados de CO2");
    }
  };

  if (!currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                <Leaf className="h-8 w-8 text-primary" />
                Impacto Ambiental
              </h1>
              <p className="text-muted-foreground">
                Visualize sua contribuição para a sustentabilidade
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              loadImpactoData();
              loadCO2Data();
            }}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>

        {/* Filter */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
            <CardDescription>Filtre os dados por tipo de produto e escopo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Tipo de Produto */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Tipo de Produto
                </label>
                <Select value={tipoSelecionado} onValueChange={setTipoSelecionado}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os tipos</SelectItem>
                    {tiposProduto.map((tipo) => (
                      <SelectItem key={tipo.id} value={tipo.id.toString()}>
                        {tipo.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Escopo de Impacto */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Escopo do Impacto
                </label>
                <RadioGroup value={escopoImpacto} onValueChange={setEscopoImpacto} className="flex gap-6">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="meu" id="meu" />
                    <Label htmlFor="meu" className="cursor-pointer">Meu impacto</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="total" id="total" />
                    <Label htmlFor="total" className="cursor-pointer">Impacto total do sistema</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Doações Card */}
          <Card className="border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Gift className="h-5 w-5 text-primary" />
                Doações
              </CardTitle>
              <CardDescription>Transações concluídas como doação</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-primary">
                {loading ? "..." : impacto.doacoes}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Total de itens doados ou recebidos
              </p>
            </CardContent>
          </Card>

          {/* Trocas Card */}
          <Card className="border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <ArrowLeftRight className="h-5 w-5 text-primary" />
                Trocas
              </CardTitle>
              <CardDescription>Transações concluídas como troca</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-primary">
                {loading ? "..." : impacto.trocas}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Total de trocas realizadas
              </p>
            </CardContent>
          </Card>

          {/* Total Card */}
          <Card className="border-primary/20 hover:border-primary/40 transition-colors bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Leaf className="h-5 w-5 text-primary" />
                Total de Transações
              </CardTitle>
              <CardDescription>Soma de todas as transações</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-primary">
                {loading ? "..." : impacto.total}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {escopoImpacto === "meu" ? "Sua contribuição sustentável" : "Contribuições sustentáveis dos usuários"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* CO2 Chart */}
        {co2Data.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Leaf className="h-5 w-5 text-primary" />
                CO2 Evitado por Tipo de Produto
              </CardTitle>
              <CardDescription>
                Consumo de CO2 em KG que foi evitado através de suas transações
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={co2Data}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="tipo" 
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--foreground))' }}
                    />
                    <YAxis 
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--foreground))' }}
                      label={{ 
                        value: 'KG CO2', 
                        angle: -90, 
                        position: 'insideLeft',
                        style: { fill: 'hsl(var(--foreground))' }
                      }}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                      formatter={(value: number) => [`${value} KG CO2`, 'CO2 Evitado']}
                    />
                    <Legend 
                      wrapperStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Bar 
                      dataKey="co2_evitado" 
                      fill="hsl(var(--primary))" 
                      name="CO2 Evitado (KG)"
                      radius={[8, 8, 0, 0]}
                      barSize={60}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 p-4 bg-primary/5 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Total de CO2 evitado:</strong>{" "}
                  {co2Data.reduce((sum, item) => sum + item.co2_evitado, 0).toFixed(2)} KG CO2
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Impact Message */}
        {impacto.total > 0 && escopoImpacto === "meu" && (
          <Card className="bg-primary/10 border-primary/30">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <Leaf className="h-8 w-8 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Parabéns pelo seu impacto ambiental!
                  </h3>
                  <p className="text-muted-foreground">
                    Você já realizou {impacto.total} {impacto.total !== 1 ? "transações sustentáveis" : "transação sustentável"}! 
                    Cada item doado ou trocado reduz o desperdício e contribui para um planeta mais sustentável.
                    Continue compartilhando e fazendo a diferença!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
