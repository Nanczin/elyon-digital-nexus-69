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

  const addTopicToPackage = (packageId: number) => { // Added packageId parameter
    const packages = checkoutData.form_fields.packages.map((pkg: PackageConfig) => pkg.id === packageId ? {
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
  return (
    <div className="container mx-auto p-3 sm:p-4 lg:p-6 max-w-7xl">
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
                          <Button type="button" size="sm" variant="outline" onClick={() => addTopicToPackage(pkg.id)} className="w-full sm:w-auto">
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
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          {metaPixels.length === 0 
                            ? "Configure um Meta Pixel na página de Integrações" 
                            : "Pixel que será usado para rastrear conversões deste checkout"
                          }
                        </p>
                      </div>

                      {/* Nova seção para Email Transacional */}
                      <div className="space-y-2">
                        <Label>Conta de Email Transacional</Label>
                        <Select 
                          value={checkoutData.integrations?.selectedEmailAccount || "none"} 
                          onValueChange={value => {
                            if (value !== 'no-email-config' && value !== "none") {
                              handleInputChange('integrations.selectedEmailAccount', value);
                            } else {
                              handleInputChange('integrations.selectedEmailAccount', '');
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma conta de email configurada" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Nenhuma</SelectItem>
                            {emailConfig ? (
                              <SelectItem key="default-email-config" value="default-email-config">
                                {emailConfig.displayName || emailConfig.email}
                              </SelectItem>
                            ) : (
                              <SelectItem value="no-email-config" disabled>
                                Nenhuma conta de email configurada
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          {emailConfig
                            ? "Conta que será usada para enviar e-mails transacionais deste checkout"
                            : "Configure uma conta de e-mail na página de Integrações para habilitar esta opção"
                          }
                        </p>
                      </div>

                      {(mercadoPagoAccounts.length === 0 || metaPixels.length === 0 || !isEmailIntegrationConfigured) && (
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
                            onClick={() => toast({ title: "Redirecionar", description: "Funcionalidade não implementada." })}
                            className="mt-3"
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
                    <h3 className="text-lg font-semibold">Cores e Textos</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Cor Primária</Label>
                        <div className="flex gap-2">
                          <Input type="color" value={checkoutData.styles.primaryColor || '#3b82f6'} onChange={e => handleInputChange('styles.primaryColor', e.target.value)} className="w-16 h-10 p-1" />
                          <Input type="text" value={checkoutData.styles.primaryColor || '#3b82f6'} onChange={e => handleInputChange('styles.primaryColor', e.target.value)} placeholder="#3b82f6" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Cor do Gradiente</Label>
                        <div className="flex gap-2">
                          <Input type="color" value={checkoutData.styles.gradientColor || '#60a5fa'} onChange={e => handleInputChange('styles.gradientColor', e.target.value)} className="w-16 h-10 p-1" />
                          <Input type="text" value={checkoutData.styles.gradientColor || '#60a5fa'} onChange={e => handleInputChange('styles.gradientColor', e.target.value)} placeholder="#60a5fa" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Cor de Destaque</Label>
                        <div className="flex gap-2">
                          <Input type="color" value={checkoutData.styles.highlightColor || '#3b82f6'} onChange={e => handleInputChange('styles.highlightColor', e.target.value)} className="w-16 h-10 p-1" />
                          <Input type="text" value={checkoutData.styles.highlightColor || '#3b82f6'} onChange={e => handleInputChange('styles.highlightColor', e.target.value)} placeholder="#3b82f6" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Cor do Fundo</Label>
                        <div className="flex gap-2">
                          <Input type="color" value={checkoutData.styles.backgroundColor || '#ffffff'} onChange={e => handleInputChange('styles.backgroundColor', e.target.value)} className="w-16 h-10 p-1" />
                          <Input type="text" value={checkoutData.styles.backgroundColor || '#ffffff'} onChange={e => handleInputChange('styles.backgroundColor', e.target.value)} placeholder="#ffffff" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Cor do Texto</Label>
                        <div className="flex gap-2">
                          <Input type="color" value={checkoutData.styles.textColor || '#000000'} onChange={e => handleInputChange('styles.textColor', e.target.value)} className="w-16 h-10 p-1" />
                          <Input type="text" value={checkoutData.styles.textColor || '#000000'} onChange={e => handleInputChange('styles.textColor', e.target.value)} placeholder="#000000" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Cor do Título</Label>
                        <div className="flex gap-2">
                          <Input type="color" value={checkoutData.styles.headlineColor || '#000000'} onChange={e => handleInputChange('styles.headlineColor', e.target.value)} className="w-16 h-10 p-1" />
                          <Input type="text" value={checkoutData.styles.headlineColor || '#000000'} onChange={e => handleInputChange('styles.headlineColor', e.target.value)} placeholder="#000000" />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Texto do Título</Label>
                      <Textarea value={checkoutData.styles.headlineText || ''} onChange={e => handleInputChange('styles.headlineText', e.target.value)} placeholder="Sua transformação começa agora!" rows={2} />
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold">Timer de Escassez</h3>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Habilitar Timer</Label>
                        <p className="text-sm text-muted-foreground">Mostrar um contador de tempo no checkout</p>
                      </div>
                      <Switch checked={checkoutData.timer?.enabled || false} onCheckedChange={checked => handleInputChange('timer.enabled', checked)} />
                    </div>
                    {checkoutData.timer?.enabled && (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Duração (minutos)</Label>
                            <Input type="number" value={checkoutData.timer.duration || 15} onChange={e => handleInputChange('timer.duration', Number(e.target.value))} placeholder="15" />
                          </div>
                          <div className="space-y-2">
                            <Label>Cor do Timer</Label>
                            <div className="flex gap-2">
                              <Input type="color" value={checkoutData.timer.color || '#dc2626'} onChange={e => handleInputChange('timer.color', e.target.value)} className="w-16 h-10 p-1" />
                              <Input type="text" value={checkoutData.timer.color || '#dc2626'} onChange={e => handleInputChange('timer.color', e.target.value)} placeholder="#dc2626" />
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Texto do Timer</Label>
                          <Input value={checkoutData.timer.text || 'Oferta por tempo limitado'} onChange={e => handleInputChange('timer.text', e.target.value)} placeholder="Oferta por tempo limitado" />
                        </div>
                      </>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="deliverable" className="space-y-4">
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold">Configuração de Entregável</h3>
                    <p className="text-sm text-muted-foreground">
                      Defina como o produto principal (ou o pacote selecionado) será entregue após a compra.
                    </p>

                    <div className="space-y-4">
                      <Label>Tipo de Entregável</Label>
                      <Select 
                        value={checkoutData.form_fields.deliverable?.type || 'none'} 
                        onValueChange={value => handleInputChange('form_fields.deliverable.type', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo de entregável" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum (usar link do produto)</SelectItem>
                          <SelectItem value="link">Link Direto</SelectItem>
                          <SelectItem value="upload">Upload de Arquivo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {checkoutData.form_fields.deliverable?.type === 'link' && (
                      <div className="space-y-2">
                        <Label htmlFor="deliverableLink">Link Direto do Entregável *</Label>
                        <Input 
                          id="deliverableLink" 
                          type="url" 
                          value={checkoutData.form_fields.deliverable.link || ''} 
                          onChange={e => handleInputChange('form_fields.deliverable.link', e.target.value)} 
                          placeholder="https://exemplo.com/meu-ebook.pdf" 
                          required 
                        />
                      </div>
                    )}

                    {checkoutData.form_fields.deliverable?.type === 'upload' && (
                      <div className="space-y-2">
                        <Label htmlFor="checkoutDeliverableFile">Upload de Arquivo Entregável *</Label>
                        <Input 
                          id="checkoutDeliverableFile" 
                          type="file" 
                          onChange={e => handleCheckoutDeliverableFileChange(e.target.files?.[0] || null)} 
                          required={!checkoutData.form_fields.deliverable?.fileUrl && !checkoutDeliverableFile}
                        />
                        {checkoutData.form_fields.deliverable?.fileUrl && !checkoutDeliverableFile && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <Link className="h-4 w-4" />
                            <span>Arquivo atual: <a href={checkoutData.form_fields.deliverable.fileUrl} target="_blank" rel="noopener noreferrer" className="underline">Ver</a></span>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => {
                                handleInputChange('form_fields.deliverable.fileUrl', null);
                                handleInputChange('form_fields.deliverable.link', null);
                              }}
                              className="h-6 px-2 text-destructive hover:text-destructive"
                            >
                              <XCircle className="h-3 w-3 mr-1" /> Remover
<dyad-problem-report summary="1445 problems">
<problem file="src/pages/Customers.tsx" line="12" column="32" code="1005">'from' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="143" column="81" code="1005">')' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="144" column="1" code="2657">JSX expressions must have one parent element.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="156" column="107" code="1005">',' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="156" column="124" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="159" column="98" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="159" column="163" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="165" column="39" code="1109">Expression expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="165" column="45" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="165" column="239" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="165" column="257" code="1109">Expression expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="165" column="259" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="166" column="32" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="166" column="181" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="166" column="233" code="1109">Expression expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="166" column="239" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="166" column="433" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="169" column="66" code="1005">',' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="169" column="83" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="171" column="39" code="1109">Expression expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="171" column="45" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="171" column="239" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="171" column="259" code="1109">Expression expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="171" column="261" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="172" column="32" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="172" column="181" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="172" column="233" code="1109">Expression expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="172" column="239" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="172" column="433" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="173" column="22" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="173" column="171" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="173" column="230" code="1109">Expression expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="173" column="236" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="173" column="430" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="174" column="187" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="174" column="379" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="175" column="62" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="175" column="254" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="178" column="64" code="1005">',' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="178" column="81" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="180" column="122" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="180" column="314" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="184" column="187" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="184" column="379" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="185" column="62" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="185" column="254" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="188" column="64" code="1005">',' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="188" column="81" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="210" column="191" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="210" column="383" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="211" column="62" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="211" column="254" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="214" column="64" code="1005">',' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="214" column="81" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="216" column="126" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="216" column="318" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="220" column="191" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="220" column="383" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="221" column="62" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="221" column="254" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="224" column="64" code="1005">',' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="224" column="81" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="242" column="184" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="242" column="376" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="243" column="62" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="243" column="254" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="246" column="64" code="1005">',' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="246" column="81" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="248" column="119" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="248" column="311" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="252" column="184" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="252" column="376" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="253" column="62" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="253" column="254" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="256" column="64" code="1005">',' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="256" column="81" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="280" column="1" code="1128">Declaration or statement expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="320" column="9" code="1005">';' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="320" column="22" code="1005">';' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="320" column="29" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="320" column="33" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="320" column="36" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="320" column="42" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="320" column="45" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="320" column="56" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="320" column="60" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="320" column="69" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="320" column="84" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="320" column="88" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="320" column="100" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="320" column="104" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="320" column="116" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="320" column="118" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="320" column="126" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="320" column="142" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="320" column="145" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="320" column="150" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="320" column="164" code="1003">Identifier expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="322" column="1" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="322" column="5" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="322" column="14" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="322" column="20" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="322" column="30" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="322" column="33" code="1435">Unknown keyword or identifier. Did you mean 'for'?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="324" column="15" code="1005">';' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="324" column="27" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="324" column="46" code="1109">Expression expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="324" column="48" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="324" column="50" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="324" column="78" code="1005">';' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="324" column="82" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="324" column="94" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="324" column="97" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="324" column="109" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="324" column="141" code="1005">';' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="324" column="148" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="324" column="153" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="324" column="159" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="324" column="171" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="324" column="176" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="324" column="179" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="324" column="188" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="324" column="191" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="324" column="197" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="324" column="200" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="324" column="204" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="324" column="208" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="324" column="227" code="1005">';' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="324" column="235" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="324" column="241" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="324" column="253" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="324" column="258" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="324" column="267" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="324" column="270" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="324" column="276" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="325" column="1" code="1003">Identifier expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="325" column="15" code="1005">';' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="325" column="53" code="1109">Expression expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="325" column="55" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="325" column="69" code="1443">Module declaration names may only use ' or &quot; quoted strings.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="325" column="78" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="325" column="88" code="1443">Module declaration names may only use ' or &quot; quoted strings.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="325" column="107" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="325" column="112" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="325" column="118" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="325" column="131" code="1443">Module declaration names may only use ' or &quot; quoted strings.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="325" column="138" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="325" column="141" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="325" column="159" code="1005">';' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="325" column="163" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="325" column="165" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="325" column="185" code="1005">';' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="325" column="194" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="325" column="198" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="325" column="202" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="325" column="207" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="325" column="214" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="325" column="227" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="325" column="232" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="325" column="235" code="1435">Unknown keyword or identifier. Did you mean 'object'?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="325" column="242" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="326" column="1" code="1003">Identifier expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="326" column="15" code="1005">';' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="326" column="23" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="326" column="26" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="326" column="32" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="326" column="56" code="1109">Expression expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="326" column="58" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="326" column="68" code="1443">Module declaration names may only use ' or &quot; quoted strings.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="326" column="81" code="1443">Module declaration names may only use ' or &quot; quoted strings.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="326" column="98" code="1005">';' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="326" column="104" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="326" column="118" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="326" column="127" code="1005">'while' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="326" column="131" code="1005">')' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="326" column="137" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="326" column="151" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="326" column="163" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="326" column="167" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="326" column="176" code="1443">Module declaration names may only use ' or &quot; quoted strings.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="326" column="208" code="1005">';' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="326" column="218" code="1435">Unknown keyword or identifier. Did you mean 'class'?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="326" column="249" code="1005">';' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="326" column="254" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="327" column="1" code="1003">Identifier expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="327" column="15" code="1005">';' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="327" column="20" code="1443">Module declaration names may only use ' or &quot; quoted strings.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="327" column="29" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="327" column="44" code="1109">Expression expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="327" column="46" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="327" column="53" code="1443">Module declaration names may only use ' or &quot; quoted strings.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="327" column="65" code="1443">Module declaration names may only use ' or &quot; quoted strings.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="327" column="84" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="327" column="92" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="327" column="100" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="327" column="110" code="1443">Module declaration names may only use ' or &quot; quoted strings.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="327" column="127" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="327" column="131" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="327" column="136" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="328" column="1" code="1003">Identifier expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="328" column="24" code="1109">Expression expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="328" column="26" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="328" column="36" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="328" column="38" code="1435">Unknown keyword or identifier. Did you mean 'import ação'?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="328" column="52" code="1443">Module declaration names may only use ' or &quot; quoted strings.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="328" column="81" code="1005">';' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="328" column="86" code="1005">')' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="329" column="1" code="1003">Identifier expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="329" column="28" code="1005">';' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="329" column="47" code="1109">Expression expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="329" column="89" code="1005">';' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="329" column="94" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="329" column="128" code="1005">';' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="329" column="130" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="329" column="137" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="329" column="140" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="329" column="152" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="330" column="1" code="1003">Identifier expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="330" column="34" code="1005">';' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="330" column="59" code="1109">Expression expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="330" column="61" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="330" column="70" code="1443">Module declaration names may only use ' or &quot; quoted strings.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="330" column="90" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="330" column="97" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="330" column="111" code="1443">Module declaration names may only use ' or &quot; quoted strings.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="330" column="129" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="330" column="133" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="330" column="137" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="330" column="144" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="330" column="147" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="330" column="167" code="1005">';' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="330" column="177" code="1005">';' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="330" column="182" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="330" column="192" code="1443">Module declaration names may only use ' or &quot; quoted strings.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="330" column="204" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="330" column="228" code="1005">';' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="330" column="230" code="1443">Module declaration names may only use ' or &quot; quoted strings.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="331" column="1" code="1003">Identifier expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="331" column="16" code="1005">';' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="331" column="50" code="1109">Expression expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="331" column="74" code="1005">';' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="331" column="82" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="331" column="85" code="1435">Unknown keyword or identifier. Did you mean 'import ação'?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="331" column="96" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="332" column="1" code="1003">Identifier expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="332" column="29" code="1005">';' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="332" column="49" code="1109">Expression expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="332" column="51" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="332" column="65" code="1443">Module declaration names may only use ' or &quot; quoted strings.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="332" column="79" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="332" column="83" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="332" column="95" code="1443">Module declaration names may only use ' or &quot; quoted strings.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="332" column="114" code="1443">Module declaration names may only use ' or &quot; quoted strings.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="332" column="151" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="332" column="179" code="1005">';' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="332" column="182" code="1443">Module declaration names may only use ' or &quot; quoted strings.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="332" column="226" code="1003">Identifier expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="334" column="1" code="1434">Unexpected keyword or identifier.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="334" column="25" code="1005">';' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="336" column="2" code="17008">JSX element 'dyad-write' has no corresponding closing tag.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="342" column="11" code="1005">',' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="342" column="39" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="348" column="21" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="349" column="21" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="350" column="3" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="352" column="11" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="353" column="25" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="354" column="12" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="355" column="18" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="361" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="363" column="18" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="369" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="371" column="19" code="1109">Expression expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="372" column="11" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="377" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="380" column="27" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="385" column="11" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="387" column="27" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="392" column="11" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="394" column="7" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="396" column="12" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="397" column="18" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="407" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="409" column="18" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="419" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="421" column="19" code="1109">Expression expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="422" column="11" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="431" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="434" column="27" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="439" column="11" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="441" column="27" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="446" column="11" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="448" column="27" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="453" column="11" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="455" column="27" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="460" column="11" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="462" column="7" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="464" column="12" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="465" column="27" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="486" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="488" column="28" code="1109">Expression expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="489" column="11" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="509" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="511" column="28" code="1109">Expression expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="512" column="11" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="532" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="535" column="27" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="540" column="11" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="542" column="7" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="544" column="12" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="545" column="22" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="554" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="556" column="22" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="565" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="567" column="23" code="1109">Expression expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="568" column="11" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="576" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="579" column="27" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="584" column="11" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="586" column="27" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="591" column="11" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="593" column="7" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="595" column="12" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="596" column="21" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="614" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="616" column="22" code="1109">Expression expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="617" column="11" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="634" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="636" column="22" code="1109">Expression expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="637" column="11" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="654" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="657" column="27" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="662" column="11" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="664" column="27" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="669" column="11" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="671" column="27" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="676" column="11" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="678" column="7" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="680" column="12" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="681" column="21" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="692" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="694" column="22" code="1109">Expression expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="695" column="11" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="705" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="707" column="22" code="1109">Expression expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="708" column="11" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="718" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="720" column="7" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="722" column="12" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="723" column="21" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="732" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="734" column="22" code="1109">Expression expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="735" column="11" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="743" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="745" column="22" code="1109">Expression expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="746" column="11" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="753" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="756" column="27" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="761" column="11" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="763" column="7" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="765" column="12" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="766" column="18" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="772" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="774" column="18" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="780" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="782" column="19" code="1109">Expression expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="783" column="11" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="788" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="791" column="27" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="796" column="11" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="798" column="27" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="803" column="11" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="805" column="7" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="807" column="12" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="808" column="23" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="814" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="816" column="24" code="1109">Expression expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="817" column="11" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="822" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="824" column="24" code="1109">Expression expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="825" column="11" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="830" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="833" column="27" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="838" column="11" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="840" column="27" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="845" column="11" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="847" column="7" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="849" column="12" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="850" column="23" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="862" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="864" column="24" code="1109">Expression expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="865" column="11" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="876" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="878" column="24" code="1109">Expression expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="879" column="11" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="890" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="893" column="27" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="898" column="11" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="900" column="7" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="902" column="12" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="903" column="18" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="912" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="914" column="19" code="1109">Expression expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="915" column="11" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="923" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="925" column="19" code="1109">Expression expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="926" column="11" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="934" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="937" column="27" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="942" column="11" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="944" column="7" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="946" column="12" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="947" column="28" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="955" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="957" column="29" code="1109">Expression expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="958" column="11" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="965" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="967" column="29" code="1109">Expression expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="968" column="11" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="975" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="978" column="27" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="983" column="11" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="985" column="27" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="990" column="11" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="992" column="27" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="997" column="11" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="999" column="7" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1001" column="12" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1002" column="30" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1012" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1014" column="31" code="1109">Expression expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1014" column="40" code="1011">An element access expression should take an argument.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1015" column="11" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1024" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1026" column="31" code="1109">Expression expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1026" column="40" code="1011">An element access expression should take an argument.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1027" column="11" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1036" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1039" column="27" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1044" column="11" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1046" column="7" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1048" column="12" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1049" column="21" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1061" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1063" column="22" code="1109">Expression expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1064" column="11" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1075" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1077" column="22" code="1109">Expression expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1078" column="11" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1089" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1092" column="27" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1097" column="11" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1099" column="27" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1104" column="11" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1106" column="27" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1111" column="11" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1113" column="7" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1115" column="12" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1116" column="17" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1127" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1129" column="17" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1140" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1142" column="18" code="1109">Expression expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1143" column="11" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1153" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1156" column="27" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1161" column="11" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1163" column="27" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1168" column="11" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1170" column="27" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1175" column="11" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1177" column="27" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1182" column="11" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1184" column="7" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1186" column="12" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1187" column="17" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1202" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1204" column="17" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1219" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1221" column="18" code="1109">Expression expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1222" column="11" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1236" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1239" column="27" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1244" column="11" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1246" column="27" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1251" column="11" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1253" column="7" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1255" column="12" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1256" column="17" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1266" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1268" column="18" code="1109">Expression expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1269" column="11" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1278" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1280" column="18" code="1109">Expression expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1281" column="11" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1290" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1293" column="27" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1298" column="11" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1300" column="27" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1305" column="11" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1307" column="7" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1309" column="12" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1310" column="28" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1317" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1319" column="29" code="1109">Expression expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1320" column="11" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1326" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1328" column="29" code="1109">Expression expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1329" column="11" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1335" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1338" column="27" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1343" column="11" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1345" column="27" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1350" column="11" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1352" column="27" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1357" column="11" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1359" column="7" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1361" column="12" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1362" column="21" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1369" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1371" column="22" code="1109">Expression expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1372" column="11" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1378" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1380" column="22" code="1109">Expression expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1381" column="11" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1387" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1390" column="27" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1395" column="11" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1397" column="27" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1402" column="11" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1404" column="7" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1406" column="12" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1407" column="22" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1420" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1422" column="23" code="1109">Expression expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1423" column="11" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1435" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1437" column="23" code="1109">Expression expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1438" column="11" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1450" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1453" column="27" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1458" column="11" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1460" column="27" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1465" column="11" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1467" column="7" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1469" column="12" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1470" column="21" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1487" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1489" column="22" code="1109">Expression expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1490" column="11" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1506" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1508" column="22" code="1109">Expression expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1509" column="11" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1525" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1528" column="27" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1533" column="11" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1535" column="27" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1540" column="11" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1542" column="7" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1544" column="12" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1545" column="21" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1558" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1560" column="22" code="1109">Expression expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1561" column="11" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1573" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1575" column="22" code="1109">Expression expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1576" column="11" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1588" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1591" column="27" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1596" column="11" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1598" column="27" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1603" column="11" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1605" column="7" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1607" column="12" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1608" column="21" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1619" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1621" column="21" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1632" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1634" column="22" code="1109">Expression expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1635" column="11" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1645" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1648" column="27" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1653" column="11" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1655" column="7" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1657" column="12" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1658" column="21" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1665" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1667" column="22" code="1109">Expression expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1668" column="11" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1674" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1676" column="22" code="1109">Expression expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1677" column="11" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1683" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1686" column="27" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1691" column="11" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1693" column="27" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1698" column="11" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1700" column="7" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1702" column="12" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1703" column="27" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1718" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1720" column="28" code="1109">Expression expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1721" column="11" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1735" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1737" column="28" code="1109">Expression expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1738" column="11" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1752" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1754" column="7" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1756" column="12" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1757" column="17" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1773" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1775" column="17" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1791" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1793" column="18" code="1109">Expression expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1794" column="11" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1809" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1812" column="27" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1817" column="11" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1819" column="27" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1824" column="11" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1826" column="27" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1831" column="11" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1833" column="27" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1838" column="11" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1840" column="7" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1841" column="5" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1843" column="19" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1844" column="5" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1846" column="28" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1847" column="13" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1847" column="33" code="1003">Identifier expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1847" column="40" code="1382">Unexpected token. Did you mean `{'&gt;'}` or `&amp;gt;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1849" column="7" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1851" column="13" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1851" column="33" code="1003">Identifier expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1851" column="40" code="1382">Unexpected token. Did you mean `{'&gt;'}` or `&amp;gt;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1853" column="7" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1855" column="13" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1856" column="19" code="1109">Expression expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1859" column="7" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1861" column="13" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1862" column="27" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1863" column="9" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1865" column="7" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1867" column="13" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1867" column="33" code="1003">Identifier expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1867" column="40" code="1382">Unexpected token. Did you mean `{'&gt;'}` or `&amp;gt;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1869" column="7" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1871" column="13" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1871" column="33" code="1003">Identifier expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1871" column="40" code="1382">Unexpected token. Did you mean `{'&gt;'}` or `&amp;gt;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1873" column="7" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1875" column="13" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1875" column="33" code="1003">Identifier expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1875" column="40" code="1382">Unexpected token. Did you mean `{'&gt;'}` or `&amp;gt;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1877" column="7" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1879" column="13" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1879" column="33" code="1003">Identifier expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1879" column="40" code="1382">Unexpected token. Did you mean `{'&gt;'}` or `&amp;gt;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1881" column="7" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1882" column="5" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1884" column="19" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1885" column="5" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1887" column="19" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1888" column="5" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1889" column="3" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1890" column="1" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1892" column="46" code="1003">Identifier expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1892" column="68" code="1382">Unexpected token. Did you mean `{'&gt;'}` or `&amp;gt;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1894" column="69" code="1003">Identifier expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1894" column="79" code="1382">Unexpected token. Did you mean `{'&gt;'}` or `&amp;gt;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1898" column="5" code="1003">Identifier expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1899" column="15" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1899" column="48" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1901" column="11" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1902" column="3" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1906" column="1" code="1382">Unexpected token. Did you mean `{'&gt;'}` or `&amp;gt;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1907" column="9" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1908" column="1" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1911" column="10" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1912" column="5" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1919" column="12" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1920" column="7" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1927" column="5" code="1003">Identifier expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1928" column="15" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1928" column="48" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1930" column="11" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1931" column="3" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1934" column="1" code="1382">Unexpected token. Did you mean `{'&gt;'}` or `&amp;gt;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1935" column="9" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1936" column="1" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1938" column="13" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1939" column="5" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1944" column="15" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1945" column="7" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1952" column="5" code="1003">Identifier expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1953" column="15" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1953" column="48" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1955" column="11" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1956" column="3" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1959" column="1" code="1382">Unexpected token. Did you mean `{'&gt;'}` or `&amp;gt;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1960" column="9" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1961" column="1" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1963" column="13" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1964" column="5" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1969" column="15" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1970" column="7" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1977" column="5" code="1003">Identifier expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1978" column="15" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1978" column="48" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1980" column="11" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1981" column="3" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1984" column="1" code="1382">Unexpected token. Did you mean `{'&gt;'}` or `&amp;gt;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1985" column="9" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1986" column="1" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1994" column="5" code="1003">Identifier expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1995" column="15" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1995" column="48" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1997" column="11" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1998" column="3" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="2001" column="1" code="1382">Unexpected token. Did you mean `{'&gt;'}` or `&amp;gt;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="2002" column="9" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="2003" column="1" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="2010" column="9" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="2011" column="10" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="2012" column="3" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="2013" column="1" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="2016" column="7" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="2021" column="1" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="2024" column="5" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="2032" column="1" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="2035" column="10" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="2038" column="1" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="2041" column="10" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="2043" column="1" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="2046" column="8" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="2053" column="1" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="2057" column="15" code="1109">Expression expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="2057" column="24" code="1005">'}' expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="2069" column="1" code="1381">Unexpected token. Did you mean `{'}'}` or `&amp;rbrace;`?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="2069" column="2" code="1005">'&lt;/' expected.</problem>
<problem file="src/hooks/useIntegrations.ts" line="94" column="127" code="2352">Conversion of type '{ [key: string]: Json; } | Json[]' to type 'EmailConfig' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
  Type 'Json[]' is missing the following properties from type 'EmailConfig': email, appPassword, displayName</problem>
<problem file="src/pages/AdminCheckouts.tsx" line="1610" column="27" code="2322">Type 'string' is not assignable to type 'boolean'.</problem>
<problem file="src/pages/AdminCheckouts.tsx" line="1711" column="87" code="2322">Type '{ children: (string | Element)[]; to: string; target: string; rel: string; }' is not assignable to type 'IntrinsicAttributes &amp; Omit&lt;LucideProps, &quot;ref&quot;&gt; &amp; RefAttributes&lt;SVGSVGElement&gt;'.
  Property 'rel' does not exist on type 'IntrinsicAttributes &amp; Omit&lt;LucideProps, &quot;ref&quot;&gt; &amp; RefAttributes&lt;SVGSVGElement&gt;'.</problem>
<problem file="src/components/integrations/IntegrationsStatus.tsx" line="90" column="32" code="2345">Argument of type 'string' is not assignable to parameter of type 'boolean'.</problem>
<problem file="src/components/integrations/IntegrationsStatus.tsx" line="94" column="33" code="2345">Argument of type 'string' is not assignable to parameter of type 'boolean'.</problem>
<problem file="src/pages/Customers.tsx" line="12" column="32" code="1141">String literal expected.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="70" column="115" code="2304">Cannot find name 'PlatformColors'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="143" column="47" code="2365">Operator '&lt;' cannot be applied to types '(arg: any) =&gt; arg is any[]' and 'number'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="143" column="61" code="2304">Cannot find name 'dyad'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="143" column="66" code="2304">Cannot find name 'problem'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="143" column="74" code="2304">Cannot find name 'report'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="143" column="81" code="2304">Cannot find name 'summary'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="143" column="89" code="2365">Operator '&gt;' cannot be applied to types 'string' and 'Element'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="144" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="144" column="91" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="145" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="145" column="102" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="146" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="146" column="101" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="147" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="147" column="100" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="148" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="148" column="143" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="149" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="149" column="102" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="150" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="150" column="102" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="151" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="151" column="91" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="152" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="152" column="90" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="153" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="153" column="88" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="154" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="154" column="89" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="155" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="155" column="89" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="156" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="156" column="104" code="2304">Cannot find name 'key'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="157" column="109" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="158" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="158" column="132" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="159" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="159" column="90" code="2304">Cannot find name 'children'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="160" column="151" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="161" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="161" column="177" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="162" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="162" column="177" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="163" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="163" column="99" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="164" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="165" column="32" code="2304">Cannot find name 'colors'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="165" column="41" code="2304">Cannot find name 'Json'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="165" column="252" code="2609">JSX spread child must be an array type.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="166" column="25" code="2304">Cannot find name 'user_id'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="166" column="226" code="2304">Cannot find name 'colors'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="166" column="235" code="2304">Cannot find name 'Json'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="169" column="63" code="2304">Cannot find name 'key'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="171" column="32" code="2304">Cannot find name 'colors'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="171" column="41" code="2304">Cannot find name 'Json'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="171" column="254" code="2609">JSX spread child must be an array type.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="172" column="25" code="2304">Cannot find name 'user_id'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="172" column="226" code="2304">Cannot find name 'colors'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="172" column="235" code="2304">Cannot find name 'Json'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="173" column="15" code="2304">Cannot find name 'user_id'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="173" column="223" code="2304">Cannot find name 'colors'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="173" column="232" code="2304">Cannot find name 'Json'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="173" column="475" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="174" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="174" column="181" code="2304">Cannot find name 'colors'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="175" column="56" code="2304">Cannot find name 'colors'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="178" column="61" code="2304">Cannot find name 'key'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="179" column="81" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="180" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="180" column="116" code="2304">Cannot find name 'colors'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="183" column="76" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="184" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="184" column="181" code="2304">Cannot find name 'colors'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="185" column="56" code="2304">Cannot find name 'colors'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="188" column="61" code="2304">Cannot find name 'key'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="189" column="81" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="190" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="191" column="64" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="192" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="193" column="59" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="194" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="195" column="61" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="196" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="197" column="57" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="198" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="199" column="67" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="200" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="201" column="61" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="202" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="203" column="63" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="204" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="205" column="63" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="206" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="207" column="60" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="208" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="209" column="58" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="210" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="210" column="185" code="2304">Cannot find name 'colors'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="211" column="56" code="2304">Cannot find name 'colors'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="214" column="61" code="2304">Cannot find name 'key'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="215" column="81" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="216" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="216" column="120" code="2304">Cannot find name 'colors'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="219" column="76" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="220" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="220" column="185" code="2304">Cannot find name 'colors'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="221" column="56" code="2304">Cannot find name 'colors'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="224" column="61" code="2304">Cannot find name 'key'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="225" column="81" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="226" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="227" column="64" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="228" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="229" column="59" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="230" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="231" column="61" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="232" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="233" column="57" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="234" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="235" column="63" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="236" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="237" column="63" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="238" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="239" column="60" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="240" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="241" column="58" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="242" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="242" column="178" code="2304">Cannot find name 'colors'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="243" column="56" code="2304">Cannot find name 'colors'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="246" column="61" code="2304">Cannot find name 'key'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="247" column="81" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="248" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="248" column="113" code="2304">Cannot find name 'colors'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="251" column="76" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="252" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="252" column="178" code="2304">Cannot find name 'colors'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="253" column="56" code="2304">Cannot find name 'colors'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="256" column="61" code="2304">Cannot find name 'key'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="257" column="81" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="258" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="258" column="138" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="259" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="260" column="57" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="261" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="261" column="132" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="262" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="263" column="59" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="264" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="265" column="61" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="266" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="267" column="57" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="268" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="269" column="63" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="270" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="271" column="63" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="272" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="273" column="60" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="274" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="275" column="58" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="276" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="276" column="133" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="277" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="277" column="133" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="278" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="278" column="133" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="279" column="1" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="279" column="133" code="2339">Property 'problem' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="280" column="3" code="2304">Cannot find name 'dyad'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="280" column="3" code="2365">Operator '&gt;' cannot be applied to types 'number' and 'Element'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="280" column="8" code="2304">Cannot find name 'problem'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="280" column="16" code="2552">Cannot find name 'report'. Did you mean 'Report'?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="280" column="23" code="2339">Property 'think' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="320" column="1" code="2339">Property 'think' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="320" column="9" code="2304">Cannot find name 'Com'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="320" column="13" code="2304">Cannot find name 'certeza'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="320" column="22" code="2304">Cannot find name 'Parece'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="320" column="29" code="2304">Cannot find name 'que'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="320" column="33" code="2304">Cannot find name 'os'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="320" column="36" code="2552">Cannot find name 'erros'. Did you mean 'Error'?</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="320" column="42" code="2304">Cannot find name 'de'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="320" column="45" code="2304">Cannot find name 'compilação'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="320" column="56" code="2304">Cannot find name 'são'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="320" column="60" code="2304">Cannot find name 'causados'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="320" column="69" code="2304">Cannot find name 'principalmente'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="320" column="84" code="2304">Cannot find name 'por'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="320" column="88" code="2304">Cannot find name 'comentários'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="320" column="100" code="2708">Cannot use namespace 'JSX' as a value.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="320" column="104" code="2304">Cannot find name 'malformados'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="320" column="116" code="2304">Cannot find name 'e'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="320" column="118" code="2304">Cannot find name 'algumas'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="320" column="126" code="2304">Cannot find name 'inconsistências'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="320" column="142" code="2304">Cannot find name 'de'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="320" column="145" code="2304">Cannot find name 'tipo'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="320" column="150" code="2304">Cannot find name 'no'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="320" column="153" code="2304">Cannot find name 'TypeScript'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="322" column="1" code="2304">Cannot find name 'Vou'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="322" column="5" code="2304">Cannot find name 'corrigir'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="322" column="14" code="2304">Cannot find name 'esses'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="322" column="20" code="2304">Cannot find name 'problemas'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="322" column="30" code="2304">Cannot find name 'de'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="322" column="33" code="2304">Cannot find name 'forma'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="324" column="7" code="2304">Cannot find name 'Remover'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="324" column="15" code="2304">Cannot find name 'comentários'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="324" column="27" code="2708">Cannot use namespace 'JSX' as a value.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="324" column="31" code="2304">Cannot find name 'problemáticos'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="324" column="48" code="2304">Cannot find name 'O'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="324" column="50" code="2304">Cannot find name 'compilador'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="324" column="61" code="2304">Cannot find name 'TypeScript'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="324" column="72" code="2363">The right-hand side of an arithmetic operation must be of type 'any', 'number', 'bigint' or an enum type.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="324" column="78" code="2304">Cannot find name 'tem'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="324" column="82" code="2304">Cannot find name 'dificuldade'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="324" column="94" code="2304">Cannot find name 'em'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="324" column="97" code="2304">Cannot find name 'interpretar'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="324" column="109" code="2304">Cannot find name 'comentários'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="324" column="121" code="2708">Cannot use namespace 'JSX' as a value.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="324" column="141" code="2304">Cannot find name 'quando'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="324" column="148" code="2304">Cannot find name 'eles'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="324" column="153" code="2304">Cannot find name 'estão'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="324" column="159" code="2304">Cannot find name 'diretamente'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="324" column="171" code="2304">Cannot find name 'após'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="324" column="176" code="2304">Cannot find name 'um'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="324" column="179" code="2304">Cannot find name 'atributo'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="324" column="188" code="2304">Cannot find name 'ou'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="324" column="191" code="2304">Cannot find name 'antes'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="324" column="197" code="2304">Cannot find name 'de'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="324" column="200" code="2304">Cannot find name 'uma'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="324" column="204" code="2304">Cannot find name 'tag'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="324" column="208" code="2304">Cannot find name 'de'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="324" column="211" code="2304">Cannot find name 'fechamento'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="324" column="227" code="2304">Cannot find name 'remover'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="324" column="235" code="2304">Cannot find name 'esses'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="324" column="241" code="2304">Cannot find name 'comentários'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="324" column="253" code="2304">Cannot find name 'para'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="324" column="258" code="2304">Cannot find name 'resolver'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="324" column="267" code="2304">Cannot find name 'os'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="324" column="270" code="2304">Cannot find name 'erros'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="324" column="276" code="2304">Cannot find name 'de'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="324" column="279" code="2304">Cannot find name 'sintaxe'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="325" column="7" code="2304">Cannot find name 'Ajustar'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="325" column="15" code="2304">Cannot find name 'tipagem'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="325" column="23" code="2304">Cannot find name 'de'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="325" column="55" code="2304">Cannot find name 'A'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="325" column="57" code="2304">Cannot find name 'propriedade'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="325" column="78" code="2304">Cannot find name 'dentro'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="325" column="85" code="2304">Cannot find name 'de'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="325" column="107" code="2304">Cannot find name 'está'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="325" column="112" code="2304">Cannot find name 'sendo'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="325" column="118" code="2304">Cannot find name 'tratada'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="325" column="126" code="2304">Cannot find name 'como'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="325" column="138" code="2304">Cannot find name 'em'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="325" column="141" code="2304">Cannot find name 'alguns'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="325" column="148" code="2304">Cannot find name 'lugares'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="325" column="148" code="2695">Left side of comma operator is unused and has no side effects.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="325" column="157" code="2304">Cannot find name 'o'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="325" column="159" code="2304">Cannot find name 'que'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="325" column="163" code="2304">Cannot find name 'é'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="325" column="165" code="2304">Cannot find name 'muito'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="325" column="171" code="2304">Cannot find name 'genérico'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="325" column="185" code="2304">Cannot find name 'garantir'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="325" column="194" code="2304">Cannot find name 'que'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="325" column="198" code="2304">Cannot find name 'ela'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="325" column="202" code="2304">Cannot find name 'seja'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="325" column="207" code="2304">Cannot find name 'tipada'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="325" column="214" code="2304">Cannot find name 'corretamente'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="325" column="227" code="2304">Cannot find name 'como'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="325" column="232" code="2304">Cannot find name 'um'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="325" column="235" code="2304">Cannot find name 'objeto'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="325" column="242" code="2304">Cannot find name 'de'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="325" column="245" code="2304">Cannot find name 'cores'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="326" column="7" code="2304">Cannot find name 'Ajustar'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="326" column="15" code="2304">Cannot find name 'tipagem'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="326" column="23" code="2304">Cannot find name 'de'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="326" column="26" code="2304">Cannot find name 'dados'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="326" column="32" code="2304">Cannot find name 'carregados'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="326" column="46" code="2304">Cannot find name 'Supabase'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="326" column="58" code="2304">Cannot find name 'Em'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="326" column="61" code="2304">Cannot find name 'alguns'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="326" column="79" code="2304">Cannot find name 'e'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="326" column="88" code="2304">Cannot find name 'calls'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="326" column="88" code="2695">Left side of comma operator is unused and has no side effects.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="326" column="95" code="2304">Cannot find name 'os'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="326" column="98" code="2304">Cannot find name 'dados'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="326" column="104" code="2304">Cannot find name 'retornados'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="326" column="118" code="2304">Cannot find name 'Supabase'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="326" column="127" code="2304">Cannot find name 'não'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="326" column="131" code="2304">Cannot find name 'estão'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="326" column="137" code="2304">Cannot find name 'perfeitamente'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="326" column="151" code="2304">Cannot find name 'compatíveis'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="326" column="163" code="2304">Cannot find name 'com'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="326" column="167" code="2304">Cannot find name 'os'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="326" column="170" code="2304">Cannot find name 'tipos'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="326" column="193" code="2304">Cannot find name 'esperados'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="326" column="208" code="2304">Cannot find name 'adicionar'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="326" column="218" code="2304">Cannot find name 'casts'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="326" column="224" code="2304">Cannot find name 'explícitos'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="326" column="249" code="2304">Cannot find name 'para'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="326" column="254" code="2304">Cannot find name 'resolver'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="326" column="263" code="2304">Cannot find name 'isso'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="327" column="7" code="2304">Cannot find name 'Ajustar'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="327" column="15" code="2304">Cannot find name 'tipo'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="327" column="29" code="2304">Cannot find name 'para'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="327" column="34" code="2304">Cannot find name 'relações'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="327" column="46" code="2304">Cannot find name 'O'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="327" column="48" code="2304">Cannot find name 'tipo'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="327" column="62" code="2304">Cannot find name 'em'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="327" column="84" code="2304">Cannot find name 'precisa'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="327" column="92" code="2304">Cannot find name 'incluir'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="327" column="100" code="2304">Cannot find name 'a'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="327" column="102" code="2304">Cannot find name 'relação'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="327" column="127" code="2304">Cannot find name 'que'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="327" column="131" code="2304">Cannot find name 'está'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="327" column="136" code="2304">Cannot find name 'sendo'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="327" column="142" code="2304">Cannot find name 'selecionada'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="328" column="7" code="2304">Cannot find name 'Importar'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="328" column="26" code="2304">Cannot find name 'Adicionar'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="328" column="36" code="2304">Cannot find name 'a'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="328" column="38" code="2304">Cannot find name 'importação'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="328" column="49" code="2304">Cannot find name 'de'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="328" column="81" code="2304">Cannot find name 'onde'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="328" column="86" code="2304">Cannot find name 'estiver'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="328" column="94" code="2304">Cannot find name 'faltando'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="329" column="7" code="2304">Cannot find name 'Corrigir'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="329" column="28" code="2304">Cannot find name 'para'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="329" column="49" code="2304">Cannot find name 'No'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="329" column="49" code="2695">Left side of comma operator is unused and has no side effects.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="329" column="76" code="2304">Cannot find name 'o'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="329" column="89" code="2304">Cannot find name 'para'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="329" column="94" code="2304">Cannot find name 'aulas'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="329" column="100" code="2304">Cannot find name 'é'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="329" column="113" code="2304">Cannot find name 'plural'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="329" column="122" code="2304">Cannot find name 'então'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="329" column="128" code="2304">Cannot find name 'a'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="329" column="130" code="2304">Cannot find name 'função'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="329" column="137" code="2304">Cannot find name 'de'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="329" column="140" code="2304">Cannot find name 'atualização'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="329" column="152" code="2304">Cannot find name 'deve'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="329" column="157" code="2304">Cannot find name 'ser'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="330" column="7" code="2304">Cannot find name 'Corrigir'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="330" column="34" code="2304">Cannot find name 'em'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="330" column="61" code="2304">Cannot find name 'A'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="330" column="63" code="2304">Cannot find name 'função'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="330" column="90" code="2304">Cannot find name 'estava'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="330" column="97" code="2304">Cannot find name 'tentando'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="330" column="106" code="2304">Cannot find name 'usar'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="330" column="129" code="2304">Cannot find name 'que'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="330" column="133" code="2304">Cannot find name 'não'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="330" column="137" code="2304">Cannot find name 'estava'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="330" column="144" code="2304">Cannot find name 'no'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="330" column="147" code="2304">Cannot find name 'escopo'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="330" column="154" code="2304">Cannot find name 'correto'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="330" column="167" code="2304">Cannot find name 'ajustá'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="330" column="174" code="2304">Cannot find name 'la'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="330" column="177" code="2304">Cannot find name 'para'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="330" column="182" code="2304">Cannot find name 'receber'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="330" column="190" code="2304">Cannot find name 'o'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="330" column="204" code="2304">Cannot find name 'como'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="330" column="209" code="2304">Cannot find name 'argumento'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="330" column="209" code="2695">Left side of comma operator is unused and has no side effects.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="330" column="220" code="2304">Cannot find name 'similar'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="330" column="228" code="2304">Cannot find name 'a'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="330" column="251" code="2304">Cannot find name 'e'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="331" column="7" code="2304">Cannot find name 'Corrigir'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="331" column="16" code="2304">Cannot find name 'importação'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="331" column="52" code="2304">Cannot find name 'No'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="331" column="52" code="2695">Left side of comma operator is unused and has no side effects.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="331" column="72" code="2304">Cannot find name 'a'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="331" column="74" code="2304">Cannot find name 'sintaxe'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="331" column="82" code="2304">Cannot find name 'de'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="331" column="85" code="2304">Cannot find name 'importação'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="331" column="96" code="2304">Cannot find name 'estava'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="331" column="103" code="2304">Cannot find name 'incorreta'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="332" column="7" code="2304">Cannot find name 'Remover'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="332" column="29" code="2304">Cannot find name 'de'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="332" column="51" code="2304">Cannot find name 'A'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="332" column="53" code="2304">Cannot find name 'propriedade'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="332" column="79" code="2304">Cannot find name 'foi'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="332" column="83" code="2304">Cannot find name 'removida'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="332" column="92" code="2304">Cannot find name 'de'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="332" column="111" code="2304">Cannot find name 'em'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="332" column="151" code="2304">Cannot find name 'para'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="332" column="156" code="2304">Cannot find name 'refletir'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="332" column="168" code="2304">Cannot find name 'alterações'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="332" column="179" code="2304">Cannot find name 'no'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="332" column="203" code="2304">Cannot find name 'e'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="334" column="1" code="2304">Cannot find name 'Aqui'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="334" column="6" code="2304">Cannot find name 'estão'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="334" column="15" code="2304">Cannot find name 'alterações'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="336" column="1" code="2339">Property 'dyad-write' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="342" column="8" code="2304">Cannot find name 'key'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="348" column="3" code="2304">Cannot find name '__InternalSupabase'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="349" column="5" code="2304">Cannot find name 'PostgrestVersion'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="352" column="5" code="2693">'Tables' only refers to a type, but is being used as a value here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="353" column="7" code="2304">Cannot find name 'community_comments'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="354" column="9" code="2304">Cannot find name 'Row'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="355" column="11" code="2304">Cannot find name 'content'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="363" column="11" code="2304">Cannot find name 'content'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="371" column="11" code="2304">Cannot find name 'content'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="371" column="21" code="2693">'string' only refers to a type, but is being used as a value here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="380" column="13" code="2304">Cannot find name 'foreignKeyName'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="387" column="13" code="2304">Cannot find name 'foreignKeyName'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="396" column="9" code="2304">Cannot find name 'Row'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="397" column="11" code="2304">Cannot find name 'content'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="409" column="11" code="2304">Cannot find name 'content'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="421" column="11" code="2304">Cannot find name 'content'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="421" column="21" code="2693">'string' only refers to a type, but is being used as a value here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="434" column="13" code="2304">Cannot find name 'foreignKeyName'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="441" column="13" code="2304">Cannot find name 'foreignKeyName'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="448" column="13" code="2304">Cannot find name 'foreignKeyName'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="455" column="13" code="2304">Cannot find name 'foreignKeyName'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="464" column="9" code="2304">Cannot find name 'Row'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="465" column="11" code="2304">Cannot find name 'acesso_expira_em'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="488" column="11" code="2304">Cannot find name 'acesso_expira_em'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="488" column="30" code="2693">'string' only refers to a type, but is being used as a value here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="488" column="39" code="18050">The value 'null' cannot be used here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="511" column="11" code="2304">Cannot find name 'acesso_expira_em'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="511" column="30" code="2693">'string' only refers to a type, but is being used as a value here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="511" column="39" code="18050">The value 'null' cannot be used here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="535" column="13" code="2304">Cannot find name 'foreignKeyName'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="544" column="9" code="2304">Cannot find name 'Row'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="545" column="11" code="2304">Cannot find name 'action_type'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="556" column="11" code="2304">Cannot find name 'action_type'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="567" column="11" code="2304">Cannot find name 'action_type'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="567" column="25" code="2693">'string' only refers to a type, but is being used as a value here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="579" column="13" code="2304">Cannot find name 'foreignKeyName'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="586" column="13" code="2304">Cannot find name 'foreignKeyName'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="595" column="9" code="2304">Cannot find name 'Row'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="596" column="11" code="2304">Cannot find name 'created_at'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="616" column="11" code="2304">Cannot find name 'created_at'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="616" column="24" code="2693">'string' only refers to a type, but is being used as a value here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="636" column="11" code="2304">Cannot find name 'created_at'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="636" column="24" code="2693">'string' only refers to a type, but is being used as a value here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="657" column="13" code="2304">Cannot find name 'foreignKeyName'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="664" column="13" code="2304">Cannot find name 'foreignKeyName'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="671" column="13" code="2304">Cannot find name 'foreignKeyName'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="680" column="9" code="2304">Cannot find name 'Row'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="681" column="11" code="2304">Cannot find name 'created_at'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="694" column="11" code="2304">Cannot find name 'created_at'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="694" column="24" code="2693">'string' only refers to a type, but is being used as a value here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="707" column="11" code="2304">Cannot find name 'created_at'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="707" column="24" code="2693">'string' only refers to a type, but is being used as a value here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="722" column="9" code="2304">Cannot find name 'Row'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="723" column="11" code="2304">Cannot find name 'created_at'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="734" column="11" code="2304">Cannot find name 'created_at'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="734" column="24" code="2693">'string' only refers to a type, but is being used as a value here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="745" column="11" code="2304">Cannot find name 'created_at'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="745" column="24" code="2693">'string' only refers to a type, but is being used as a value here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="756" column="13" code="2304">Cannot find name 'foreignKeyName'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="765" column="9" code="2304">Cannot find name 'Row'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="766" column="11" code="2304">Cannot find name 'content'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="774" column="11" code="2304">Cannot find name 'content'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="782" column="11" code="2304">Cannot find name 'content'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="782" column="21" code="2693">'string' only refers to a type, but is being used as a value here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="791" column="13" code="2304">Cannot find name 'foreignKeyName'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="798" column="13" code="2304">Cannot find name 'foreignKeyName'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="807" column="9" code="2304">Cannot find name 'Row'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="808" column="11" code="2304">Cannot find name 'completed_at'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="816" column="11" code="2304">Cannot find name 'completed_at'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="816" column="26" code="2693">'string' only refers to a type, but is being used as a value here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="824" column="11" code="2304">Cannot find name 'completed_at'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="824" column="26" code="2693">'string' only refers to a type, but is being used as a value here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="833" column="13" code="2304">Cannot find name 'foreignKeyName'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="840" column="13" code="2304">Cannot find name 'foreignKeyName'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="849" column="9" code="2304">Cannot find name 'Row'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="850" column="11" code="2304">Cannot find name 'content_type'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="864" column="11" code="2304">Cannot find name 'content_type'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="864" column="26" code="2693">'string' only refers to a type, but is being used as a value here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="878" column="11" code="2304">Cannot find name 'content_type'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="878" column="26" code="2693">'string' only refers to a type, but is being used as a value here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="893" column="13" code="2304">Cannot find name 'foreignKeyName'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="902" column="9" code="2304">Cannot find name 'Row'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="903" column="11" code="2304">Cannot find name 'assunto'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="914" column="11" code="2304">Cannot find name 'assunto'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="914" column="21" code="2693">'string' only refers to a type, but is being used as a value here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="914" column="30" code="18050">The value 'null' cannot be used here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="925" column="11" code="2304">Cannot find name 'assunto'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="925" column="21" code="2693">'string' only refers to a type, but is being used as a value here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="925" column="30" code="18050">The value 'null' cannot be used here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="937" column="13" code="2304">Cannot find name 'foreignKeyName'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="946" column="9" code="2304">Cannot find name 'Row'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="947" column="11" code="2304">Cannot find name 'access_granted_at'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="957" column="11" code="2304">Cannot find name 'access_granted_at'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="957" column="31" code="2693">'string' only refers to a type, but is being used as a value here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="967" column="11" code="2304">Cannot find name 'access_granted_at'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="967" column="31" code="2693">'string' only refers to a type, but is being used as a value here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="978" column="13" code="2304">Cannot find name 'foreignKeyName'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="985" column="13" code="2304">Cannot find name 'foreignKeyName'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="992" column="13" code="2304">Cannot find name 'foreignKeyName'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1001" column="9" code="2304">Cannot find name 'Row'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1002" column="11" code="2304">Cannot find name 'associated_products'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1014" column="11" code="2304">Cannot find name 'associated_products'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1014" column="33" code="2693">'string' only refers to a type, but is being used as a value here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1014" column="44" code="18050">The value 'null' cannot be used here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1026" column="11" code="2304">Cannot find name 'associated_products'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1026" column="33" code="2693">'string' only refers to a type, but is being used as a value here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1026" column="44" code="18050">The value 'null' cannot be used here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1039" column="13" code="2304">Cannot find name 'foreignKeyName'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1048" column="9" code="2304">Cannot find name 'Row'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1049" column="11" code="2304">Cannot find name 'banner_url'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1063" column="11" code="2304">Cannot find name 'banner_url'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1063" column="24" code="2693">'string' only refers to a type, but is being used as a value here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1063" column="33" code="18050">The value 'null' cannot be used here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1077" column="11" code="2304">Cannot find name 'banner_url'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1077" column="24" code="2693">'string' only refers to a type, but is being used as a value here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1077" column="33" code="18050">The value 'null' cannot be used here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1092" column="13" code="2304">Cannot find name 'foreignKeyName'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1099" column="13" code="2304">Cannot find name 'foreignKeyName'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1106" column="13" code="2304">Cannot find name 'foreignKeyName'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1115" column="9" code="2304">Cannot find name 'Row'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1116" column="11" code="2304">Cannot find name 'amount'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1129" column="11" code="2304">Cannot find name 'amount'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1142" column="11" code="2304">Cannot find name 'amount'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1142" column="20" code="2693">'number' only refers to a type, but is being used as a value here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1156" column="13" code="2304">Cannot find name 'foreignKeyName'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1163" column="13" code="2304">Cannot find name 'foreignKeyName'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1170" column="13" code="2304">Cannot find name 'foreignKeyName'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1177" column="13" code="2304">Cannot find name 'foreignKeyName'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1186" column="9" code="2304">Cannot find name 'Row'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1187" column="11" code="2304">Cannot find name 'amount'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1204" column="11" code="2304">Cannot find name 'amount'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1221" column="11" code="2304">Cannot find name 'amount'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1221" column="20" code="2693">'number' only refers to a type, but is being used as a value here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1239" column="13" code="2304">Cannot find name 'foreignKeyName'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1246" column="13" code="2304">Cannot find name 'foreignKeyName'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1255" column="9" code="2304">Cannot find name 'Row'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1256" column="11" code="2304">Cannot find name 'colors'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1268" column="11" code="2304">Cannot find name 'colors'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1268" column="20" code="2304">Cannot find name 'Json'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1268" column="27" code="18050">The value 'null' cannot be used here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1280" column="11" code="2304">Cannot find name 'colors'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1280" column="20" code="2304">Cannot find name 'Json'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1280" column="27" code="18050">The value 'null' cannot be used here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1293" column="13" code="2304">Cannot find name 'foreignKeyName'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1300" column="13" code="2304">Cannot find name 'foreignKeyName'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1309" column="9" code="2304">Cannot find name 'Row'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1310" column="11" code="2304">Cannot find name 'access_granted_at'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1319" column="11" code="2304">Cannot find name 'access_granted_at'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1319" column="31" code="2693">'string' only refers to a type, but is being used as a value here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1328" column="11" code="2304">Cannot find name 'access_granted_at'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1328" column="31" code="2693">'string' only refers to a type, but is being used as a value here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1338" column="13" code="2304">Cannot find name 'foreignKeyName'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1345" column="13" code="2304">Cannot find name 'foreignKeyName'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1352" column="13" code="2304">Cannot find name 'foreignKeyName'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1361" column="9" code="2304">Cannot find name 'Row'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1362" column="11" code="2304">Cannot find name 'created_at'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1371" column="11" code="2304">Cannot find name 'created_at'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1371" column="24" code="2693">'string' only refers to a type, but is being used as a value here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1371" column="33" code="18050">The value 'null' cannot be used here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1380" column="11" code="2304">Cannot find name 'created_at'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1380" column="24" code="2693">'string' only refers to a type, but is being used as a value here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1380" column="33" code="18050">The value 'null' cannot be used here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1390" column="13" code="2304">Cannot find name 'foreignKeyName'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1397" column="13" code="2304">Cannot find name 'foreignKeyName'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1406" column="9" code="2304">Cannot find name 'Row'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1407" column="11" code="2304">Cannot find name 'access_sent'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1422" column="11" code="2304">Cannot find name 'access_sent'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1422" column="25" code="2693">'boolean' only refers to a type, but is being used as a value here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1422" column="35" code="18050">The value 'null' cannot be used here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1437" column="11" code="2304">Cannot find name 'access_sent'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1437" column="25" code="2693">'boolean' only refers to a type, but is being used as a value here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1437" column="35" code="18050">The value 'null' cannot be used here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1453" column="13" code="2304">Cannot find name 'foreignKeyName'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1460" column="13" code="2304">Cannot find name 'foreignKeyName'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1469" column="9" code="2304">Cannot find name 'Row'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1470" column="11" code="2304">Cannot find name 'access_url'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1489" column="11" code="2304">Cannot find name 'access_url'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1489" column="24" code="2693">'string' only refers to a type, but is being used as a value here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1489" column="33" code="18050">The value 'null' cannot be used here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1508" column="11" code="2304">Cannot find name 'access_url'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1508" column="24" code="2693">'string' only refers to a type, but is being used as a value here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1508" column="33" code="18050">The value 'null' cannot be used here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1528" column="13" code="2304">Cannot find name 'foreignKeyName'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1535" column="13" code="2304">Cannot find name 'foreignKeyName'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1544" column="9" code="2304">Cannot find name 'Row'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1545" column="11" code="2304">Cannot find name 'avatar_url'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1560" column="11" code="2304">Cannot find name 'avatar_url'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1560" column="24" code="2693">'string' only refers to a type, but is being used as a value here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1560" column="33" code="18050">The value 'null' cannot be used here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1575" column="11" code="2304">Cannot find name 'avatar_url'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1575" column="24" code="2693">'string' only refers to a type, but is being used as a value here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1575" column="33" code="18050">The value 'null' cannot be used here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1591" column="13" code="2304">Cannot find name 'foreignKeyName'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1598" column="13" code="2304">Cannot find name 'foreignKeyName'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1607" column="9" code="2304">Cannot find name 'Row'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1608" column="11" code="2304">Cannot find name 'access_url'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1621" column="11" code="2304">Cannot find name 'access_url'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1634" column="11" code="2304">Cannot find name 'access_url'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1634" column="24" code="2693">'string' only refers to a type, but is being used as a value here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1648" column="13" code="2304">Cannot find name 'foreignKeyName'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1657" column="9" code="2304">Cannot find name 'Row'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1658" column="11" code="2304">Cannot find name 'created_at'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1667" column="11" code="2304">Cannot find name 'created_at'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1667" column="24" code="2693">'string' only refers to a type, but is being used as a value here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1667" column="33" code="18050">The value 'null' cannot be used here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1676" column="11" code="2304">Cannot find name 'created_at'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1676" column="24" code="2693">'string' only refers to a type, but is being used as a value here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1676" column="33" code="18050">The value 'null' cannot be used here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1686" column="13" code="2304">Cannot find name 'foreignKeyName'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1693" column="13" code="2304">Cannot find name 'foreignKeyName'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1702" column="9" code="2304">Cannot find name 'Row'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1703" column="11" code="2304">Cannot find name 'acesso_expira_em'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1720" column="11" code="2304">Cannot find name 'acesso_expira_em'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1720" column="30" code="2693">'number' only refers to a type, but is being used as a value here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1720" column="39" code="18050">The value 'null' cannot be used here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1737" column="11" code="2304">Cannot find name 'acesso_expira_em'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1737" column="30" code="2693">'number' only refers to a type, but is being used as a value here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1737" column="39" code="18050">The value 'null' cannot be used here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1756" column="9" code="2304">Cannot find name 'Row'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1757" column="11" code="2304">Cannot find name 'amount'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1775" column="11" code="2304">Cannot find name 'amount'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1793" column="11" code="2304">Cannot find name 'amount'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1793" column="20" code="2693">'number' only refers to a type, but is being used as a value here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1812" column="13" code="2304">Cannot find name 'foreignKeyName'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1819" column="13" code="2304">Cannot find name 'foreignKeyName'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1826" column="13" code="2304">Cannot find name 'foreignKeyName'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1833" column="13" code="2304">Cannot find name 'foreignKeyName'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1843" column="8" code="2304">Cannot find name '_'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1843" column="13" code="2693">'never' only refers to a type, but is being used as a value here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1846" column="7" code="2304">Cannot find name 'get_current_user_role'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1847" column="9" code="2304">Cannot find name 'Args'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1847" column="22" code="2693">'PropertyKey' only refers to a type, but is being used as a value here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1851" column="9" code="2304">Cannot find name 'Args'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1851" column="22" code="2693">'PropertyKey' only refers to a type, but is being used as a value here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1855" column="9" code="2304">Cannot find name 'Args'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1856" column="11" code="2304">Cannot find name 'user_id'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1856" column="21" code="2693">'string' only refers to a type, but is being used as a value here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1861" column="9" code="2304">Cannot find name 'Args'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1862" column="11" code="2304">Cannot find name 'p_member_area_id'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1867" column="9" code="2304">Cannot find name 'Args'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1867" column="22" code="2693">'PropertyKey' only refers to a type, but is being used as a value here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1871" column="9" code="2304">Cannot find name 'Args'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1871" column="22" code="2693">'PropertyKey' only refers to a type, but is being used as a value here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1875" column="9" code="2304">Cannot find name 'Args'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1875" column="22" code="2693">'PropertyKey' only refers to a type, but is being used as a value here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1879" column="9" code="2304">Cannot find name 'Args'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1879" column="22" code="2693">'PropertyKey' only refers to a type, but is being used as a value here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1884" column="8" code="2304">Cannot find name '_'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1884" column="13" code="2693">'never' only refers to a type, but is being used as a value here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1887" column="8" code="2304">Cannot find name '_'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1887" column="13" code="2693">'never' only refers to a type, but is being used as a value here.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1892" column="38" code="2304">Cannot find name 'Database'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1894" column="54" code="2339">Property 'keyof' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1897" column="3" code="2304">Cannot find name 'DefaultSchemaTableNameOrOptions'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1899" column="9" code="2304">Cannot find name 'schema'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1901" column="5" code="2304">Cannot find name 'schema'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1907" column="3" code="2304">Cannot find name 'schema'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1911" column="7" code="2304">Cannot find name 'Row'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1919" column="9" code="2304">Cannot find name 'Row'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1926" column="3" code="2304">Cannot find name 'DefaultSchemaTableNameOrOptions'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1928" column="9" code="2304">Cannot find name 'schema'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1930" column="5" code="2304">Cannot find name 'schema'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1935" column="3" code="2304">Cannot find name 'schema'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1938" column="7" code="2304">Cannot find name 'Insert'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1944" column="9" code="2304">Cannot find name 'Insert'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1951" column="3" code="2304">Cannot find name 'DefaultSchemaTableNameOrOptions'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1953" column="9" code="2304">Cannot find name 'schema'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1955" column="5" code="2304">Cannot find name 'schema'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1960" column="3" code="2304">Cannot find name 'schema'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1963" column="7" code="2304">Cannot find name 'Update'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1969" column="9" code="2304">Cannot find name 'Update'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1976" column="3" code="2304">Cannot find name 'DefaultSchemaEnumNameOrOptions'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1978" column="9" code="2304">Cannot find name 'schema'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1980" column="5" code="2304">Cannot find name 'schema'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1985" column="3" code="2304">Cannot find name 'schema'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1993" column="3" code="2304">Cannot find name 'PublicCompositeTypeNameOrOptions'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1995" column="9" code="2304">Cannot find name 'schema'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="1997" column="5" code="2304">Cannot find name 'schema'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="2002" column="3" code="2304">Cannot find name 'schema'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="2010" column="3" code="2304">Cannot find name 'public'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="2011" column="5" code="2304">Cannot find name 'Enums'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="2016" column="3" code="2304">Cannot find name 'type'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="2024" column="3" code="2304">Cannot find name 'id'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="2035" column="3" code="2304">Cannot find name 'enabled'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="2041" column="3" code="2304">Cannot find name 'enabled'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="2046" column="3" code="2304">Cannot find name 'email'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="2057" column="3" code="2304">Cannot find name 'requireName'.</problem>
<problem file="src/pages/MemberAreaDashboard.tsx" line="2057" column="17" code="2693">'boolean' only refers to a type, but is being used as a value here.</problem>
<problem file="src/pages/MemberAreaModuleDetails.tsx" line="188" column="48" code="2339">Property 'button_background' does not exist on type 'Json'.
  Property 'button_background' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaModuleDetails.tsx" line="189" column="45" code="2339">Property 'text_primary' does not exist on type 'Json'.
  Property 'text_primary' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaModuleDetails.tsx" line="190" column="54" code="2339">Property 'text_secondary' does not exist on type 'Json'.
  Property 'text_secondary' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaModuleDetails.tsx" line="191" column="50" code="2339">Property 'card_login' does not exist on type 'Json'.
  Property 'card_login' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaModuleDetails.tsx" line="202" column="50" code="2339">Property 'background_login' does not exist on type 'Json'.
  Property 'background_login' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaModuleDetails.tsx" line="210" column="52" code="2339">Property 'background_login' does not exist on type 'Json'.
  Property 'background_login' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaModuleDetails.tsx" line="211" column="48" code="2339">Property 'header_border' does not exist on type 'Json'.
  Property 'header_border' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaModuleDetails.tsx" line="212" column="42" code="2339">Property 'text_header' does not exist on type 'Json'.
  Property 'text_header' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaLesson.tsx" line="120" column="7" code="2304">Cannot find name 'setLesson'.</problem>
<problem file="src/pages/MemberAreaLesson.tsx" line="206" column="163" code="2339">Property 'text_cards' does not exist on type 'Json'.
  Property 'text_cards' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaLesson.tsx" line="244" column="8" code="2304">Cannot find name 'lesson'.</problem>
<problem file="src/pages/MemberAreaLesson.tsx" line="263" column="45" code="2339">Property 'text_primary' does not exist on type 'Json'.
  Property 'text_primary' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaLesson.tsx" line="264" column="54" code="2339">Property 'text_secondary' does not exist on type 'Json'.
  Property 'text_secondary' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaLesson.tsx" line="265" column="50" code="2339">Property 'card_login' does not exist on type 'Json'.
  Property 'card_login' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaLesson.tsx" line="276" column="50" code="2339">Property 'background_login' does not exist on type 'Json'.
  Property 'background_login' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaLesson.tsx" line="284" column="52" code="2339">Property 'background_login' does not exist on type 'Json'.
  Property 'background_login' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaLesson.tsx" line="285" column="48" code="2339">Property 'header_border' does not exist on type 'Json'.
  Property 'header_border' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaLesson.tsx" line="286" column="42" code="2339">Property 'text_header' does not exist on type 'Json'.
  Property 'text_header' does not exist on type 'string'.</problem>
<problem file="src/pages/MemberAreaLesson.tsx" line="339" column="16" code="2304">Cannot find name 'lesson'.</problem>
<problem file="src/pages/MemberAreaLesson.tsx" line="341" column="14" code="2304">Cannot find name 'lesson'.</problem>
<problem file="src/pages/MemberAreaLesson.tsx" line="343" column="18" code="2304">Cannot find name 'lesson'.</problem>
<problem file="src/pages/MemberAreaLesson.tsx" line="348" column="34" code="2304">Cannot find name 'lesson'.</problem>
<problem file="src/App.tsx" line="35" column="8" code="1192">Module '&quot;C:/Users/Stevan/dyad-apps/elyon-digital-nexus-69/src/pages/MemberAreaDashboard&quot;' has no default export.</problem>
</dyad-problem-report>Com certeza! Parece que ainda temos muitos erros de compilação, mas a boa notícia é que muitos deles são do mesmo tipo e podem ser resolvidos de forma sistemática.

Vou focar nos seguintes tipos de erros:

1.  **Comentários JSX malformados**: O compilador TypeScript/React tem dificuldade em interpretar comentários JSX (`{/* ... */}`) quando eles estão diretamente após um atributo ou antes de uma tag de fechamento. Vou remover esses comentários para resolver os erros de sintaxe.
2.  **Tipagem incorreta de `PlatformSettings.colors`**: A propriedade `colors` dentro de `PlatformSettings` está sendo tratada como `Json` em alguns lugares, o que é muito genérico. Vou garantir que ela seja tipada corretamente como um objeto de cores.
3.  **Erros de `Cannot find name`**: Isso geralmente ocorre quando uma variável não foi declarada ou importada corretamente, ou quando há um erro de digitação.
4.  **Erros de `Module has no default export`**: Isso significa que um módulo está sendo importado como `default` quando ele não tem uma exportação padrão, ou vice-versa.
5.  **Erros de `Operator '<' cannot be applied to types`**: Isso indica que estou tentando usar um operador de forma inadequada com os tipos de dados.
6.  **Erros de `Property 'problem' does not exist on type 'JSX.IntrinsicElements'`**: Isso é um resquício dos comentários JSX malformados que o sistema de feedback injeta.
7.  **Erros de `Identifier expected` e `Expression expected`**: Geralmente causados por sintaxe inválida ou incompletas.

Vou corrigir todos esses erros de forma concisa, arquivo por arquivo.

<dyad-write path="src/integrations/supabase/types.ts" description="Ensuring correct typing for EmailConfig and removing problematic JSX comments.">
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