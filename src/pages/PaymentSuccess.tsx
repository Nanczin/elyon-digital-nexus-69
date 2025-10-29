import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Download, MessageCircle, Copy, CreditCard, QrCode, Shield, Clock, AlertTriangle, ChevronDown, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import nubankLogo from '@/assets/banks/nubank-logo.png';
import itauLogo from '@/assets/banks/itau-logo.png';
import bradescoLogo from '@/assets/banks/bradesco-logo.png';
import santanderLogo from '@/assets/banks/santander-logo.png';
import { DeliverableConfig, FormFields } from '@/integrations/supabase/types';
import { CheckoutData } from '@/components/checkout/CheckoutLayoutProps';

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [paymentData, setPaymentData] = useState<any>(null);
  const [isProtectionOpen, setIsProtectionOpen] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'completed' | 'failed'>('pending');
  const [productData, setProductData] = useState<CheckoutData['products'] | null>(null);
  const [checkoutDeliverable, setCheckoutDeliverable] = useState<DeliverableConfig | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [lastDetail, setLastDetail] = useState<string | null>(null);
  const [deliverableLinkToDisplay, setDeliverableLinkToDisplay] = useState<string | null>(null);
  const [sendTransactionalEmail, setSendTransactionalEmail] = useState<boolean>(true);

  const intervalRef = useRef<number | null>(null);
  const isMounted = useRef(true);

  const clearPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      console.log('PAYMENT_SUCCESS_DEBUG: Polling interval cleared.');
    }
  };

  // Centralized function to derive the deliverable link
  const deriveDeliverableLink = (
    product: CheckoutData['products'] | null,
    deliverableConfig: DeliverableConfig | null,
    emailTransactionalDeliverableLink: string | null // From metadata, highest priority
  ): string | null => {
    console.log('PAYMENT_SUCCESS_DEBUG: deriveDeliverableLink called with:', { product, deliverableConfig, emailTransactionalDeliverableLink });
    if (emailTransactionalDeliverableLink) {
      console.log('PAYMENT_SUCCESS_DEBUG: Derived link from emailTransactionalDeliverableLink (highest priority):', emailTransactionalDeliverableLink);
      return emailTransactionalDeliverableLink;
    }
    if (deliverableConfig?.type !== 'none' && (deliverableConfig?.link || deliverableConfig?.fileUrl)) {
      console.log('PAYMENT_SUCCESS_DEBUG: Derived link from checkoutDeliverableConfig:', deliverableConfig.link || deliverableConfig.fileUrl);
      return deliverableConfig.link || deliverableConfig.fileUrl;
    }
    if (product?.member_area_link || product?.file_url) {
      console.log('PAYMENT_SUCCESS_DEBUG: Derived link from productData:', product.member_area_link || product.file_url);
      return product.member_area_link || product.file_url;
    }
    console.log('PAYMENT_SUCCESS_DEBUG: No deliverable link derived, returning null.');
    return null;
  };

  const fetchAndVerifyPayment = async (mpIdToCheck: string, currentPaymentData: any) => {
    console.log('PAYMENT_SUCCESS_DEBUG: 7. Starting fetchAndVerifyPayment for MP ID:', mpIdToCheck);
    let fetchedPaymentFromDb: any = null;

    try {
      console.log('PAYMENT_SUCCESS_DEBUG: 9. Invoking verify-mercado-pago-payment for MP ID:', mpIdToCheck);
      const res = await supabase.functions.invoke('verify-mercado-pago-payment', {
        body: { mp_payment_id: mpIdToCheck },
        method: 'POST'
      });
      console.log('PAYMENT_SUCCESS_DEBUG: 10. Response from verify-mercado-pago-payment:', res);

      if (!isMounted.current) return;

      if (res.data?.success) {
        const dbPaymentStatus = res.data.payment?.status;
        const dbMpPaymentStatus = res.data.payment?.mp_payment_status;
        console.log('PAYMENT_SUCCESS_DEBUG: 11. DB Payment Status from Edge Function:', { dbPaymentStatus, dbMpPaymentStatus });

        if (dbPaymentStatus === 'completed' || dbMpPaymentStatus === 'approved') {
          setPaymentStatus('completed');
          setIsChecking(false);
          clearPolling();
          // REMOVIDO: window.history.replaceState({}, '', '/payment-success?status=approved');
          localStorage.removeItem('paymentData'); // Limpar localStorage ao completar
          console.log('PAYMENT_SUCCESS_DEBUG: 12. Status updated to COMPLETED (from Edge Function) and localStorage cleared.');
          fetchedPaymentFromDb = res.data.payment;
          console.log('PAYMENT_SUCCESS_DEBUG: 11.1. Full fetchedPaymentFromDb:', JSON.stringify(fetchedPaymentFromDb, null, 2));
        } else if (dbPaymentStatus === 'failed' || dbMpPaymentStatus === 'rejected') {
          setPaymentStatus('failed');
          setIsChecking(false);
          clearPolling();
          localStorage.removeItem('paymentData'); // Limpar localStorage ao falhar
          console.log('PAYMENT_SUCCESS_DEBUG: 13. Status updated to FAILED (from Edge Function) and localStorage cleared.');
        } else {
          setLastDetail(res.data.status_detail || null);
          // Do NOT stop checking if it's still pending, continue polling
          console.log('PAYMENT_SUCCESS_DEBUG: 14. Status still PENDING, last detail:', res.data.status_detail);
        }
      } else if (res.error) {
        console.error('PAYMENT_SUCCESS_DEBUG: 15. Error invoking verify-mercado-pago-payment:', res.error);
        setIsChecking(false);
        clearPolling();
        localStorage.removeItem('paymentData'); // Limpar localStorage em caso de erro na verificação
        setPaymentStatus('failed'); // Assume failed if verification itself fails
      }
    } catch (err) {
      console.warn('PAYMENT_SUCCESS_DEBUG: 16. Erro ao verificar status via Edge Function:', err);
      setIsChecking(false);
      clearPolling();
      localStorage.removeItem('paymentData'); // Limpar localStorage em caso de erro
      setPaymentStatus('failed'); // Assume failed on network/unexpected error
    }

    if (!isMounted.current) return;

    if (fetchedPaymentFromDb) {
      console.log('PAYMENT_SUCCESS_DEBUG: 20. Processing fetchedPaymentFromDb for product/deliverable data.');
      console.log('PAYMENT_SUCCESS_DEBUG: 20.1. fetchedPaymentFromDb.checkouts:', JSON.stringify(fetchedPaymentFromDb.checkouts, null, 2));
      console.log('PAYMENT_SUCCESS_DEBUG: 20.2. fetchedPaymentFromDb.checkouts?.products:', JSON.stringify(fetchedPaymentFromDb.checkouts?.products, null, 2));
      console.log('PAYMENT_SUCCESS_DEBUG: 20.3. fetchedPaymentFromDb.checkouts?.form_fields?.deliverable:', JSON.stringify(fetchedPaymentFromDb.checkouts?.form_fields?.deliverable, null, 2));

      const currentProduct = fetchedPaymentFromDb.checkouts?.products as CheckoutData['products'] || null;
      const emailTransactionalDeliverableLink = (fetchedPaymentFromDb.metadata as any)?.email_transactional_data?.deliverableLink || null;
      const currentCheckoutDeliverableConfig = fetchedPaymentFromDb.checkouts?.form_fields?.deliverable as DeliverableConfig || null;
      
      const currentSendTransactionalEmail = (fetchedPaymentFromDb.metadata as any)?.email_transactional_data?.sendTransactionalEmail ?? true;

      setProductData(currentProduct);
      setCheckoutDeliverable(currentCheckoutDeliverableConfig);
      setSendTransactionalEmail(currentSendTransactionalEmail);

      const determinedLink = deriveDeliverableLink(
        currentProduct,
        currentCheckoutDeliverableConfig,
        emailTransactionalDeliverableLink
      );
      setDeliverableLinkToDisplay(determinedLink);
      console.log('PAYMENT_SUCCESS_DEBUG: 21. Product/Deliverable data updated from fetched payment:', { currentProduct, currentCheckoutDeliverableConfig, determinedLink, currentSendTransactionalEmail });
      console.log('PAYMENT_SUCCESS_DEBUG: 21.1. Derived currentProduct:', JSON.stringify(currentProduct, null, 2));
      console.log('PAYMENT_SUCCESS_DEBUG: 21.2. Derived currentCheckoutDeliverableConfig:', JSON.stringify(currentCheckoutDeliverableConfig, null, 2));
      console.log('PAYMENT_SUCCESS_DEBUG: 21.3. Final determinedLink (from fetchAndVerifyPayment):', determinedLink);
    } else {
      // Ensure productData and checkoutDeliverable are reset if no payment is fetched
      setProductData(null);
      setCheckoutDeliverable(null);
      setDeliverableLinkToDisplay(null);
      setSendTransactionalEmail(true); // Default to true if no specific data
    }
  };

  useEffect(() => {
    isMounted.current = true;
    let initialPaymentData: any = null;
    const savedPaymentData = localStorage.getItem('paymentData');
    console.log('PAYMENT_SUCCESS_DEBUG: 1. Saved payment data from localStorage (initial effect):', savedPaymentData);

    if (savedPaymentData) {
      initialPaymentData = JSON.parse(savedPaymentData);
      setPaymentData(initialPaymentData);
      setSendTransactionalEmail(initialPaymentData.sendTransactionalEmail ?? true);

      // Derive deliverable link immediately from localStorage data
      const productFromLocalStorage = initialPaymentData.payment?.checkouts?.products as CheckoutData['products'] || null;
      const checkoutDeliverableFromLocalStorage = initialPaymentData.payment?.checkouts?.form_fields?.deliverable as DeliverableConfig || null;
      const emailTransactionalDeliverableLinkFromLocalStorage = initialPaymentData.deliverableLink || null; // This is the pre-derived link from Checkout.tsx

      const initialDeterminedLink = deriveDeliverableLink(
        productFromLocalStorage,
        checkoutDeliverableFromLocalStorage,
        emailTransactionalDeliverableLinkFromLocalStorage
      );
      setDeliverableLinkToDisplay(initialDeterminedLink);

      console.log('PAYMENT_SUCCESS_DEBUG: 2. Initialized from localStorage (initial effect):', { initialPaymentData, initialDeterminedLink, sendTransactionalEmail: initialPaymentData.sendTransactionalEmail });
      console.log('PAYMENT_SUCCESS_DEBUG: 2.1. Full initialPaymentData from localStorage:', JSON.stringify(initialPaymentData, null, 2));
    }

    const urlStatus = searchParams.get('status');
    const urlPaymentId = searchParams.get('payment_id');
    const mpIdToCheck = urlPaymentId || initialPaymentData?.payment?.mp_payment_id;
    console.log('PAYMENT_SUCCESS_DEBUG: 3. URL Params:', { urlStatus, urlPaymentId });
    console.log('PAYMENT_SUCCESS_DEBUG: 8. MP ID to check (initial effect):', mpIdToCheck);

    if (urlStatus === 'approved' || urlStatus === 'completed') {
      setPaymentStatus('completed');
      setIsChecking(false);
      clearPolling();
      localStorage.removeItem('paymentData'); // Limpar localStorage se o status já vem da URL
      console.log('PAYMENT_SUCCESS_DEBUG: 4. Initial status: COMPLETED (from URL) and localStorage cleared.');
    } else if (initialPaymentData?.paymentMethod === 'pix' && initialPaymentData?.payment?.qr_code) {
      setPaymentStatus('pending');
      setIsChecking(false); // For PIX with QR, show QR immediately, not generic checking
      console.log('PAYMENT_SUCCESS_DEBUG: 5. Initial status: PENDING (PIX with QR code)');
      // Start polling for PIX payments
      if (mpIdToCheck) {
        intervalRef.current = setInterval(() => {
          if (isMounted.current && paymentStatus === 'pending') {
            console.log('PAYMENT_SUCCESS_DEBUG: 23. Interval check (PIX): paymentStatus is PENDING, re-fetching...');
            fetchAndVerifyPayment(mpIdToCheck, initialPaymentData);
          } else {
            clearPolling();
          }
        }, 5000) as unknown as number;
      }
    } else if (mpIdToCheck) {
      setPaymentStatus('pending');
      setIsChecking(true);
      console.log('PAYMENT_SUCCESS_DEBUG: 6. Initial status: PENDING (default, starting check)');
      fetchAndVerifyPayment(mpIdToCheck, initialPaymentData); // Initial check
      
      // Start polling only if it's a payment that needs verification
      intervalRef.current = setInterval(() => {
        if (isMounted.current && paymentStatus === 'pending') { // Only poll if still pending
          console.log('PAYMENT_SUCCESS_DEBUG: 23. Interval check: paymentStatus is PENDING, re-fetching...');
          fetchAndVerifyPayment(mpIdToCheck, initialPaymentData);
        } else {
          clearPolling();
        }
      }, 5000) as unknown as number; // Cast to number for setInterval return type
    } else {
      // No payment data or MP ID, assume failed or invalid access
      setPaymentStatus('failed');
      setIsChecking(false);
      clearPolling();
      localStorage.removeItem('paymentData'); // Limpar localStorage se não há dados de pagamento
      console.log('PAYMENT_SUCCESS_DEBUG: 6.1. No payment data or MP ID, defaulting to FAILED and localStorage cleared.');
    }

    return () => {
      isMounted.current = false;
      clearPolling();
      console.log('PAYMENT_SUCCESS_DEBUG: 25. Component unmounted or effect re-ran, interval cleared.');
    };
  }, [searchParams, paymentStatus]); // Depend on searchParams and paymentStatus to re-evaluate initial state and polling

  // REMOVIDO: Este useEffect foi removido para evitar o redirecionamento automático
  // useEffect(() => {
  //   console.log('PAYMENT_SUCCESS_DEBUG: Redirection useEffect triggered. Current values:', { paymentStatus, deliverableLinkToDisplay });
  //   let redirectTimer: NodeJS.Timeout;
  //   if (paymentStatus === 'completed' && deliverableLinkToDisplay) {
  //     console.log('PAYMENT_SUCCESS_DEBUG: Payment completed and deliverable link found. Redirecting in 3 seconds...');
  //     toast({
  //       title: "Pagamento Aprovado! ✅",
  //       description: "Redirecionando para o seu produto em 3 segundos...",
  //     });
  //     redirectTimer = setTimeout(() => {
  //       window.location.href = deliverableLinkToDisplay; // Redirecionamento completo
  //     }, 3000); // Redireciona após 3 segundos
  //   }
  //   return () => clearTimeout(redirectTimer); // Limpa o timer se o componente desmontar ou as dependências mudarem
  // }, [paymentStatus, deliverableLinkToDisplay, toast]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: "Código PIX copiado para a área de transferência",
    });
  };

  const copyQRCode = () => {
    if (paymentData?.payment?.qr_code) {
      copyToClipboard(paymentData.payment.qr_code);
    }
  };

  // Função para definir o texto do botão do entregável
  const getDeliverableButtonText = (link: string | null) => {
    if (!link) return 'Acessar Produto'; // Fallback genérico
    
    // Prioriza o nome do entregável configurado no checkout, depois o nome do produto base
    if (checkoutDeliverable?.name) {
      return `Acessar ${checkoutDeliverable.name}`;
    }
    if (productData?.name) {
      return `Acessar ${productData.name}`;
    }
    
    // Fallback se nenhum nome for encontrado
    return 'Acessar Produto';
  };

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
        <div className="container mx-auto px-4 max-w-2xl">
          <Card className="border-blue-200">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <div className="w-8 h-8 border-4 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
              </div>
              <CardTitle className="text-2xl text-blue-700">
                Verificando Pagamento...
              </CardTitle>
              <p className="text-muted-foreground">
                Aguarde enquanto confirmamos seu pagamento
              </p>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  if (paymentStatus === 'completed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100">
        <div className="container mx-auto px-4 max-w-2xl">
          <Card className="border-green-200">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl text-green-700">
                🎉 Pagamento Aprovado!
              </CardTitle>
              <p className="text-muted-foreground">
                Sua compra foi processada com sucesso
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center space-y-4">
                <p className="text-lg font-medium text-green-800">
                  Parabéns! Agora você tem acesso completo ao seu produto.
                </p>
                
                {deliverableLinkToDisplay && ( // Usar deliverableLinkToDisplay diretamente
                  <div className="bg-white border border-green-200 rounded-lg p-6 space-y-4">
                    <h3 className="font-semibold text-lg text-gray-800">
                      {checkoutDeliverable?.name || productData?.name || 'Seu Produto'} {/* Fallback para nome */}
                    </h3>
                    
                    {(checkoutDeliverable?.description || productData?.description) && (
                      <p className="text-gray-600 text-sm">
                        {checkoutDeliverable?.description || productData?.description}
                      </p>
                    )}
                    
                    <div className="space-y-3">
                      <Button 
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => window.open(deliverableLinkToDisplay, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        {getDeliverableButtonText(deliverableLinkToDisplay)}
                      </Button>
                    </div>
                  </div>
                )}
                
                {!deliverableLinkToDisplay && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-yellow-800 text-sm">
                      O acesso ao produto será enviado por e-mail em breve.
                    </p>
                  </div>
                )}
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold text-green-800 mb-2">Importante:</h3>
                  <ul className="text-sm text-green-700 space-y-1 text-left">
                    {sendTransactionalEmail && ( // Condicionalmente exibir a mensagem de e-mail
                      <li>• Você também receberá um e-mail com os detalhes</li>
                    )}
                    <li>• Guarde este link para acessar quando quiser</li>
                    <li>• Entre em contato se tiver dúvidas</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  
  if (paymentStatus === 'failed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100">
        <div className="container mx-auto px-4 max-w-2xl">
          <Card className="border-red-200">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <CardTitle className="text-2xl text-red-700">
                Pagamento Não Aprovado
              </CardTitle>
              <p className="text-muted-foreground">
                Houve um problema com seu pagamento
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center space-y-4">
                <p className="text-lg">
                  Não se preocupe! Você pode tentar novamente.
                </p>
                
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="font-semibold text-red-800 mb-2">Possíveis causas:</h3>
                  <ul className="text-sm text-red-700 space-y-1">
                    <li>• Saldo insuficiente</li>
                    <li>• Dados incorretos</li>
                    <li>• Problema temporário</li>
                  </ul>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  className="flex-1"
                  onClick={() => navigate(-1)}
                >
                  Tentar Novamente
                </Button>
                <Button 
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate('/')}
                >
                  Voltar ao início
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (paymentStatus === 'pending') {
    if (paymentData?.paymentMethod === 'creditCard') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
          <div className="container mx-auto px-4 max-w-2xl">
            <Card className="border-blue-200">
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <CreditCard className="h-8 w-8 text-blue-600 animate-pulse" />
                </div>
                <CardTitle className="text-2xl text-blue-700">
                  Processando pagamento...
                </CardTitle>
                <p className="text-muted-foreground">
                  Estamos processando seu pagamento aqui no checkout. Aguarde a confirmação, sem redirecionamento externo.
                </p>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-sm text-muted-foreground mt-2">
                  Status atual: {paymentStatus}{lastDetail ? ` (${lastDetail})` : ''}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }
    
    // Default pending state for PIX
    const primaryColor = paymentData?.checkoutStyles?.primaryColor || '#ec4899';
    const gradientColor = paymentData?.checkoutStyles?.gradientColor || primaryColor;
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100">
        <div className="container mx-auto px-4 max-w-2xl">
          <Card className="border-green-200">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: `${primaryColor}20` }}>
                <Clock className="h-8 w-8" style={{ color: primaryColor }} />
              </div>
              <CardTitle className="text-2xl text-gray-700 mb-2">
                Falta pouco! Sua transformação está a um passo de começar.
              </CardTitle>
              <p className="text-muted-foreground">
                Para concluir, escaneie o QR Code ou use o "Copia e Cola" no seu app do banco.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center space-y-4">
                <div className="bg-white p-4 rounded-lg border-2" style={{ borderColor: `${primaryColor}40` }}>
                  <h3 className="font-semibold mb-2" style={{ color: primaryColor }}>Valor a pagar:</h3>
                  <p className="text-2xl font-bold" style={{ color: primaryColor }}>
                    R$ {paymentData.total.toFixed(2).replace('.', ',')}
                  </p>
                </div>

                {paymentData.payment?.qr_code_base64 && (
                  <div className="bg-white p-4 rounded-lg border">
                    <h3 className="font-semibold mb-2">QR Code PIX:</h3>
                    <div className="flex justify-center mb-4">
                      <img 
                        src={`data:image/png;base64,${paymentData.payment.qr_code_base64}`}
                        alt="QR Code PIX"
                        className="max-w-48 h-auto"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Abra o aplicativo do seu banco e escaneie o QR Code acima
                    </p>
                  </div>
                )}

                {paymentData.payment?.qr_code && (
                  <div className="space-y-4">
                    <Button 
                       onClick={copyQRCode}
                       className="w-full text-white py-4 text-lg font-semibold hover:opacity-90 transition-all duration-300"
                       style={{ 
                         background: `linear-gradient(135deg, ${primaryColor}, ${gradientColor}dd)`,
                         boxShadow: `0 4px 15px ${primaryColor}33`
                       }}
                       size="lg"
                     >
                     Copiar Código PIX
                    </Button>
                    
                    <Alert className="bg-yellow-50 border-yellow-200">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <AlertDescription className="text-yellow-800">
                        Os bancos reforçaram a segurança do Pix e podem exibir avisos preventivos. Não se preocupe, sua transação está protegida.
                      </AlertDescription>
                    </Alert>
                    
                    <Collapsible open={isProtectionOpen} onOpenChange={setIsProtectionOpen}>
                      <CollapsibleTrigger asChild>
                        <Button 
                          variant="outline" 
                          className="w-full justify-between text-sm border-gray-300 hover:bg-gray-50"
                        >
                          Proteção Bancária: Saiba mais
                          <ChevronDown className={`h-4 w-4 transition-transform ${isProtectionOpen ? 'rotate-180' : ''}`} />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2">
                        <div className="bg-white border rounded-lg p-4">
                          <Tabs defaultValue="nubank" className="w-full">
                            <TabsList className="grid w-full grid-cols-4">
                              <TabsTrigger value="nubank" className="text-xs">Nubank</TabsTrigger>
                              <TabsTrigger value="itau" className="text-xs">Itaú</TabsTrigger>
                              <TabsTrigger value="bradesco" className="text-xs">Bradesco</TabsTrigger>
                              <TabsTrigger value="santander" className="text-xs">Santander</TabsTrigger>
                            </TabsList>
                            
                            <TabsContent value="nubank" className="mt-4 space-y-3">
                              <div className="flex justify-center mb-4">
                                <img 
                                  src="/lovable-uploads/ecad8c6d-aea7-4fb7-a728-d52632530987.png" 
                                  alt="Alerta de Golpe Nubank"
                                  className="w-full max-w-sm rounded-lg shadow-sm"
                                />
                              </div>
                            </TabsContent>
                            
                            <TabsContent value="itau" className="mt-4 space-y-3">
                              <div className="flex justify-center mb-4">
                                <img 
                                  src="/lovable-uploads/a76239a2-eeaf-4efa-9312-9084cbcd1865.png" 
                                  alt="Alerta de Golpe Itaú"
                                  className="w-full max-w-sm rounded-lg shadow-sm"
                                />
                              </div>
                            </TabsContent>
                            
                            <TabsContent value="bradesco" className="mt-4 space-y-3">
                              <div className="flex justify-center mb-4">
                                <img 
                                  src="/lovable-uploads/8ae820f6-6087-42c8-b64e-aff574e6fdf7.png" 
                                  alt="Alerta de Golpe Bradesco"
                                  className="w-full max-w-sm rounded-lg shadow-sm"
                                />
                              </div>
                            </TabsContent>
                            
                            <TabsContent value="santander" className="mt-4 space-y-3">
                              <div className="flex justify-center mb-4">
                                <img 
                                  src="/lovable-uploads/0009e46d-54a9-415f-b6e6-b5262f1bc520.png" 
                                  alt="Alerta de Golpe Santander"
                                  className="w-full max-w-sm rounded-lg shadow-sm"
                                />
                              </div>
                            </TabsContent>
                          </Tabs>
                          
                          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-sm text-blue-800 text-center">
                              Se exibido no app, clique na opção indicada para finalizar sua compra com segurança.
                            </p>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                 </div>
                )}
              </div>

              <div className="bg-white border rounded-lg p-6 text-center">
                <div className="mx-auto w-12 h-12 mb-4">
                  <div className="w-full h-full border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                </div>
                <h3 className="font-semibold text-gray-700 mb-2">
                  Aguardando confirmação do pagamento...
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Você será redirecionado automaticamente. Após a confirmação, o acesso é liberado e você receberá um e-mail com os detalhes.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100">
      <div className="container mx-auto px-4 max-w-2xl">
        <Card className="border-green-200">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-700">
              Pagamento Processado!
            </CardTitle>
            <p className="text-muted-foreground">
              Seu pedido foi processado com sucesso
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center space-y-4">
              <p className="text-lg">
                Obrigado pela sua compra! Você receberá um e-mail com os detalhes do seu pedido e instruções de acesso.
              </p>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-800 mb-2">Próximos passos:</h3>
                <ul className="text-sm text-green-700 space-y-1 text-left">
                  {sendTransactionalEmail && ( // Condicionalmente exibir a mensagem de e-mail
                    <li>• Verifique seu e-mail (incluindo spam)</li>
                  )}
                  <li>• Acesse o produto através do link enviado</li>
                  <li>• Entre em contato conosco se tiver dúvidas</li>
                </ul>
              </div>
            </div>

            <div className="text-center text-sm text-muted-foreground">
              <p>
                Precisa de ajuda? Entre em contato conosco através do WhatsApp ou e-mail.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

export default PaymentSuccess;