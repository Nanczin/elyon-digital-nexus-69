import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCheckoutIntegrations } from '@/hooks/useCheckoutIntegrations';
import { CheckoutData, CustomerData, OrderBump, PaymentMethods, FormFields } from '@/components/checkout/CheckoutLayoutProps';
import { CardData } from '@/components/checkout/CreditCardForm';
import HorizontalLayout from '@/components/checkout/HorizontalLayout';
import MosaicLayout from '@/components/checkout/MosaicLayout';

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

  // Hook para integrações do checkout
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
          products (id, name, description, banner_url, logo_url)
        `)
        .eq('id', checkoutId)
        .single();

      if (error) throw error;
      
      // Fetch order bump products
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
        products: data.products
      };
      
      console.log('Timer carregado do banco:', data.timer);
      console.log('Timer no objeto transformado:', transformedData.timer);
      
      setCheckout(transformedData);
      
      // Set default payment method
      if (transformedData.payment_methods?.pix) {
        setSelectedPaymentMethod('pix');
      } else if (transformedData.payment_methods?.creditCard) {
        setSelectedPaymentMethod('creditCard');
      }
    } catch (error) {
      console.error('Erro ao carregar checkout:', error);
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

  // Disparar evento de início do checkout quando os dados estiverem carregados
  useEffect(() => {
    if (checkout && hasIntegrations) {
      const total = calculateTotal();
      trackInitiateCheckoutEvent({
        product_id: checkout.product_id,
        total: total * 100, // Converter para centavos
        checkout_id: checkout.id
      });
    }
  }, [checkout, hasIntegrations]);

  const calculateTotal = () => {
    if (!checkout) return 0;
    
    const packages = (checkout.form_fields as any)?.packages;
    let total = 0;
    
    if (packages && packages.length > 0) {
      const selectedPkg = packages.find((pkg: any) => pkg.id === selectedPackage);
      total = selectedPkg ? selectedPkg.price : (checkout.promotional_price || checkout.price) / 100;
    } else {
      total = (checkout.promotional_price || checkout.price) / 100;
    }
    
    selectedOrderBumps.forEach(bumpId => {
      const bump = checkout.order_bumps.find(b => b.id === bumpId);
      if (bump && bump.enabled) {
        total += bump.price / 100;
      }
    });
    
    return total;
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

    // Disparar evento de AddToCart quando adicionar order bump
    if (isAdding && hasIntegrations) {
      const bump = checkout?.order_bumps.find(b => b.id === bumpId);
      if (bump) {
        trackAddToCartEvent({
          product_id: bump.selectedProduct || 'order-bump-' + bumpId,
          price: bump.price * 100 // Converter para centavos
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
    
    // Para pagamentos com cartão de crédito no Brasil, o CPF é obrigatório
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
    
    return true;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value / 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setProcessing(true);
    
    try {
      // Preparar dados do pagamento
      const totalAmount = Math.round(calculateTotal() * 100);
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

      // Adicionar dados do cartão se for pagamento com cartão
      if (selectedPaymentMethod === 'creditCard' && cardData) {
        paymentData.cardData = {
          cardNumber: cardData.cardNumber.replace(/\s/g, ''),
          cardholderName: cardData.cardholderName,
          expirationMonth: cardData.expirationMonth,
          expirationYear: cardData.expirationYear,
          securityCode: cardData.securityCode,
          installments: cardData.installments
        };
      }

      console.log('Enviando dados para processamento:', paymentData);

      // Chamar edge function do Mercado Pago
      const { data: mpResponse, error: mpError } = await supabase.functions.invoke(
        'create-mercado-pago-payment',
        { body: paymentData }
      );

      if (mpError) {
        console.error('Erro na edge function:', mpError);
        throw new Error(mpError.message || 'Erro ao processar pagamento');
      }

      if (!mpResponse?.success) {
        console.error('Resposta de erro do MP:', mpResponse);
        throw new Error(mpResponse?.error || 'Erro ao criar pagamento no Mercado Pago');
      }

      console.log('Pagamento criado com sucesso:', mpResponse);

      // Disparar evento de compra
      if (hasIntegrations) {
        trackPurchaseEvent({
          amount: totalAmount,
          product_id: checkout?.product_id,
          checkout_id: checkoutId,
          payment_method: selectedPaymentMethod,
          customer_data: customerData
        });
      }

      // Armazenar informações do pagamento no localStorage para mostrar na tela de sucesso
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
        }
      }));

      toast({
        title: "Pagamento criado!",
        description: selectedPaymentMethod === 'pix' 
          ? "Redirecionando para o pagamento PIX..." 
          : "Processando pagamento no checkout..."
      });

      // Redirecionar para tela de pagamento
      navigate('/payment-success');

    } catch (error) {
      console.error('Erro ao processar pedido:', error);
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

  // Extract styles from configuration
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
      if (selectedPkg && selectedPkg.originalPrice > selectedPkg.price) {
        return selectedPkg.originalPrice - selectedPkg.price;
      }
    }
    
    if (checkout.price > (checkout.promotional_price || checkout.price)) {
      return (checkout.price - (checkout.promotional_price || checkout.price)) / 100;
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
    setCardData
  };

  // Render appropriate layout based on configuration
  if (checkout.layout === 'mosaic') {
    return <MosaicLayout {...layoutProps} />;
  } else {
    // Default to horizontal layout
    return <HorizontalLayout {...layoutProps} />;
  }
};

export default Checkout;