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
import { DeliverableConfig, FormFields, PackageConfig, GuaranteeConfig, ReservedRightsConfig, Tables } from '@/integrations/supabase/types'; // Importar DeliverableConfig e os novos tipos
import { Alert, AlertDescription } from '@/components/ui/alert'; // Importação adicionada
import { setNestedValue, deepMerge } from '@/lib/utils'; // Importar setNestedValue e deepMerge
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';


type MemberArea = Tables<'member_areas'>;
type Product = Tables<'products'>; // Import Product type

const AdminCheckouts = () => {
  const {
    user,
    isAdmin,
    loading
  } = useAuth();
  const {
    mercadoPagoAccounts,
    metaPixels,
    emailConfig, // <-- Adicionado
    isConfigured: { email: isEmailIntegrationConfigured } // Obter status da integração de e-mail
  } = useIntegrations();
  const {
    toast
  } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingCheckout, setEditingCheckout] = useState<any>(null);
  const [checkouts, setCheckouts] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]); // Usar Product type
  const [memberAreas, setMemberAreas] = useState<MemberArea[]>([]); // Novo estado para áreas de membros
  const [currentTab, setCurrentTab] = useState('basic');
  
  // State to manage file upload for checkout-level deliverable
  const [checkoutDeliverableFile, setCheckoutDeliverableFile] = useState<File | null>(null);

  // Refatorado initialFormData para ser uma função que retorna um novo objeto
  const getInitialFormData = useCallback(() => {
    const initial: any = { // Use 'any' temporarily for easier merging, will be typed later
      name: '', // Este campo é para o nome do checkout no formulário, não é salvo diretamente na tabela 'checkouts'
      layout: 'horizontal' as string,
      form_fields: { // Corresponde à coluna 'form_fields' na tabela 'checkouts'
        requireName: true,
        requireCpf: true,
        requirePhone: true,
        requireEmail: true,
        requireEmailConfirm: true,
        packages: [{
          id: 1,
          name: 'Pacote Básico', // Default name for the first package
          description: 'Acesso essencial ao produto.',
          topics: ['Acesso vitalício: ao conteúdo principal'],
          price: 97.00, // Default price in Reais
          originalPrice: 0,
          mostSold: false,
          associatedProductIds: [], // Changed to array
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
        deliverable: { // Checkout-level deliverable
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
      payment_methods: { // Corresponde à coluna 'payment_methods'
        pix: true,
        creditCard: true,
        maxInstallments: 12,
        installmentsWithInterest: false
      },
      order_bumps: [{ // Corresponde à coluna 'order_bumps'
        id: 1,
        selectedProduct: '',
        price: 0,
        originalPrice: 0,
        enabled: false
      }],
      styles: { // Corresponde à coluna 'styles'
        backgroundColor: '#ffffff',
        primaryColor: '#3b82f6',
        textColor: '#000000',
        headlineText: 'Sua transformação começa agora!',
        headlineColor: '#000000',
        description: 'Desbloqueie seu potencial com nosso produto exclusivo.', // Default description
        gradientColor: '#60a5fa',
        highlightColor: '#3b82f6'
      },
      integrations: { // Corresponde à coluna 'integrations'
        selectedMercadoPagoAccount: '',
        selectedMetaPixel: '',
        selectedEmailAccount: '',
      },
      support_contact: { // Corresponde à coluna 'support_contact'
        email: ''
      },
      timer: { // Corresponde à coluna 'timer'
        enabled: false,
        duration: 15,
        color: '#dc2626',
        text: 'Oferta por tempo limitado'
      },
      member_area_id: '' as string | null, // Novo campo para member_area_id
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
  } = useAutoSave(getInitialFormData, { // Chamar getInitialFormData aqui
    key: autoSaveKey,
    debounceMs: 800,
    showToast: false // Alterado para false para desativar o toast
  });
  
  const loadOriginalCheckoutData = useCallback((checkout: any) => {
    const initial = getInitialFormData(); // Start with a full initial structure

    // Convert prices from cents to reais
    const priceInReais = checkout.price ? checkout.price / 100 : 0;
    const promotionalPriceInReais = checkout.promotional_price ? checkout.promotional_price / 100 : 0;
    
    // Convert order bumps from cents to reais
    const orderBumpsInReais = Array.isArray(checkout.order_bumps) ? checkout.order_bumps.map((bump: any) => ({
      ...bump,
      price: bump.price ? bump.price / 100 : 0,
      originalPrice: bump.originalPrice ? bump.originalPrice / 100 : 0,
      selectedProduct: bump.selectedProduct || ''
    })) : initial.order_bumps; // Usar initial.order_bumps como fallback
    
    const packagesFromDb = (checkout.form_fields as FormFields)?.packages;
    const packagesConfig: PackageConfig[] = Array.isArray(packagesFromDb) ? packagesFromDb.map((pkg: any) => ({ // Cast pkg to any
      id: pkg.id || Date.now(), // Ensure ID exists
      name: pkg.name || '',
      description: pkg.description || '',
      topics: Array.isArray(pkg.topics) ? pkg.topics.filter((t: any) => typeof t === 'string') : [''],
      price: pkg.price ? pkg.price / 100 : priceInReais,
      originalPrice: pkg.originalPrice ? pkg.originalPrice / 100 : promotionalPriceInReais,
      mostSold: pkg.mostSold ?? false,
      associatedProductIds: Array.isArray(pkg.associatedProductIds) ? pkg.associatedProductIds : (pkg.associatedProductId ? [pkg.associatedProductId] : []), // Load new field, handle old single ID
    })) : initial.form_fields.packages; // Usar initial.form_fields.packages como fallback

    // Definir o arquivo selecionado localmente se houver um fileUrl existente
    if (checkout.form_fields?.deliverable?.fileUrl && checkout.form_fields?.deliverable?.type === 'upload') {
      setCheckoutDeliverableFile(null); // Clear local file state for checkout-level deliverable
    }

    return deepMerge(initial, { // Usar deepMerge para garantir que todos os campos padrão estejam presentes
      name: checkout.name || checkout.products?.name || '', // Carregar o novo campo 'name'
      layout: 'horizontal', // Layout fixo como 'horizontal'
      form_fields: { // Mapear para a nova estrutura aninhada
        requireName: checkout.form_fields?.requireName ?? true,
        requireCpf: checkout.form_fields?.requireCpf ?? true,
        requirePhone: checkout.form_fields?.requirePhone ?? true,
        requireEmail: checkout.form_fields?.requireEmail ?? true,
        requireEmailConfirm: checkout.form_fields?.requireEmailConfirm ?? true,
        packages: packagesConfig, // Usar os pacotes processados
        guarantee: (checkout.form_fields?.guarantee as GuaranteeConfig) || initial.form_fields.guarantee,
        reservedRights: (checkout.form_fields?.reservedRights as ReservedRightsConfig) || initial.form_fields.reservedRights,
        deliverable: { // Checkout-level deliverable
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
        description: checkout.styles?.description || checkout.products?.description || initial.styles.description, // Prioritize checkout description, then product, then default
        headlineText: checkout.styles?.headlineText || checkout.products?.name || initial.styles.headlineText, // Prioritize checkout headline, then product name, then default
      },
      timer: checkout.timer || initial.timer,
      member_area_id: checkout.member_area_id || null, // Carregar member_area_id
    });
  }, [getInitialFormData, products]); // Adicionado products como dependência

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
        if (!forceLoad()) { // Tenta carregar o rascunho
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
        // Se a chave já é 'checkout-new', e não há rascunho, useAutoSave já terá carregado initialDataFn().
        // Se houver rascunho, ele já terá carregado o rascunho.
        if (!hasSavedData) { // Verifica se já existe um rascunho para 'checkout-new'
          console.log(`[AdminCheckouts] No draft found for 'checkout-new', initializing with fresh data.`);
          loadData(getInitialFormData()); // Garante que o formulário comece limpo
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
            return undefined; // Exclui objetos File da serialização
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
      fetchMemberAreas(); // Buscar áreas de membros
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
      setProducts(data || []);
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
      setMemberAreas(data || []);
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
      .from('products') // Using 'products' bucket, but a specific folder
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
      loadData(originalData); // Usar loadData para sobrescrever o estado
      clearSavedData(); // Limpar o rascunho do localStorage
      setCheckoutDeliverableFile(null); // Limpar checkout-level file
      
      toast({
        title: "Dados recarregados",
        description: "Dados originais do checkout foram recarregados"
      });
    } else {
      loadData(getInitialFormData()); // Para novo checkout, resetar para initialFormData
      clearSavedData();
      setCheckoutDeliverableFile(null); // Limpar checkout-level file
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
    setAutoSaveKey(newKey); // useAutoSave irá carregar o rascunho para esta chave (se existir)
    
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
      handleInputChange('form_fields.deliverable.link', null); // Clear existing link if new file is selected
      handleInputChange('form_fields.deliverable.fileUrl', null); // Clear existing fileUrl if new file is selected
    }
  };

  const addPackage = () => {
    const newPackages = [...checkoutData.form_fields.packages, {
      id: Date.now(),
      name: 'Novo Pacote', // Default name for new package
      description: '',
      topics: [''],
      price: 0,
      originalPrice: 0,
      mostSold: false,
      associatedProductIds: [], // Changed to array
    }] as PackageConfig[]; // Tipado explicitamente
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

  const addTopicToPackage = (packageId: number) => {
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
      const discountedPriceInReais = priceInReais * 0.5; // 50% discount
      
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
        finalCheckoutDeliverable.fileUrl = finalCheckoutDeliverable.link; // Use link as fileUrl for consistency
      } else {
        finalCheckoutDeliverable.fileUrl = null;
        finalCheckoutDeliverable.link = null;
      }

      const checkoutPayload = {
        user_id: user?.id, // Adicionar user_id
        member_area_id: checkoutData.member_area_id || null, // Adicionar member_area_id
        name: checkoutData.name, // Salvar o novo campo 'name'
        // product_id agora é derivado do primeiro pacote
        product_id: checkoutData.form_fields.packages[0]?.associatedProductIds?.[0] || null, // Use the first associated product ID of the first package as the main product_id
        price: Math.round(checkoutData.form_fields.packages[0]?.price * 100) || 0, // Aplicar Math.round
        promotional_price: checkoutData.form_fields.packages[0]?.originalPrice ? Math.round(checkoutData.form_fields.packages[0].originalPrice * 100) : null, // Aplicar Math.round
        form_fields: {
          ...checkoutData.form_fields, // Usar o objeto form_fields já estruturado
          packages: checkoutData.form_fields.packages.map(pkg => ({ // Converter preços de pacotes para centavos
            ...pkg,
            price: Math.round(pkg.price * 100), // Aplicar Math.round
            originalPrice: Math.round((pkg.originalPrice || 0) * 100) // Aplicar Math.round
          })),
          deliverable: finalCheckoutDeliverable // Save processed checkout-level deliverable
        },
        payment_methods: checkoutData.payment_methods, // Usar o objeto payment_methods já estruturado
        order_bumps: checkoutData.order_bumps.map(bump => ({
          ...bump,
          price: Math.round(bump.price * 100), // Converter para centavos e aplicar Math.round
          originalPrice: Math.round((bump.originalPrice || 0) * 100) // Converter para centavos e aplicar Math.round
        })),
        styles: checkoutData.styles, // Usar o objeto styles já estruturado
        layout: 'horizontal', // Layout fixo como 'horizontal'
        support_contact: checkoutData.support_contact, // Usar o objeto support_contact já estruturado
        integrations: checkoutData.integrations, // Usar o objeto integrations já estruturado
        timer: checkoutData.timer || null // Usar o objeto timer já estruturado
      };

      console.log('ADMIN_CHECKOUTS_DEBUG: Final checkoutPayload before DB operation:', JSON.stringify(checkoutPayload, null, 2)); // Log detalhado

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
      setCheckoutDeliverableFile(null); // Limpar checkout-level file after save
      fetchCheckouts();
    } catch (error: any) { // Improved error logging
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
            // Quando o diálogo é fechado, o useAutoSave já terá salvo o rascunho.
            // Se for um novo checkout, o autoSaveKey será 'checkout-new'.
            // Se for um checkout existente, o autoSaveKey será 'checkout-edit-ID'.
            // Não precisamos fazer nada aqui, pois o useAutoSave gerencia o estado.
          }
        }}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2" onClick={() => {
               setEditingCheckout(null);
              setAutoSaveKey('checkout-new'); // Isso fará com que useAutoSave carregue o rascunho 'checkout-new' ou initialFormData
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
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Pacotes</h3>
                    <Button type="button" onClick={addPackage} size="sm">
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
                        <div className="flex items-center justify-between">
                          <Label>Tópicos do que será entregue</Label>
                          <Button type="button" size="sm" variant="outline" onClick={() => addTopicToPackage(pkg.id)}>
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
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Order Bumps</h3>
                    <Button type="button" onClick={addOrderBump} size="sm">
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
                      
                      {!checkoutData.payment_methods.pix && !checkoutData.payment_methods.creditCard && <div className="p-3 bg-yellow-50 border-yellow-200 rounded-lg">
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
                              handleInputChange('integrations.selectedEmailAccount', ''); // Desselecionar
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma conta de email configurada" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Nenhuma</SelectItem> {/* Alterado para "none" */}
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

                      {(mercadoPagoAccounts.length === 0 || metaPixels.length === 0 || !emailConfig) && ( // <-- Condição atualizada
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
                    
                    {/* Removido o seletor de layout */}
                    {/* <div className="space-y-2">
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
                    </div> */}

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
                      Entregável do Checkout (Padrão)
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Configure um arquivo ou link que será disponibilizado na página de sucesso do pagamento.
                      Este é o entregável padrão, que pode ser sobrescrito por um entregável específico de um pacote.
                    </p>

                    <div className="space-y-4">
                      <Label>Tipo de Entregável</Label>
                      <Select 
                        value={checkoutData.form_fields.deliverable.type} 
                        onValueChange={value => handleInputChange('form_fields.deliverable.type', value)}
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

                    {checkoutData.form_fields.deliverable.type !== 'none' && ( // Mostrar nome/descrição se não for 'none'
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="deliverableName">Nome do Entregável</Label>
                          <Input 
                            id="deliverableName" 
                            value={checkoutData.form_fields.deliverable.name || ''} 
                            onChange={e => handleInputChange('form_fields.deliverable.name', e.target.value)} 
                            placeholder="Ex: E-book Exclusivo" 
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="deliverableDescription">Descrição do Entregável</Label>
                          <Textarea 
                            id="deliverableDescription" 
                            value={checkoutData.form_fields.deliverable.description || ''} 
                            onChange={e => handleInputChange('form_fields.deliverable.description', e.target.value)} 
                            placeholder="Uma breve descrição do que o cliente receberá." 
                            rows={3}
                          />
                        </div>
                      </>
                    )}

                    {checkoutData.form_fields.deliverable.type === 'link' && (
                      <div className="space-y-2">
                        <Label htmlFor="deliverableLink">Link do Entregável *</Label>
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

                    {checkoutData.form_fields.deliverable.type === 'upload' && (
                      <div className="space-y-2">
                        <Label htmlFor="deliverableFile">Arquivo Entregável *</Label>
                        <Input 
                          id="deliverableFile" 
                          type="file" 
                          onChange={e => handleCheckoutDeliverableFileChange(e.target.files?.[0] || null)} 
                          required={!checkoutData.form_fields.deliverable.fileUrl && !checkoutDeliverableFile}
                        />
                        {checkoutData.form_fields.deliverable.fileUrl && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <Link className="h-4 w-4" />
                            <span>Arquivo atual: <a href={checkoutData.form_fields.deliverable.fileUrl} target="_blank" rel="noopener noreferrer" className="underline">Ver</a></span>
                            <Button 
                               type="button" 
                               variant="ghost" 
                               size="sm" 
                               onClick={() => handleInputChange('form_fields.deliverable.fileUrl', null)}
                               className="h-6 px-2 text-destructive hover:text-destructive"
                             >
                               <XCircle className="h-3 w-3 mr-1" /> Remover
                             </Button>
                           </div>
                         )}
                         {checkoutDeliverableFile && (
                           <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                             <Upload className="h-4 w-4" />
                             <span>Novo arquivo selecionado: {checkoutDeliverableFile.name}</span>
                             <Button 
                               type="button" 
                               variant="ghost" 
                               size="sm" 
                               onClick={() => handleCheckoutDeliverableFileChange(null)}
                               className="h-6 px-2 text-destructive hover:text-destructive"
                             >
                               <XCircle className="h-3 w-3 mr-1" /> Remover
                             </Button>
                           </div>
                         )}
                       </div>
                     )}

                    <Separator />

                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Mail className="h-5 w-5" />
                        E-mail Transacional
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Envie e-mails automáticos de confirmação de compra e acesso ao produto.
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Ativar envio de e-mail</Label>
                          <p className="text-sm text-muted-foreground">
                            {isEmailIntegrationConfigured && checkoutData.integrations?.selectedEmailAccount === 'default-email-config'
                              ? "Um e-mail será enviado ao cliente com os detalhes da compra."
                              : "Selecione uma conta de e-mail na aba 'Integrações' para ativar esta opção."
                            }
                          </p>
                        </div>
                        <Switch 
                          checked={checkoutData.form_fields.sendTransactionalEmail && isEmailIntegrationConfigured && checkoutData.integrations?.selectedEmailAccount === 'default-email-config'} 
                          onCheckedChange={checked => handleInputChange('form_fields.sendTransactionalEmail', checked)} 
                          disabled={!isEmailIntegrationConfigured || checkoutData.integrations?.selectedEmailAccount !== 'default-email-config'}
                        />
                      </div>
                      {!isEmailIntegrationConfigured && (
                        <Alert className="bg-yellow-50 border-yellow-200 text-yellow-800">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            A integração de e-mail SMTP não está configurada. Por favor, configure-a na página de Integrações para habilitar esta opção.
                          </AlertDescription>
                        </Alert>
                      )}
                      {isEmailIntegrationConfigured && checkoutData.integrations?.selectedEmailAccount !== 'default-email-config' && (
                        <Alert className="bg-yellow-50 border-yellow-200 text-yellow-800">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            Nenhuma conta de e-mail transacional selecionada para este checkout. Selecione uma na aba "Integrações" para habilitar o envio de e-mails.
                          </AlertDescription>
                        </Alert>
                      )}

                      {checkoutData.form_fields.sendTransactionalEmail && isEmailIntegrationConfigured && checkoutData.integrations?.selectedEmailAccount === 'default-email-config' && (
                        <div className="space-y-4 pl-6 border-l-2 border-gray-200">
                          <div className="space-y-2">
                            <Label htmlFor="emailSubject">Assunto do E-mail</Label>
                            <Input 
                              id="emailSubject" 
                              value={checkoutData.form_fields.transactionalEmailSubject || ''} 
                              onChange={e => handleInputChange('form_fields.transactionalEmailSubject', e.target.value)} 
                              placeholder="Seu acesso ao produto Elyon Digital!" 
                            />
                            <p className="text-xs text-muted-foreground">
                              Use <code className="bg-muted px-1 py-0.5 rounded text-xs">{'{{product_name}}'}</code> para o nome do produto.
                            </p>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="emailBody">Corpo do E-mail</Label>
                            <Textarea 
                              id="emailBody" 
                              value={checkoutData.form_fields.transactionalEmailBody || ''} 
                              onChange={e => handleInputChange('form_fields.transactionalEmailBody', e.target.value)} 
                              placeholder="Olá {customer_name},..." 
                              rows={8}
                            />
                            <p className="text-xs text-muted-foreground">
                              Use <code className="bg-muted px-1 py-0.5 rounded text-xs">{'{{customer_name}}'}</code>, <code className="bg-muted px-1 py-0.5 rounded text-xs">{'{{product_name}}'}</code> e <code className="bg-muted px-1 py-0.5 rounded text-xs">{'{{access_link}}'}</code>.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
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
              <p className="text-muted-foreground mb-4">
                Crie sua primeira página de vendas personalizada com Mercado Pago
              </p>
            </div> : <div className="space-y-3 sm:space-y-4">
              {checkouts.map(checkout => <div key={checkout.id} className="border rounded-lg p-3 sm:p-4 hover:bg-accent/50 transition-colors">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold cursor-pointer hover:text-primary transition-colors text-sm sm:text-base line-clamp-2" 
                         onClick={() => window.open(`/checkout/${checkout.id}`, '_blank')}>
                        {checkout.name || checkout.products?.name || 'Produto não encontrado'} {/* Exibir o novo campo 'name' */}
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
                        {checkout.integrations?.selectedEmailAccount && ( // <-- Adicionado
                          <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-800">
                            Email Ativo
                          </Badge>
                        )}
                        {checkout.member_area_id && checkout.member_areas?.name && (
                           <Badge variant="secondary" className="text-xs bg-indigo-100 text-indigo-800">
                             Área: {checkout.member_areas.name}
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