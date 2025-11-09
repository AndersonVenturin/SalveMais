import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface NotificationBellProps {
  currentUser: any;
}

export const NotificationBell = ({ currentUser }: NotificationBellProps) => {
  const [pendingRequests, setPendingRequests] = useState<number>(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!currentUser?.id) return;
    
    console.log('NotificationBell - currentUser:', currentUser);

    const fetchPendingRequests = async () => {
      try {
        // Ensure RLS context for current user
        await supabase.rpc('set_user_context', { user_email: currentUser.email });

        // Get situation IDs
        const { data: allSituacoes, error: situacaoError } = await supabase
          .from('situacao')
          .select('id, nome');

        if (situacaoError) throw situacaoError;

        const situacaoPendente = allSituacoes?.find(s => s.nome.toLowerCase() === 'pendente');
        if (!situacaoPendente) return;

        let totalCount = 0;

        // 1) Count pending requests for this user's products (received requests)
        const { data: pendingRequests, error: pendingError } = await (supabase as any)
          .from('historico_transacao')
          .select(`
            id, 
            produto_id,
            produto!inner(usuario_id)
          `)
          .eq('situacao_id', situacaoPendente.id)
          .eq('produto.usuario_id', currentUser.id);

        if (pendingError) throw pendingError;
        
        totalCount += pendingRequests?.length || 0;

        // 2) Count responded requests where user is the requester (sent requests)
        const { data: respondedRequests, error: respondedError } = await (supabase as any)
          .from('historico_transacao')
          .select('id')
          .eq('usuario_origem_id', currentUser.id)
          .neq('situacao_id', situacaoPendente.id);

        if (respondedError) throw respondedError;

        if (respondedRequests && respondedRequests.length > 0) {
          // Check which ones are not read yet
          const { data: readNotifications, error: readError } = await (supabase as any)
            .from('notificacao_lida')
            .select('historico_transacao_id')
            .eq('usuario_id', currentUser.id)
            .in('historico_transacao_id', respondedRequests.map((r: any) => r.id));

          if (readError) throw readError;

          const readTransactionIds = new Set(readNotifications?.map((r: any) => r.historico_transacao_id) || []);
          const unreadCount = respondedRequests.filter((r: any) => !readTransactionIds.has(r.id)).length;
          
          totalCount += unreadCount;
        }

        setPendingRequests(totalCount);

        console.log('NotificationBell - total notification count:', totalCount);
      } catch (error) {
        console.error('Error fetching pending requests:', error);
      }
    };

    fetchPendingRequests();

    // Set up real-time subscription for new or updated requests
    const channel = supabase
      .channel('pending-requests')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'historico_transacao'
        },
        () => {
          fetchPendingRequests();
          toast({
            title: 'Nova solicitação recebida!',
            description: 'Você recebeu uma nova solicitação para um dos seus produtos.'
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'historico_transacao'
        },
        () => {
          // A request was updated (e.g., responded). Recalculate counts.
          fetchPendingRequests();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notificacao_lida'
        },
        () => {
          // A notification was marked as read. Recalculate counts.
          fetchPendingRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id, toast]);

  const handleNotificationClick = () => {
    navigate('/solicitacoes');
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleNotificationClick}
        className="relative"
      >
        <Bell className="h-5 w-5" />
        {pendingRequests > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
          >
            {pendingRequests}
          </Badge>
        )}
      </Button>
    </div>
  );
};