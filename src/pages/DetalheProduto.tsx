import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Package, MapPin, User, Clock, Edit, Save, X, Upload, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import salveLogo from "@/assets/salve-logo.png";
import { ufs, fetchMunicipios } from "@/lib/location-data";
import imageCompression from 'browser-image-compression';
import { formatInTimeZone, toZonedTime } from "date-fns-tz";

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
    }
  }, [currentUser, id]);

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
                    <span>{produto.usuario.nome}</span>
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
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                      Solicitar Produto
                    </Button>
                  </div>
                )
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default DetalheProduto;