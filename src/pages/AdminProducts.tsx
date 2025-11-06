import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Plus, Package, Upload, Link, Image, DollarSign, Trash2, Edit, MoreVertical, MonitorDot, XCircle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; // Importar Select
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types'; // Importar Tables

type MemberArea = Tables<'member_areas'>;

const AdminProducts = () => {
  const {
    user,
    isAdmin,
    loading
  } = useAuth();
  const {
    toast
  } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [memberAreas, setMemberAreas] = useState<MemberArea[]>([]); // Novo estado para áreas de membros
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    banner: null as File | null,
    logo: null as File | null,
    deliveryType: 'link' as 'link' | 'upload' | 'deliverableLink',
    memberAreaLink: '',
    deliverable: null as File | null,
    deliverableLink: '',
    accessUrl: '',
    emailTemplate: '',
    orderBumps: [{
      id: 1,
      name: '',
      description: '',
      price: 0,
      enabled: false
    }],
    member_area_id: '' as string | null, // Novo campo para member_area_id
  });

  useEffect(() => {
    if (user && isAdmin) {
      fetchProducts();
      fetchMemberAreas(); // Buscar áreas de membros
    }
  }, [user, isAdmin]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*, member_areas(name, slug)') // Incluir nome e slug da área de membros
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('ADMIN_PRODUCTS_DEBUG: Erro ao carregar produtos:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os produtos",
        variant: "destructive"
      });
    }
  };

  const fetchMemberAreas = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('member_areas')
        .select('id, name, slug')
        .eq('user_id', user.id);
      if (error) throw error;
      setMemberAreas(data || []);
    } catch (error) {
      console.error('ADMIN_PRODUCTS_DEBUG: Erro ao carregar áreas de membros:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as áreas de membros",
        variant: "destructive"
      });
    }
  };

  const uploadFile = async (file: File, folder: string) => {
    console.log(`ADMIN_PRODUCTS_DEBUG: Iniciando upload de arquivo: ${file.name} para a pasta: ${folder}`);
    const fileExt = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    try {
      console.log(`ADMIN_PRODUCTS_DEBUG: Chamando supabase.storage.from('products').upload para ${filePath}`);
      const { data: uploadData, error: uploadError } = await supabase.storage // Capturar data e error
        .from('products')
        .upload(filePath, file);

      if (uploadError) {
        console.error(`ADMIN_PRODUCTS_DEBUG: ERRO NO UPLOAD DO ARQUIVO ${file.name}:`, uploadError);
        throw uploadError;
      }
      console.log(`ADMIN_PRODUCTS_DEBUG: Upload concluído. Dados do upload:`, uploadData); // Log do retorno do upload

      const { data } = supabase.storage
        .from('products')
        .getPublicUrl(filePath);

      console.log(`ADMIN_PRODUCTS_DEBUG: Arquivo ${file.name} enviado com sucesso. URL: ${data.publicUrl}`);
      return data.publicUrl;
    } catch (error) {
      console.error(`ADMIN_PRODUCTS_DEBUG: EXCEÇÃO DURANTE O UPLOAD DO ARQUIVO ${file.name}:`, error);
      throw error; // Re-throw para ser capturado pelo handleSubmit/handleUpdate
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }
  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }
  const handleInputChange = (field: string, value: string | null) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  const handleFileChange = (field: string, file: File | null) => {
    setFormData(prev => ({
      ...prev,
      [field]: file
    }));
  };
  const addOrderBump = () => {
    setFormData(prev => ({
      ...prev,
      orderBumps: [...prev.orderBumps, {
        id: Date.now(),
        name: '',
        description: '',
        price: 0,
        enabled: false
      }]
    }));
  };
  const removeOrderBump = (id: number) => {
    setFormData(prev => ({
      ...prev,
      orderBumps: prev.orderBumps.filter(bump => bump.id !== id)
    }));
  };
  const updateOrderBump = (id: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      orderBumps: prev.orderBumps.map(bump => bump.id === id ? {
        ...bump,
        [field]: value
      } : bump)
    }));
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.description || !formData.price) {
      toast({
        title: "Erro",
        description: "Nome, descrição e preço são obrigatórios",
        variant: "destructive"
      });
      setIsLoading(false); // Ensure loading is false on validation error
      return;
    }
    
    if (formData.deliveryType === 'link' && !formData.memberAreaLink) {
      toast({
        title: "Erro",
        description: "Link da área de membros é obrigatório",
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }
    
    if (formData.deliveryType === 'upload' && !formData.deliverable) {
      toast({
        title: "Erro",
        description: "Arquivo entregável é obrigatório",
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }

    if (formData.deliveryType === 'deliverableLink' && !formData.deliverableLink) {
      toast({
        title: "Erro",
        description: "Link do entregável é obrigatório",
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    console.log('ADMIN_PRODUCTS_DEBUG: Iniciando handleSubmit (criar produto).');
    try {
      let bannerUrl = null;
      let logoUrl = null;
      let fileUrl = null;

      // Upload banner if exists
      if (formData.banner) {
        console.log('ADMIN_PRODUCTS_DEBUG: Tentando upload do banner.');
        bannerUrl = await uploadFile(formData.banner, 'banners');
      }

      // Upload logo if exists
      if (formData.logo) {
        console.log('ADMIN_PRODUCTS_DEBUG: Tentando upload do logo.');
        logoUrl = await uploadFile(formData.logo, 'logos');
      }

      // Upload deliverable if exists
      if (formData.deliverable) {
        console.log('ADMIN_PRODUCTS_DEBUG: Tentando upload do entregável.');
        fileUrl = await uploadFile(formData.deliverable, 'deliverables');
      } else if (formData.deliveryType === 'deliverableLink') {
        console.log('ADMIN_PRODUCTS_DEBUG: Usando link direto para entregável.');
        fileUrl = formData.deliverableLink;
      }

      console.log('ADMIN_PRODUCTS_DEBUG: Dados para inserção no DB:', {
        user_id: user?.id,
        member_area_id: formData.member_area_id,
        name: formData.name,
        description: formData.description,
        price: parseInt(formData.price) * 100,
        banner_url: bannerUrl,
        logo_url: logoUrl,
        file_url: fileUrl,
        member_area_link: formData.deliveryType === 'link' ? formData.memberAreaLink : null,
        access_url: formData.accessUrl,
        email_template: formData.emailTemplate,
      });

      // Create product in database
      const { error } = await supabase
        .from('products')
        .insert({
          user_id: user?.id, // Adicionar user_id
          member_area_id: formData.member_area_id || null, // Adicionar member_area_id
          name: formData.name,
          description: formData.description,
          price: parseInt(formData.price) * 100, // Convert to cents
          banner_url: bannerUrl,
          logo_url: logoUrl,
          file_url: fileUrl, // Save deliverable link here
          member_area_link: formData.deliveryType === 'link' ? formData.memberAreaLink : null,
          access_url: formData.accessUrl, // Salvar access_url
          email_template: formData.emailTemplate, // Salvar email_template
        });

      if (error) {
        console.error('ADMIN_PRODUCTS_DEBUG: ERRO AO INSERIR PRODUTO NO DB:', error);
        throw error;
      }

      toast({
        title: "Sucesso",
        description: "Produto criado com sucesso!"
      });

      setIsDialogOpen(false);
      setFormData({
        name: '',
        description: '',
        price: '',
        banner: null,
        logo: null,
        deliveryType: 'link',
        memberAreaLink: '',
        deliverable: null,
        deliverableLink: '',
        accessUrl: '',
        emailTemplate: '',
        orderBumps: [{
          id: 1,
          name: '',
          description: '',
          price: 0,
          enabled: false
        }],
        member_area_id: null,
      });

      // Refresh products list
      fetchProducts();
    } catch (error: any) {
      console.error('ADMIN_PRODUCTS_DEBUG: Erro ao criar produto (catch block):', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível criar o produto",
        variant: "destructive"
      });
    } finally {
      console.log('ADMIN_PRODUCTS_DEBUG: Finalizando handleSubmit (criar produto).');
      setIsLoading(false);
    }
  };

  const handleEdit = (product: any) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      price: (product.price / 100).toString(),
      banner: null,
      logo: null,
      deliveryType: product.member_area_link ? 'link' : (product.file_url && !product.file_url.startsWith('http') ? 'upload' : (product.file_url ? 'deliverableLink' : 'link')), // Determine delivery type
      memberAreaLink: product.member_area_link || '',
      deliverable: null,
      deliverableLink: product.file_url && product.file_url.startsWith('http') ? product.file_url : '', // Load deliverable link
      accessUrl: product.access_url || '', // Carregar access_url
      emailTemplate: product.email_template || '', // Carregar email_template
      orderBumps: [{
        id: 1,
        name: '',
        description: '',
        price: 0,
        enabled: false
      }],
      member_area_id: product.member_area_id || null, // Carregar member_area_id
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (productId: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Produto excluído com sucesso!"
      });

      fetchProducts();
    } catch (error) {
      console.error('ADMIN_PRODUCTS_DEBUG: Erro ao excluir produto:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o produto",
        variant: "destructive"
      });
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.description || !formData.price) {
      toast({
        title: "Erro",
        description: "Nome, descrição e preço são obrigatórios",
        variant: "destructive"
      });
      setIsLoading(false); // Ensure loading is false on validation error
      return;
    }

    if (formData.deliveryType === 'link' && !formData.memberAreaLink) {
      toast({
        title: "Erro",
        description: "Link da área de membros é obrigatório",
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }
    
    if (formData.deliveryType === 'upload' && !formData.deliverable && !editingProduct?.file_url) {
      toast({
        title: "Erro",
        description: "Arquivo entregável é obrigatório",
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }

    if (formData.deliveryType === 'deliverableLink' && !formData.deliverableLink) {
      toast({
        title: "Erro",
        description: "Link do entregável é obrigatório",
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    console.log('ADMIN_PRODUCTS_DEBUG: Iniciando handleUpdate (atualizar produto).');
    try {
      let bannerUrl = editingProduct.banner_url;
      let logoUrl = editingProduct.logo_url;
      let fileUrl = editingProduct.file_url;
      let memberAreaLink = editingProduct.member_area_link;

      // Upload new files if provided
      if (formData.banner) {
        console.log('ADMIN_PRODUCTS_DEBUG: Tentando upload do novo banner.');
        bannerUrl = await uploadFile(formData.banner, 'banners');
      }

      if (formData.logo) {
        console.log('ADMIN_PRODUCTS_DEBUG: Tentando upload do novo logo.');
        logoUrl = await uploadFile(formData.logo, 'logos');
      }

      if (formData.deliveryType === 'upload' && formData.deliverable) {
        console.log('ADMIN_PRODUCTS_DEBUG: Tentando upload do novo entregável.');
        fileUrl = await uploadFile(formData.deliverable, 'deliverables');
        memberAreaLink = null; // Clear member area link if uploading
      } else if (formData.deliveryType === 'deliverableLink') {
        console.log('ADMIN_PRODUCTS_DEBUG: Usando novo link direto para entregável.');
        fileUrl = formData.deliverableLink;
        memberAreaLink = null; // Clear member area link if using deliverable link
      } else if (formData.deliveryType === 'link') {
        console.log('ADMIN_PRODUCTS_DEBUG: Usando novo link da área de membros.');
        memberAreaLink = formData.memberAreaLink;
        fileUrl = null; // Clear file url if using member area link
      } else {
        console.log('ADMIN_PRODUCTS_DEBUG: Nenhum novo arquivo/link de entregável fornecido, mantendo o existente.');
        fileUrl = null; // Ensure fileUrl is null if not 'upload' or 'deliverableLink'
        memberAreaLink = null; // Ensure memberAreaLink is null if not 'link'
      }


      console.log('ADMIN_PRODUCTS_DEBUG: Dados para atualização no DB:', {
        member_area_id: formData.member_area_id,
        name: formData.name,
        description: formData.description,
        price: parseInt(formData.price) * 100,
        banner_url: bannerUrl,
        logo_url: logoUrl,
        file_url: fileUrl,
        member_area_link: memberAreaLink,
        access_url: formData.accessUrl,
        email_template: formData.emailTemplate,
      });

      // Update product in database
      const { error } = await supabase
        .from('products')
        .update({
          member_area_id: formData.member_area_id || null, // Atualizar member_area_id
          name: formData.name,
          description: formData.description,
          price: parseInt(formData.price) * 100,
          banner_url: bannerUrl,
          logo_url: logoUrl,
          file_url: fileUrl, // Save deliverable link here
          member_area_link: memberAreaLink,
          access_url: formData.accessUrl, // Salvar access_url
          email_template: formData.emailTemplate, // Salvar email_template
        })
        .eq('id', editingProduct.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Produto atualizado com sucesso!"
      });

      setIsDialogOpen(false);
      setEditingProduct(null);
      setFormData({
        name: '',
        description: '',
        price: '',
        banner: null,
        logo: null,
        deliveryType: 'link',
        memberAreaLink: '',
        deliverable: null,
        deliverableLink: '',
        accessUrl: '',
        emailTemplate: '',
        orderBumps: [{
          id: 1,
          name: '',
          description: '',
          price: 0,
          enabled: false
        }],
        member_area_id: null,
      });

      fetchProducts();
    } catch (error: any) {
      console.error('ADMIN_PRODUCTS_DEBUG: Erro ao atualizar produto:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível atualizar o produto",
        variant: "destructive"
      });
    } finally {
      console.log('ADMIN_PRODUCTS_DEBUG: Finalizando handleUpdate (atualizar produto).');
      setIsLoading(false);
    }
  };

  return <div className="container mx-auto p-3 sm:p-4 lg:p-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6 sm:mb-8">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground truncate">
            Produtos Digitais
          </h1>
          <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">
            Gerencie seus infoprodutos e cursos
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingProduct(null);
            setFormData({
              name: '',
              description: '',
              price: '',
              banner: null,
              logo: null,
              deliveryType: 'link',
              memberAreaLink: '',
              deliverable: null,
              deliverableLink: '',
              accessUrl: '',
              emailTemplate: '',
              orderBumps: [{
                id: 1,
                name: '',
                description: '',
                price: 0,
                enabled: false
              }],
              member_area_id: null,
            });
          }
        }}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2 text-sm sm:text-base" size="sm" onClick={() => {
              setEditingProduct(null);
              setFormData({
                name: '',
                description: '',
                price: '',
                banner: null,
                logo: null,
                deliveryType: 'link',
                memberAreaLink: '',
                deliverable: null,
                deliverableLink: '',
                accessUrl: '',
                emailTemplate: '',
                orderBumps: [{
                  id: 1,
                  name: '',
                  description: '',
                  price: 0,
                  enabled: false
                }],
                member_area_id: null,
              });
            }}>
              <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Novo Produto</span>
              <span className="sm:hidden">Novo</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto mx-auto">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">
                {editingProduct ? 'Editar Produto' : 'Criar Novo Produto'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={editingProduct ? handleUpdate : handleSubmit} className="space-y-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-auto">
                  <TabsTrigger value="basic" className="text-xs sm:text-sm py-2">
                    <span className="hidden sm:inline">Informações Básicas</span>
                    <span className="sm:hidden">Básico</span>
                  </TabsTrigger>
                  <TabsTrigger value="delivery" className="text-xs sm:text-sm py-2">
                    Entrega
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="memberArea">Área de Membros (Opcional)</Label>
                      <Select 
                        value={formData.member_area_id || "none"} 
                        onValueChange={value => handleInputChange('member_area_id', value === "none" ? null : value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Associar a uma área de membros" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhuma</SelectItem>
                          {memberAreas.map(area => (
                            <SelectItem key={area.id} value={area.id}>
                              <div className="flex items-center gap-2">
                                <MonitorDot className="h-4 w-4" />
                                {area.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Associe este produto a uma área de membros específica.
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm font-medium">Nome do Produto *</Label>
                      <Input 
                        id="name" 
                        value={formData.name} 
                        onChange={e => handleInputChange('name', e.target.value)} 
                        placeholder="Ex: Curso de Marketing Digital" 
                        className="text-sm"
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="price" className="text-sm font-medium">Preço (R$) *</Label>
                      <Input 
                        id="price" 
                        type="number" 
                        value={formData.price} 
                        onChange={e => handleInputChange('price', e.target.value)} 
                        placeholder="97.00" 
                        step="0.01" 
                        className="text-sm"
                        required 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-sm font-medium">Descrição *</Label>
                    <Textarea 
                      id="description" 
                      value={formData.description} 
                      onChange={e => handleInputChange('description', e.target.value)} 
                      placeholder="Descreva seu produto..." 
                      rows={3}
                      className="text-sm resize-none"
                      required 
                    />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="logo" className="text-sm font-medium">Logo do Produto</Label>
                      <div className="flex items-center gap-2">
                        <Input 
                          id="logo" 
                          type="file" 
                          accept="image/*" 
                          onChange={e => handleFileChange('logo', e.target.files?.[0] || null)} 
                          className="text-sm file:text-xs"
                        />
                        <Image className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="banner" className="text-sm font-medium">Banner do Produto</Label>
                      <div className="flex items-center gap-2">
                        <Input 
                          id="banner" 
                          type="file" 
                          accept="image/*" 
                          onChange={e => handleFileChange('banner', e.target.files?.[0] || null)} 
                          className="text-sm file:text-xs"
                        />
                        <Image className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="delivery" className="space-y-4">
                  <div className="space-y-4">
                    <Label>Tipo de Entrega</Label>
                    <RadioGroup value={formData.deliveryType} onValueChange={value => handleInputChange('deliveryType', value)}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="link" id="link" />
                        <Label htmlFor="link" className="flex items-center gap-2">
                          <Link className="h-4 w-4" />
                          Link da Área de Membros
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="upload" id="upload" />
                        <Label htmlFor="upload" className="flex items-center gap-2">
                          <Upload className="h-4 w-4" />
                          Upload do Entregável
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="deliverableLink" id="deliverableLink" />
                        <Label htmlFor="deliverableLink" className="flex items-center gap-2">
                          <Link className="h-4 w-4" />
                          Link Direto do Entregável
                        </Label>
                      </div>
                    </RadioGroup>

                    {formData.deliveryType === 'link' && <div className="space-y-2">
                        <Label htmlFor="memberAreaLink">Link da Área de Membros *</Label>
                        <Input id="memberAreaLink" type="url" value={formData.memberAreaLink} onChange={e => handleInputChange('memberAreaLink', e.target.value)} placeholder="https://exemplo.com/membros" required />
                      </div>}

                    {formData.deliveryType === 'upload' && <div className="space-y-2">
                        <Label htmlFor="deliverable">Arquivo Entregável *</Label>
                        <Input 
                          id="deliverable" 
                          type="file" 
                          onChange={e => handleFileChange('deliverable', e.target.files?.[0] || null)} 
                          required={!editingProduct?.file_url && !formData.deliverable} // Only required if no existing file and no new file selected
                        />
                        {editingProduct?.file_url && !formData.deliverable && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <Link className="h-4 w-4" />
                            <span>Arquivo atual: <a href={editingProduct.file_url} target="_blank" rel="noopener noreferrer" className="underline">Ver</a></span>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleInputChange('file_url', null)} // Clear existing file_url
                              className="h-6 px-2 text-destructive hover:text-destructive"
                            >
                              <XCircle className="h-3 w-3 mr-1" /> Remover
                            </Button>
                          </div>
                        )}
                        {formData.deliverable && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <Upload className="h-4 w-4" />
                            <span>Novo arquivo selecionado: {formData.deliverable.name}</span>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleFileChange('deliverable', null)}
                              className="h-6 px-2 text-destructive hover:text-destructive"
                            >
                              <XCircle className="h-3 w-3 mr-1" /> Remover
                            </Button>
                          </div>
                        )}
                      </div>}

                    {formData.deliveryType === 'deliverableLink' && <div className="space-y-2">
                        <Label htmlFor="deliverableLink">Link Direto do Entregável *</Label>
                        <Input id="deliverableLink" type="url" value={formData.deliverableLink} onChange={e => handleInputChange('deliverableLink', e.target.value)} placeholder="https://exemplo.com/meu-ebook.pdf" required />
                      </div>}
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Configurações de Acesso e E-mail</h3>
                    <div className="space-y-2">
                      <Label htmlFor="accessUrl">URL de Acesso ao Produto</Label>
                      <Input 
                        id="accessUrl" 
                        type="url" 
                        value={formData.accessUrl} 
                        onChange={e => handleInputChange('accessUrl', e.target.value)} 
                        placeholder="https://seuplataforma.com/acesso" 
                      />
                      <p className="text-xs text-muted-foreground">
                        Link para onde o cliente será direcionado para acessar o produto.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emailTemplate">Template de E-mail de Acesso</Label>
                      <Textarea 
                        id="emailTemplate" 
                        value={formData.emailTemplate} 
                        onChange={e => handleInputChange('emailTemplate', e.target.value)} 
                        placeholder="Olá {{nome}}, seu acesso é..." 
                        rows={8} 
                      />
                      <p className="text-xs text-muted-foreground">
                        Use variáveis como <code className="bg-muted px-1 py-0.5 rounded text-xs">{'{{nome}}'}</code>, <code className="bg-muted px-1 py-0.5 rounded text-xs">{'{{produto}}'}</code>, <code className="bg-muted px-1 py-0.5 rounded text-xs">{'{{username}}'}</code>, <code className="bg-muted px-1 py-0.5 rounded text-xs">{'{{password}}'}</code>, <code className="bg-muted px-1 py-0.5 rounded text-xs">{'{{url_acesso}}'}</code> e <code className="bg-muted px-1 py-0.5 rounded text-xs">{'{{suporte}}'}</code>.
                      </p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="order-bumps" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Order Bumps do Produto</h3>
                    <Button type="button" onClick={addOrderBump} size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Order Bump
                    </Button>
                  </div>
                  
                  {formData.orderBumps.map((bump, index) => <Card key={bump.id} className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Order Bump {index + 1}
                        </h4>
                        {formData.orderBumps.length > 1 && <Button type="button" variant="destructive" size="sm" onClick={() => removeOrderBump(bump.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>}
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>Habilitar Order Bump</Label>
                            <p className="text-sm text-muted-foreground">Mostrar no checkout</p>
                          </div>
                          <Switch checked={bump.enabled} onCheckedChange={checked => updateOrderBump(bump.id, 'enabled', checked)} />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Nome do Order Bump</Label>
                            <Input value={bump.name} onChange={e => updateOrderBump(bump.id, 'name', e.target.value)} placeholder="Ex: E-book Complementar" />
                          </div>
                          <div className="space-y-2">
                            <Label>Preço (R$)</Label>
                            <Input type="number" value={bump.price} onChange={e => updateOrderBump(bump.id, 'price', Number(e.target.value))} placeholder="0" step="0.01" />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Descrição</Label>
                          <Textarea value={bump.description} onChange={e => updateOrderBump(bump.id, 'description', e.target.value)} placeholder="Descrição do order bump..." rows={3} />
                        </div>
                      </div>
                    </Card>)}
                </TabsContent>
              </Tabs>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                  className="text-sm"
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoading} className="text-sm">
                  {editingProduct 
                    ? (isLoading ? 'Atualizando...' : 'Atualizar Produto')
                    : (isLoading ? 'Criando...' : 'Criar Produto')
                  }
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Package className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="hidden sm:inline">Seus Produtos ({products.length})</span>
            <span className="sm:hidden">Produtos</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <div className="text-center py-12">
              <Package className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-semibold mb-2">Nenhum produto criado</h3>
              <p className="text-muted-foreground mb-4">
                Comece criando seu primeiro infoproduto
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {products.map((product) => (
                <Card key={product.id} className="overflow-hidden hover-scale">
                  <CardContent className="p-4 sm:p-6">
                    {product.banner_url && (
                      <div className="aspect-video mb-3 sm:mb-4 rounded-lg overflow-hidden">
                        <img 
                          src={product.banner_url} 
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                     <div className="flex items-start gap-2 sm:gap-3">
                       {product.logo_url && (
                         <img 
                           src={product.logo_url} 
                           alt={`${product.name} logo`}
                           className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover flex-shrink-0"
                         />
                       )}
                       <div className="flex-1 min-w-0">
                         <div className="flex items-start justify-between mb-1">
                           <h3 className="font-semibold text-base sm:text-lg truncate pr-2">
                             {product.name}
                           </h3>
                           <DropdownMenu>
                             <DropdownMenuTrigger asChild>
                               <Button variant="ghost" size="icon" className="h-6 w-6 sm:h-8 sm:w-8 flex-shrink-0">
                                 <MoreVertical className="h-3 w-3 sm:h-4 sm:w-4" />
                               </Button>
                             </DropdownMenuTrigger>
                             <DropdownMenuContent align="end" className="w-40">
                               <DropdownMenuItem onClick={() => handleEdit(product)} className="text-xs sm:text-sm">
                                 <Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                                 Editar
                               </DropdownMenuItem>
                               <AlertDialog>
                                 <AlertDialogTrigger asChild>
                                   <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-xs sm:text-sm text-destructive">
                                     <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                                     Excluir
                                   </DropdownMenuItem>
                                 </AlertDialogTrigger>
                                 <AlertDialogContent className="w-[95vw] max-w-md mx-auto">
                                   <AlertDialogHeader>
                                     <AlertDialogTitle className="text-base sm:text-lg">
                                       Confirmar exclusão
                                     </AlertDialogTitle>
                                     <AlertDialogDescription className="text-sm">
                                       Tem certeza de que deseja excluir o produto "{product.name}"? 
                                       Esta ação não pode ser desfeita.
                                     </AlertDialogDescription>
                                   </AlertDialogHeader>
                                   <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                                     <AlertDialogCancel className="text-sm">Cancelar</AlertDialogCancel>
                                     <AlertDialogAction 
                                       onClick={() => handleDelete(product.id)}
                                       className="text-sm"
                                     >
                                       Excluir
                                     </AlertDialogAction>
                                   </AlertDialogFooter>
                                 </AlertDialogContent>
                               </AlertDialog>
                             </DropdownMenuContent>
                           </DropdownMenu>
                         </div>
                         <p className="text-muted-foreground text-xs sm:text-sm mb-2 line-clamp-2">
                           {product.description}
                         </p>
                         {product.member_area_id && product.member_areas?.name && (
                           <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                             <MonitorDot className="h-3 w-3" />
                             <span>Área: {product.member_areas.name}</span>
                           </div>
                         )}
                         <div className="flex items-center justify-between">
                           <span className="font-bold text-primary text-sm sm:text-base">
                             R$ {(product.price / 100).toFixed(2)}
                           </span>
                           <span className="text-xs text-muted-foreground">
                             {new Date(product.created_at).toLocaleDateString('pt-BR', {
                               day: '2-digit',
                               month: '2-digit',
                               year: window.innerWidth < 640 ? '2-digit' : 'numeric'
                             })}
                           </span>
                         </div>
                       </div>
                     </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>;
};
export default AdminProducts;