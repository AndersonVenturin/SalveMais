import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Upload, X, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ufs, tiposContato, formatPhone, isValidEmail, fetchUFs, fetchMunicipios } from "@/lib/location-data";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatInTimeZone } from 'date-fns-tz';
import imageCompression from 'browser-image-compression';

const formSchema = z.object({
  nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  descricao: z.string().min(1, "Descrição é obrigatória"),
  quantidade: z.number().min(1, "Quantidade deve ser maior que 0"),
  tipo_produto_id: z.string().min(1, "Tipo de produto é obrigatório"),
  tipo_transacao_id: z.string().min(1, "Tipo de transação é obrigatório"),
  uf: z.string().min(1, "UF é obrigatória"),
  municipio: z.string().min(1, "Município é obrigatório"),
  tipo_contato: z.string().min(1, "Tipo de contato é obrigatório"),
  contato: z.string().min(1, "Contato é obrigatório"),
}).refine((data) => {
  if (data.tipo_contato === "email") {
    return isValidEmail(data.contato);
  }
  if (data.tipo_contato === "telefone") {
    const numbers = data.contato.replace(/\D/g, '');
    return numbers.length >= 10 && numbers.length <= 11;
  }
  return true;
}, {
  message: "Formato de contato inválido",
  path: ["contato"],
});

type FormData = z.infer<typeof formSchema>;

const CadastrarProduto = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [tiposProduto, setTiposProduto] = useState<any[]>([]);
  const [tiposTransacao, setTiposTransacao] = useState<any[]>([]);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedUf, setSelectedUf] = useState<string>("");
  const [availableMunicipios, setAvailableMunicipios] = useState<string[]>([]);
  const [ufOpen, setUfOpen] = useState(false);
  const [municipioOpen, setMunicipioOpen] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: "",
      descricao: "",
      quantidade: 1,
      tipo_produto_id: "",
      tipo_transacao_id: "",
      uf: "",
      municipio: "",
      tipo_contato: "",
      contato: "",
    },
  });

  useEffect(() => {
    document.title = "Salve+ - Cadastrar produto";
    
    const checkUser = async () => {
      console.log("CadastrarProduto: Verificando usuário...");
      
      // Verificar se há usuário no localStorage primeiro
      const localUser = localStorage.getItem('user');
      if (localUser) {
        try {
          const userData = JSON.parse(localUser);
          console.log("CadastrarProduto: Usuário do localStorage:", userData);
          setCurrentUser(userData);
          setUser(userData); // Também definir user para compatibilidade
          return;
        } catch (error) {
          console.error("Erro ao parsear usuário do localStorage:", error);
          localStorage.removeItem('user');
        }
      }

      // Se não há usuário no localStorage, verificar Supabase Auth
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log("CadastrarProduto: Usuário não autenticado, redirecionando");
        navigate('/');
        return;
      }
      
      console.log("CadastrarProduto: Usuário do Supabase:", user);
      setUser(user);

      // Buscar dados do usuário na tabela usuario
      const { data: userData, error } = await supabase
        .from('usuario')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error) {
        console.error("Erro ao buscar dados do usuário:", error);
      } else {
        console.log("CadastrarProduto: Dados do usuário da tabela:", userData);
        setCurrentUser(userData);
      }
    };

    const loadData = async () => {
      console.log("CadastrarProduto: Carregando tipos de produto e transação...");
      
      // Carregar tipos de produto
      const { data: tipos } = await supabase
        .from('tipo_produto')
        .select('*')
        .order('nome');
      setTiposProduto(tipos || []);

      // Carregar tipos de transação
      const { data: transacoes } = await supabase
        .from('tipo_transacao')
        .select('*')
        .order('nome');
      setTiposTransacao(transacoes || []);
    };

    checkUser();
    loadData();
  }, [navigate]);

  // Atualizar municípios quando UF mudar
  useEffect(() => {
    const loadMunicipios = async () => {
      if (selectedUf) {
        console.log("Carregando municípios para UF:", selectedUf);
        const municipios = await fetchMunicipios(selectedUf);
        setAvailableMunicipios(municipios);
        // Limpar município selecionado quando UF mudar
        form.setValue('municipio', '');
      }
    };
    
    loadMunicipios();
  }, [selectedUf, form]);

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Verificar tamanho antes da compressão
      const maxSizeInBytes = 100 * 1024; // 100KB
      
      try {
        let processedFile = file;
        
        // Se o arquivo é maior que 100KB, comprimir
        if (file.size > maxSizeInBytes) {
          const options = {
            maxSizeMB: 0.1, // 100KB
            maxWidthOrHeight: 1024,
            useWebWorker: true,
            fileType: 'image/jpeg',
            initialQuality: 0.7,
          };
          
          processedFile = await imageCompression(file, options);
          
          // Verificar se após compressão ainda está maior que 100KB
          if (processedFile.size > maxSizeInBytes) {
            toast({
              title: "Erro",
              description: "O tamanho da foto é maior que o limite permitido.",
              variant: "destructive",
            });
            return;
          }
        }
        
        setSelectedImage(processedFile);
        const reader = new FileReader();
        reader.onload = (e) => {
          setImagePreview(e.target?.result as string);
        };
        reader.readAsDataURL(processedFile);
      } catch (error) {
        console.error('Erro ao processar imagem:', error);
        toast({
          title: "Erro",
          description: "Falha ao processar a imagem. Tente novamente.",
          variant: "destructive",
        });
      }
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  const onSubmit = async (data: FormData) => {
    console.log("=== INICIO DO SUBMIT ===");
    console.log("Dados do formulário:", data);
    console.log("CurrentUser:", currentUser);
    console.log("User (Supabase):", user);
    
    // Usar a mesma lógica de autenticação do sistema
    let usuarioId = null;
    
    // Primeira opção: usar currentUser se disponível
    if (currentUser && currentUser.id) {
      usuarioId = currentUser.id;
      console.log("Usando ID do currentUser:", usuarioId);
    } else {
      // Segunda opção: buscar no localStorage
      const localUser = localStorage.getItem('user');
      if (localUser) {
        try {
          const userData = JSON.parse(localUser);
          usuarioId = userData.id;
          console.log("Usando ID do localStorage:", usuarioId);
        } catch (error) {
          console.error("Erro ao parsear localStorage:", error);
        }
      }
    }
    
    // Terceira opção: tentar buscar via Supabase Auth se user_id estiver disponível
    if (!usuarioId) {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        console.log("Tentando buscar usuário via Supabase Auth:", authUser.id);
        const { data: userData, error: userError } = await supabase
          .from('usuario')
          .select('*')
          .eq('user_id', authUser.id)
          .maybeSingle();

        if (userData && !userError) {
          usuarioId = userData.id;
          console.log("Usando ID do usuário via Supabase Auth:", usuarioId);
        }
      }
    }
    
    if (!usuarioId) {
      console.error("ERRO: Nenhum ID de usuário encontrado");
      toast({
        title: "Erro",
        description: "Usuário não encontrado. Faça login novamente.",
        variant: "destructive",
      });
      navigate('/');
      return;
    }

    setLoading(true);

    try {
      // Obter horário de São Paulo
      const saoPauloTime = formatInTimeZone(new Date(), 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ss.SSSXXX");
      
      // Inserir produto
      const { data: produto, error: produtoError } = await supabase
        .from('produto')
        .insert([
          {
            nome: data.nome,
            descricao: data.descricao,
            quantidade: data.quantidade,
            tipo_produto_id: parseInt(data.tipo_produto_id),
            tipo_transacao_id: parseInt(data.tipo_transacao_id),
            uf: data.uf,
            municipio: data.municipio,
            contato: data.contato,
            usuario_id: usuarioId,
            data_insercao: saoPauloTime,
          },
        ])
        .select()
        .single();

      if (produtoError) {
        throw produtoError;
      }

      // Salvar imagem como base64 se houver
      if (selectedImage && produto) {
        try {
          // Converter imagem para base64
          const reader = new FileReader();
          const base64Promise = new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(selectedImage);
          });

          const base64String = await base64Promise;
          
          // Inserir foto na tabela produto_foto
          const { error: fotoError } = await supabase
            .from('produto_foto')
            .insert([
              {
                produto_id: produto.id,
                foto: base64String,
                data_insercao: saoPauloTime,
              },
            ]);

          if (fotoError) {
            console.error('Erro ao registrar foto:', fotoError);
            throw new Error('Falha ao registrar a foto. Tente novamente.');
          }
        } catch (photoError) {
          console.error('Erro ao processar/salvar imagem:', photoError);
          if (photoError instanceof Error) {
            throw photoError;
          } else {
            throw new Error('Falha ao registrar a foto. Tente novamente.');
          }
        }
      }

      toast({
        title: "Sucesso",
        description: "Produto cadastrado com sucesso!",
      });

      navigate('/dashboard');
    } catch (error: any) {
      console.error('Erro ao cadastrar produto:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao cadastrar produto",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
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
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/dashboard')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold text-foreground">Cadastrar Produto</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Informações do Produto</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Produto</FormLabel>
                      <FormControl>
                        <Input placeholder="Digite o nome do produto" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="descricao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Descreva o produto"
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="quantidade"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantidade</FormLabel>
                        <FormControl>
                          <Select
                            value={field.value?.toString()}
                            onValueChange={(value) => field.onChange(parseInt(value))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 100 }, (_, i) => i + 1).map((num) => (
                                <SelectItem key={num} value={num.toString()}>
                                  {num}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tipo_produto_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Produto</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} value={field.value}>
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
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="tipo_transacao_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Transação</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo de transação" />
                          </SelectTrigger>
                          <SelectContent>
                            {tiposTransacao.map((tipo) => (
                              <SelectItem key={tipo.id} value={tipo.id.toString()}>
                                {tipo.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="uf"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estado (UF)</FormLabel>
                        <Popover open={ufOpen} onOpenChange={setUfOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between"
                              >
                                {field.value
                                  ? ufs.find((uf) => uf.sigla === field.value)?.nome + ` (${field.value})`
                                  : "Selecione o estado"}
                                <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0">
                            <Command>
                              <CommandInput placeholder="Buscar estado..." />
                              <CommandEmpty>Nenhum estado encontrado.</CommandEmpty>
                              <CommandGroup>
                                <CommandList>
                                  {ufs.map((uf) => (
                                    <CommandItem
                                      key={uf.sigla}
                                      value={uf.nome}
                                      onSelect={() => {
                                        field.onChange(uf.sigla);
                                        setSelectedUf(uf.sigla);
                                        setUfOpen(false);
                                      }}
                                    >
                                      {uf.nome} ({uf.sigla})
                                    </CommandItem>
                                  ))}
                                </CommandList>
                              </CommandGroup>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="municipio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Município</FormLabel>
                        <Popover open={municipioOpen} onOpenChange={setMunicipioOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between"
                                disabled={!selectedUf}
                              >
                                {field.value || "Selecione o município"}
                                <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0">
                            <Command>
                              <CommandInput placeholder="Buscar município..." />
                              <CommandEmpty>Nenhum município encontrado.</CommandEmpty>
                              <CommandGroup>
                                <CommandList>
                                  {availableMunicipios.map((municipio) => (
                                    <CommandItem
                                      key={municipio}
                                      value={municipio}
                                      onSelect={() => {
                                        field.onChange(municipio);
                                        setMunicipioOpen(false);
                                      }}
                                    >
                                      {municipio}
                                    </CommandItem>
                                  ))}
                                </CommandList>
                              </CommandGroup>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="tipo_contato"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Contato</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                            <SelectContent>
                              {tiposContato.map((tipo) => (
                                <SelectItem key={tipo.value} value={tipo.value}>
                                  {tipo.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contato"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contato</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={
                              form.watch("tipo_contato") === "telefone"
                                ? "(11) 99999-9999"
                                : form.watch("tipo_contato") === "email"
                                ? "exemplo@email.com"
                                : "Selecione o tipo primeiro"
                            }
                            {...field}
                            onChange={(e) => {
                              const tipoContato = form.watch("tipo_contato");
                              if (tipoContato === "telefone") {
                                const formatted = formatPhone(e.target.value);
                                field.onChange(formatted);
                              } else {
                                field.onChange(e.target.value);
                              }
                            }}
                            disabled={!form.watch("tipo_contato")}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4">
                  <FormLabel>Imagem do Produto</FormLabel>
                  {imagePreview ? (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-48 object-cover rounded-md border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={removeImage}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-md p-8 text-center">
                      <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                      <div className="mt-4">
                        <label htmlFor="image-upload">
                          <span className="cursor-pointer text-primary hover:underline">
                            Clique para adicionar uma imagem
                          </span>
                          <input
                            id="image-upload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageChange}
                          />
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Salvando..." : "Salvar Produto"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default CadastrarProduto;