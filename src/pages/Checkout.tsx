import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCheckoutIntegrations } from '@/hooks/useCheckoutIntegrations';
import { CheckoutData, CustomerData, OrderBump, PaymentMethods, FormFields } from '@/components/checkout/CheckoutLayoutProps';
import { CardData } from '@/components/checkout/CreditCardForm';
import HorizontalLayout from '@/components/checkout/HorizontalLayout';
import MosaicLayout from '@/components/checkout/MosaicLayout';
import { createCardToken } from '@mercadopago/sdk-react';
import { toCents } from '@/utils/textFormatting';
import { DeliverableConfig } from '@/integrations/supabase/types'; // Importar DeliverableConfig

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
      fetchCheckout();
    }
  }, [checkoutId]);

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
      
      let orderBumpsWithProducts = [];
      if (data.order_bumps && Array.isArray(data.order_bumps)) {
        const orderBumps = data.order_bumps as unknown as OrderBump[];
        const productIds = orderBumps
          .filter(bump => bump.selectedProduct)
          .map(bump => bump.selectedProduct);
        
        if (productIds.length > 0) {
          const { data: productsData } = await supabase
            .from('products')
            .select('id, name, description, banner_url, logo_url')
            .in('id', productIds);
          
          orderBumpsWithProducts = orderBumps.map(bump => ({
            ...bump,
            product: productsData?.find(p => p.id === bump.selectedProduct) || null
          }));
        } else {
          orderBumpsWithProducts = orderBumps;
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

      const transformedData: CheckoutData = {
        id: data.id,
        product_id: data.product_id,
        price: data.price,
        promotional_price: data.promotional_price,
        layout: data.layout || 'horizontal',
        form_fields: data.form_fields as FormFields || {},
        payment_methods: data.payment_methods as PaymentMethods || {},
        order_bumps: orderBumpsWithProducts,
        styles: data.styles as CheckoutData['styles'] || {},
        support_contact: data.support_contact || {},
        integrations: data.integrations || {},
        timer: data.timer as CheckoutData['timer'] || undefined,
        products: data.products as CheckoutData['products'] // Cast para o tipo correto
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
    const packages = (checkout.form_fields as any)?.packages;

    if (packages && packages.length > 0) {
      const selectedPkg = packages.find((pkg: any) => pkg.id === selectedPackage);
      basePrice = selectedPkg ? (parseFloat(selectedPkg.price) || 0) : 0;
      console.log('Checkout Debug: Package selected:', selectedPkg);
      console.log('Checkout Debug: Base price from package (in Reais):', basePrice);
    } else {
      basePrice = (parseFloat(String(checkout.promotional_price)) || parseFloat(String(checkout.price)) || 0) / 100;
      console.log('Checkout Debug: Base price from main checkout (in Reais):', basePrice);
    }

    let totalInReais = basePrice;

    selectedOrderBumps.forEach(bumpId => {
      const bump = checkout.order_bumps.find(b => b.id === bumpId);
      if (bump && bump.enabled) {
        totalInReais += (parseFloat(String(bump.price)) || 0) / 100;
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
          price: toCents((parseFloat(String(bump.price)) || 0) / 100)
        });
      }
    }
  };

  const validateForm = () => {
    const fields = checkout?.form_fields || {};
    
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
        paymentMethod: selectedPaymentMethod
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

      if (hasIntegrations) {
        trackPurchaseEvent({
          amount: totalAmount,
          product_id: checkout?.product_id,
          checkout_id: checkoutId,
          payment_method: selectedPaymentMethod,
          customer_data: customerData
        });
      }

      const productData = checkout?.products;
      const checkoutDeliverable = checkout?.form_fields?.deliverable;

      const finalDeliverableLink = checkoutDeliverable?.type !== 'none' && (checkoutDeliverable?.link || checkoutDeliverable?.fileUrl)
        ? (checkoutDeliverable.link || checkoutDeliverable.fileUrl)
        : (productData as any)?.member_area_link || (productData as any)?.file_url; // Cast para any aqui

      console.log('Checkout Debug: Final deliverable link (after approval):', finalDeliverableLink);

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
        deliverableLink: finalDeliverableLink
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
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando checkout...</p>
        </div>
      </div>
    );
  }

  if (!checkout) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Checkout não encontrado</h1>
          <button 
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
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
    
    const packages = (checkout.form_fields as any)?.packages;
    if (packages && packages.length > 0) {
      const selectedPkg = packages.find((pkg: any) => pkg.id === selectedPackage);
      if (selectedPkg && (parseFloat(String(selectedPkg.originalPrice)) || 0) > (parseFloat(String(selectedPkg.price)) || 0)) {
        return (parseFloat(String(selectedPkg.originalPrice)) || 0) - (parseFloat(String(selectedPkg.price)) || 0);
      }
    }
    
    if ((parseFloat(String(checkout.price)) || 0) > (parseFloat(String(checkout.promotional_price)) || parseFloat(String(checkout.price)) || 0)) {
      return ((parseFloat(String(checkout.price)) || 0) - (parseFloat(String(checkout.promotional_price)) || parseFloat(String(checkout.price)) || 0)) / 100;
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

  if (checkout.layout === 'mosaic') {
    return <MosaicLayout {...layoutProps} />;
  } else {
    return <HorizontalLayout {...layoutProps} />;
  }
};

export default Checkout;