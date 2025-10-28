import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

import { useAutoSave } from '@/hooks/useAutoSave';
import { useIntegrations } from '@/hooks/useIntegrations';

import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, CreditCard, Package, Shield, FileText, DollarSign, Trash2, Edit, Smartphone, MoreVertical, Save, Link, ShoppingBag, Upload, XCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { DeliverableConfig, FormFields, PackageConfig, GuaranteeConfig, ReservedRightsConfig } from '@/integrations/supabase/types'; // Importar DeliverableConfig, FormFields e os novos tipos

const AdminCheckouts = () => {
  const {
    user,
    isAdmin,
    loading
  } = useAuth();
  const {
    mercadoPagoAccounts,
    metaPixels
  } = useIntegrations();
  const {
    toast
  } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingCheckout, setEditingCheckout] = useState<any>(null);
  const [checkouts, setCheckouts] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [currentTab, setCurrentTab] = useState('basic');
  
  const initialFormData = {
    name: '',
    description: '', // Agora parte de FormFields, mas mantido aqui para o estado local
    selectedProduct: '',
    layout: 'horizontal' as string,
    customerFields: {
      requireName: true,
      requireCpf: true,
      requirePhone: true,
      requireEmail: true,
      requireEmailConfirm: true
    },
    packages: [{
      id: 1,
      name: '',
      description: '',
      topics: [''],
      price: 0,
      originalPrice: 0,
      mostSold: false
    }] as PackageConfig[], // Tipado explicitamente
    orderBumps: [{
      id: 1,
      selectedProduct: '',
      price: 0,
      originalPrice: 0,
      enabled: false
    }],
    guarantee: {
      enabled: true,
      days: 7,
      description: 'Garantia de 7 Dias. Se não gostar, devolvemos seu dinheiro sem burocracia.'
    } as GuaranteeConfig, // Tipado explicitamente
    reservedRights: {
      enabled: true,
      text: 'Todos os direitos reservados. Este produto é protegido por direitos autorais.'
    } as ReservedRightsConfig, // Tipado explicitamente
    paymentMethods: {
      pix: true,
      creditCard: true,
      maxInstallments: 12,
      installmentsWithInterest: false
    },
    integrations: {
      selectedMercadoPagoAccount: '',
      selectedMetaPixel: ''
    },
    support_contact: {
      email: ''
    },
    styles: {
      backgroundColor: '#ffffff',
      primaryColor: '#3b82f6',
      textColor: '#000000',
      headlineText: 'Sua transformação começa agora!',
      headlineColor: '#000000',
      description: '',
      gradientColor: '#60a5fa',
      highlightColor: '#3b82f6'
    },
    timer: {
      enabled: false,
      duration: 15,
      color: '#dc2626',
      text: 'Oferta por tempo limitado'
    },
    deliverable: { // New deliverable field
      type: 'none' as 'none' | 'link' | 'upload',
      link: '',
      file: null as File | null,
      fileUrl: '',
      name: '', // Adicionado nome para o entregável
      description: '' // Adicionado descrição para o entregável
    } as DeliverableConfig & { file: File | null } // Explicitly type deliverable
  };
  // Usar uma chave única por checkout ou "new" para novos
  // Manter a chave consistente mesmo quando o componente remonta
  const [autoSaveKey, setAutoSaveKey] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('edit');
    return editId ? `checkout-edit-${editId}` : 'checkout-new';
  });
  
  const {
    data: checkoutData,
    setData: setCheckoutData,
    clearSavedData,
    loadData,
    forceLoad,
    hasSavedData
  } = useAutoSave(initialFormData, {
    key: autoSaveKey,
    debounceMs: 800,
    showToast: false
  });
  
  // Verificar e carregar dados salvos quando o componente montar
  useEffect(() => {
    // Não fazer nada aqui para evitar carregar automaticamente rascunhos corrompidos
    // O carregamento será feito explicitamente na função handleEdit
  }, []);

  // Salvar dados antes de navegar ou fechar a aba
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Forçar o salvamento dos dados atuais
      try {
        localStorage.setItem(autoSaveKey, JSON.stringify(checkoutData));
      } catch (error) {
        console.error('Erro ao salvar dados antes de navegar:', error);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [autoSaveKey, checkoutData]);

  // O auto-save handle carregamento automático para novos checkouts
  // Para edição, usamos a função handleEdit que já carrega os dados corretamente

  useEffect(() => {
    if (user && isAdmin) {
      fetchCheckouts();
      fetchProducts();
    }
  }, [user, isAdmin]);

  const fetchCheckouts = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('checkouts').select(`
          *,
          products (id, name)
        `).order('created_at', {
        ascending: false
      });
      if (error) throw error;
      setCheckouts(data || []);
    } catch (error) {
      console.error('Erro ao carregar checkouts:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os checkouts",
        variant: "destructive"
      });
    }
  };
  const fetchProducts = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('products').select('id, name, price, description').order('created_at', {
        ascending: false
      });
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    }
  };

  const uploadFile = async (file: File, folder: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('products') // Using 'products' bucket, but a specific folder
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('products')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };


  const loadOriginalCheckoutData = (checkout: any) => {
    // Converter preços de centavos para reais
    const priceInReais = checkout.price ? checkout.price / 100 : 0;
    const promotionalPriceInReais = checkout.promotional_price ? checkout.promotional_price / 100 : 0;
    
    // Converter order bumps de centavos para reais
    const orderBumpsInReais = Array.isArray(checkout.order_bumps) ? checkout.order_bumps.map((bump: any) => ({
      ...bump,
      price: bump.price ? bump.price / 100 : 0,
      originalPrice: bump.originalPrice ? bump.originalPrice / 100 : 0,
      selectedProduct: bump.selectedProduct || ''
    })) : initialFormData.orderBumps; // Use initialFormData default
    
    const packagesFromDb = (checkout.form_fields as FormFields)?.packages;
    const packagesConfig: PackageConfig[] = Array.isArray(packagesFromDb) ? packagesFromDb.map((pkg: any) => ({ // Cast pkg to any
      id: pkg.id || Date.now(), // Ensure ID exists
      name: pkg.name || '',
      description: pkg.description || '',
      topics: Array.isArray(pkg.topics) ? pkg.topics.filter((t: any) => typeof t === 'string') : [''],
      price: pkg.price ? pkg.price / 100 : priceInReais,
      originalPrice: pkg.originalPrice ? pkg.originalPrice / 100 : promotionalPriceInReais,
      mostSold: pkg.mostSold ?? false
    })) : initialFormData.packages; // Use initialFormData default

    return {
      name: checkout.products?.name || '',
      description: (checkout.form_fields as FormFields)?.description || '', // Corrigido: acessar de form_fields
      selectedProduct: checkout.product_id || '',
      layout: checkout.layout || 'horizontal',
      customerFields: {
        requireName: checkout.form_fields?.requireName ?? true,
        requireCpf: checkout.form_fields?.requireCpf ?? true,
        requirePhone: checkout.form_fields?.requirePhone ?? true,
        requireEmail: checkout.form_fields?.requireEmail ?? true,
        requireEmailConfirm: checkout.form_fields?.requireEmailConfirm ?? true
      },
      packages: packagesConfig, // Usar os pacotes processados
      orderBumps: orderBumpsInReais,
      guarantee: (checkout.form_fields?.guarantee as GuaranteeConfig) || initialFormData.guarantee, // Usar initialFormData default e cast
      reservedRights: (checkout.form_fields?.reservedRights as ReservedRightsConfig) || initialFormData.reservedRights, // Usar initialFormData default e cast
      paymentMethods: checkout.payment_methods || initialFormData.paymentMethods,
      integrations: checkout.integrations || initialFormData.integrations,
      support_contact: checkout.support_contact || initialFormData.support_contact,
      styles: checkout.styles || initialFormData.styles,
      timer: checkout.timer || initialFormData.timer,
      deliverable: {
        type: checkout.form_fields?.deliverable?.type || 'none',
        link: checkout.form_fields?.deliverable?.link || '',
        file: null, // Always null when loading from DB, as files are not stored in state
        fileUrl: checkout.form_fields?.deliverable?.fileUrl || '',
        name: checkout.form_fields?.deliverable?.name || '', // Novo campo
        description: checkout.form_fields?.deliverable?.description || '' // Novo campo
      }
    };
  };

  const resetToOriginal = () => {
    if (editingCheckout) {
      const originalData = loadOriginalCheckoutData(editingCheckout);
      setCheckoutData(originalData);
      
      // Limpar apenas o localStorage da chave atual, mas manter a chave
      clearSavedData();
      
      toast({
        title: "Dados recarregados",
        description: "Dados originais do checkout foram recarregados"
      });
    } else {
      setCheckoutData(initialFormData);
      clearSavedData();
      toast({
        title: "Formulário limpo",
        description: "Formulário resetado para valores padrão"
      });
    }
  };
  const handleEdit = (checkout: any) => {
    setEditingCheckout(checkout);
    
    // Atualizar a chave do auto-save para o checkout específico
    const newKey = `checkout-edit-${checkout.id}`;
    setAutoSaveKey(newKey);
    
    // Verificar se há dados salvos em rascunho primeiro
    const savedData = localStorage.getItem(newKey);
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        // Verificar se os dados salvos não estão vazios ou corrompidos
        if (parsedData && parsedData.selectedProduct && Object.keys(parsedData).length > 5) {
          console.log('Carregando dados salvos do rascunho para checkout:', checkout.id);
          setCheckoutData(parsedData);
          setIsDialogOpen(true);
          return;
        } else {
          // Se os dados estão vazios ou corrompidos, remover do localStorage
          localStorage.removeItem(newKey);
          console.log('Dados salvos estavam corrompidos, removendo...');
        }
      } catch (error) {
        console.error('Erro ao carregar dados salvos:', error);
        localStorage.removeItem(newKey);
      }
    }
    
    // Se não há dados salvos válidos, carregar dados originais do checkout
    console.log('Carregando dados originais do checkout:', checkout.id);
    console.log('Timer do checkout carregado:', checkout.timer);
    
    const originalData = loadOriginalCheckoutData(checkout);
    console.log('Timer nos dados processados:', originalData.timer);
    setCheckoutData(originalData);
    setIsDialogOpen(true);
  };
  const handleDelete = async (checkoutId: string) => {
    try {
      setIsLoading(true);
      const {
        error
      } = await supabase.from('checkouts').delete().eq('id', checkoutId);
      if (error) throw error;
      toast({
        title: "Sucesso",
        description: "Checkout excluído com sucesso!"
      });
      fetchCheckouts();
    } catch (error) {
      console.error('Erro ao excluir checkout:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o checkout",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
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
  const handleInputChange = (path: string, value: any) => {
    setCheckoutData(prev => {
      const keys = path.split('.');
      const newData = {
        ...prev
      };
      let current: any = newData;
      let oldCurrent: any = prev;
      
      // Get old value for history
      for (let i = 0; i < keys.length - 1; i++) {
        oldCurrent = oldCurrent?.[keys[i]];
        current[keys[i]] = {
          ...current[keys[i]]
        };
        current = current[keys[i]];
      }
      
      const oldValue = oldCurrent?.[keys[keys.length - 1]];
      current[keys[keys.length - 1]] = value;
      
      // Only add to history if value actually changed
      if (oldValue !== value) {
      }
      
      return newData;
    });
  };

  const handleFileChange = (file: File | null) => {
    setCheckoutData(prev => ({
      ...prev,
      deliverable: {
        ...prev.deliverable,
        file: file,
        fileUrl: file ? prev.deliverable.fileUrl : '' // Clear fileUrl if file is removed
      }
    }));
  };

  const addPackage = () => {
    const newPackages = [...checkoutData.packages, {
      id: Date.now(),
      name: '',
      description: '',
      topics: [''],
      price: 0,
      originalPrice: 0,
      mostSold: false
    }] as PackageConfig[]; // Tipado explicitamente
    handleInputChange('packages', newPackages);
  };
  const removePackage = (id: number) => {
    const newPackages = checkoutData.packages.filter(pkg => pkg.id !== id);
    handleInputChange('packages', newPackages);
  };
  const updatePackage = (id: number, field: string, value: any) => {
    const packages = checkoutData.packages.map(pkg => pkg.id === id ? {
      ...pkg,
      [field]: value
    } : pkg);
    handleInputChange('packages', packages);
  };
  const addTopicToPackage = (packageId: number) => {
    const packages = checkoutData.packages.map(pkg => pkg.id === packageId ? {
      ...pkg,
      topics: [...pkg.topics, '']
    } : pkg);
    handleInputChange('packages', packages);
  };
  const removeTopicFromPackage = (packageId: number, topicIndex: number) => {
    const packages = checkoutData.packages.map(pkg => pkg.id === packageId ? {
      ...pkg,
      topics: pkg.topics.filter((_, index) => index !== topicIndex)
    } : pkg);
    handleInputChange('packages', packages);
  };
  const updatePackageTopic = (packageId: number, topicIndex: number, value: string) => {
    const packages = checkoutData.packages.map(pkg => pkg.id === packageId ? {
      ...pkg,
      topics: pkg.topics.map((topic, index) => index === topicIndex ? value : topic)
    } : pkg);
    handleInputChange('packages', packages);
  };
  const addOrderBump = () => {
    const newOrderBumps = [...checkoutData.orderBumps, {
      id: Date.now(),
      selectedProduct: '',
      price: 0,
      originalPrice: 0,
      enabled: false
    }];
    handleInputChange('orderBumps', newOrderBumps);
  };
  const removeOrderBump = (id: number) => {
    const newOrderBumps = checkoutData.orderBumps.filter(bump => bump.id !== id);
    handleInputChange('orderBumps', newOrderBumps);
  };
  const updateOrderBump = (id: number, field: string, value: any) => {
    const orderBumps = checkoutData.orderBumps.map(bump => bump.id === id ? {
      ...bump,
      [field]: value
    } : bump);
    handleInputChange('orderBumps', orderBumps);
  };
  const loadProductAsOrderBump = (bumpId: number, productData: any) => {
    if (productData === 'manual') {
      // Reset to manual configuration
      const orderBumps = checkoutData.orderBumps.map(bump => bump.id === bumpId ? {
        ...bump,
        price: 0,
        originalPrice: 0,
        selectedProduct: ''
      } : bump);
      handleInputChange('orderBumps', orderBumps);
      return;
    }

    // Load real product data from database
    const product = products.find(p => p.id === productData);
    if (product) {
      // Convert from cents (database format) to reais (form format) for display
      const priceInReais = product.price / 100;
      const discountedPriceInReais = priceInReais * 0.5; // 50% discount
      
      console.log('Order Bump Product Loading:', {
        productName: product.name,
        priceInCents: product.price,
        priceInReais: priceInReais,
        discountedPrice: discountedPriceInReais
      });
      
      const orderBumps = checkoutData.orderBumps.map(bump => bump.id === bumpId ? {
        ...bump,
        price: discountedPriceInReais,
        originalPrice: priceInReais,
        selectedProduct: product.id
      } : bump);
      handleInputChange('orderBumps', orderBumps);
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutData.selectedProduct) {
      toast({
        title: "Erro",
        description: "Selecione um produto base",
        variant: "destructive"
      });
      return;
    }
    setIsLoading(true);
    try {
      console.log('Timer sendo salvo:', checkoutData.timer);

      let deliverableFileUrl = checkoutData.deliverable.fileUrl;
      if (checkoutData.deliverable.type === 'upload' && checkoutData.deliverable.file) {
        deliverableFileUrl = await uploadFile(checkoutData.deliverable.file, 'checkout-deliverables');
      } else if (checkoutData.deliverable.type === 'link') {
        deliverableFileUrl = checkoutData.deliverable.link;
      } else {
        deliverableFileUrl = ''; // Clear if type is 'none'
      }

      const checkoutPayload = {
        user_id: user?.id, // Adicionar user_id
        product_id: checkoutData.selectedProduct,
        price: checkoutData.packages[0]?.price * 100 || 0,
        promotional_price: checkoutData.packages[0]?.originalPrice ? checkoutData.packages[0].originalPrice * 100 : null,
        form_fields: {
          description: checkoutData.description, // Isso agora está corretamente tipado em FormFields
          ...checkoutData.customerFields,
          packages: checkoutData.packages,
          guarantee: checkoutData.guarantee,
          reservedRights: checkoutData.reservedRights,
          deliverable: { // Save deliverable data
            type: checkoutData.deliverable.type,
            link: checkoutData.deliverable.type === 'link' ? checkoutData.deliverable.link : null,
            fileUrl: deliverableFileUrl, // This will be the uploaded URL or the provided link
            name: checkoutData.deliverable.name || null, // Novo campo
            description: checkoutData.deliverable.description || null // Novo campo
          }
        },
        payment_methods: checkoutData.paymentMethods,
        order_bumps: checkoutData.orderBumps.map(bump => ({
          ...bump,
          price: bump.price * 100, // Converter para centavos
          originalPrice: (bump.originalPrice || 0) * 100 // Converter para centavos
        })),
        styles: {
          backgroundColor: checkoutData.styles?.backgroundColor || '#ffffff',
          primaryColor: checkoutData.styles?.primaryColor || '#3b82f6',
          textColor: checkoutData.styles?.textColor || '#000000',
          headlineText: checkoutData.styles?.headlineText || 'Sua transformação começa agora!',
          headlineColor: checkoutData.styles?.headlineColor || '#000000',
          highlightColor: checkoutData.styles?.highlightColor || checkoutData.styles?.primaryColor || '#3b82f6', // Corrigido aqui
          description: checkoutData.styles?.description || '',
          gradientColor: checkoutData.styles?.gradientColor || '#60a5fa'
        },
        layout: checkoutData.layout || 'horizontal',
        support_contact: {
          email: checkoutData.support_contact?.email || ''
        },
        integrations: checkoutData.integrations || {},
        timer: checkoutData.timer || null
      };
      if (editingCheckout) {
        const {
          error
        } = await supabase.from('checkouts').update(checkoutPayload).eq('id', editingCheckout.id);
        if (error) throw error;
        toast({
          title: "Sucesso",
          description: "Checkout atualizado!"
        });
      } else {
        const {
          error
        } = await supabase.from('checkouts').insert(checkoutPayload);
        if (error) throw error;
        toast({
          title: "Sucesso",
          description: "Checkout criado!"
        });
      }
      setIsDialogOpen(false);
      setEditingCheckout(null);
      clearSavedData(); // Limpar dados salvos após salvar com sucesso
      fetchCheckouts();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao salvar checkout",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  return <div className="mobile-container">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Checkouts</h1>
          <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">
            Gerencie as páginas de vendas dos seus produtos
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          // Quando fechar o diálogo, apenas resetar estado de edição mas manter rascunhos
          if (!open) {
            setEditingCheckout(null);
          }
        }}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2" onClick={() => {
              // Salvar a chave atual antes de mudar
              const currentKey = autoSaveKey;
              
              setEditingCheckout(null);
              setAutoSaveKey('checkout-new');
              
              // Só limpar se estamos mudando de contexto (de edição para novo)
              if (currentKey.startsWith('checkout-edit-')) {
                // Se estivermos editando, não limpar os dados salvos da edição
                // Apenas trocar para o contexto de novo checkout
                const newCheckoutData = localStorage.getItem('checkout-new');
                if (newCheckoutData) {
                  try {
                    setCheckoutData(JSON.parse(newCheckoutData));
                  } catch {
                    // Se houver erro, usar dados iniciais
                    setCheckoutData(initialFormData);
                  }
                } else {
                  setCheckoutData(initialFormData);
                }
              }
            }}>
              <Plus className="h-4 w-4" />
              Novo Checkout
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xs sm:max-w-2xl lg:max-w-4xl max-h-[90vh] overflow-y-auto mx-2 sm:mx-4">
            <DialogHeader>
              <DialogTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pr-2 sm:pr-8">
                <span className="flex items-center gap-2 text-sm sm:text-base">
                  {editingCheckout ? 'Editar Checkout' : 'Criar Nova Página de Checkout'}
                  <Save className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                </span>
                <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                  {hasSavedData && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                      Rascunho Carregado
                    </Badge>
                  )}
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={resetToOriginal}
                    className="text-xs sm:text-sm"
                  >
                    {editingCheckout ? 'Resetar' : 'Limpar Tudo'}
                  </Button>
                  {editingCheckout && hasSavedData && (
                    <Button 
                      type="button"
                      variant="destructive" 
                      size="sm" 
                      onClick={() => {
                        clearSavedData();
                        handleEdit(editingCheckout); // Recarregar dados originais
                      }}
                      className="text-xs sm:text-sm"
                    >
                      Limpar Rascunho
                    </Button>
                  )}
                </div>
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-1 h-auto p-1">
                  <TabsTrigger value="basic" onClick={() => setCurrentTab('basic')} className="text-xs sm:text-sm py-2">
                    Básico
                  </TabsTrigger>
                  <TabsTrigger value="customer" onClick={() => setCurrentTab('customer')} className="text-xs sm:text-sm py-2">
                    Cliente
                  </TabsTrigger>
                  <TabsTrigger value="packages" onClick={() => setCurrentTab('packages')} className="text-xs sm:text-sm py-2">
                    Pacotes
                  </TabsTrigger>
                  <TabsTrigger value="bumps" onClick={() => setCurrentTab('bumps')} className="text-xs sm:text-sm py-2">
                    <span className="hidden sm:inline">Order Bumps</span>
                    <span className="sm:hidden">Bumps</span>
                  </TabsTrigger>
                  <TabsTrigger value="guarantee" onClick={() => setCurrentTab('guarantee')} className="text-xs sm:text-sm py-2">
                    Garantia
                  </TabsTrigger>
                  <TabsTrigger value="payment" onClick={() => setCurrentTab('payment')} className="text-xs sm:text-sm py-2">
                    <span className="hidden sm:inline">Pagamento</span>
                    <span className="sm:hidden">Pgto</span>
                  </TabsTrigger>
                  <TabsTrigger value="integrations" onClick={() => setCurrentTab('integrations')} className="text-xs sm:text-sm py-2">
                    <span className="hidden sm:inline">Integrações</span>
                    <span className="sm:hidden">APIs</span>
                  </TabsTrigger>
                  <TabsTrigger value="styles" onClick={() => setCurrentTab('styles')} className="text-xs sm:text-sm py-2">
                    Visual
                  </TabsTrigger>
                  <TabsTrigger value="deliverable" onClick={() => setCurrentTab('deliverable')} className="text-xs sm:text-sm py-2">
                    <span className="hidden sm:inline">Entregável</span>
                    <span className="sm:hidden">Entreg.</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="selectedProduct">Produto Base</Label>
                      <Select value={checkoutData.selectedProduct} onValueChange={value => handleInputChange('selectedProduct', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um produto criado ou deixe em branco para manual" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.filter(product => product.id && product.id.trim() !== '').map(product => <SelectItem key={product.id} value={product.id}>
                              {product.name}
                            </SelectItem>)}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Se selecionado, os order bumps do produto serão carregados automaticamente
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome do Checkout *</Label>
                      <Input id="name" value={checkoutData.name} onChange={e => handleInputChange('name', e.target.value)} placeholder="Ex: Checkout Curso de Marketing" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Descrição *</Label>
                      <Textarea id="description" value={checkoutData.description} onChange={e => handleInputChange('description', e.target.value)} placeholder="Descrição do checkout..." rows={4} required />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="customer" className="space-y-4">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Campos do Cliente</h3>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Nome Completo</Label>
                          <p className="text-sm text-muted-foreground">Obrigatório no checkout</p>
                        </div>
                        <Switch checked={checkoutData.customerFields?.requireName ?? true} onCheckedChange={checked => handleInputChange('customerFields.requireName', checked)} />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>CPF</Label>
                          <p className="text-sm text-muted-foreground">Documento obrigatório</p>
                        </div>
                        <Switch checked={checkoutData.customerFields?.requireCpf ?? true} onCheckedChange={checked => handleInputChange('customerFields.requireCpf', checked)} />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Telefone</Label>
                          <p className="text-sm text-muted-foreground">Número de contato</p>
                        </div>
                        <Switch checked={checkoutData.customerFields?.requirePhone ?? true} onCheckedChange={checked => handleInputChange('customerFields.requirePhone', checked)} />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Email</Label>
                          <p className="text-sm text-muted-foreground">Email principal</p>
                        </div>
                        <Switch checked={checkoutData.customerFields?.requireEmail ?? true} onCheckedChange={checked => handleInputChange('customerFields.requireEmail', checked)} />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Confirmar Email</Label>
                          <p className="text-sm text-muted-foreground">Campo de confirmação</p>
                        </div>
                        <Switch checked={checkoutData.customerFields?.requireEmailConfirm ?? true} onCheckedChange={checked => handleInputChange('customerFields.requireEmailConfirm', checked)} />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="packages" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Pacotes</h3>
                    <Button type="button" onClick={addPackage} size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Pacote
                    </Button>
                  </div>
                  
                  {checkoutData.packages.map((pkg, index) => <Card key={pkg.id} className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          Pacote {index + 1}
                        </h4>
                        {checkoutData.packages.length > 1 && <Button type="button" variant="destructive" size="sm" onClick={() => removePackage(pkg.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>}
                      </div>
            
            
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="space-y-2">
                          <Label>Nome do Pacote</Label>
                           <Input value={pkg.name} onChange={e => updatePackage(pkg.id, 'name', e.target.value)} placeholder="Ex: Pacote Básico" />
                        </div>
                        <div className="space-y-2">
                          <Label>Preço (R$)</Label>
                           <Input 
                             type="number" 
                             value={pkg.price} 
                             onChange={e => updatePackage(pkg.id, 'price', Math.max(0, Number(e.target.value)))} 
                             placeholder="0,00" 
                             step="0.01" 
                           />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="space-y-2">
                          <Label>Preço Original (R$)</Label>
                           <Input 
                             type="number" 
                             value={pkg.originalPrice} 
                             onChange={e => updatePackage(pkg.id, 'originalPrice', Math.max(0, Number(e.target.value)))} 
                             placeholder="0,00" 
                             step="0.01" 
                           />
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch 
                            checked={pkg.mostSold || false} 
                            onCheckedChange={checked => updatePackage(pkg.id, 'mostSold', checked)} 
                          />
                          <Label className="text-sm">Marcar como "Mais Vendido"</Label>
                        </div>
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        <Label>Descrição</Label>
                         <Textarea value={pkg.description} onChange={e => updatePackage(pkg.id, 'description', e.target.value)} placeholder="Descrição do pacote..." rows={3} />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Tópicos do que será entregue</Label>
                          <Button type="button" size="sm" variant="outline" onClick={() => addTopicToPackage(pkg.id)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Adicionar Tópico
                          </Button>
                        </div>
                        
                         {pkg.topics.map((topic, topicIndex) => <div key={topicIndex} className="flex items-center gap-2">
                              <Input value={topic} onChange={e => updatePackageTopic(pkg.id, topicIndex, e.target.value)} placeholder="Ex: Acesso vitalício: ao conteúdo" />
                             {pkg.topics.length > 1 && <Button type="button" variant="destructive" size="sm" onClick={() => removeTopicFromPackage(pkg.id, topicIndex)}>
                                 <Trash2 className="h-4 w-4" />
                               </Button>}
                           </div>)}
                         <div className="text-xs text-muted-foreground mt-2">
                           💡 O texto antes dos dois pontos (:) será destacado em negrito automaticamente
                         </div>
                      </div>
                    </Card>)}
                </TabsContent>

                <TabsContent value="bumps" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Order Bumps</h3>
                    <Button type="button" onClick={addOrderBump} size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Order Bump
                    </Button>
                  </div>
                  
                  {checkoutData.orderBumps.map((bump, index) => <Card key={bump.id} className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Order Bump {index + 1}
                        </h4>
                        <div className="flex items-center gap-2">
                           <Switch checked={bump.enabled} onCheckedChange={checked => updateOrderBump(bump.id, 'enabled', checked)} />
                          <Button type="button" variant="destructive" size="sm" onClick={() => removeOrderBump(bump.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Carregar Produto Salvo</Label>
                          <Select 
                            value={bump.selectedProduct || 'manual'} 
                            onValueChange={value => loadProductAsOrderBump(bump.id, value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um produto ou configure manualmente" />
                            </SelectTrigger>
                            <SelectContent>
                              {products.filter(product => product.id && product.id.trim() !== '').map(product => <SelectItem key={product.id} value={product.id}>
                                  <div className="flex items-center gap-2">
                                    <Package className="h-4 w-4" />
                                    {product.name}
                                  </div>
                                </SelectItem>)}
                              <SelectItem value="manual">
                                <div className="flex items-center gap-2">
                                  <Edit className="h-4 w-4" />
                                  Configuração Manual
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            Ao selecionar um produto, os dados serão carregados automaticamente
                          </p>
                        </div>
                        
                        <Separator />
                        
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Preço (R$)</Label>
                               <Input 
                                 type="number" 
                                 value={bump.price} 
                                 onChange={e => updateOrderBump(bump.id, 'price', Math.max(0, Number(e.target.value)))} 
                                 placeholder="0,00" 
                                 step="0.01" 
                               />
                            </div>
                            <div className="space-y-2">
                              <Label>Preço Original (R$)</Label>
                               <Input 
                                 type="number" 
                                 value={bump.originalPrice || 0} 
                                 onChange={e => updateOrderBump(bump.id, 'originalPrice', Math.max(0, Number(e.target.value)))} 
                                 placeholder="0,00" 
                                 step="0.01" 
                               />
                             <p className="text-xs text-muted-foreground">
                               Deixe 0 para não mostrar desconto
                             </p>
                           </div>
                         </div>
                         
                         {bump.selectedProduct && <div className="p-3 bg-muted rounded-lg">
                             <p className="text-sm text-muted-foreground mb-1">Descrição do produto selecionado:</p>
                             <p className="text-sm">{products.find(p => p.id === bump.selectedProduct)?.description || 'Nenhuma descrição disponível'}</p>
                           </div>}
                      </div>
                    </Card>)}
                </TabsContent>

                <TabsContent value="guarantee" className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Garantia
                      </h3>
                      <Switch checked={checkoutData.guarantee.enabled} onCheckedChange={checked => handleInputChange('guarantee.enabled', checked)} />
                    </div>
                    
                    {checkoutData.guarantee.enabled && <>
                        <div className="space-y-2">
                          <Label>Dias de Garantia</Label>
                          <Input type="number" value={checkoutData.guarantee.days} onChange={e => handleInputChange('guarantee.days', Number(e.target.value))} placeholder="7" />
                        </div>
                        <div className="space-y-2">
                          <Label>Descrição da Garantia</Label>
                          <Textarea value={checkoutData.guarantee.description} onChange={e => handleInputChange('guarantee.description', e.target.value)} placeholder="Descreva a garantia..." rows={3} />
                        </div>
                      </>}
                    
                    <Separator />
                    
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Direitos Reservados
                      </h3>
                      <Switch checked={checkoutData.reservedRights.enabled} onCheckedChange={checked => handleInputChange('reservedRights.enabled', checked)} />
                    </div>
                    
                    {checkoutData.reservedRights.enabled && <div className="space-y-2">
                        <Label>Texto dos Direitos Reservados</Label>
                        <Textarea value={checkoutData.reservedRights.text} onChange={e => handleInputChange('reservedRights.text', e.target.value)} placeholder="Texto dos direitos reservados..." rows={3} />
                      </div>}
                  </div>
                </TabsContent>

                <TabsContent value="payment" className="space-y-4">
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Formas de Pagamento</h3>
                      <p className="text-sm text-muted-foreground">
                        Selecione quais formas de pagamento estarão disponíveis no checkout
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center space-x-3 p-4 border rounded-lg">
                          <Checkbox id="pix" checked={checkoutData.paymentMethods.pix} onCheckedChange={checked => handleInputChange('paymentMethods.pix', checked)} />
                          <div className="flex items-center gap-2">
                            <Smartphone className="h-5 w-5 text-green-600" />
                            <div>
                              <Label htmlFor="pix" className="text-sm font-medium">PIX</Label>
                              <p className="text-xs text-muted-foreground">Pagamento instantâneo</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-3 p-4 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Checkbox id="creditCard" checked={checkoutData.paymentMethods.creditCard} onCheckedChange={checked => handleInputChange('paymentMethods.creditCard', checked)} />
                            <div className="flex items-center gap-2">
                              <CreditCard className="h-5 w-5 text-blue-600" />
                              <div>
                                <Label htmlFor="creditCard" className="text-sm font-medium">Cartão de Crédito</Label>
                                <p className="text-xs text-muted-foreground">Parcelamento disponível</p>
                              </div>
                            </div>
                          </div>
                          
                          {checkoutData.paymentMethods.creditCard && (
                            <div className="ml-8 space-y-3 pt-3 border-t">
                              <div className="space-y-2">
                                <Label htmlFor="maxInstallments" className="text-sm">Máximo de Parcelas</Label>
                                <Select 
                                  value={String(checkoutData.paymentMethods.maxInstallments || 12)} 
                                  onValueChange={value => handleInputChange('paymentMethods.maxInstallments', parseInt(value))}
                                >
                                  <SelectTrigger id="maxInstallments">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-white dark:bg-gray-800 z-50">
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map(num => (
                                      <SelectItem key={num} value={String(num)}>
                                        {num}x
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              <div className="flex items-center space-x-3">
                                <Checkbox 
                                  id="installmentsWithInterest" 
                                  checked={checkoutData.paymentMethods.installmentsWithInterest || false} 
                                  onCheckedChange={checked => handleInputChange('paymentMethods.installmentsWithInterest', checked)} 
                                />
                                <Label htmlFor="installmentsWithInterest" className="text-sm">
                                  Cobrar juros nas parcelas
                                </Label>
                              </div>
                              <p className="text-xs text-muted-foreground ml-7">
                                {checkoutData.paymentMethods.installmentsWithInterest 
                                  ? "As taxas de juros serão aplicadas conforme a configuração do Mercado Pago"
                                  : "Todas as parcelas serão sem juros"}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {!checkoutData.paymentMethods.pix && !checkoutData.paymentMethods.creditCard && <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-sm text-yellow-800">
                            ⚠️ Selecione pelo menos uma forma de pagamento
                          </p>
                        </div>}
                    </div>
                    
                     
                     <div className="space-y-4">
                       <h3 className="text-lg font-semibold">Contato de Suporte</h3>
                       <p className="text-sm text-muted-foreground">
                         Adicione informações de contato para suporte
                       </p>
                       
                       <div className="space-y-2">
                         <Label>Email para Suporte</Label>
                         <Input value={checkoutData.support_contact?.email || ''} onChange={e => handleInputChange('support_contact.email', e.target.value)} placeholder="Ex: suporte@seudominio.com.br" />
                         <p className="text-xs text-muted-foreground">
                           Este email será mostrado no checkout para clientes que precisarem de ajuda
                         </p>
                       </div>
                     </div>
                   </div>
                  </TabsContent>

                <TabsContent value="integrations" className="space-y-4">
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold">Configurações de Integração</h3>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Conta do Mercado Pago para Processamento</Label>
                        <Select 
                          value={checkoutData.integrations?.selectedMercadoPagoAccount || ''} 
                          onValueChange={value => {
                            // Don't allow selecting the disabled "no-account" option
                            if (value !== 'no-account') {
                              handleInputChange('integrations.selectedMercadoPagoAccount', value);
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma conta configurada" />
                          </SelectTrigger>
                          <SelectContent>
                            {mercadoPagoAccounts.length === 0 ? (
                              <SelectItem value="no-account" disabled>
                                Nenhuma conta configurada
                              </SelectItem>
                            ) : (
                              mercadoPagoAccounts.map((account) => (
                                <SelectItem key={account.id} value={account.id}>
                                  {account.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          {mercadoPagoAccounts.length === 0 
                            ? "Configure uma conta do Mercado Pago na página de Integrações" 
                            : "Conta que será usada para processar os pagamentos deste checkout"
                          }
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>Meta Pixel para Rastreamento</Label>
                        <Select 
                          value={checkoutData.integrations?.selectedMetaPixel || ''} 
                          onValueChange={value => {
                            // Don't allow selecting the disabled "no-pixel" option
                            if (value !== 'no-pixel') {
                              handleInputChange('integrations.selectedMetaPixel', value);
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um pixel configurado" />
                          </SelectTrigger>
                          <SelectContent>
                            {metaPixels.length === 0 ? (
                              <SelectItem value="no-pixel" disabled>
                                Nenhum pixel configurado
                              </SelectItem>
                            ) : (
                              metaPixels.map((pixel) => (
                                <SelectItem key={pixel.id} value={pixel.id}>
                                  {pixel.name} (ID: {pixel.pixelId})
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          {metaPixels.length === 0 
                            ? "Configure um Meta Pixel na página de Integrações" 
                            : "Pixel que será usado para rastrear conversões deste checkout"
                          }
                        </p>
                      </div>

                      {(mercadoPagoAccounts.length === 0 || metaPixels.length === 0) && (
                        <Card className="p-4 bg-blue-50 border-blue-200">
                          <div className="flex items-center gap-2 text-blue-800">
                            <CreditCard className="h-4 w-4" />
                            <span className="font-medium">Configure suas integrações</span>
                          </div>
                          <p className="text-sm text-blue-700 mt-1">
                            Para usar todas as funcionalidades, configure suas integrações na página de Administração.
                          </p>
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            className="mt-3 border-blue-300 text-blue-700 hover:bg-blue-100"
                            onClick={() => window.open('/admin/integrations', '_blank')}
                          >
                            Ir para Integrações
                          </Button>
                        </Card>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="styles" className="space-y-4">
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold">Personalização Visual</h3>
                    
                    <div className="space-y-2">
                      <Label>Layout do Checkout</Label>
                      <Select value={checkoutData.layout || 'horizontal'} onValueChange={value => handleInputChange('layout', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o layout" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="horizontal">Horizontal</SelectItem>
                          <SelectItem value="mosaic">Mosaico</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Separator />

                     <div className="space-y-4">
                       <h4 className="font-semibold">Textos e Conteúdo</h4>
                       
                       <div className="space-y-2">
                         <Label>Texto da Headline</Label>
                         <Textarea value={checkoutData.styles?.headlineText || 'Sua transformação começa agora!'} onChange={e => handleInputChange('styles.headlineText', e.target.value)} placeholder="Sua transformação começa agora!" rows={2} />
                          <div className="text-xs text-muted-foreground">
                            💡 Para destacar palavras com cores diferentes:
                            <br />
                            <code className="bg-muted px-1 py-0.5 rounded text-xs">
                              Sua transformação *começa agora*!
                            </code>
                          </div>
                       </div>

                       <div className="space-y-2">
                         <Label>Descrição</Label>
                         <Textarea value={checkoutData.styles?.description || ''} onChange={e => handleInputChange('styles.description', e.target.value)} placeholder="Descrição opcional do produto" rows={3} />
                       </div>
                     </div>

                    <Separator />
                    
                    <div className="space-y-4">
                      <h4 className="font-semibold">Cores</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Cor de Fundo</Label>
                          <div className="flex gap-2">
                            <Input type="color" value={checkoutData.styles?.backgroundColor || '#ffffff'} onChange={e => handleInputChange('styles.backgroundColor', e.target.value)} className="w-16 h-10 p-1 border rounded cursor-pointer" />
                            <Input type="text" value={checkoutData.styles?.backgroundColor || '#ffffff'} onChange={e => handleInputChange('styles.backgroundColor', e.target.value)} placeholder="#ffffff" className="flex-1" />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Cor Principal</Label>
                          <div className="flex gap-2">
                            <Input type="color" value={checkoutData.styles?.primaryColor || '#3b82f6'} onChange={e => handleInputChange('styles.primaryColor', e.target.value)} className="w-16 h-10 p-1 border rounded cursor-pointer" />
                            <Input type="text" value={checkoutData.styles?.primaryColor || '#3b82f6'} onChange={e => handleInputChange('styles.primaryColor', e.target.value)} placeholder="#3b82f6" className="flex-1" />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Cor da Headline</Label>
                          <div className="flex gap-2">
                            <Input type="color" value={checkoutData.styles?.headlineColor || '#000000'} onChange={e => handleInputChange('styles.headlineColor', e.target.value)} className="w-16 h-10 p-1 border rounded cursor-pointer" />
                            <Input type="text" value={checkoutData.styles?.headlineColor || '#000000'} onChange={e => handleInputChange('styles.headlineColor', e.target.value)} placeholder="#000000" className="flex-1" />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Cor da Palavra em Destaque</Label>
                          <div className="flex gap-2">
                            <Input type="color" value={checkoutData.styles?.highlightColor || checkoutData.styles?.primaryColor || '#3b82f6'} onChange={e => handleInputChange('styles.highlightColor', e.target.value)} className="w-16 h-10 p-1 border rounded cursor-pointer" />
                            <Input type="text" value={checkoutData.styles?.highlightColor || checkoutData.styles?.primaryColor || '#3b82f6'} onChange={e => handleInputChange('styles.highlightColor', e.target.value)} placeholder="#3b82f6" className="flex-1" />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Cor das palavras entre asteriscos (*palavra*)
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label>Cor do Gradiente do Botão</Label>
                          <div className="flex gap-2">
                            <Input type="color" value={checkoutData.styles?.gradientColor || '#60a5fa'} onChange={e => handleInputChange('styles.gradientColor', e.target.value)} className="w-16 h-10 p-1 border rounded cursor-pointer" />
                            <Input type="text" value={checkoutData.styles?.gradientColor || '#60a5fa'} onChange={e => handleInputChange('styles.gradientColor', e.target.value)} placeholder="#60a5fa" className="flex-1" />
                          </div>
                         </div>
                       </div>
                     </div>

                     <Separator />

                     <div className="space-y-4">
                       <h4 className="font-semibold">Temporizador de Oferta</h4>
                       
                       <div className="space-y-2">
                         <div className="flex items-center space-x-2">
                           <Switch 
                             checked={checkoutData.timer?.enabled || false} 
                             onCheckedChange={checked => handleInputChange('timer.enabled', checked)} 
                           />
                           <Label>Ativar temporizador</Label>
                         </div>
                       </div>

                       {checkoutData.timer?.enabled && (
                         <div className="space-y-4 pl-6 border-l-2 border-gray-200">
                           <div className="space-y-2">
                             <Label>Duração (em minutos)</Label>
                             <Input 
                               type="number" 
                               min="1" 
                               max="120" 
                               value={checkoutData.timer?.duration || 15} 
                               onChange={e => handleInputChange('timer.duration', parseInt(e.target.value) || 15)} 
                               placeholder="15" 
                             />
                             <p className="text-xs text-muted-foreground">
                               Tempo em minutos para a oferta expirar
                             </p>
                           </div>

                           <div className="space-y-2">
                             <Label>Texto do Timer</Label>
                             <Input 
                               value={checkoutData.timer?.text || 'Oferta por tempo limitado'} 
                               onChange={e => handleInputChange('timer.text', e.target.value)} 
                               placeholder="Oferta por tempo limitado" 
                             />
                           </div>

                           <div className="space-y-2">
                             <Label>Cor do Timer</Label>
                             <div className="flex gap-2">
                               <Input 
                                 type="color" 
                                 value={checkoutData.timer?.color || '#dc2626'} 
                                 onChange={e => handleInputChange('timer.color', e.target.value)} 
                                 className="w-16 h-10 p-1 border rounded cursor-pointer" 
                               />
                               <Input 
                                 type="text" 
                                 value={checkoutData.timer?.color || '#dc2626'} 
                                 onChange={e => handleInputChange('timer.color', e.target.value)} 
                                 placeholder="#dc2626" 
                                 className="flex-1" 
                               />
                             </div>
                           </div>
                         </div>
                       )}
                     </div>
                   </div>
                 </TabsContent>

                <TabsContent value="deliverable" className="space-y-4">
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Upload className="h-5 w-5" />
                      Entregável do Checkout
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Configure um arquivo ou link que será disponibilizado na página de sucesso do pagamento.
                      Isso sobrescreve o entregável do produto base, se houver.
                    </p>

                    <div className="space-y-4">
                      <Label>Tipo de Entregável</Label>
                      <Select 
                        value={checkoutData.deliverable.type} 
                        onValueChange={value => handleInputChange('deliverable.type', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo de entregável" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          <SelectItem value="link">Link Direto</SelectItem>
                          <SelectItem value="upload">Upload de Arquivo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {checkoutData.deliverable.type !== 'none' && ( // Mostrar nome/descrição se não for 'none'
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="deliverableName">Nome do Entregável</Label>
                          <Input 
                            id="deliverableName" 
                            value={checkoutData.deliverable.name || ''} 
                            onChange={e => handleInputChange('deliverable.name', e.target.value)} 
                            placeholder="Ex: E-book Exclusivo" 
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="deliverableDescription">Descrição do Entregável</Label>
                          <Textarea 
                            id="deliverableDescription" 
                            value={checkoutData.deliverable.description || ''} 
                            onChange={e => handleInputChange('deliverable.description', e.target.value)} 
                            placeholder="Uma breve descrição do que o cliente receberá." 
                            rows={3}
                          />
                        </div>
                      </>
                    )}

                    {checkoutData.deliverable.type === 'link' && (
                      <div className="space-y-2">
                        <Label htmlFor="deliverableLink">Link do Entregável *</Label>
                        <Input 
                          id="deliverableLink" 
                          type="url" 
                          value={checkoutData.deliverable.link || ''} 
                          onChange={e => handleInputChange('deliverable.link', e.target.value)} 
                          placeholder="https://exemplo.com/meu-ebook.pdf" 
                          required 
                        />
                      </div>
                    )}

                    {checkoutData.deliverable.type === 'upload' && (
                      <div className="space-y-2">
                        <Label htmlFor="deliverableFile">Arquivo Entregável *</Label>
                        <Input 
                          id="deliverableFile" 
                          type="file" 
                          onChange={e => handleFileChange(e.target.files?.[0] || null)} 
                          required={!checkoutData.deliverable.fileUrl}
                        />
                        {checkoutData.deliverable.fileUrl && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <Link className="h-4 w-4" />
                            <span>Arquivo atual: <a href={checkoutData.deliverable.fileUrl} target="_blank" rel="noopener noreferrer" className="underline">Ver</a></span>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleInputChange('deliverable.fileUrl', '')}
                              className="h-6 px-2 text-destructive hover:text-destructive"
                            >
                              <XCircle className="h-3 w-3 mr-1" /> Remover
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </TabsContent>


              </Tabs>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => {
                  setIsDialogOpen(false);
                  setEditingCheckout(null);
                }}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingCheckout ? 'Salvar Alterações' : 'Criar Checkout'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <CreditCard className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="hidden sm:inline">Suas Páginas de Checkout</span>
            <span className="sm:hidden">Checkout</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {checkouts.length === 0 ? <div className="text-center py-8 sm:py-12">
              <CreditCard className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-semibold mb-2">Nenhum checkout criado</h3>
              <p className="text-sm sm:text-base text-muted-foreground mb-4">
                Crie sua primeira página de vendas personalizada com Mercado Pago
              </p>
            </div> : <div className="space-y-3 sm:space-y-4">
              {checkouts.map(checkout => <div key={checkout.id} className="border rounded-lg p-3 sm:p-4 hover:bg-accent/50 transition-colors">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold cursor-pointer hover:text-primary transition-colors text-sm sm:text-base line-clamp-2" 
                         onClick={() => window.open(`/checkout/${checkout.id}`, '_blank')}>
                        {checkout.products?.name || 'Produto não encontrado'}
                      </h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Preço: R$ {(checkout.price / 100).toFixed(2)}
                        {checkout.promotional_price && ` (De: R$ ${(checkout.promotional_price / 100).toFixed(2)})`}
                      </p>
                      <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-1">
                        <p className="text-xs text-muted-foreground">
                          Criado em: {new Date(checkout.created_at).toLocaleDateString('pt-BR')}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          Layout: {checkout.layout || 'horizontal'}
                        </Badge>
                        {checkout.integrations?.selectedMercadoPagoAccount && (
                          <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                            MP Configurado
                          </Badge>
                        )}
                        {checkout.integrations?.selectedMetaPixel && (
                          <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                            Pixel Ativo
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                      <Button variant="outline" size="sm" onClick={() => window.open(`/checkout/${checkout.id}`, '_blank')} className="text-xs sm:text-sm">
                        <Smartphone className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        <span className="hidden sm:inline">Ver Checkout</span>
                        <span className="sm:hidden">Ver</span>
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/checkout/${checkout.id}`);
                  toast({
                    title: "Link copiado!",
                    description: "O link do checkout foi copiado para a área de transferência"
                  });
                }} className="text-xs sm:text-sm">
                        <Link className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        <span className="hidden sm:inline">Copiar Link</span>
                        <span className="sm:hidden">Link</span>
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleEdit(checkout)} className="text-xs sm:text-sm">
                        <Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        <span className="hidden sm:inline">Editar</span>
                        <span className="sm:hidden">Edit</span>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm" className="text-xs sm:text-sm">
                            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                            <span className="hidden sm:inline">Excluir</span>
                            <span className="sm:hidden">Del</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="max-w-xs sm:max-w-md mx-2 sm:mx-4">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-sm sm:text-base">
                              Tem certeza que deseja excluir este checkout?
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-xs sm:text-sm">
                              Esta ação não pode ser desfeita e o checkout não estará mais disponível para seus clientes.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                            <AlertDialogCancel className="text-xs sm:text-sm">Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(checkout.id)} className="text-xs sm:text-sm">
                              Confirmar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>)}
            </div>}
        </CardContent>
      </Card>
    </div>;
};
export default AdminCheckouts;