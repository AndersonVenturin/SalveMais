import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Register from "./pages/Register";
import ConfirmEmail from "./pages/ConfirmEmail";
import Dashboard from "./pages/Dashboard";
import CadastrarProduto from "./pages/CadastrarProduto";
import BuscarProdutos from "./pages/BuscarProdutos";
import DetalheProduto from "./pages/DetalheProduto";
import MeusProdutos from "./pages/MeusProdutos";
import Solicitacoes from "./pages/Solicitacoes";
import Historico from "./pages/Historico";
import HistoricoDetalhado from "./pages/HistoricoDetalhado";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/register" element={<Register />} />
          <Route path="/confirm-email" element={<ConfirmEmail />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/cadastrar-produto" element={<CadastrarProduto />} />
          <Route path="/buscar-produtos" element={<BuscarProdutos />} />
          <Route path="/produto/:id" element={<DetalheProduto />} />
          <Route path="/meus-produtos" element={<MeusProdutos />} />
          <Route path="/solicitacoes" element={<Solicitacoes />} />
          <Route path="/historico" element={<Historico />} />
          <Route path="/historico-detalhado/:id" element={<HistoricoDetalhado />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
