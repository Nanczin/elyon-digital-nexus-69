import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCheckoutIntegrations } from '@/hooks/useCheckoutIntegrations';
import { CheckoutData, CustomerData, OrderBump, PaymentMethods } from '@/components/checkout/CheckoutLayoutProps';
import { CardData } from '@/components/checkout/CreditCardForm';
import HorizontalLayout from '@/components/checkout/HorizontalLayout';
import MosaicLayout from '@/components/checkout/MosaicLayout';
import { createCardToken } from '@mercadopago/sdk-react';
import { toCents } from '@/utils/textFormatting';
import { DeliverableConfig, FormFields, PackageConfig } from '@/integrations/supabase/types'; // Importar DeliverableConfig e FormFields

const Checkout = () => {
  const { checkoutId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [checkout, setCheckout] = useState<CheckoutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [customerData, setCustomerData] = useState<CustomerData>({
    name: '',
    email: '',
    emailConfirm: '',
    phone: '',
    cpf: ''
  });
  const [selectedOrderBumps, setSelectedOrderBumps] = useState<number[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [selectedPackage, setSelectedPackage] = useState<number>(1);
  const [cardData, setCardData] = useState<CardData | null>(null);
  const [mpPublicKey, setMpPublicKey] = useState<string | null>(null);
  const [selectedInstallments, setSelectedInstallments] = useState<number>(1);

  const {
    selectedMPAccount,
    selectedPixel,
    trackPurchaseEvent,
    trackAddToCartEvent,
    trackInitiateCheckoutEvent,
    hasIntegrations
  } = useCheckoutIntegrations(checkout?.integrations || {});

  useEffect(() => {
    if (checkoutId) {
      if (checkoutId === 'preview') {
        loadPreviewCheckout();
      } else {
        fetchCheckout();
      }
    }
  }, [checkoutId]);

  const loadPreviewCheckout = async () => {
    setLoading(true);
    const previewDataString = localStorage.getItem('checkout-preview-draft');
    if (previewDataString) {
      try {
        const previewData = JSON.parse(previewDataString);
        console.log('CHECKOUT_FRONTEND_DEBUG: Loaded preview data from localStorage:', JSON.stringify(previewData, null, 2));

        // The previewData already has prices in Reais from AdminCheckouts form state.
        // `AdminCheckouts` `handlePreview` function already prepares `previewData.products` and `previewData.order_bumps[i].product`.
        
        setCheckout(previewData);

        // Set initial payment method
        if (previewData.payment_methods?.pix) {
          setSelectedPaymentMethod('pix');
        } else if (previewData.payment_methods?.creditCard) {
          setSelectedPaymentMethod('creditCard');
        }
        setSelectedInstallments(previewData.payment_methods?.maxInstallments || 1);

        // Fetch MP Public Key from the selected account in the draft
        const selectedMpAccountId = previewData.integrations?.selectedMercadoPagoAccount;
        if (selectedMpAccountId) {
          const { data: mpConfig, error: mpConfigError } = await supabase
            .from('integrations')
            .select('mercado_pago_token_public')
            .eq('user_id', previewData.user_id) // Use the user_id from the checkout draft
            .maybeSingle();
          if (mpConfigError) console.error('Error fetching MP public key for preview:', mpConfigError);
          setMpPublicKey(mpConfig?.mercado_pago_token_public || null);
        }

      } catch (e) {
        console.error('Error parsing preview data from localStorage:', e);
        toast({ title: "Erro", description: "Não foi possível carregar o preview do checkout.", variant: "destructive" });
        navigate('/');
      }
    } else {
      toast({ title: "Erro", description: "Nenhum dado de preview encontrado.", variant: "destructive" });
      navigate('/');
    }
    setLoading(false);
  };

  const fetchCheckout = async () => {
    try {
      const { data, error } = await supabase
        .from('checkouts')
        .select(`
          *,
          products (id, name, description, banner_url, logo_url, member_area_link, file_url)
        `)
        .eq('id', checkoutId)
        .single();

      if (error) throw error;
      
      console.log('CHECKOUT_FRONTEND_DEBUG: Checkout data fetched from DB:', JSON.stringify(data, null, 2));
      console.log('CHECKOUT_FRONTEND_DEBUG: Checkout user_id from DB:', data.user_id);

      let orderBumpsWithProducts = [];
      if (data.order_bumps && Array.isArray(data.order_bumps)) {
        const orderBumps = data.order_bumps as unknown as OrderBump[];
        const productIds = orderBumps
          .filter(bump => bump.enabled && bump.selectedProduct) // Only enabled bumps with selected product
          .map(bump => bump.selectedProduct);
        
        if (productIds.length > 0) {
          const { data: productsData } = await supabase
            .from('products')
            .select('id, name, description, banner_url, logo_url')
            .in('id', productIds);
          
          orderBumpsWithProducts = orderBumps.map(bump => ({
            ...bump,
            price: bump.price / 100, // Convert to Reais
            originalPrice: bump.originalPrice ? bump.originalPrice / 100 : 0, // Convert to Reais
            product: productsData?.find(p => p.id === bump.selectedProduct) || null
          }));
        } else {
          // If no products to fetch, still convert prices
          orderBumpsWithProducts = orderBumps.map(bump => ({
            ...bump,
            price: bump.price / 100, // Convert to Reais
            originalPrice: bump.originalPrice ? bump.originalPrice / 100 : 0, // Convert to Reais
          }));
        }
      }

      try {
        const { data: mpRow } = await supabase
          .from('integrations')
          .select('mercado_pago_token_public')
          .eq('user_id', data.user_id)
          .maybeSingle();
        setMpPublicKey(mpRow?.mercado_pago_token_public || null);
      } catch (e) {
        console.warn('Não foi possível carregar a chave pública do Mercado Pago:', e);
      }

      // Mapear form_fields para a estrutura esperada, convertendo preços de pacotes
      const formFieldsData = (data.form_fields || {}) as FormFields;
      const packagesConfig: PackageConfig[] = Array.isArray(formFieldsData.packages) 
        ? await Promise.all(formFieldsData.packages.map(async pkg => {
            // No longer fetching individual associated product details here, as package name/description are explicit
            return {
              ...pkg,
              price: pkg.price / 100, // Convert package price to reais
              originalPrice: pkg.originalPrice ? pkg.originalPrice / 100 : 0, // Convert original price to reais
              // product: associatedProductDetails, // Removed: package name/description are explicit
            };
          }))
        : [];

      const transformedData: CheckoutData = {
        id: data.id,
        product_id: data.product_id,
        price: data.price / 100, // Convert main product price to Reais
        promotional_price: data.promotional_price ? data.promotional_price / 100 : null, // Convert promotional price to Reais
        layout: data.layout || 'horizontal',
        form_fields: {
          ...formFieldsData,
          packages: packagesConfig, // Usar os pacotes processados
        },
        payment_methods: data.payment_methods as PaymentMethods || {},
        order_bumps: orderBumpsWithProducts,
        styles: data.styles as CheckoutData['styles'] || {},
        extra_content: data.extra_content || {},
        support_contact: data.support_contact || {},
        integrations: data.integrations || {},
        timer: data.timer as CheckoutData['timer'] || undefined,
        products: data.products as CheckoutData['products'], // Cast explícito aqui
        user_id: data.user_id // Certifique-se de que user_id está sendo passado
      };
      
      console.log('Checkout Debug: Timer carregado do banco:', data.timer);
      console.log('Checkout Debug: Timer no objeto transformado:', transformedData.timer);
      
      setCheckout(transformedData);

      if (transformedData.payment_methods?.pix) {
        setSelectedPaymentMethod('pix');
      } else if (transformedData.payment_methods?.creditCard) {
        setSelectedPaymentMethod('creditCard');
      }
      
      setSelectedInstallments(transformedData.payment_methods?.maxInstallments || 1);

    } catch (error) {
      console.error('Checkout Debug: Erro ao carregar checkout:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar a página de checkout",
        variant: "destructive"
      });
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (checkout && hasIntegrations) {
      const total = calculateTotal();
      trackInitiateCheckoutEvent({
        product_id: checkout.product_id,
        total: toCents(total),
        checkout_id: checkout.id
      });
    }
  }, [checkout, hasIntegrations]);

  const calculateTotal = () => {
    if (!checkout) return 0;
    
    let basePrice = 0;
    const packages = checkout.form_fields?.packages; // Agora acessado via form_fields

    if (packages && packages.length > 0) {
      const selectedPkg = packages.find((pkg: any) => pkg.id === selectedPackage);
      basePrice = selectedPkg ? (parseFloat(String(selectedPkg.price)) || 0) : 0;
      console.log('Checkout Debug: Package selected:', selectedPkg);
      console.log('Checkout Debug: Base price from package (in Reais):', basePrice);
    } else {
      // Use checkout.promotional_price or checkout.price directly, as they are already in Reais
      basePrice = (parseFloat(String(checkout.promotional_price)) || parseFloat(String(checkout.price)) || 0);
      console.log('Checkout Debug: Base price from main checkout (in Reais):', basePrice);
    }

    let totalInReais = basePrice;

    selectedOrderBumps.forEach(bumpId => {
      const bump = checkout.order_bumps.find(b => b.id === bumpId);
      if (bump && bump.enabled) {
        totalInReais += (parseFloat(String(bump.price)) || 0); 
      }
    });
    
    const finalTotal = parseFloat(totalInReais.toFixed(2));
    console.log('Checkout Debug: Final calculated total (in Reais, fixed 2 decimals):', finalTotal);
    return Math.max(0.01, finalTotal);
  };

  const handleInputChange = (field: keyof CustomerData, value: string) => {
    setCustomerData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleOrderBumpToggle = (bumpId: number) => {
    const isAdding = !selectedOrderBumps.includes(bumpId);
    
    setSelectedOrderBumps(prev => 
      prev.includes(bumpId) 
        ? prev.filter(id => id !== bumpId)
        : [...prev, bumpId]
    );

    if (isAdding && hasIntegrations) {
      const bump = checkout?.order_bumps.find(b => b.id === bumpId);
      if (bump) {
        trackAddToCartEvent({
          product_id: bump.selectedProduct || 'order-bump-' + bumpId,
          price: toCents((parseFloat(String(bump.price)) || 0)) 
        });
      }
    }
  };

  const validateForm = () => {
    const fields = checkout?.form_fields || {}; // Agora acessado via form_fields
    
    if (fields.requireName && !customerData.name.trim()) {
      toast({ title: "Erro", description: "Nome é obrigatório", variant: "destructive" });
      return false;
    }
    
    if (fields.requireEmail && !customerData.email.trim()) {
      toast({ title: "Erro", description: "E-mail é obrigatório", variant: "destructive" });
      return false;
    }
    
    if (fields.requireEmailConfirm && customerData.email !== customerData.emailConfirm) {
      toast({ title: "Erro", description: "E-mails não conferem", variant: "destructive" });
      return false;
    }
    
    if (fields.requirePhone && !customerData.phone.trim()) {
      toast({ title: "Erro", description: "Telefone é obrigatório", variant: "destructive" });
      return false;
    }
    
    if (fields.requireCpf && !customerData.cpf.trim()) {
      toast({ title: "Erro", description: "CPF é obrigatório", variant: "destructive" });
      return false;
    }
    
    if (selectedPaymentMethod === 'creditCard' && !customerData.cpf.trim()) {
      toast({ title: "Erro", description: "Informe o CPF para pagamento com cartão de crédito", variant: "destructive" });
      return false;
    }
    
    if (!selectedPaymentMethod) {
      toast({ title: "Erro", description: "Selecione uma forma de pagamento", variant: "destructive" });
      return false;
    }

    if (selectedPaymentMethod === 'creditCard') {
      if (!cardData) {
        toast({ title: "Erro", description: "Preencha os dados do cartão", variant: "destructive" });
        return false;
      }

      if (mpPublicKey) {
        if (!cardData.cardholderName.trim()) {
          toast({ title: "Erro", description: "Nome no cartão é obrigação", variant: "destructive" });
          return false;
        }
      } else {
        if (!cardData.cardNumber || cardData.cardNumber.replace(/\s/g, '').length < 13) {
          toast({ title: "Erro", description: "Número do cartão inválido", variant: "destructive" });
          return false;
        }
        if (!cardData.cardholderName.trim()) {
          toast({ title: "Erro", description: "Nome no cartão é obrigatório", variant: "destructive" });
          return false;
        }
        if (!cardData.expirationMonth || !cardData.expirationYear) {
          toast({ title: "Erro", description: "Data de validade é obrigatória", variant: "destructive" });
          return false;
        }
        if (!cardData.securityCode || cardData.securityCode.length < 3) {
          toast({ title: "Erro", description: "CVV inválido", variant: "destructive" });
          return false;
        }
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setProcessing(true);
    
    try {
      const totalAmount = toCents(calculateTotal());
      console.log('CHECKOUT_FRONTEND_DEBUG: Calculated total (Reais):', calculateTotal(), typeof calculateTotal());
      console.log('CHECKOUT_FRONTEND_DEBUG: Total amount (cents) sent to Edge Function:', totalAmount, typeof totalAmount);

      if (totalAmount <= 0) {
        toast({ title: "Erro", description: "O valor total do pagamento deve ser maior que zero.", variant: "destructive" });
        setProcessing(false);
        return;
      }
      
      // Determine the selected package and its associated product/deliverable
      const selectedPackageDetails = checkout?.form_fields?.packages?.find(pkg => pkg.id === selectedPackage);
      // const packageDeliverable = selectedPackageDetails?.deliverable; // REMOVIDO

      // Gather all purchased product IDs (from selected package and all enabled order bumps)
      const purchasedProductIds: string[] = [];
      if (selectedPackageDetails?.associatedProductIds) {
        purchasedProductIds.push(...selectedPackageDetails.associatedProductIds);
      }
      checkout?.order_bumps.forEach(bump => {
        if (bump.enabled && bump.selectedProduct) {
          purchasedProductIds.push(bump.selectedProduct);
        }
      });
      console.log('CHECKOUT_FRONTEND_DEBUG: All purchased product IDs:', purchasedProductIds);


      // Determine the final deliverable link based on priority: package > checkout-level > main product
      let finalDeliverableLink: string | null = null;
      // if (packageDeliverable?.type !== 'none' && (packageDeliverable?.link || packageDeliverable?.fileUrl)) { // REMOVIDO
      //   finalDeliverableLink = packageDeliverable.link || packageDeliverable.fileUrl || null;
      // } else 
      if (checkout?.form_fields?.deliverable?.type !== 'none' && (checkout?.form_fields?.deliverable?.link || checkout?.form_fields?.deliverable?.fileUrl)) {
        finalDeliverableLink = checkout.form_fields.deliverable.link || checkout.form_fields.deliverable.fileUrl || null;
      } else if (checkout?.products?.member_area_link || checkout?.products?.file_url) {
        finalDeliverableLink = checkout.products.member_area_link || checkout.products.file_url || null;
      }

      console.log('CHECKOUT_FRONTEND_DEBUG: Final deliverable link to save in localStorage:', finalDeliverableLink); // ADDED LOG

      const paymentData: any = {
        checkoutId: checkoutId || '',
        amount: totalAmount,
        customerData: {
          name: customerData.name,
          email: customerData.email,
          phone: customerData.phone,
          cpf: customerData.cpf
        },
        selectedMercadoPagoAccount: checkout?.integrations?.selectedMercadoPagoAccount,
        orderBumps: selectedOrderBumps,
        selectedPackage: selectedPackage,
        paymentMethod: selectedPaymentMethod,
        // finalProductId: mainPurchasedProductId, // Removed: now using purchasedProductIds array
        purchasedProductIds: purchasedProductIds, // Pass all purchased product IDs
        // Adicionar dados de e-mail transacional e entregável ao metadata
        emailMetadata: {
          sendTransactionalEmail: checkout?.form_fields?.sendTransactionalEmail ?? true, // Acessado via form_fields
          transactionalEmailSubject: checkout?.form_fields?.transactionalEmailSubject, // Acessado via form_fields
          transactionalEmailBody: checkout?.form_fields?.transactionalEmailBody, // Acessado via form_fields
          deliverableLink: finalDeliverableLink || null, // Garantir que seja string ou null
          productName: selectedPackageDetails?.name || checkout?.products?.name, // Use package name if available
          productDescription: selectedPackageDetails?.description || checkout?.products?.description, // Use package description if available
          sellerUserId: checkout?.user_id || null, // Passar o user_id do checkout (vendedor), garantindo que seja null se não existir
          supportEmail: checkout?.support_contact?.email,
        }
      };

      console.log('CHECKOUT_FRONTEND_DEBUG: Full paymentData sent to Edge Function:', JSON.stringify(paymentData, null, 2));

      const { data: mpResponse, error: mpError } = await supabase.functions.invoke(
        'create-mercado-pago-payment',
        { body: paymentData }
      );

      if (mpError) {
        console.error('Checkout Debug: Erro na edge function:', mpError);
        throw new Error(mpError.message || 'Erro ao processar pagamento');
      }

      if (!mpResponse?.success) {
        console.error('Checkout Debug: Resposta de erro do MP:', mpResponse);
        throw new Error(mpResponse?.error || 'Erro ao criar pagamento no Mercado Pago');
      }

      console.log('Checkout Debug: Pagamento criado com sucesso:', mpResponse);

      const paymentStatus = mpResponse.payment?.status;
      const statusDetail = mpResponse.payment?.status_detail;

      console.log('CHECKOUT_FRONTEND_DEBUG: MP Payment Status:', paymentStatus);
      console.log('CHECKOUT_FRONTEND_DEBUG: MP Status Detail:', statusDetail);

      if (hasIntegrations) {
        trackPurchaseEvent({
          amount: totalAmount,
          product_id: purchasedProductIds[0] || checkout?.product_id, // Use the first purchased product ID for tracking
          checkout_id: checkoutId,
          payment_method: selectedPaymentMethod,
          customer_data: customerData
        });
      }

      // Armazenar dados relevantes no localStorage para a página de sucesso
      localStorage.setItem('paymentData', JSON.stringify({
        payment: mpResponse.payment,
        customerData,
        total: calculateTotal(),
        paymentMethod: selectedPaymentMethod,
        checkoutStyles: {
          primaryColor,
          highlightColor,
          backgroundColor,
          textColor,
          headlineColor,
          gradientColor
        },
        deliverableLink: finalDeliverableLink || null, // Armazenar o link final aqui
        sendTransactionalEmail: checkout?.form_fields?.sendTransactionalEmail ?? true // Armazenar o status de envio de e-mail
      }));

      if (paymentStatus === 'approved') {
        toast({
          title: "Pagamento Aprovado! ✅",
          description: "Redirecionando para a página de confirmação..."
        });
        setTimeout(() => {
          navigate('/payment-success?status=approved');
        }, 1500);
      } else if (paymentStatus === 'pending' && selectedPaymentMethod === 'pix') {
        toast({
          title: "PIX Gerado!",
          description: "Redirecionando para o pagamento PIX..."
        });
        navigate('/payment-success');
      } else if (paymentStatus === 'pending' && selectedPaymentMethod === 'creditCard') {
        toast({
          title: "Processando Pagamento...",
          description: "Aguardando confirmação do pagamento."
        });
        navigate('/payment-success');
      } else if (paymentStatus === 'rejected' || paymentStatus === 'cancelled') {
        let errorMessage = 'Pagamento recusado. Tente novamente.';

        if (selectedPaymentMethod === 'pix') {
          errorMessage = 'Pagamento PIX recusado ou falhou. Por favor, tente novamente.';
        } else if (selectedPaymentMethod === 'creditCard') {
          errorMessage = statusDetail === 'cc_rejected_insufficient_amount' ? 'Cartão sem saldo suficiente' :
                         statusDetail === 'cc_rejected_bad_filled_security_code' ? 'CVV inválido' :
                         statusDetail === 'cc_rejected_bad_filled_date' ? 'Data de validade inválida' :
                         statusDetail === 'cc_rejected_bad_filled_card_number' ? 'Número do cartão inválido' :
                         statusDetail === 'cc_rejected_blacklist' ? 'Cartão bloqueado' :
                         statusDetail === 'cc_rejected_call_for_authorize' ? 'Pagamento não autorizado pelo banco' :
                         statusDetail === 'cc_rejected_card_disabled' ? 'Cartão desabilitado' :
                         'Pagamento com cartão recusado. Tente outro cartão ou forma de pagamento.';
        }
        throw new Error(errorMessage);
      } else {
        // Fallback para qualquer outro status não explicitamente tratado
        console.warn('Checkout Debug: Status de pagamento não tratado, redirecionando para /payment-success:', paymentStatus);
        navigate('/payment-success');
      }

    } catch (error) {
      console.error('Checkout Debug: Erro ao processar pedido:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Não foi possível processar o pedido",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!checkout) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-xl sm:text-2xl font-bold mb-4">Checkout não encontrado</h1>
          <button 
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm sm:text-base"
          >
            Voltar ao início
          </button>
        </div>
      </div>
    );
  }

  const styles = checkout.styles || {};
  const backgroundColor = styles.backgroundColor || '#ffffff';
  const primaryColor = styles.primaryColor || '#ec4899';
  const textColor = styles.textColor || '#000000';
  const headlineText = styles.headlineText || checkout.products.name;
  const headlineColor = styles.headlineColor || textColor;
  const highlightColor = styles.highlightColor || primaryColor;
  const description = styles.description || checkout.products.description;
  const gradientColor = styles.gradientColor || styles.primaryColor || primaryColor;

  const calculateSavings = () => {
    if (!checkout) return 0;
    
    const packages = checkout.form_fields?.packages; // Agora acessado via form_fields
    if (packages && packages.length > 0) {
      const selectedPkg = packages.find((pkg: any) => pkg.id === selectedPackage);
      if (selectedPkg && (parseFloat(String(selectedPkg.originalPrice)) || 0) > (parseFloat(String(selectedPkg.price)) || 0)) {
        return (parseFloat(String(selectedPkg.originalPrice)) || 0) - (parseFloat(String(selectedPkg.price)) || 0);
      }
    }
    
    // Use checkout.price and checkout.promotional_price directly, as they are already in Reais
    if ((parseFloat(String(checkout.price)) || 0) > (parseFloat(String(checkout.promotional_price)) || parseFloat(String(checkout.price)) || 0)) {
      return (parseFloat(String(checkout.price)) || 0) - (parseFloat(String(checkout.promotional_price)) || parseFloat(String(checkout.price)) || 0);
    }
    
    return 0;
  };

  const layoutProps = {
    checkout,
    customerData,
    selectedOrderBumps,
    selectedPaymentMethod,
    selectedPackage,
    setSelectedPackage,
    processing,
    textColor,
    primaryColor,
    headlineText,
    headlineColor,
    description,
    gradientColor,
    calculateTotal,
    calculateSavings,
    handleInputChange,
    handleOrderBumpToggle,
    setSelectedPaymentMethod,
    handleSubmit,
    cardData,
    setCardData,
    mpPublicKey: mpPublicKey || undefined,
    selectedInstallments,
    setSelectedInstallments
  };

  // Always render HorizontalLayout for responsiveness
  return <HorizontalLayout {...layoutProps} />;
};

export default Checkout;