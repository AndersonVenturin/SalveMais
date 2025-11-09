import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StarRating } from "./StarRating";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface AvaliacaoModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    dataTransacao: Date;
    avaliacaoProduto: number;
    observacaoProduto: string;
    avaliacaoUsuario: number;
    observacaoUsuario: string;
  }) => void;
  isProductOwner?: boolean;
  usuarioAvaliadoNome?: string;
}

export const AvaliacaoModal = ({ open, onClose, onSubmit, isProductOwner = false, usuarioAvaliadoNome }: AvaliacaoModalProps) => {
  const [dataTransacao, setDataTransacao] = useState<Date>();
  const [avaliacaoProduto, setAvaliacaoProduto] = useState(0);
  const [observacaoProduto, setObservacaoProduto] = useState("");
  const [avaliacaoUsuario, setAvaliacaoUsuario] = useState(0);
  const [observacaoUsuario, setObservacaoUsuario] = useState("");

  const handleSubmit = () => {
    if (!isProductOwner && !dataTransacao) {
      return;
    }

    onSubmit({
      dataTransacao: dataTransacao || new Date(),
      avaliacaoProduto: isProductOwner ? 0 : avaliacaoProduto,
      observacaoProduto: isProductOwner ? '' : observacaoProduto,
      avaliacaoUsuario,
      observacaoUsuario,
    });

    // Reset form
    setDataTransacao(undefined);
    setAvaliacaoProduto(0);
    setObservacaoProduto("");
    setAvaliacaoUsuario(0);
    setObservacaoUsuario("");
  };

  const isValid = avaliacaoUsuario > 0 && (isProductOwner || (dataTransacao && avaliacaoProduto > 0));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Avaliar Transação</DialogTitle>
          <DialogDescription>
            {isProductOwner 
              ? 'Avalie o usuário envolvido nesta transação' 
              : 'Avalie o produto e o usuário envolvido nesta transação'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Data de Recebimento - oculto para dono do produto */}
          {!isProductOwner && (
            <div className="space-y-2">
              <Label>Data de Recebimento *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dataTransacao && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dataTransacao ? format(dataTransacao, "PPP", { locale: ptBR }) : "Selecione a data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dataTransacao}
                    onSelect={setDataTransacao}
                    initialFocus
                    locale={ptBR}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Avaliação do Produto - oculto para dono do produto */}
          {!isProductOwner && (
            <div className="space-y-3">
              <Label className="text-base font-semibold">Avalie o produto</Label>
              <div className="space-y-2">
                <StarRating rating={avaliacaoProduto} onRatingChange={setAvaliacaoProduto} />
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="obs-produto" className="text-sm">
                      Observação (opcional)
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      {observacaoProduto.length}/200
                    </span>
                  </div>
                  <Textarea
                    id="obs-produto"
                    value={observacaoProduto}
                    onChange={(e) => {
                      if (e.target.value.length <= 200) {
                        setObservacaoProduto(e.target.value);
                      }
                    }}
                    placeholder="Digite sua observação sobre o produto..."
                    rows={3}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Avaliação do Usuário */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">
              Avalie o usuário{usuarioAvaliadoNome && ` - ${usuarioAvaliadoNome}`}
            </Label>
            <div className="space-y-2">
              <StarRating rating={avaliacaoUsuario} onRatingChange={setAvaliacaoUsuario} />
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <Label htmlFor="obs-usuario" className="text-sm">
                    Observação (opcional)
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    {observacaoUsuario.length}/200
                  </span>
                </div>
                <Textarea
                  id="obs-usuario"
                  value={observacaoUsuario}
                  onChange={(e) => {
                    if (e.target.value.length <= 200) {
                      setObservacaoUsuario(e.target.value);
                    }
                  }}
                  placeholder="Digite sua observação sobre o usuário..."
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={!isValid} className="flex-1">
              Enviar Avaliação
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
