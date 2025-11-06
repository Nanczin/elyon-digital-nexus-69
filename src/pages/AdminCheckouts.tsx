import React, { useState, useEffect, useCallback } from 'react';
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
import { Plus, CreditCard, Package, Shield, FileText, DollarSign, Trash2, Edit, Smartphone, MoreVertical, Save, Link, ShoppingBag, Upload, XCircle, Mail, AlertTriangle, MonitorDot, Check as CheckIcon, ChevronsUpDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { DeliverableConfig, FormFields, PackageConfig, GuaranteeConfig, ReservedRightsConfig, Tables } from '@/integrations/supabase/types';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { setNestedValue, deepMerge } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';


type MemberArea = Tables<'member_areas'>;
type Product = Tables<'products'>;

const AdminCheckouts = () => {
  const {
    user,
    isAdmin,
    loading
  } = useAuth();
  const {
    mercadoPagoAccounts,
    metaPixels,
    emailConfig,
    isConfigured: { email: isEmailIntegrationConfigured }
  } = useIntegrations();
  const {
    toast
  } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingCheckout, setEditingCheckout] = useState<any>(null);
  const [checkouts, setCheckouts] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [memberAreas, setMemberAreas] = useState<MemberArea[]>([]);
  const [currentTab, setCurrentTab] = useState('basic');
  
  // State to manage file upload for checkout-level deliverable
  const [checkoutDeliverableFile, setCheckoutDeliverableFile] = useState<File | null>(null);

  // Refatorado initialFormData para ser uma função que retorna um novo objeto
  const getInitialFormData = useCallback(() => {
    const initial: any = {
      name: '',
      layout: 'horizontal' as string,
      form_fields: {
        requireName: true,
        requireCpf: true,
        requirePhone: true,
        requireEmail: true,
        requireEmailConfirm: true,
        packages: [{
          id: 1,
          name: 'Pacote Básico',
          description: 'Acesso essencial ao produto.',
          topics: ['Acesso vitalício: ao conteúdo principal'],
          price: 97.00,
          originalPrice: 0,
          mostSold: false,
          associatedProductIds: [],
        }] as PackageConfig[],
        guarantee: {
          enabled: true,
          days: 7,
          description: 'Garantia de 7 Dias. Se não gostar, devolvemos seu dinheiro sem burocracia.'
        } as GuaranteeConfig,
        reservedRights: {
          enabled: true,
          text: 'Todos os direitos reservados. Este produto é protegido por direitos autorais.'
        } as ReservedRightsConfig,
        deliverable: {
          type: 'none' as 'none' | 'link' | 'upload',
          link: null,
          fileUrl: null,
          name: null,
          description: null,
        } as DeliverableConfig,
        sendTransactionalEmail: true,
        transactionalEmailSubject: 'Seu acesso ao produto Elyon Digital!',
        transactionalEmailBody: 'Olá {customer_name},\n\nObrigado por sua compra! Seu acesso ao produto "{product_name}" está liberado.\n\nAcesse aqui: {access_link}\n\nQualquer dúvida, entre em contato com nosso suporte.\n\nAtenciosamente,\nEquipe Elyon Digital'
      } as FormFields,
      payment_methods: {
        pix: true,
        creditCard: true,
        maxInstallments: 12,
        installmentsWithInterest: false
      },
      order_bumps: [{
        id: 1,
        selectedProduct: '',
        price: 0,
        originalPrice: 0,
        enabled: false
      }],
      styles: {
        backgroundColor: '#ffffff',
        primaryColor: '#3b82f6',
        textColor: '#000000',
        headlineText: 'Sua transformação começa agora!',
        headlineColor: '#000000',
        description: 'Desbloqueie seu potencial com nosso produto exclusivo.',
        gradientColor: '#60a5fa',
        highlightColor: '#3b82f6'
      },
      integrations: {
        selectedMercadoPagoAccount: '',
        selectedMetaPixel: '',
        selectedEmailAccount: '',
      },
      support_contact: {
        email: ''
      },
      timer: {
        enabled: false,
        duration: 15,
        color: '#dc2626',
        text: 'Oferta por tempo limitado'
      },
      member_area_id: '' as string | null,
    };
    // Deep clone the initial object to ensure a fresh start every time
    return JSON.parse(JSON.stringify(initial));
  }, []);
  
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
    hasSavedData,
    forceLoad
  } = useAutoSave(getInitialFormData, {
    key: autoSaveKey,
    debounceMs: 800,
    showToast: false
  });
  
  const loadOriginalCheckoutData = useCallback((checkout: any) => {
    const initial = getInitialFormData();

    // Convert prices from cents to reais
    const priceInReais = checkout.price ? checkout.price / 100 : 0;
    const promotionalPriceInReais = checkout.promotional_price ? checkout.promotional_price / 100 : 0;
    
    // Convert order bumps from cents to reais
    const orderBumpsInReais = Array.isArray(checkout.order_bumps) ? checkout.order_bumps.map((bump: any) => ({
      ...bump,
      price: bump.price ? bump.price / 100 : 0,
      originalPrice: bump.originalPrice ? bump.originalPrice / 100 : 0,
      selectedProduct: bump.selectedProduct || ''
    })) : initial.order_bumps;
    
    const packagesFromDb = (checkout.form_fields as FormFields)?.packages;
    const packagesConfig: PackageConfig[] = Array.isArray(packagesFromDb) ? packagesFromDb.map((pkg: any) => ({
      id: pkg.id || Date.now(),
      name: pkg.name || '',
      description: pkg.description || '',
      topics: Array.isArray(pkg.topics) ? pkg.topics.filter((t: any) => typeof t === 'string') : [''],
      price: pkg.price ? pkg.price / 100 : priceInReais,
      originalPrice: pkg.originalPrice ? pkg.originalPrice / 100 : promotionalPriceInReais,
      mostSold: pkg.mostSold ?? false,
      associatedProductIds: Array.isArray(pkg.associatedProductIds) ? pkg.associatedProductIds : (pkg.associatedProductId ? [pkg.associatedProductId] : []),
    })) : initial.form_fields.packages;

    // Definir o arquivo selecionado localmente se houver um fileUrl existente
    if (checkout.form_fields?.deliverable?.fileUrl && checkout.form_fields?.deliverable?.type === 'upload') {
      setCheckoutDeliverableFile(null);
    }

    return deepMerge(initial, {
      name: checkout.name || checkout.products?.name || '',
      layout: 'horizontal',
      form_fields: {
        requireName: checkout.form_fields?.requireName ?? true,
        requireCpf: checkout.form_fields?.requireCpf ?? true,
        requirePhone: checkout.form_fields?.requirePhone ?? true,
        requireEmail: checkout.form_fields?.requireEmail ?? true,
        requireEmailConfirm: checkout.form_fields?.requireEmailConfirm ?? true,
        packages: packagesConfig,
        guarantee: (checkout.form_fields?.guarantee as GuaranteeConfig) || initial.form_fields.guarantee,
        reservedRights: (checkout.form_fields?.reservedRights as ReservedRightsConfig) || initial.form_fields.reservedRights,
        deliverable: {
          type: checkout.form_fields?.deliverable?.type || 'none',
          link: checkout.form_fields?.deliverable?.link || null,
          fileUrl: checkout.form_fields?.deliverable?.fileUrl || null,
          name: checkout.form_fields?.deliverable?.name || null,
          description: checkout.form_fields?.deliverable?.description || null
        },
        sendTransactionalEmail: checkout.form_fields?.sendTransactionalEmail ?? true,
        transactionalEmailSubject: checkout.form_fields?.transactionalEmailSubject || initial.form_fields.transactionalEmailSubject,
        transactionalEmailBody: checkout.form_fields?.transactionalEmailBody || initial.form_fields.transactionalEmailBody,
      },
      payment_methods: checkout.payment_methods || initial.payment_methods,
      order_bumps: orderBumpsInReais,
      integrations: {
        ...initial.integrations,
        ...(checkout.integrations || {}),
        selectedEmailAccount: checkout.integrations?.selectedEmailAccount || '',
      },
      support_contact: checkout.support_contact || initial.support_contact,
      styles: {
        ...checkout.styles,
        description: checkout.styles?.description || checkout.products?.description || initial.styles.description,
        headlineText: checkout.styles?.headlineText || checkout.products?.name || initial.styles.headlineText,
      },
      timer: checkout.timer || initial.timer,
      member_area_id: checkout.member_area_id || null,
    });
  }, [getInitialFormData, products]);

  // Efeito para carregar dados originais do checkout se estiver editando
  useEffect(() => {
    console.log(`[AdminCheckouts] useEffect for editingCheckout. editingCheckout:`, editingCheckout);
    if (editingCheckout) {
      const newKey = `checkout-edit-${editingCheckout.id}`;
      if (autoSaveKey !== newKey) {
        setAutoSaveKey(newKey);
        // forceLoad será chamado pelo useAutoSave quando a chave mudar
      } else {
        // Se a chave já é a correta, tentar carregar o rascunho.
        // Se não houver rascunho, carregar os dados originais do DB.
        if (!forceLoad()) {
          console.log(`[AdminCheckouts] No draft found for ${newKey}, loading original data.`);
          const originalData = loadOriginalCheckoutData(editingCheckout);
          loadData(originalData);
        } else {
          console.log(`[AdminCheckouts] Draft loaded for ${newKey}.`);
        }
      }
    } else {
      // Quando criando um novo checkout
      if (autoSaveKey !== 'checkout-new') {
        setAutoSaveKey('checkout-new');
        // forceLoad será chamado pelo useAutoSave quando a chave mudar
      } else {
        // Se a chave já é 'checkout-new', e não há rascunho, useAutoSave já terá carregado initialFormData().
        // Se houver rascunho, ele já terá carregado o rascunho.
        if (!hasSavedData) {
          console.log(`[AdminCheckouts] No draft found for 'checkout-new', initializing with fresh data.`);
          loadData(getInitialFormData());
        } else {
          console.log(`[AdminCheckouts] Draft loaded for 'checkout-new'.`);
        }
      }
    }
  }, [editingCheckout, autoSaveKey, loadData, forceLoad, getInitialFormData, loadOriginalCheckoutData, hasSavedData]);


  // Salvar dados antes de navegar ou fechar a aba
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Forçar o salvamento dos dados atuais
      try {
        // Usar uma função replacer para JSON.stringify para excluir objetos File
        const dataToSave = JSON.stringify(checkoutData, (key, value) => {
          if (value instanceof File) {
            return undefined;
          }
          return value;
        });
        localStorage.setItem(autoSaveKey, dataToSave);
        console.log(`[AdminCheckouts] Data saved to localStorage on beforeunload for key: ${autoSaveKey}`);
      } catch (error) {
        console.error(`[AdminCheckouts] Erro ao salvar dados antes de navegar para key: ${autoSaveKey}`, error);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [autoSaveKey, checkoutData]);

  useEffect(() => {
    if (user && isAdmin) {
      fetchCheckouts();
      fetchProducts();
      fetchMemberAreas();
    }
  }, [user, isAdmin]);

  const fetchCheckouts = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('checkouts').select(`
          *,
          products (id, name),
          member_areas (name, slug)
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
      } = await supabase.from('products').select('id, name, price, description, access_url, file_url, member_area_link').order('created_at', {
        ascending: false
      });
      if (error) throw error;
      setProducts(data as Product[] || []);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
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
      setMemberAreas(data as MemberArea[] || []);
    } catch (error) {
      console.error('Erro ao carregar áreas de membros:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as áreas de membros",
        variant: "destructive"
      });
    }
  };

  const uploadFile = async (file: File, folder: string) => {
    console.log(`[AdminCheckouts] Attempting to upload file: ${file.name} to folder: ${folder}`);
    const fileExt = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('products')
      .upload(filePath, file);

    if (uploadError) {
      console.error(`[AdminCheckouts] Error uploading file ${file.name}:`, uploadError);
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('products')
      .getPublicUrl(filePath);

    console.log(`[AdminCheckouts] File uploaded successfully: ${data.publicUrl}`);
    return data.publicUrl;
  };

  const resetToOriginal = () => {
    if (editingCheckout) {
      const originalData = loadOriginalCheckoutData(editingCheckout);
      loadData(originalData);
      clearSavedData();
      setCheckoutDeliverableFile(null);
      
      toast({
        title: "Dados recarregados",
        description: "Dados originais do checkout foram recarregados"
      });
    } else {
      loadData(getInitialFormData());
      clearSavedData();
      setCheckoutDeliverableFile(null);
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
    
    // Limpar os arquivos selecionados localmente ao iniciar a edição
    setCheckoutDeliverableFile(null);

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
    console.log(`[AdminCheckouts] handleInputChange: path=${path}, value=`, value);
    setCheckoutData(prev => {
      const newState = setNestedValue(prev, path, value);
      console.log(`[AdminCheckouts] handleInputChange: Previous state reference:`, prev);
      console.log(`[AdminCheckouts] handleInputChange: New state reference:`, newState);
      return newState;
    });
  };

  const handleCheckoutDeliverableFileChange = (file: File | null) => {
    setCheckoutDeliverableFile(file);
    if (file) {
      handleInputChange('form_fields.deliverable.link', null);
      handleInputChange('form_fields.deliverable.fileUrl', null);
    }
  };

  const addPackage = () => {
    const newPackages = [...checkoutData.form_fields.packages, {
      id: Date.now(),
      name: 'Novo Pacote',
      description: '',
      topics: [''],
      price: 0,
      originalPrice: 0,
      mostSold: false,
      associatedProductIds: [],
    }] as PackageConfig[];
    handleInputChange('form_fields.packages', newPackages);
  };
  const removePackage = (id: number) => {
    const newPackages = checkoutData.form_fields.packages.filter(pkg => pkg.id !== id);
    if (newPackages.length === 0) {
      toast({ title: "Erro", description: "Deve haver pelo menos um pacote.", variant: "destructive" });
      return;
    }
    handleInputChange('form_fields.packages', newPackages);
  };
  const updatePackage = (id: number, field: string, value: any) => {
    const packages = checkoutData.form_fields.packages.map((pkg: PackageConfig) => pkg.id === id ? {
      ...pkg,
      [field]: value
    } : pkg);
    handleInputChange('form_fields.packages', packages);
  };

  const toggleProductAssociation = (packageId: number, productId: string, isChecked: boolean) => {
    const packageIndex = checkoutData.form_fields.packages.findIndex((p: PackageConfig) => p.id === packageId);
    if (packageIndex === -1) return;

    const currentAssociatedIds = checkoutData.form_fields.packages[packageIndex].associatedProductIds || [];
    let updatedIds: string[];

    if (isChecked) {
      updatedIds = [...currentAssociatedIds, productId];
    } else {
      updatedIds = currentAssociatedIds.filter((id: string) => id !== productId);
    }
    handleInputChange(`form_fields.packages[${packageIndex}].associatedProductIds`, updatedIds);
  };

  const addTopicToPackage = () => {
    const packages = checkoutData.form_fields.packages.map((pkg: PackageConfig) => pkg.id === selectedPackage ? {
      ...pkg,
      topics: [...pkg.topics, '']
    } : pkg);
    handleInputChange('form_fields.packages', packages);
  };
  const removeTopicFromPackage = (packageId: number, topicIndex: number) => {
    const packages = checkoutData.form_fields.packages.map((pkg: PackageConfig) => pkg.id === packageId ? {
      ...pkg,
      topics: pkg.topics.filter((_, index) => index !== topicIndex)
    } : pkg);
    handleInputChange('form_fields.packages', packages);
  };
  const updatePackageTopic = (packageId: number, topicIndex: number, value: string) => {
    const packages = checkoutData.form_fields.packages.map((pkg: PackageConfig) => pkg.id === packageId ? {
      ...pkg,
      topics: pkg.topics.map((topic, index) => index === topicIndex ? value : topic)
    } : pkg);
    handleInputChange('form_fields.packages', packages);
  };
  const addOrderBump = () => {
    const newOrderBumps = [...checkoutData.order_bumps, {
      id: Date.now(),
      selectedProduct: '',
      price: 0,
      originalPrice: 0,
      enabled: false
    }];
    handleInputChange('order_bumps', newOrderBumps);
  };
  const removeOrderBump = (id: number) => {
    const newOrderBumps = checkoutData.order_bumps.filter(bump => bump.id !== id);
    handleInputChange('order_bumps', newOrderBumps);
  };
  const updateOrderBump = (id: number, field: string, value: any) => {
    const orderBumps = checkoutData.order_bumps.map(bump => bump.id === id ? {
      ...bump,
      [field]: value
    } : bump);
    handleInputChange('order_bumps', orderBumps);
  };
  const loadProductAsOrderBump = (bumpId: number, productData: any) => {
    if (productData === 'manual') {
      // Reset to manual configuration
      const orderBumps = checkoutData.order_bumps.map(bump => bump.id === bumpId ? {
        ...bump,
        price: 0,
        originalPrice: 0,
        selectedProduct: ''
      } : bump);
      handleInputChange('order_bumps', orderBumps);
      return;
    }

    // Load real product data from database
    const product = products.find(p => p.id === productData);
    if (product) {
      // Convert from cents (database format) to reais (form format) for display
      const priceInReais = product.price / 100;
      const discountedPriceInReais = priceInReais * 0.5;
      
      console.log('Order Bump Product Loading:', {
        productName: product.name,
        priceInCents: product.price,
        priceInReais: priceInReais,
        discountedPrice: discountedPriceInReais
      });
      
      const orderBumps = checkoutData.order_bumps.map(bump => bump.id === bumpId ? {
        ...bump,
        price: discountedPriceInReais,
        originalPrice: priceInReais,
        selectedProduct: product.id
      } : bump);
      handleInputChange('order_bumps', orderBumps);
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // NEW VALIDATION: Ensure at least one package exists
    if (!checkoutData.form_fields.packages || checkoutData.form_fields.packages.length === 0) {
      toast({
        title: "Erro",
        description: "Adicione pelo menos um pacote ao checkout.",
        variant: "destructive"
      });
      return;
    }

    // NEW VALIDATION: Ensure main package price is greater than zero
    const mainPackagePrice = checkoutData.form_fields.packages[0]?.price;
    if (mainPackagePrice === undefined || mainPackagePrice <= 0) {
      toast({
        title: "Erro",
        description: "O preço do pacote principal deve ser maior que zero.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      console.log('ADMIN_CHECKOUTS_DEBUG: Submitting form. Timer:', checkoutData.timer);

      // Handle checkout-level deliverable file upload
      let finalCheckoutDeliverable: DeliverableConfig = { ...checkoutData.form_fields.deliverable };
      if (finalCheckoutDeliverable.type === 'upload' && checkoutDeliverableFile) {
        console.log('ADMIN_CHECKOUTS_DEBUG: Uploading checkout-level deliverable file:', checkoutDeliverableFile.name);
        finalCheckoutDeliverable.fileUrl = await uploadFile(checkoutDeliverableFile, 'checkout-deliverables');
      } else if (finalCheckoutDeliverable.type === 'link') {
        finalCheckoutDeliverable.fileUrl = finalCheckoutDeliverable.link;
      } else {
        finalCheckoutDeliverable.fileUrl = null;
        finalCheckoutDeliverable.link = null;
      }

      const checkoutPayload = {
        user_id: user?.id,
        member_area_id: checkoutData.member_area_id || null,
        name: checkoutData.name,
        // product_id agora é derivado do primeiro pacote
        product_id: checkoutData.form_fields.packages[0]?.associatedProductIds?.[0] || null,
        price: Math.round(checkoutData.form_fields.packages[0]?.price * 100) || 0,
        promotional_price: checkoutData.form_fields.packages[0]?.originalPrice ? Math.round(checkoutData.form_fields.packages[0].originalPrice * 100) : null,
        form_fields: {
          ...checkoutData.form_fields,
          packages: checkoutData.form_fields.packages.map(pkg => ({
            ...pkg,
            price: Math.round(pkg.price * 100),
            originalPrice: Math.round((pkg.originalPrice || 0) * 100)
          })),
          deliverable: finalCheckoutDeliverable
        },
        payment_methods: checkoutData.payment_methods,
        order_bumps: checkoutData.order_bumps.map(bump => ({
          ...bump,
          price: Math.round(bump.price * 100),
          originalPrice: Math.round((bump.originalPrice || 0) * 100)
        })),
        styles: checkoutData.styles,
        layout: 'horizontal',
        support_contact: checkoutData.support_contact,
        integrations: checkoutData.integrations,
        timer: checkoutData.timer || null
      };

      console.log('ADMIN_CHECKOUTS_DEBUG: Final checkoutPayload before DB operation:', JSON.stringify(checkoutPayload, null, 2));

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
      clearSavedData();
      setCheckoutDeliverableFile(null);
      fetchCheckouts();
    } catch (error: any) {
      console.error('ADMIN_CHECKOUTS_DEBUG: Detailed error saving checkout:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar checkout. Verifique o console para mais detalhes.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  return <div className="container mx-auto p-3 sm:p-4 lg:p-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6 sm:mb-8">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground truncate">
            Checkouts
          </h1>
          <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">
            Gerencie as páginas de vendas dos seus produtos
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          // Quando fechar o diálogo, apenas resetar estado de edição mas manter rascunhos
          if (!open) {
            setEditingCheckout(null);
            // Quando o diálogo é fechado, o useAutoSave já terá salvo o rascunho.
            // Se for um novo checkout, o autoSaveKey será 'checkout-new'.
            // Se for um checkout existente, o autoSaveKey será 'checkout-edit-ID'.
            // Não precisamos fazer nada aqui, pois o useAutoSave gerencia o estado.
          }
        }}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2 text-sm sm:text-base" size="sm" onClick={() => {
               setEditingCheckout(null);
              setAutoSaveKey('checkout-new');
            }}>
              <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Novo Checkout</span>
              <span className="sm:hidden">Novo</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto mx-auto">
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
                        // Após limpar o rascunho, recarregar os dados originais do checkout
                        if (editingCheckout) {
                          const originalData = loadOriginalCheckoutData(editingCheckout);
                          loadData(originalData);
                        } else {
                          loadData(getInitialFormData());
                        }
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
                      <Label htmlFor="memberArea">Área de Membros (Opcional)</Label>
                      <Select 
                        value={checkoutData.member_area_id || "none"} 
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
                        Associe este checkout a uma área de membros específica.
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome do Checkout *</Label>
                      <Input id="name" value={checkoutData.name} onChange={e => handleInputChange('name', e.target.value)} placeholder="Ex: Checkout Curso de Marketing" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Descrição *</Label>
                      <Textarea id="description" value={checkoutData.styles?.description || ''} onChange={e => handleInputChange('styles.description', e.target.value)} placeholder="Descrição do checkout..." rows={4} required />
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
                        <Switch checked={checkoutData.form_fields?.requireName ?? true} onCheckedChange={checked => handleInputChange('form_fields.requireName', checked)} />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>CPF</Label>
                          <p className="text-sm text-muted-foreground">Documento obrigatório</p>
                        </div>
                        <Switch checked={checkoutData.form_fields?.requireCpf ?? true} onCheckedChange={checked => handleInputChange('form_fields.requireCpf', checked)} />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Telefone</Label>
                          <p className="text-sm text-muted-foreground">Número de contato</p>
                        </div>
                        <Switch checked={checkoutData.form_fields?.requirePhone ?? true} onCheckedChange={checked => handleInputChange('form_fields.requirePhone', checked)} />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Email</Label>
                          <p className="text-sm text-muted-foreground">Email principal</p>
                        </div>
                        <Switch checked={checkoutData.form_fields?.requireEmail ?? true} onCheckedChange={checked => handleInputChange('form_fields.requireEmail', checked)} />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Confirmar Email</Label>
                          <p className="text-sm text-muted-foreground">Campo de confirmação</p>
                        </div>
                        <Switch checked={checkoutData.form_fields?.requireEmailConfirm ?? true} onCheckedChange={checked => handleInputChange('form_fields.requireEmailConfirm', checked)} />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="packages" className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <h3 className="text-lg font-semibold">Pacotes</h3>
                    <Button type="button" onClick={addPackage} size="sm" className="w-full sm:w-auto">
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Pacote
                    </Button>
                  </div>
                  
                  {checkoutData.form_fields.packages.map((pkg: PackageConfig, index: number) => (
                    <Card key={pkg.id} className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          Pacote {index + 1}
                        </h4>
                        {checkoutData.form_fields.packages.length > 1 && (
                          <Button type="button" variant="destructive" size="sm" onClick={() => removePackage(pkg.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
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
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                          <Label>Tópicos do que será entregue</Label>
                          <Button type="button" size="sm" variant="outline" onClick={() => addTopicToPackage()} className="w-full sm:w-auto">
                            <Plus className="h-4 w-4 mr-2" />
                            Adicionar Tópico
                          </Button>
                        </div>
                        
                         {pkg.topics.map((topic, topicIndex) => (
                           <div key={topicIndex} className="flex items-center gap-2">
                              <Input value={topic} onChange={e => updatePackageTopic(pkg.id, topicIndex, e.target.value)} placeholder="Ex: Acesso vitalício: ao conteúdo" />
                             {pkg.topics.length > 1 && (
                               <Button type="button" variant="destructive" size="sm" onClick={() => removeTopicFromPackage(pkg.id, topicIndex)}>
                                 <Trash2 className="h-4 w-4" />
                               </Button>
                             )}
                           </div>
                         ))}
                         <div className="text-xs text-muted-foreground mt-2">
                           💡 O texto antes dos dois pontos (:) será destacado em negrito automaticamente
                         </div>
                      </div>

                      <Separator className="my-4" />

                      <div className="space-y-4">
                        <h4 className="font-semibold flex items-center gap-2">
                          <ShoppingBag className="h-5 w-5" />
                          Produtos Associados (Opcional)
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Selecione os produtos que serão liberados ao comprar este pacote.
                        </p>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              className="w-full justify-between"
                            >
                              {pkg.associatedProductIds && pkg.associatedProductIds.length > 0
                                ? `${pkg.associatedProductIds.length} produto(s) selecionado(s)`
                                : "Selecionar produtos..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                            <Command>
                              <CommandInput placeholder="Buscar produto..." />
                              <CommandList>
                                <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
                                <CommandGroup>
                                  {products.map((product) => (
                                    <CommandItem
                                      key={product.id}
                                      value={product.id}
                                      onSelect={() => {
                                        toggleProductAssociation(pkg.id, product.id, !pkg.associatedProductIds?.includes(product.id));
                                      }}
                                    >
                                      <Checkbox
                                        checked={pkg.associatedProductIds?.includes(product.id)}
                                        onCheckedChange={(checked) => {
                                          toggleProductAssociation(pkg.id, product.id, checked as boolean);
                                        }}
                                        className="mr-2"
                                      />
                                      {product.name}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </Card>
                  ))}
                </TabsContent>

                <TabsContent value="bumps" className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <h3 className="text-lg font-semibold">Order Bumps</h3>
                    <Button type="button" onClick={addOrderBump} size="sm" className="w-full sm:w-auto">
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Order Bump
                    </Button>
                  </div>
                  
                  {checkoutData.order_bumps.map((bump, index) => (
                    <Card key={bump.id} className="p-4">
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
                              {products.filter(product => product.id && product.id.trim() !== '').map(product => (
                                <SelectItem key={product.id} value={product.id}>
                                  <div className="flex items-center gap-2">
                                    <Package className="h-4 w-4" />
                                    {product.name}
                                  </div>
                                </SelectItem>
                              ))}
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
                    </Card>
                  ))}
                </TabsContent>

                <TabsContent value="guarantee" className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Garantia
                      </h3>
                      <Switch checked={checkoutData.form_fields.guarantee.enabled} onCheckedChange={checked => handleInputChange('form_fields.guarantee.enabled', checked)} />
                    </div>
                    
                    {checkoutData.form_fields.guarantee.enabled && <>
                        <div className="space-y-2">
                          <Label>Dias de Garantia</Label>
                          <Input type="number" value={checkoutData.form_fields.guarantee.days} onChange={e => handleInputChange('form_fields.guarantee.days', Number(e.target.value))} placeholder="7" />
                        </div>
                        <div className="space-y-2">
                          <Label>Descrição da Garantia</Label>
                          <Textarea value={checkoutData.form_fields.guarantee.description} onChange={e => handleInputChange('form_fields.guarantee.description', e.target.value)} placeholder="Descreva a garantia..." rows={3} />
                        </div>
                      </>}
                    
                    <Separator />
                    
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Direitos Reservados
                      </h3>
                      <Switch checked={checkoutData.form_fields.reservedRights.enabled} onCheckedChange={checked => handleInputChange('form_fields.reservedRights.enabled', checked)} />
                    </div>
                    
                    {checkoutData.form_fields.reservedRights.enabled && <div className="space-y-2">
                        <Label>Texto dos Direitos Reservados</Label>
                        <Textarea value={checkoutData.form_fields.reservedRights.text} onChange={e => handleInputChange('form_fields.reservedRights.text', e.target.value)} placeholder="Texto dos direitos reservados..." rows={3} />
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
                          <Checkbox id="pix" checked={checkoutData.payment_methods.pix} onCheckedChange={checked => handleInputChange('payment_methods.pix', checked)} />
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
                            <Checkbox id="creditCard" checked={checkoutData.payment_methods.creditCard} onCheckedChange={checked => handleInputChange('payment_methods.creditCard', checked)} />
                            <div className="flex items-center gap-2">
                              <CreditCard className="h-5 w-5 text-blue-600" />
                              <div>
                                <Label htmlFor="creditCard" className="text-sm font-medium">Cartão de Crédito</Label>
                                <p className="text-xs text-muted-foreground">Parcelamento disponível</p>
                              </div>
                            </div>
                          </div>
                          
                          {checkoutData.payment_methods.creditCard && (
                            <div className="ml-8 space-y-3 pt-3 border-t">
                              <div className="space-y-2">
                                <Label htmlFor="maxInstallments" className="text-sm">Máximo de Parcelas</Label>
                                <Select 
                                  value={String(checkoutData.payment_methods.maxInstallments || 12)} 
                                  onValueChange={value => handleInputChange('payment_methods.maxInstallments', parseInt(value))}
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
                                  checked={checkoutData.payment_methods.installmentsWithInterest || false} 
                                  onCheckedChange={checked => handleInputChange('payment_methods.installmentsWithInterest', checked)} 
                                />
                                <Label htmlFor="installmentsWithInterest" className="text-sm">
                                  Cobrar juros nas parcelas
                                </Label>
                              </div>
                              <p className="text-xs text-muted-foreground ml-7">
                                {checkoutData.payment_methods.installmentsWithInterest 
                                  ? "As taxas de juros serão aplicadas conforme a configuração do Mercado Pago"
                                  : "Todas as parcelas serão sem juros"}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {!checkoutData.payment_methods.pix && !checkoutData.payment_methods.creditCard && <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
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
<dyad-problem-report summary="190 problems">
<problem file="src/components/checkout/CheckoutChangeHistory.tsx" line="125" column="76" code="1005">'...' expected.</problem>
<problem file="src/components/checkout/CheckoutHistory.tsx" line="238" column="98" code="1005">')' expected.</problem>
<problem file="src/components/checkout/CheckoutHistory.tsx" line="239" column="20" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/components/checkout/CheckoutHistory.tsx" line="260" column="90" code="1005">'...' expected.</problem>
<problem file="src/components/checkout/CountdownTimer.tsx" line="50" column="193" code="1005">'...' expected.</problem>
<problem file="src/components/checkout/CreditCardForm.tsx" line="95" column="60" code="1005">'...' expected.</problem>
<problem file="src/components/checkout/CreditCardForm.tsx" line="108" column="58" code="1005">'...' expected.</problem>
<problem file="src/components/checkout/CreditCardForm.tsx" line="140" column="100" code="1005">')' expected.</problem>
<problem file="src/components/checkout/CreditCardForm.tsx" line="141" column="20" code="1005">'}' expected.</problem>
<problem file="src/components/checkout/CreditCardForm.tsx" line="141" column="21" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/components/checkout/CreditCardForm.tsx" line="157" column="105" code="1005">')' expected.</problem>
<problem file="src/components/checkout/CreditCardForm.tsx" line="158" column="20" code="1005">'}' expected.</problem>
<problem file="src/components/checkout/CreditCardForm.tsx" line="158" column="21" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/components/checkout/CreditCardForm.tsx" line="172" column="62" code="1005">'...' expected.</problem>
<problem file="src/components/checkout/HorizontalLayout.tsx" line="79" column="115" code="1005">'...' expected.</problem>
<problem file="src/components/checkout/HorizontalLayout.tsx" line="114" column="68" code="1005">'...' expected.</problem>
<problem file="src/components/checkout/HorizontalLayout.tsx" line="129" column="68" code="1005">'...' expected.</problem>
<problem file="src/components/checkout/HorizontalLayout.tsx" line="144" column="68" code="1005">'...' expected.</problem>
<problem file="src/components/checkout/HorizontalLayout.tsx" line="159" column="68" code="1005">'...' expected.</problem>
<problem file="src/components/checkout/HorizontalLayout.tsx" line="174" column="68" code="1005">'...' expected.</problem>
<problem file="src/components/checkout/HorizontalLayout.tsx" line="227" column="134" code="1005">'...' expected.</problem>
<problem file="src/components/checkout/HorizontalLayout.tsx" line="426" column="261" code="1005">'...' expected.</problem>
<problem file="src/components/checkout/MosaicLayout.tsx" line="73" column="115" code="1005">'...' expected.</problem>
<problem file="src/components/checkout/MosaicLayout.tsx" line="107" column="68" code="1005">'...' expected.</problem>
<problem file="src/components/checkout/MosaicLayout.tsx" line="122" column="68" code="1005">'...' expected.</problem>
<problem file="src/components/checkout/MosaicLayout.tsx" line="137" column="68" code="1005">'...' expected.</problem>
<problem file="src/components/checkout/MosaicLayout.tsx" line="152" column="68" code="1005">'...' expected.</problem>
<problem file="src/components/checkout/MosaicLayout.tsx" line="167" column="68" code="1005">'...' expected.</problem>
<problem file="src/components/checkout/MosaicLayout.tsx" line="388" column="261" code="1005">'...' expected.</problem>
<problem file="src/components/checkout/PackageSelector.tsx" line="85" column="99" code="1005">'...' expected.</problem>
<problem file="src/components/checkout/PackageSelector.tsx" line="121" column="188" code="1005">'...' expected.</problem>
<problem file="src/components/checkout/PackageSelector.tsx" line="131" column="160" code="1005">'...' expected.</problem>
<problem file="src/components/checkout/PackageSelector.tsx" line="149" column="94" code="1005">'...' expected.</problem>
<problem file="src/components/checkout/PackageSelector.tsx" line="157" column="110" code="1005">'...' expected.</problem>
<problem file="src/components/checkout/PackageSelector.tsx" line="173" column="105" code="1005">'...' expected.</problem>
<problem file="src/components/checkout/PackageSelector.tsx" line="184" column="141" code="1005">'...' expected.</problem>
<problem file="src/components/checkout/PackageSelector.tsx" line="210" column="193" code="1005">'...' expected.</problem>
<problem file="src/components/checkout/PackageSelector.tsx" line="229" column="89" code="1005">'...' expected.</problem>
<problem file="src/components/checkout/SecuritySection.tsx" line="49" column="66" code="1005">'...' expected.</problem>
<problem file="src/components/checkout/SecuritySection.tsx" line="65" column="74" code="1005">'...' expected.</problem>
<problem file="src/components/integrations/EmailConfig.tsx" line="228" column="84" code="1005">'...' expected.</problem>
<problem file="src/components/integrations/EmailConfig.tsx" line="248" column="64" code="1005">'...' expected.</problem>
<problem file="src/components/integrations/EmailConfig.tsx" line="260" column="64" code="1005">'...' expected.</problem>
<problem file="src/components/integrations/EmailConfig.tsx" line="274" column="64" code="1005">'...' expected.</problem>
<problem file="src/components/integrations/MercadoPagoConfig.tsx" line="155" column="64" code="1005">'...' expected.</problem>
<problem file="src/components/integrations/MercadoPagoConfig.tsx" line="167" column="64" code="1005">'...' expected.</problem>
<problem file="src/components/integrations/MercadoPagoConfig.tsx" line="178" column="64" code="1005">'...' expected.</problem>
<problem file="src/components/integrations/MercadoPagoConfig.tsx" line="189" column="64" code="1005">'...' expected.</problem>
<problem file="src/components/integrations/MercadoPagoConfig.tsx" line="201" column="64" code="1005">'...' expected.</problem>
<problem file="src/components/integrations/MetaPixelConfig.tsx" line="149" column="64" code="1005">'...' expected.</problem>
<problem file="src/components/integrations/MetaPixelConfig.tsx" line="160" column="64" code="1005">'...' expected.</problem>
<problem file="src/components/integrations/MetaPixelConfig.tsx" line="172" column="64" code="1005">'...' expected.</problem>
<problem file="src/components/integrations/UTMifyConfig.tsx" line="144" column="64" code="1005">'...' expected.</problem>
<problem file="src/components/integrations/UTMifyConfig.tsx" line="155" column="64" code="1005">'...' expected.</problem>
<problem file="src/components/integrations/UTMifyConfig.tsx" line="166" column="64" code="1005">'...' expected.</problem>
<problem file="src/components/member-area/LessonComments.tsx" line="205" column="73" code="1005">'...' expected.</problem>
<problem file="src/components/member-area/LessonComments.tsx" line="210" column="82" code="1005">'...' expected.</problem>
<problem file="src/components/member-area/MemberAreaPreviewContent.tsx" line="73" column="100" code="1005">'...' expected.</problem>
<problem file="src/components/member-area/MemberAreaPreviewContent.tsx" line="85" column="89" code="1005">'...' expected.</problem>
<problem file="src/components/member-area/MemberAreaPreviewContent.tsx" line="116" column="122" code="1005">')' expected.</problem>
<problem file="src/components/member-area/MemberAreaPreviewContent.tsx" line="117" column="12" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/components/member-area/MemberAreaPreviewContent.tsx" line="135" column="166" code="1005">'...' expected.</problem>
<problem file="src/components/member-area/MemberAreaPreviewContent.tsx" line="150" column="231" code="1005">'...' expected.</problem>
<problem file="src/components/member-area/ProductsAssociation.tsx" line="152" column="80" code="1005">'...' expected.</problem>
<problem file="src/components/member-area/ProfileSettingsDialog.tsx" line="274" column="84" code="1005">'...' expected.</problem>
<problem file="src/components/member-area/ProfileSettingsDialog.tsx" line="302" column="87" code="1005">'...' expected.</problem>
<problem file="src/components/member-area/ProfileSettingsDialog.tsx" line="338" column="87" code="1005">'...' expected.</problem>
<problem file="src/components/member-area/ProfileSettingsDialog.tsx" line="362" column="84" code="1005">'...' expected.</problem>
<problem file="src/pages/AdminDesign.tsx" line="324" column="128" code="1005">'...' expected.</problem>
<problem file="src/pages/Checkout.tsx" line="507" column="130" code="1005">'...' expected.</problem>
<problem file="src/pages/Customers.tsx" line="200" column="199" code="1005">'...' expected.</problem>
<problem file="src/pages/Customers.tsx" line="263" column="152" code="1005">'...' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="234" column="109" code="1005">'...' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="246" column="89" code="1005">'...' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="300" column="122" code="1005">')' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="301" column="12" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="323" column="229" code="1005">'...' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="359" column="235" code="1005">'...' expected.</problem>
<problem file="src/pages/MemberAreaLesson.tsx" line="294" column="89" code="1005">'...' expected.</problem>
<problem file="src/pages/Payments.tsx" line="206" column="199" code="1005">'...' expected.</problem>
<problem file="src/pages/PaymentSuccess.tsx" line="364" column="133" code="1005">'...' expected.</problem>
<problem file="src/pages/PaymentSuccess.tsx" line="434" column="84" code="1005">'...' expected.</problem>
<problem file="src/pages/PaymentSuccess.tsx" line="441" column="84" code="1005">'...' expected.</problem>
<problem file="src/pages/PaymentSuccess.tsx" line="513" column="92" code="1005">'...' expected.</problem>
<problem file="src/pages/PaymentSuccess.tsx" line="526" column="176" code="1005">'...' expected.</problem>
<problem file="src/pages/PaymentSuccess.tsx" line="547" column="141" code="1005">'...' expected.</problem>
<problem file="src/pages/PaymentSuccess.tsx" line="568" column="118" code="1005">'...' expected.</problem>
<problem file="src/pages/PaymentSuccess.tsx" line="578" column="118" code="1005">'...' expected.</problem>
<problem file="src/pages/PaymentSuccess.tsx" line="588" column="118" code="1005">'...' expected.</problem>
<problem file="src/pages/PaymentSuccess.tsx" line="598" column="118" code="1005">'...' expected.</problem>
<problem file="src/pages/Reports.tsx" line="191" column="126" code="1005">'...' expected.</problem>
<problem file="src/pages/Sales.tsx" line="186" column="199" code="1005">'...' expected.</problem>
<problem file="src/pages/Settings.tsx" line="48" column="73" code="1005">'...' expected.</problem>
<problem file="src/pages/Settings.tsx" line="57" column="64" code="1005">'...' expected.</problem>
<problem file="src/pages/AdminProducts.tsx" line="94" column="22" code="2345">Argument of type '{ id: string; name: string; slug: string; }[]' is not assignable to parameter of type 'SetStateAction&lt;{ associated_products: string[]; created_at: string; description: string; id: string; logo_url: string; name: string; primary_color: string; slug: string; updated_at: string; user_id: string; }[]&gt;'.
  Type '{ id: string; name: string; slug: string; }[]' is not assignable to type '{ associated_products: string[]; created_at: string; description: string; id: string; logo_url: string; name: string; primary_color: string; slug: string; updated_at: string; user_id: string; }[]'.
    Type '{ id: string; name: string; slug: string; }' is missing the following properties from type '{ associated_products: string[]; created_at: string; description: string; id: string; logo_url: string; name: string; primary_color: string; slug: string; updated_at: string; user_id: string; }': associated_products, created_at, description, logo_url, and 3 more.</problem>
<problem file="src/hooks/useIntegrations.ts" line="94" column="127" code="2352">Conversion of type '{ [key: string]: Json; } | Json[]' to type 'EmailConfig' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
  Type 'Json[]' is missing the following properties from type 'EmailConfig': email, appPassword, displayName</problem>
<problem file="src/pages/AdminCheckouts.tsx" line="341" column="19" code="2345">Argument of type '{ id: string; name: string; price: number; description: string; access_url: string; file_url: string; member_area_link: string; }[]' is not assignable to parameter of type 'SetStateAction&lt;{ access_url: string; banner_url: string; created_at: string; description: string; email_template: string; file_url: string; id: string; is_active: boolean; logo_url: string; member_area_id: string; ... 6 more ...; user_id: string; }[]&gt;'.
  Type '{ id: string; name: string; price: number; description: string; access_url: string; file_url: string; member_area_link: string; }[]' is not assignable to type '{ access_url: string; banner_url: string; created_at: string; description: string; email_template: string; file_url: string; id: string; is_active: boolean; logo_url: string; member_area_id: string; ... 6 more ...; user_id: string; }[]'.
    Type '{ id: string; name: string; price: number; description: string; access_url: string; file_url: string; member_area_link: string; }' is missing the following properties from type '{ access_url: string; banner_url: string; created_at: string; description: string; email_template: string; file_url: string; id: string; is_active: boolean; logo_url: string; member_area_id: string; ... 6 more ...; user_id: string; }': banner_url, created_at, email_template, is_active, and 6 more.</problem>
<problem file="src/pages/AdminCheckouts.tsx" line="355" column="22" code="2345">Argument of type '{ id: string; name: string; slug: string; }[]' is not assignable to parameter of type 'SetStateAction&lt;{ associated_products: string[]; created_at: string; description: string; id: string; logo_url: string; name: string; primary_color: string; slug: string; updated_at: string; user_id: string; }[]&gt;'.
  Type '{ id: string; name: string; slug: string; }[]' is not assignable to type '{ associated_products: string[]; created_at: string; description: string; id: string; logo_url: string; name: string; primary_color: string; slug: string; updated_at: string; user_id: string; }[]'.
    Type '{ id: string; name: string; slug: string; }' is missing the following properties from type '{ associated_products: string[]; created_at: string; description: string; id: string; logo_url: string; name: string; primary_color: string; slug: string; updated_at: string; user_id: string; }': associated_products, created_at, description, logo_url, and 3 more.</problem>
<problem file="src/components/integrations/IntegrationsStatus.tsx" line="90" column="32" code="2345">Argument of type 'string' is not assignable to parameter of type 'boolean'.</problem>
<problem file="src/components/integrations/IntegrationsStatus.tsx" line="94" column="33" code="2345">Argument of type 'string' is not assignable to parameter of type 'boolean'.</problem>
<problem file="src/pages/AdminContent.tsx" line="557" column="25" code="2339">Property 'products' does not exist on type '{ banner_url: string; checkout_link: string; created_at: string; description: string; id: string; member_area_id: string; order_index: number; product_id: string; status: string; title: string; updated_at: string; user_id: string; }'.</problem>
<problem file="src/pages/AdminContent.tsx" line="560" column="48" code="2339">Property 'products' does not exist on type '{ banner_url: string; checkout_link: string; created_at: string; description: string; id: string; member_area_id: string; order_index: number; product_id: string; status: string; title: string; updated_at: string; user_id: string; }'.</problem>
<problem file="src/pages/AdminContent.tsx" line="853" column="22" code="2345">Argument of type '{ id: string; name: string; slug: string; }[]' is not assignable to parameter of type 'SetStateAction&lt;{ associated_products: string[]; created_at: string; description: string; id: string; logo_url: string; name: string; primary_color: string; slug: string; updated_at: string; user_id: string; }[]&gt;'.
  Type '{ id: string; name: string; slug: string; }[]' is not assignable to type '{ associated_products: string[]; created_at: string; description: string; id: string; logo_url: string; name: string; primary_color: string; slug: string; updated_at: string; user_id: string; }[]'.
    Type '{ id: string; name: string; slug: string; }' is missing the following properties from type '{ associated_products: string[]; created_at: string; description: string; id: string; logo_url: string; name: string; primary_color: string; slug: string; updated_at: string; user_id: string; }': associated_products, created_at, description, logo_url, and 3 more.</problem>
<problem file="src/pages/AdminContent.tsx" line="869" column="19" code="2345">Argument of type '{ id: string; name: string; }[]' is not assignable to parameter of type 'SetStateAction&lt;{ access_url: string; banner_url: string; created_at: string; description: string; email_template: string; file_url: string; id: string; is_active: boolean; logo_url: string; member_area_id: string; ... 6 more ...; user_id: string; }[]&gt;'.
  Type '{ id: string; name: string; }[]' is not assignable to type '{ access_url: string; banner_url: string; created_at: string; description: string; email_template: string; file_url: string; id: string; is_active: boolean; logo_url: string; member_area_id: string; ... 6 more ...; user_id: string; }[]'.
    Type '{ id: string; name: string; }' is missing the following properties from type '{ access_url: string; banner_url: string; created_at: string; description: string; email_template: string; file_url: string; id: string; is_active: boolean; logo_url: string; member_area_id: string; ... 6 more ...; user_id: string; }': access_url, banner_url, created_at, description, and 11 more.</problem>
<problem file="src/pages/AdminContent.tsx" line="890" column="18" code="2345">Argument of type '{ id: string; title: string; }[]' is not assignable to parameter of type 'SetStateAction&lt;{ banner_url: string; checkout_link: string; created_at: string; description: string; id: string; member_area_id: string; order_index: number; product_id: string; status: string; title: string; updated_at: string; user_id: string; }[]&gt;'.
  Type '{ id: string; title: string; }[]' is not assignable to type '{ banner_url: string; checkout_link: string; created_at: string; description: string; id: string; member_area_id: string; order_index: number; product_id: string; status: string; title: string; updated_at: string; user_id: string; }[]'.
    Type '{ id: string; title: string; }' is missing the following properties from type '{ banner_url: string; checkout_link: string; created_at: string; description: string; id: string; member_area_id: string; order_index: number; product_id: string; status: string; title: string; updated_at: string; user_id: string; }': banner_url, checkout_link, created_at, description, and 6 more.</problem>
<problem file="src/components/member-area/MemberAreaPreviewContent.tsx" line="154" column="22" code="2304">Cannot find name 'Link'.</problem>
<problem file="src/components/member-area/MemberAreaPreviewContent.tsx" line="156" column="23" code="2304">Cannot find name 'Link'.</problem>
<problem file="src/pages/MemberAreaLogin.tsx" line="42" column="21" code="2345">Argument of type 'PlatformSettings' is not assignable to parameter of type 'SetStateAction&lt;{ colors: Json; created_at: string; global_font_family: string; id: string; logo_url: string; login_subtitle: string; login_title: string; member_area_id: string; updated_at: string; user_id: string; }&gt;'.
  Type 'PlatformSettings' is not assignable to type '{ colors: Json; created_at: string; global_font_family: string; id: string; logo_url: string; login_subtitle: string; login_title: string; member_area_id: string; updated_at: string; user_id: string; }'.
    Types of property 'colors' are incompatible.
      Type 'PlatformColors' is not assignable to type 'Json'.
        Type 'PlatformColors' is not assignable to type '{ [key: string]: Json; }'.
          Index signature for type 'string' is missing in type 'PlatformColors'.</problem>
<problem file="src/pages/MemberAreaLogin.tsx" line="42" column="65" code="2345">Argument of type 'Partial&lt;{ colors: Json; created_at: string; global_font_family: string; id: string; logo_url: string; login_subtitle: string; login_title: string; member_area_id: string; updated_at: string; user_id: string; }&gt;' is not assignable to parameter of type 'Partial&lt;PlatformSettings&gt;'.
  Types of property 'colors' are incompatible.
    Type 'Json' is not assignable to type 'PlatformColors'.
      Type 'string' has no properties in common with type 'PlatformColors'.</problem>
<problem file="src/pages/MemberAreaLogin.tsx" line="44" column="21" code="2345">Argument of type 'PlatformSettings' is not assignable to parameter of type 'SetStateAction&lt;{ colors: Json; created_at: string; global_font_family: string; id: string; logo_url: string; login_subtitle: string; login_title: string; member_area_id: string; updated_at: string; user_id: string; }&gt;'.
  Type 'PlatformSettings' is not assignable to type '{ colors: Json; created_at: string; global_font_family: string; id: string; logo_url: string; login_subtitle: string; login_title: string; member_area_id: string; updated_at: string; user_id: string; }'.
    Types of property 'colors' are incompatible.
      Type 'PlatformColors' is not assignable to type 'Json'.
        Type 'PlatformColors' is not assignable to type '{ [key: string]: Json; }'.
          Index signature for type 'string' is missing in type 'PlatformColors'.</problem>
<problem file="src/pages/MemberAreaLogin.tsx" line="101" column="50" code="2339">Property 'background_login' does not exist on type 'Json | PlatformColors'.
  Property 'background_login' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaLogin.tsx" line="105" column="103" code="2339">Property 'card_login' does not exist on type 'Json | PlatformColors'.
  Property 'card_login' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaLogin.tsx" line="117" column="95" code="2339">Property 'text_primary' does not exist on type 'Json | PlatformColors'.
  Property 'text_primary' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaLogin.tsx" line="120" column="70" code="2339">Property 'text_secondary' does not exist on type 'Json | PlatformColors'.
  Property 'text_secondary' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaLogin.tsx" line="128" column="78" code="2339">Property 'text_primary' does not exist on type 'Json | PlatformColors'.
  Property 'text_primary' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaLogin.tsx" line="140" column="81" code="2339">Property 'text_primary' does not exist on type 'Json | PlatformColors'.
  Property 'text_primary' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaLogin.tsx" line="158" column="89" code="2339">Property 'text_secondary' does not exist on type 'Json | PlatformColors'.
  Property 'text_secondary' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaLogin.tsx" line="160" column="86" code="2339">Property 'text_secondary' does not exist on type 'Json | PlatformColors'.
  Property 'text_secondary' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaLogin.tsx" line="170" column="65" code="2339">Property 'button_background' does not exist on type 'Json | PlatformColors'.
  Property 'button_background' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaLogin.tsx" line="177" column="76" code="2339">Property 'text_secondary' does not exist on type 'Json | PlatformColors'.
  Property 'text_secondary' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaLogin.tsx" line="179" column="149" code="2339">Property 'button_background' does not exist on type 'Json | PlatformColors'.
  Property 'button_background' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="70" column="21" code="2345">Argument of type 'PlatformSettings' is not assignable to parameter of type 'SetStateAction&lt;{ colors: Json; created_at: string; global_font_family: string; id: string; logo_url: string; login_subtitle: string; login_title: string; member_area_id: string; updated_at: string; user_id: string; }&gt;'.
  Type 'PlatformSettings' is not assignable to type '{ colors: Json; created_at: string; global_font_family: string; id: string; logo_url: string; login_subtitle: string; login_title: string; member_area_id: string; updated_at: string; user_id: string; }'.
    Types of property 'colors' are incompatible.
      Type 'PlatformColors' is not assignable to type 'Json'.
        Type 'PlatformColors' is not assignable to type '{ [key: string]: Json; }'.
          Index signature for type 'string' is missing in type 'PlatformColors'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="70" column="65" code="2345">Argument of type 'Partial&lt;{ colors: Json; created_at: string; global_font_family: string; id: string; logo_url: string; login_subtitle: string; login_title: string; member_area_id: string; updated_at: string; user_id: string; }&gt;' is not assignable to parameter of type 'Partial&lt;PlatformSettings&gt;'.
  Types of property 'colors' are incompatible.
    Type 'Json' is not assignable to type 'PlatformColors'.
      Type 'string' has no properties in common with type 'PlatformColors'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="72" column="21" code="2345">Argument of type 'PlatformSettings' is not assignable to parameter of type 'SetStateAction&lt;{ colors: Json; created_at: string; global_font_family: string; id: string; logo_url: string; login_subtitle: string; login_title: string; member_area_id: string; updated_at: string; user_id: string; }&gt;'.
  Type 'PlatformSettings' is not assignable to type '{ colors: Json; created_at: string; global_font_family: string; id: string; logo_url: string; login_subtitle: string; login_title: string; member_area_id: string; updated_at: string; user_id: string; }'.
    Types of property 'colors' are incompatible.
      Type 'PlatformColors' is not assignable to type 'Json'.
        Type 'PlatformColors' is not assignable to type '{ [key: string]: Json; }'.
          Index signature for type 'string' is missing in type 'PlatformColors'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="210" column="48" code="2339">Property 'button_background' does not exist on type 'Json | PlatformColors'.
  Property 'button_background' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="211" column="45" code="2339">Property 'text_primary' does not exist on type 'Json | PlatformColors'.
  Property 'text_primary' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="212" column="54" code="2339">Property 'text_secondary' does not exist on type 'Json | PlatformColors'.
  Property 'text_secondary' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="213" column="50" code="2339">Property 'card_login' does not exist on type 'Json | PlatformColors'.
  Property 'card_login' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="215" column="52" code="2339">Property 'checkmark_background' does not exist on type 'Json | PlatformColors'.
  Property 'checkmark_background' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="216" column="54" code="2339">Property 'checkmark_icon' does not exist on type 'Json | PlatformColors'.
  Property 'checkmark_icon' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="228" column="50" code="2339">Property 'background_login' does not exist on type 'Json | PlatformColors'.
  Property 'background_login' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="236" column="52" code="2339">Property 'background_login' does not exist on type 'Json | PlatformColors'.
  Property 'background_login' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="237" column="48" code="2339">Property 'header_border' does not exist on type 'Json | PlatformColors'.
  Property 'header_border' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="238" column="42" code="2339">Property 'text_header' does not exist on type 'Json | PlatformColors'.
  Property 'text_header' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaModuleDetails.tsx" line="67" column="21" code="2345">Argument of type 'PlatformSettings' is not assignable to parameter of type 'SetStateAction&lt;{ colors: Json; created_at: string; global_font_family: string; id: string; logo_url: string; login_subtitle: string; login_title: string; member_area_id: string; updated_at: string; user_id: string; }&gt;'.
  Type 'PlatformSettings' is not assignable to type '{ colors: Json; created_at: string; global_font_family: string; id: string; logo_url: string; login_subtitle: string; login_title: string; member_area_id: string; updated_at: string; user_id: string; }'.
    Types of property 'colors' are incompatible.
      Type 'PlatformColors' is not assignable to type 'Json'.
        Type 'PlatformColors' is not assignable to type '{ [key: string]: Json; }'.
          Index signature for type 'string' is missing in type 'PlatformColors'.</problem>
<problem file="src/pages/MemberAreaModuleDetails.tsx" line="67" column="65" code="2345">Argument of type 'Partial&lt;{ colors: Json; created_at: string; global_font_family: string; id: string; logo_url: string; login_subtitle: string; login_title: string; member_area_id: string; updated_at: string; user_id: string; }&gt;' is not assignable to parameter of type 'Partial&lt;PlatformSettings&gt;'.
  Types of property 'colors' are incompatible.
    Type 'Json' is not assignable to type 'PlatformColors'.
      Type 'string' has no properties in common with type 'PlatformColors'.</problem>
<problem file="src/pages/MemberAreaModuleDetails.tsx" line="69" column="21" code="2345">Argument of type 'PlatformSettings' is not assignable to parameter of type 'SetStateAction&lt;{ colors: Json; created_at: string; global_font_family: string; id: string; logo_url: string; login_subtitle: string; login_title: string; member_area_id: string; updated_at: string; user_id: string; }&gt;'.
  Type 'PlatformSettings' is not assignable to type '{ colors: Json; created_at: string; global_font_family: string; id: string; logo_url: string; login_subtitle: string; login_title: string; member_area_id: string; updated_at: string; user_id: string; }'.
    Types of property 'colors' are incompatible.
      Type 'PlatformColors' is not assignable to type 'Json'.
        Type 'PlatformColors' is not assignable to type '{ [key: string]: Json; }'.
          Index signature for type 'string' is missing in type 'PlatformColors'.</problem>
<problem file="src/pages/MemberAreaModuleDetails.tsx" line="188" column="48" code="2339">Property 'button_background' does not exist on type 'Json | PlatformColors'.
  Property 'button_background' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaModuleDetails.tsx" line="189" column="45" code="2339">Property 'text_primary' does not exist on type 'Json | PlatformColors'.
  Property 'text_primary' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaModuleDetails.tsx" line="190" column="54" code="2339">Property 'text_secondary' does not exist on type 'Json | PlatformColors'.
  Property 'text_secondary' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaModuleDetails.tsx" line="191" column="50" code="2339">Property 'card_login' does not exist on type 'Json | PlatformColors'.
  Property 'card_login' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaModuleDetails.tsx" line="202" column="50" code="2339">Property 'background_login' does not exist on type 'Json | PlatformColors'.
  Property 'background_login' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaModuleDetails.tsx" line="210" column="52" code="2339">Property 'background_login' does not exist on type 'Json | PlatformColors'.
  Property 'background_login' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaModuleDetails.tsx" line="211" column="48" code="2339">Property 'header_border' does not exist on type 'Json | PlatformColors'.
  Property 'header_border' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaModuleDetails.tsx" line="212" column="42" code="2339">Property 'text_header' does not exist on type 'Json | PlatformColors'.
  Property 'text_header' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaLesson.tsx" line="68" column="21" code="2345">Argument of type 'PlatformSettings' is not assignable to parameter of type 'SetStateAction&lt;{ colors: Json; created_at: string; global_font_family: string; id: string; logo_url: string; login_subtitle: string; login_title: string; member_area_id: string; updated_at: string; user_id: string; }&gt;'.
  Type 'PlatformSettings' is not assignable to type '{ colors: Json; created_at: string; global_font_family: string; id: string; logo_url: string; login_subtitle: string; login_title: string; member_area_id: string; updated_at: string; user_id: string; }'.
    Types of property 'colors' are incompatible.
      Type 'PlatformColors' is not assignable to type 'Json'.
        Type 'PlatformColors' is not assignable to type '{ [key: string]: Json; }'.
          Index signature for type 'string' is missing in type 'PlatformColors'.</problem>
<problem file="src/pages/MemberAreaLesson.tsx" line="68" column="65" code="2345">Argument of type 'Partial&lt;{ colors: Json; created_at: string; global_font_family: string; id: string; logo_url: string; login_subtitle: string; login_title: string; member_area_id: string; updated_at: string; user_id: string; }&gt;' is not assignable to parameter of type 'Partial&lt;PlatformSettings&gt;'.
  Types of property 'colors' are incompatible.
    Type 'Json' is not assignable to type 'PlatformColors'.
      Type 'string' has no properties in common with type 'PlatformColors'.</problem>
<problem file="src/pages/MemberAreaLesson.tsx" line="70" column="21" code="2345">Argument of type 'PlatformSettings' is not assignable to parameter of type 'SetStateAction&lt;{ colors: Json; created_at: string; global_font_family: string; id: string; logo_url: string; login_subtitle: string; login_title: string; member_area_id: string; updated_at: string; user_id: string; }&gt;'.
  Type 'PlatformSettings' is not assignable to type '{ colors: Json; created_at: string; global_font_family: string; id: string; logo_url: string; login_subtitle: string; login_title: string; member_area_id: string; updated_at: string; user_id: string; }'.
    Types of property 'colors' are incompatible.
      Type 'PlatformColors' is not assignable to type 'Json'.
        Type 'PlatformColors' is not assignable to type '{ [key: string]: Json; }'.
          Index signature for type 'string' is missing in type 'PlatformColors'.</problem>
<problem file="src/pages/MemberAreaLesson.tsx" line="206" column="163" code="2339">Property 'text_cards' does not exist on type 'Json | PlatformColors'.
  Property 'text_cards' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaLesson.tsx" line="263" column="45" code="2339">Property 'text_primary' does not exist on type 'Json | PlatformColors'.
  Property 'text_primary' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaLesson.tsx" line="264" column="54" code="2339">Property 'text_secondary' does not exist on type 'Json | PlatformColors'.
  Property 'text_secondary' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaLesson.tsx" line="265" column="50" code="2339">Property 'card_login' does not exist on type 'Json | PlatformColors'.
  Property 'card_login' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaLesson.tsx" line="276" column="50" code="2339">Property 'background_login' does not exist on type 'Json | PlatformColors'.
  Property 'background_login' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaLesson.tsx" line="284" column="52" code="2339">Property 'background_login' does not exist on type 'Json | PlatformColors'.
  Property 'background_login' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaLesson.tsx" line="285" column="48" code="2339">Property 'header_border' does not exist on type 'Json | PlatformColors'.
  Property 'header_border' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaLesson.tsx" line="286" column="42" code="2339">Property 'text_header' does not exist on type 'Json | PlatformColors'.
  Property 'text_header' does not exist on type 'string'.</problem>
<problem file="src/pages/AuthForgotPassword.tsx" line="42" column="21" code="2345">Argument of type 'PlatformSettings' is not assignable to parameter of type 'SetStateAction&lt;{ colors: Json; created_at: string; global_font_family: string; id: string; logo_url: string; login_subtitle: string; login_title: string; member_area_id: string; updated_at: string; user_id: string; }&gt;'.
  Type 'PlatformSettings' is not assignable to type '{ colors: Json; created_at: string; global_font_family: string; id: string; logo_url: string; login_subtitle: string; login_title: string; member_area_id: string; updated_at: string; user_id: string; }'.
    Types of property 'colors' are incompatible.
      Type 'PlatformColors' is not assignable to type 'Json'.
        Type 'PlatformColors' is not assignable to type '{ [key: string]: Json; }'.
          Index signature for type 'string' is missing in type 'PlatformColors'.</problem>
<problem file="src/pages/AuthForgotPassword.tsx" line="42" column="65" code="2345">Argument of type 'Partial&lt;{ colors: Json; created_at: string; global_font_family: string; id: string; logo_url: string; login_subtitle: string; login_title: string; member_area_id: string; updated_at: string; user_id: string; }&gt;' is not assignable to parameter of type 'Partial&lt;PlatformSettings&gt;'.
  Types of property 'colors' are incompatible.
    Type 'Json' is not assignable to type 'PlatformColors'.
      Type 'string' has no properties in common with type 'PlatformColors'.</problem>
<problem file="src/pages/AuthForgotPassword.tsx" line="44" column="21" code="2345">Argument of type 'PlatformSettings' is not assignable to parameter of type 'SetStateAction&lt;{ colors: Json; created_at: string; global_font_family: string; id: string; logo_url: string; login_subtitle: string; login_title: string; member_area_id: string; updated_at: string; user_id: string; }&gt;'.
  Type 'PlatformSettings' is not assignable to type '{ colors: Json; created_at: string; global_font_family: string; id: string; logo_url: string; login_subtitle: string; login_title: string; member_area_id: string; updated_at: string; user_id: string; }'.
    Types of property 'colors' are incompatible.
      Type 'PlatformColors' is not assignable to type 'Json'.
        Type 'PlatformColors' is not assignable to type '{ [key: string]: Json; }'.
          Index signature for type 'string' is missing in type 'PlatformColors'.</problem>
<problem file="src/pages/AuthForgotPassword.tsx" line="108" column="50" code="2339">Property 'background_login' does not exist on type 'Json | PlatformColors'.
  Property 'background_login' does not exist on type 'string'.</problem>
<problem file="src/pages/AuthForgotPassword.tsx" line="112" column="103" code="2339">Property 'card_login' does not exist on type 'Json | PlatformColors'.
  Property 'card_login' does not exist on type 'string'.</problem>
<problem file="src/pages/AuthForgotPassword.tsx" line="124" column="95" code="2339">Property 'text_primary' does not exist on type 'Json | PlatformColors'.
  Property 'text_primary' does not exist on type 'string'.</problem>
<problem file="src/pages/AuthForgotPassword.tsx" line="127" column="70" code="2339">Property 'text_secondary' does not exist on type 'Json | PlatformColors'.
  Property 'text_secondary' does not exist on type 'string'.</problem>
<problem file="src/pages/AuthForgotPassword.tsx" line="139" column="78" code="2339">Property 'text_primary' does not exist on type 'Json | PlatformColors'.
  Property 'text_primary' does not exist on type 'string'.</problem>
<problem file="src/pages/AuthForgotPassword.tsx" line="145" column="67" code="2339">Property 'button_background' does not exist on type 'Json | PlatformColors'.
  Property 'button_background' does not exist on type 'string'.</problem>
<problem file="src/pages/AuthForgotPassword.tsx" line="153" column="80" code="2339">Property 'text_primary' does not exist on type 'Json | PlatformColors'.
  Property 'text_primary' does not exist on type 'string'.</problem>
<problem file="src/pages/AuthForgotPassword.tsx" line="161" column="69" code="2339">Property 'card_login' does not exist on type 'Json | PlatformColors'.
  Property 'card_login' does not exist on type 'string'.</problem>
<problem file="src/pages/AuthForgotPassword.tsx" line="161" column="157" code="2339">Property 'text_primary' does not exist on type 'Json | PlatformColors'.
  Property 'text_primary' does not exist on type 'string'.</problem>
<problem file="src/pages/AuthForgotPassword.tsx" line="169" column="67" code="2339">Property 'button_background' does not exist on type 'Json | PlatformColors'.
  Property 'button_background' does not exist on type 'string'.</problem>
<problem file="src/pages/AuthForgotPassword.tsx" line="178" column="139" code="2339">Property 'button_background' does not exist on type 'Json | PlatformColors'.
  Property 'button_background' does not exist on type 'string'.</problem>
<problem file="src/pages/AuthUpdatePassword.tsx" line="46" column="21" code="2345">Argument of type 'PlatformSettings' is not assignable to parameter of type 'SetStateAction&lt;{ colors: Json; created_at: string; global_font_family: string; id: string; logo_url: string; login_subtitle: string; login_title: string; member_area_id: string; updated_at: string; user_id: string; }&gt;'.
  Type 'PlatformSettings' is not assignable to type '{ colors: Json; created_at: string; global_font_family: string; id: string; logo_url: string; login_subtitle: string; login_title: string; member_area_id: string; updated_at: string; user_id: string; }'.
    Types of property 'colors' are incompatible.
      Type 'PlatformColors' is not assignable to type 'Json'.
        Type 'PlatformColors' is not assignable to type '{ [key: string]: Json; }'.
          Index signature for type 'string' is missing in type 'PlatformColors'.</problem>
<problem file="src/pages/AuthUpdatePassword.tsx" line="46" column="65" code="2345">Argument of type 'Partial&lt;{ colors: Json; created_at: string; global_font_family: string; id: string; logo_url: string; login_subtitle: string; login_title: string; member_area_id: string; updated_at: string; user_id: string; }&gt;' is not assignable to parameter of type 'Partial&lt;PlatformSettings&gt;'.
  Types of property 'colors' are incompatible.
    Type 'Json' is not assignable to type 'PlatformColors'.
      Type 'string' has no properties in common with type 'PlatformColors'.</problem>
<problem file="src/pages/AuthUpdatePassword.tsx" line="48" column="21" code="2345">Argument of type 'PlatformSettings' is not assignable to parameter of type 'SetStateAction&lt;{ colors: Json; created_at: string; global_font_family: string; id: string; logo_url: string; login_subtitle: string; login_title: string; member_area_id: string; updated_at: string; user_id: string; }&gt;'.
  Type 'PlatformSettings' is not assignable to type '{ colors: Json; created_at: string; global_font_family: string; id: string; logo_url: string; login_subtitle: string; login_title: string; member_area_id: string; updated_at: string; user_id: string; }'.
    Types of property 'colors' are incompatible.
      Type 'PlatformColors' is not assignable to type 'Json'.
        Type 'PlatformColors' is not assignable to type '{ [key: string]: Json; }'.
          Index signature for type 'string' is missing in type 'PlatformColors'.</problem>
<problem file="src/pages/AuthUpdatePassword.tsx" line="120" column="50" code="2339">Property 'background_login' does not exist on type 'Json | PlatformColors'.
  Property 'background_login' does not exist on type 'string'.</problem>
<problem file="src/pages/AuthUpdatePassword.tsx" line="124" column="103" code="2339">Property 'card_login' does not exist on type 'Json | PlatformColors'.
  Property 'card_login' does not exist on type 'string'.</problem>
<problem file="src/pages/AuthUpdatePassword.tsx" line="136" column="95" code="2339">Property 'text_primary' does not exist on type 'Json | PlatformColors'.
  Property 'text_primary' does not exist on type 'string'.</problem>
<problem file="src/pages/AuthUpdatePassword.tsx" line="139" column="70" code="2339">Property 'text_secondary' does not exist on type 'Json | PlatformColors'.
  Property 'text_secondary' does not exist on type 'string'.</problem>
<problem file="src/pages/AuthUpdatePassword.tsx" line="154" column="67" code="2339">Property 'button_background' does not exist on type 'Json | PlatformColors'.
  Property 'button_background' does not exist on type 'string'.</problem>
<problem file="src/pages/AuthUpdatePassword.tsx" line="162" column="83" code="2339">Property 'text_primary' does not exist on type 'Json | PlatformColors'.
  Property 'text_primary' does not exist on type 'string'.</problem>
<problem file="src/pages/AuthUpdatePassword.tsx" line="171" column="71" code="2339">Property 'card_login' does not exist on type 'Json | PlatformColors'.
  Property 'card_login' does not exist on type 'string'.</problem>
<problem file="src/pages/AuthUpdatePassword.tsx" line="171" column="159" code="2339">Property 'text_primary' does not exist on type 'Json | PlatformColors'.
  Property 'text_primary' does not exist on type 'string'.</problem>
<problem file="src/pages/AuthUpdatePassword.tsx" line="181" column="91" code="2339">Property 'text_secondary' does not exist on type 'Json | PlatformColors'.
  Property 'text_secondary' does not exist on type 'string'.</problem>
<problem file="src/pages/AuthUpdatePassword.tsx" line="183" column="88" code="2339">Property 'text_secondary' does not exist on type 'Json | PlatformColors'.
  Property 'text_secondary' does not exist on type 'string'.</problem>
<problem file="src/pages/AuthUpdatePassword.tsx" line="190" column="90" code="2339">Property 'text_primary' does not exist on type 'Json | PlatformColors'.
  Property 'text_primary' does not exist on type 'string'.</problem>
<problem file="src/pages/AuthUpdatePassword.tsx" line="199" column="71" code="2339">Property 'card_login' does not exist on type 'Json | PlatformColors'.
  Property 'card_login' does not exist on type 'string'.</problem>
<problem file="src/pages/AuthUpdatePassword.tsx" line="199" column="159" code="2339">Property 'text_primary' does not exist on type 'Json | PlatformColors'.
  Property 'text_primary' does not exist on type 'string'.</problem>
<problem file="src/pages/AuthUpdatePassword.tsx" line="209" column="91" code="2339">Property 'text_secondary' does not exist on type 'Json | PlatformColors'.
  Property 'text_secondary' does not exist on type 'string'.</problem>
<problem file="src/pages/AuthUpdatePassword.tsx" line="211" column="88" code="2339">Property 'text_secondary' does not exist on type 'Json | PlatformColors'.
  Property 'text_secondary' does not exist on type 'string'.</problem>
<problem file="src/pages/AuthUpdatePassword.tsx" line="221" column="67" code="2339">Property 'button_background' does not exist on type 'Json | PlatformColors'.
  Property 'button_background' does not exist on type 'string'.</problem>
<problem file="src/pages/AuthUpdatePassword.tsx" line="230" column="139" code="2339">Property 'button_background' does not exist on type 'Json | PlatformColors'.
  Property 'button_background' does not exist on type 'string'.</problem>
</dyad-problem-report><think>**Tackling JSX Issues**

I've discovered the root cause of many errors lies in JSX comments. Specifically, comments placed inline after attributes or before closing tags, such as `{/* Ajustado text size */}`, are triggering syntax errors. The solution seems to be removing or relocating these comments.


**Refining Type Consistency**

I'm now zeroing in on type inconsistencies across the codebase. Several errors stemmed from `PlatformSettings.colors` incorrectly being inferred as `Json` instead of `PlatformColors`. I've made fixes in the codebase to resolve this, now it's a matter of ensuring the user has the most up to date data. Also, I realized that data retrieved from Supabase needed to be casted to the correct types, and have addressed this issue in `AdminCheckouts.tsx`.


**Addressing Remaining Issues**

I'm now focusing on specific file locations to fix the remaining TypeScript issues. I'll meticulously go through `AdminProducts.tsx`, `useIntegrations.ts`, and `AdminCheckouts.tsx` to apply explicit casts as indicated. I've also identified a crucial type refinement needed in `AdminContent.tsx` to handle product relations within the `Module` type. I'll make sure to incorporate this correction to ensure data integrity and compatibility. Finally, I'll revisit `src/integrations/supabase/types.ts` and `src/hooks/useGlobalPlatformSettings.ts` for final verification.


**Fixing Remaining Errors**

I'm now methodically addressing the remaining TypeScript errors, starting with JSX comments and type inconsistencies. I've re-verified that `FormFields` is exported and `PlatformSettings` uses `PlatformColors`. I'm specifically focusing on casting Supabase data correctly within `AdminProducts.tsx`, `useIntegrations.ts`, and `AdminCheckouts.tsx`. In `AdminContent.tsx`, I'll update the `Module` type to properly handle product relations. Also, I'll add the necessary `Link` import.


**Implementing Key Fixes**

I'm now methodically addressing the remaining TypeScript errors based on my plan. I've re-verified that `FormFields` is exported, and `PlatformSettings` correctly uses `PlatformColors`. I am specifically focusing on casting Supabase data correctly within `AdminProducts.tsx`, `useIntegrations.ts`, and `AdminCheckouts.tsx` and updating the `Module` type definition in `AdminContent.tsx` to include `products(name)`. I'll also add the necessary `Link` import. I'm also ensuring `deepMerge` is updated.


**Fixing TypeScript Issues**

I'm systematically addressing the remaining TypeScript errors. I've re-verified that `FormFields` is exported and `PlatformSettings` uses `PlatformColors` correctly. My focus is now on explicitly casting Supabase data within `AdminProducts.tsx`, `useIntegrations.ts`, and `AdminCheckouts.tsx`. In `AdminContent.tsx`, I'll update the `Module` type to handle `products(name)`. I'll also add the necessary `Link` import and ensure that `deepMerge` is updated to correctly handle `Json` inputs.


**Refining Type Consistency**

I'm systematically addressing the type inconsistencies and JSX comment errors. I've re-verified `FormFields` export and `PlatformSettings` uses `PlatformColors` correctly. I'm focusing on casting Supabase data in `AdminProducts`, `AdminCheckouts`, and `useIntegrations`. Also, I'll update the `Module` type definition in `AdminContent` to handle `products(name)`. I've added the necessary `Link` import. I'll also ensure deepMerge accepts `Json`.


**Resolving TypeScript Errors**

I'm systematically addressing the remaining TypeScript errors. I've re-verified `FormFields` export and `PlatformSettings` use `PlatformColors`. I'm explicitly casting Supabase data in several files, including `AdminProducts`, `AdminCheckouts`, and `useIntegrations`. Also, I'll update the `Module` type definition in `AdminContent` to handle `products(name)`, and add necessary `Link` imports. I'll ensure `deepMerge` handles `Json` inputs, focusing on `colors`.


**Resolving Type Mismatches**

I'm systematically addressing the type inconsistencies and JSX comment errors. I've ensured `FormFields` is exported, and `PlatformSettings` uses `PlatformColors`. My focus is on casting Supabase data within `AdminProducts`, `AdminCheckouts`, and `useIntegrations`. I'm updating the `Module` type definition in `AdminContent` to handle `products(name)`, importing `Link`, and ensuring deep merge handles `Json` with `colors`.


</think>Com certeza! Parece que os erros de compilação são causados principalmente por comentários JSX malformados e algumas inconsistências de tipo no TypeScript.

Vou corrigir esses problemas de forma concisa:

1.  **Remover comentários JSX problemáticos**: O compilador TypeScript/React tem dificuldade em interpretar comentários JSX (`{/* ... */}`) quando eles estão diretamente após um atributo ou antes de uma tag de fechamento. Vou remover esses comentários para resolver os erros de sintaxe.
2.  **Ajustar tipagem de `PlatformSettings.colors`**: A propriedade `colors` dentro de `PlatformSettings` está sendo tratada como `Json` em alguns lugares, o que é muito genérico. Vou garantir que ela seja tipada corretamente como um objeto de cores.
3.  **Ajustar tipagem de dados carregados do Supabase**: Em alguns `useState` e `setX` calls, os dados retornados do Supabase não estão perfeitamente compatíveis com os tipos `Tables<'...' >` esperados. Vou adicionar casts explícitos (`as Type[]`) para resolver isso.
4.  **Ajustar tipo `Module` para relações**: O tipo `Module` em `AdminContent.tsx` precisa incluir a relação `products(name)` que está sendo selecionada.
5.  **Importar `Link`**: Adicionar a importação de `Link` do `react-router-dom` onde estiver faltando.

Aqui estão as alterações:

<dyad-write path="src/integrations/supabase/types.ts" description="Ensuring correct typing for EmailConfig.">
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      community_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      community_posts: {
        Row: {
          content: string
          created_at: string
          id: string
          is_automatic: boolean
          lesson_id: string | null
          member_area_id: string | null
          module_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_automatic?: boolean
          lesson_id?: string | null
          member_area_id?: string | null
          module_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_automatic?: boolean
          lesson_id?: string | null
          member_area_id?: string | null
          module_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_posts_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_posts_member_area_id_fkey"
            columns: ["member_area_id"]
            isOneToOne: false
            referencedRelation: "member_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_posts_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      compras: {
        Row: {
          acesso_expira_em: string | null
          cliente_documento: string | null
          cliente_email: string
          cliente_nome: string
          cliente_telefone: string | null
          created_at: string | null
          email_entrega_id: string | null
          entregavel_enviado: boolean | null
          entregavel_enviado_em: string | null
          id: string
          mercadopago_order_id: string | null
          mercadopago_payment_id: string
          metodo_pagamento: string | null
          moeda: string | null
          password: string | null
          produto_id: string | null
          status_pagamento: string
          updated_at: string | null
          username: string | null
          valor_pago: number
          webhook_payload: Json | null
        }
        Insert: {
          acesso_expira_em?: string | null
          cliente_documento?: string | null
          cliente_email: string
          cliente_nome: string
          cliente_telefone?: string | null
          created_at?: string | null
          email_entrega_id?: string | null
          entregavel_enviado?: boolean | null
          entregavel_enviado_em?: string | null
          id?: string
          mercadopago_order_id?: string | null
          mercadopago_payment_id: string
          metodo_pagamento?: string | null
          moeda?: string | null
          password?: string | null
          produto_id?: string | null
          status_pagamento?: string
          updated_at?: string | null
          username?: string | null
          valor_pago: number
          webhook_payload?: Json | null
        }
        Update: {
          acesso_expira_em?: string | null
          cliente_documento?: string | null
          cliente_email?: string
          cliente_nome?: string
          cliente_telefone?: string | null
          created_at?: string | null
          email_entrega_id?: string | null
          entregavel_enviado?: boolean | null
          entregavel_enviado_em?: string | null
          id?: string
          mercadopago_order_id?: string | null
          mercadopago_payment_id?: string
          metodo_pagamento?: string | null
          moeda?: string | null
          password?: string | null
          produto_id?: string | null
          status_pagamento?: string
          updated_at?: string | null
          username?: string | null
          valor_pago?: number
          webhook_payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "compras_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos_digitais"
            referencedColumns: ["id"]
          },
        ]
      }
      checkout_history: {
        Row: {
          action_type: string
          changes: Json
          checkout_id: string
          created_at: string
          description: string | null
          id: string
          new_values: Json | null
          old_values: Json | null
          user_id: string
        }
        Insert: {
          action_type: string
          changes?: Json
          checkout_id: string
          created_at?: string
          description?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          user_id: string
        }
        Update: {
          action_type?: string
          changes?: Json
          checkout_id?: string
          created_at?: string
          description?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkout_history_checkout_id_fkey"
            columns: ["checkout_id"]
            isOneToOne: false
            referencedRelation: "checkouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkout_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      checkouts: {
        Row: {
          created_at: string
          extra_content: Json | null
          form_fields: Json | null
          id: string
          integrations: Json | null
          layout: string
          member_area_id: string | null
          name: string | null
          order_bumps: Json | null
          payment_methods: Json | null
          price: number
          product_id: string
          promotional_price: number | null
          styles: Json | null
          support_contact: Json | null
          timer: Json | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          extra_content?: Json | null
          form_fields?: Json | null
          id?: string
          integrations?: Json | null
          layout?: string
          member_area_id?: string | null
          name?: string | null
          order_bumps?: Json | null
          payment_methods?: Json | null
          price: number
          product_id: string
          promotional_price?: number | null
          styles?: Json | null
          support_contact?: Json | null
          timer?: Json | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          extra_content?: Json | null
          form_fields?: Json | null
          id?: string
          integrations?: Json | null
          layout?: string
          member_area_id?: string | null
          name?: string | null
          order_bumps?: Json | null
          payment_methods?: Json | null
          price?: number
          product_id?: string
          promotional_price?: number | null
          styles?: Json | null
          support_contact?: Json | null
          timer?: Json | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checkouts_member_area_id_fkey"
            columns: ["member_area_id"]
            isOneToOne: false
            referencedRelation: "member_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkouts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkouts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          cpf: string | null
          email: string
          id: string
          last_purchase: string | null
          name: string
          phone: string | null
          purchase_count: number | null
          status: string | null
          total_spent: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          cpf?: string | null
          email: string
          id?: string
          last_purchase?: string | null
          name: string
          phone?: string | null
          purchase_count?: number | null
          status?: string | null
          total_spent?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          cpf?: string | null
          email?: string
          id?: string
          last_purchase?: string | null
          name?: string
          phone?: string | null
          purchase_count?: number | null
          status?: string | null
          total_spent?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      integrations: {
        Row: {
          created_at: string
          id: string
          mercado_pago_access_token: string | null
          mercado_pago_token_public: string | null
          meta_pixel_id: string | null
          smtp_config: Json | null
          updated_at: string
          user_id: string
          utmify_code: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          mercado_pago_access_token?: string | null
          mercado_pago_token_public?: string | null
          meta_pixel_id?: string | null
          smtp_config?: Json | null
          updated_at?: string
          user_id: string
          utmify_code?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          mercado_pago_access_token?: string | null
          mercado_pago_token_public?: string | null
          meta_pixel_id?: string | null
          smtp_config?: Json | null
          updated_at?: string
          user_id?: string
          utmify_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      lesson_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          lesson_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          lesson_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          lesson_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_comments_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      lesson_completions: {
        Row: {
          completed_at: string
          created_at: string
          id: string
          lesson_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          created_at?: string
          id?: string
          lesson_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string
          created_at?: string
          id?: string
          lesson_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_completions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_completions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      lessons: {
        Row: {
          content_type: string
          content_url: string | null
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          module_id: string
          order_index: number
          status: string
          text_content: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content_type?: string
          content_url?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          module_id: string
          order_index?: number
          status?: string
          text_content?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          content_type?: string
          content_url?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          module_id?: string
          order_index?: number
          status?: string
          text_content?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      logs_entrega: {
        Row: {
          assunto: string | null
          compra_id: string | null
          created_at: string | null
          destinatario: string
          erro_mensagem: string | null
          id: string
          status: string
          tentativa_numero: number | null
          tipo: string
        }
        Insert: {
          assunto?: string | null
          compra_id?: string | null
          created_at?: string | null
          destinatario: string
          erro_mensagem?: string | null
          id?: string
          status: string
          tentativa_numero?: number | null
          tipo: string
        }
        Update: {
          assunto?: string | null
          compra_id?: string | null
          created_at?: string | null
          destinatario?: string
          erro_mensagem?: string | null
          id?: string
          status?: string
          tentativa_numero?: number | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "logs_entrega_compra_id_fkey"
            columns: ["compra_id"]
            isOneToOne: false
            referencedRelation: "compras"
            referencedColumns: ["id"]
          },
        ]
      }
      member_access: {
        Row: {
          access_granted_at: string
          created_at: string
          id: string
          is_active: boolean
          member_area_id: string | null
          module_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_granted_at?: string
          created_at?: string
          id?: string
          is_active?: boolean
          member_area_id?: string | null
          module_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_granted_at?: string
          created_at?: string
          id?: string
          is_active?: boolean
          member_area_id?: string | null
          module_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_access_member_area_id_fkey"
            columns: ["member_area_id"]
            isOneToOne: false
            referencedRelation: "member_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_access_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      member_areas: {
        Row: {
          associated_products: string[] | null
          created_at: string | null
          description: string | null
          id: string
          logo_url: string | null
          name: string
          primary_color: string | null
          slug: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          associated_products?: string[] | null
          created_at?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          primary_color?: string | null
          slug: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          associated_products?: string[] | null
          created_at?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          primary_color?: string | null
          slug?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_areas_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      modules: {
        Row: {
          banner_url: string | null
          checkout_link: string | null // NEW FIELD
          created_at: string
          description: string | null
          id: string
          member_area_id: string
          order_index: number
          product_id: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          banner_url?: string | null
          checkout_link?: string | null // NEW FIELD
          created_at?: string
          description?: string | null
          id?: string
          member_area_id: string
          order_index?: number
          product_id?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          banner_url?: string | null
          checkout_link?: string | null // NEW FIELD
          created_at?: string
          description?: string | null
          id?: string
          member_area_id?: string
          order_index?: number
          product_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "modules_member_area_id_fkey"
            columns: ["member_area_id"]
            isOneToOne: false
            referencedRelation: "member_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modules_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modules_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      orders: {
        Row: {
          amount: number
          checkout_id: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          mp_payment_id: string | null
          payment_id: string | null
          product_id: string | null
          status: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          checkout_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          mp_payment_id?: string | null
          payment_id?: string | null
          product_id?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          checkout_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          mp_payment_id?: string | null
          payment_id?: string | null
          product_id?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_checkout_id_fkey"
            columns: ["checkout_id"]
            isOneToOne: false
            referencedRelation: "checkouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          checkout_id: string
          created_at: string
          date: string
          id: string
          metadata: Json | null
          mp_payment_id: string | null
          mp_payment_status: string | null
          payment_method: string | null
          payment_url: string | null
          qr_code: string | null
          qr_code_base64: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          checkout_id: string
          created_at?: string
          date?: string
          id?: string
          metadata?: Json | null
          mp_payment_id?: string | null
          mp_payment_status?: string | null
          payment_method?: string | null
          payment_url?: string | null
          qr_code?: string | null
          qr_code_base64?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          checkout_id?: string
          created_at?: string
          date?: string
          id?: string
          metadata?: Json | null
          mp_payment_id?: string | null
          mp_payment_status?: string | null
          payment_method?: string | null
          payment_url?: string | null
          qr_code?: string | null
          qr_code_base64?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_checkout_id_fkey"
            columns: ["checkout_id"]
            isOneToOne: false
            referencedRelation: "checkouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          colors: Json | null
          created_at: string
          global_font_family: string | null
          id: string
          logo_url: string | null
          login_subtitle: string | null
          login_title: string | null
          member_area_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          colors?: Json | null
          created_at?: string
          global_font_family?: string | null
          id?: string
          logo_url?: string | null
          login_subtitle?: string | null
          login_title?: string | null
          member_area_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          colors?: Json | null
          created_at?: string
          global_font_family?: string | null
          id?: string
          logo_url?: string | null
          login_subtitle?: string | null
          login_title?: string | null
          member_area_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_settings_member_area_id_fkey"
            columns: ["member_area_id"]
            isOneToOne: false
            referencedRelation: "member_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      product_access: {
        Row: {
          access_granted_at: string
          created_at: string | null
          id: string
          payment_id: string | null
          product_id: string | null
          source: string | null
          user_id: string | null
        }
        Insert: {
          access_granted_at?: string
          created_at?: string | null
          id?: string
          payment_id?: string | null
          product_id?: string | null
          source?: string | null
          user_id?: string | null
        }
        Update: {
          access_granted_at?: string
          created_at?: string | null
          id?: string
          payment_id?: string | null
          product_id?: string | null
          source?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_access_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_access_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      product_deliveries: {
        Row: {
          created_at: string | null
          error_message: string | null
          gmail_account_id: string | null
          id: string
          purchase_id: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          gmail_account_id?: string | null
          id?: string
          purchase_id?: string | null
          status: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          gmail_account_id?: string | null
          id?: string
          purchase_id?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_deliveries_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "product_purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_deliveries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      product_purchases: {
        Row: {
          access_sent: boolean | null
          access_sent_at: string | null
          amount: number
          created_at: string | null
          customer_email: string
          customer_name: string
          id: string
          password: string | null
          payment_id: string
          payment_status: string
          product_id: string | null
          user_id: string | null
          username: string | null
        }
        Insert: {
          access_sent?: boolean | null
          access_sent_at?: string | null
          amount: number
          created_at?: string | null
          customer_email: string
          customer_name: string
          id?: string
          password?: string | null
          payment_id: string
          payment_status: string
          product_id?: string | null
          user_id?: string | null
          username?: string | null
        }
        Update: {
          access_sent?: boolean | null
          access_sent_at?: string | null
          amount?: number
          created_at?: string | null
          customer_email?: string
          customer_name?: string
          id?: string
          password?: string | null
          payment_id?: string
          payment_status?: string
          product_id?: string | null
          user_id?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_purchases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      products: {
        Row: {
          access_url: string | null
          banner_url: string | null
          created_at: string
          description: string | null
          email_template: string | null
          file_url: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          member_area_id: string | null
          member_area_link: string | null
          name: string
          price: number
          price_original: number | null
          project_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          access_url?: string | null
          banner_url?: string | null
          created_at?: string
          description?: string | null
          email_template?: string | null
          file_url?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          member_area_id?: string | null
          member_area_link?: string | null
          name: string
          price: number
          price_original?: number | null
          project_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          access_url?: string | null
          banner_url?: string | null
          created_at?: string
          description?: string | null
          email_template?: string | null
          file_url?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          member_area_id?: string | null
          member_area_link?: string | null
          name?: string
          price?: number
          price_original?: number | null
          project_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_member_area_id_fkey"
            columns: ["member_area_id"]
            isOneToOne: false
            referencedRelation: "member_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          login_url: string | null
          member_area_id: string | null
          name: string | null
          role: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          login_url?: string | null
          member_area_id?: string | null
          name?: string | null
          role?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          login_url?: string | null
          member_area_id?: string | null
          name?: string | null
          role?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_member_area_id_fkey"
            columns: ["member_area_id"]
            isOneToOne: false
            referencedRelation: "member_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          access_url: string
          created_at: string | null
          description: string | null
          id: string
          logo_url: string | null
          name: string
          primary_color: string | null
          secondary_color: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_url: string
          created_at?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          primary_color?: string | null
          secondary_color?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_url?: string
          created_at?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          primary_color?: string | null
          secondary_color?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      project_members: {
        Row: {
          created_at: string | null
          id: string
          project_id: string
          role: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          project_id: string
          role?: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          project_id?: string
          role?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      produtos_digitais: {
        Row: {
          acesso_expira_em: number | null
          arquivo_url: string | null
          created_at: string | null
          descricao: string | null
          email_assunto: string
          email_template: string
          gerar_credenciais: boolean | null
          id: string
          instrucoes_acesso: string | null
          is_active: boolean | null
          nome: string
          preco: number
          tipo_entregavel: string
          updated_at: string | null
          url_acesso: string | null
        }
        Insert: {
          acesso_expira_em?: number | null
          arquivo_url?: string | null
          created_at?: string | null
          descricao?: string | null
          email_assunto?: string
          email_template: string
          gerar_credenciais?: boolean | null
          id?: string
          instrucoes_acesso?: string | null
          is_active?: boolean | null
          nome: string
          preco: number
          tipo_entregavel: string
          updated_at?: string | null
          url_acesso?: string | null
        }
        Update: {
          acesso_expira_em?: number | null
          arquivo_url?: string | null
          created_at?: string | null
          descricao?: string | null
          email_assunto?: string
          email_template?: string
          gerar_credenciais?: boolean | null
          id?: string
          instrucoes_acesso?: string | null
          is_active?: boolean | null
          nome?: string
          preco?: number
          tipo_entregavel?: string
          updated_at?: string | null
          url_acesso?: string | null
        }
        Relationships: []
      }
      sales: {
        Row: {
          amount: number
          checkout_id: string | null
          commission_amount: number | null
          created_at: string
          customer_id: string | null
          id: string
          net_amount: number | null
          order_bumps: Json | null
          payment_id: string | null
          payment_method: string | null
          product_id: string | null
          product_name: string
          quantity: number | null
          selected_package: Json | null
          status: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          checkout_id?: string | null
          commission_amount?: number | null
          created_at?: string
          customer_id?: string | null
          id?: string
          net_amount?: number | null
          order_bumps?: Json | null
          payment_id?: string | null
          payment_method?: string | null
          product_id?: string | null
          product_name: string
          quantity?: number | null
          selected_package?: Json | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          checkout_id?: string | null
          commission_amount?: number | null
          created_at?: string
          customer_id?: string | null
          id?: string
          net_amount?: number | null
          order_bumps?: Json | null
          payment_id?: string | null
          payment_method?: string | null
          product_id?: string | null
          product_name?: string
          quantity?: number | null
          selected_package?: Json | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_checkout_id_fkey"
            columns: ["checkout_id"]
            isOneToOne: false
            referencedRelation: "checkouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      handle_new_user: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_admin: {
        Args: {
          user_id?: string
        }
        Returns: boolean
      }
      is_admin_of_member_area: {
        Args: {
          p_member_area_id: string
        }
        Returns: boolean
      }
      log_checkout_changes: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      process_completed_sale: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      update_customer_stats: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      update_updated_at_column: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

export interface DeliverableConfig {
  type: 'none' | 'link' | 'upload';
  link?: string | null;
  fileUrl?: string | null; // For uploaded files
  name?: string | null;
  description?: string | null;
}

export interface PackageConfig {
  id: number;
  name: string;
  description: string;
  topics: string[];
  price: number; // in Reais
  originalPrice: number; // in Reais
  mostSold?: boolean;
  associatedProductIds?: string[] | null; // Changed to array
  // deliverable?: DeliverableConfig; // New: Package-specific deliverable
}

export interface GuaranteeConfig {
  enabled: boolean;
  days: number;
  description: string;
}

export interface ReservedRightsConfig {
  enabled: boolean;
  text: string;
}

export interface EmailConfig {
  email: string;
  appPassword: string;
  displayName: string;
  host?: string;
  port?: string;
  secure?: boolean;
  provider?: string;
}

// Export FormFields
export interface FormFields {
  requireName?: boolean;
  requireEmail?: boolean;
  requireEmailConfirm?: boolean;
  requirePhone?: boolean;
  requireCpf?: boolean;
  packages?: PackageConfig[];
  deliverable?: DeliverableConfig;
  sendTransactionalEmail?: boolean;
  transactionalEmailSubject?: string;
  transactionalEmailBody?: string;
  guarantee?: GuaranteeConfig;
  reservedRights?: ReservedRightsConfig;
}