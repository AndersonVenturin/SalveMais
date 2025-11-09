import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Package, Search, LogOut, List, BarChart3, History } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { NotificationBell } from "@/components/NotificationBell";
import salveLogo from "@/assets/salve-logo.png";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    document.title = "Salve+ - Dashboard";
  }, []);

  useEffect(() => {
    const checkUser = async () => {
      // Verificar se há usuário no localStorage primeiro
      const localUser = localStorage.getItem('user');
      if (localUser) {
        const userData = JSON.parse(localUser);
        setCurrentUser(userData);
        console.log("Usuário encontrado no localStorage:", userData);
        return;
      }

      // Se não há usuário no localStorage, verificar Supabase Auth
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log("Usuário não autenticado, redirecionando para login");
        navigate('/');
        return;
      }
      
      setUser(user);

      // Buscar dados do usuário na tabela usuario
      const { data: userData } = await supabase
        .from('usuario')
        .select('*')
        .eq('email', user.email)
        .single();
      
      setCurrentUser(userData);
    };

    checkUser();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('user');
    navigate('/');
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img 
                src={salveLogo} 
                alt="Salve+" 
                className="h-10 w-auto"
              />
              <div>
                <h1 className="text-xl font-bold text-foreground">Sistema Salve+</h1>
                <p className="text-sm text-muted-foreground">Gestão de Produtos</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <NotificationBell currentUser={currentUser} />
              <button 
                onClick={() => navigate(`/perfil-usuario/${currentUser.id}`)}
                className="text-right hover:opacity-80 transition-opacity"
              >
                <p className="text-sm font-medium text-foreground hover:underline">{currentUser.nome}</p>
                <p className="text-xs text-muted-foreground">{currentUser.email}</p>
              </button>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Bem-vindo,{' '}
            <button
              onClick={() => navigate(`/perfil-usuario/${currentUser.id}`)}
              className="text-primary hover:underline"
            >
              {currentUser.nome}
            </button>
            !
          </h2>
          <p className="text-muted-foreground">
            Escolha uma das opções abaixo para gerenciar seus produtos.
          </p>
        </div>

        {/* Menu Cards */}
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-5">
          {/* Cadastrar Produto */}
          <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer group border-2 hover:border-primary/20 flex flex-col">
            <CardHeader className="pb-4 flex-1">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Plus className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-lg">Cadastrar Produto</CardTitle>
              <CardDescription>
                Adicione um novo produto ao sistema com todas as informações necessárias
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button 
                className="w-full"
                onClick={() => {
                  console.log("Navegando para cadastrar produto...");
                  navigate('/cadastrar-produto');
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Novo Produto
              </Button>
            </CardContent>
          </Card>

          {/* Meus Produtos */}
          <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer group border-2 hover:border-primary/20 flex flex-col">
            <CardHeader className="pb-4 flex-1">
              <div className="w-12 h-12 bg-secondary/50 rounded-lg flex items-center justify-center mb-4 group-hover:bg-secondary/70 transition-colors">
                <Package className="h-6 w-6 text-secondary-foreground" />
              </div>
              <CardTitle className="text-lg">Meus Produtos</CardTitle>
              <CardDescription>
                Visualize, edite e gerencie todos os produtos que você cadastrou
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button 
                variant="secondary" 
                className="w-full"
                onClick={() => navigate('/meus-produtos')}
              >
                <List className="h-4 w-4 mr-2" />
                Ver Produtos
              </Button>
            </CardContent>
          </Card>

          {/* Buscar Produtos */}
          <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer group border-2 hover:border-primary/20 flex flex-col">
            <CardHeader className="pb-4 flex-1">
              <div className="w-12 h-12 bg-accent/50 rounded-lg flex items-center justify-center mb-4 group-hover:bg-accent/70 transition-colors">
                <Search className="h-6 w-6 text-accent-foreground" />
              </div>
              <CardTitle className="text-lg">Buscar Produtos</CardTitle>
              <CardDescription>
                Encontre produtos por nome, tipo, município ou transação
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate('/buscar-produtos')}
              >
                <Search className="h-4 w-4 mr-2" />
                Buscar Produtos
              </Button>
            </CardContent>
          </Card>

          {/* Histórico */}
          <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer group border-2 hover:border-primary/20 flex flex-col">
            <CardHeader className="pb-4 flex-1">
              <div className="w-12 h-12 bg-accent/50 rounded-lg flex items-center justify-center mb-4 group-hover:bg-accent/70 transition-colors">
                <History className="h-6 w-6 text-accent-foreground" />
              </div>
              <CardTitle className="text-lg">Histórico</CardTitle>
              <CardDescription>
                Visualize o histórico de doações e trocas realizadas
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate('/historico')}
              >
                <History className="h-4 w-4 mr-2" />
                Ver Histórico
              </Button>
            </CardContent>
          </Card>

          {/* Relatórios */}
          <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer group border-2 hover:border-primary/20 flex flex-col">
            <CardHeader className="pb-4 flex-1">
              <div className="w-12 h-12 bg-accent/50 rounded-lg flex items-center justify-center mb-4 group-hover:bg-accent/70 transition-colors">
                <BarChart3 className="h-6 w-6 text-accent-foreground" />
              </div>
              <CardTitle className="text-lg">Relatórios</CardTitle>
              <CardDescription>
                Visualize estatísticas e relatórios dos seus produtos cadastrados
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button variant="outline" className="w-full">
                <BarChart3 className="h-4 w-4 mr-2" />
                Ver Relatórios
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;