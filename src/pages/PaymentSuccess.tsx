import { useEffect, useState } from 'react';
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

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [paymentData, setPaymentData] = useState<any>(null);
  const [isProtectionOpen, setIsProtectionOpen] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'completed' | 'failed'>('pending');
  const [productData, setProductData] = useState<any>(null);
  const [checkoutDeliverable, setCheckoutDeliverable] = useState<any>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [lastDetail, setLastDetail] = useState<string | null>(null);
  const [deliverableLinkToDisplay, setDeliverableLinkToDisplay] = useState<string | null>(null);

  useEffect(() => {
    const checkPaymentStatus = async () => {
      try {
        setIsChecking(true);
        
        const savedPaymentData = localStorage.getItem('paymentData');
        let currentPaymentData = null;
        
        if (savedPaymentData) {
          currentPaymentData = JSON.parse(savedPaymentData);
          setPaymentData(currentPaymentData);
          if (currentPaymentData.deliverableLink) {
            setDeliverableLinkToDisplay(currentPaymentData.deliverableLink);
          }
        }

        const urlPaymentId = searchParams.get('payment_id');
        const urlStatus = searchParams.get('status');
        
        console.log('PaymentSuccess Debug: Verificando status:', { urlStatus, urlPaymentId, currentPaymentData });
        
        if (urlStatus === 'approved' || urlStatus === 'completed') {
          setPaymentStatus('completed');
          
          let fetchedPayment = null;
          if (urlPaymentId) {
            const { data: payment } = await supabase
              .from('payments')
              .select(`
                *,
                checkouts (
                  *,
                  products (*)
                )
              `)
              .eq('mp_payment_id', urlPaymentId)
              .maybeSingle();
            fetchedPayment = payment;
          } else if (currentPaymentData?.payment?.id) {
            const { data: payment } = await supabase
              .from('payments')
              .select(`
                *,
                checkouts (
                  *,
                  products (*)
                )
              `)
              .eq('id', currentPaymentData.payment.id)
              .maybeSingle();
            fetchedPayment = payment;
          }

          console.log('PaymentSuccess Debug: Fetched payment for redirect:', fetchedPayment);

          if (fetchedPayment?.checkouts?.products) {
            setProductData(fetchedPayment.checkouts.products);
          }
          if (fetchedPayment?.checkouts?.form_fields?.deliverable) {
            setCheckoutDeliverable(fetchedPayment.checkouts.form_fields.deliverable);
          }

          if (!deliverableLinkToDisplay && (fetchedPayment?.checkouts?.form_fields?.deliverable?.type !== 'none' && (fetchedPayment?.checkouts?.form_fields?.deliverable?.link || fetchedPayment?.checkouts?.form_fields?.deliverable?.fileUrl))) {
            setDeliverableLinkToDisplay(fetchedPayment.checkouts.form_fields.deliverable.link || fetchedPayment.checkouts.form_fields.deliverable.fileUrl);
          } else if (!deliverableLinkToDisplay && (fetchedPayment?.checkouts?.products?.member_area_link || fetchedPayment?.checkouts?.products?.file_url)) {
            setDeliverableLinkToDisplay(fetchedPayment.checkouts.products.member_area_link || fetchedPayment.checkouts.products.file_url);
          }
          
          setIsChecking(false);
          return;
        }
        
        if (paymentStatus === 'pending') {
          const mpIdToCheck = urlPaymentId || currentPaymentData?.payment?.mp_payment_id;
          
          if (mpIdToCheck) {
            try {
              const res = await supabase.functions.invoke('verify-mercado-pago-payment', {
                body: { mp_payment_id: mpIdToCheck },
                method: 'POST'
              });
              
              console.log('PaymentSuccess Debug: Verify MP payment response:', res);

              if (res.data?.success) {
                if (res.data.status === 'approved' || res.data.payment?.status === 'completed') {
                  setPaymentStatus('completed');
                  window.history.replaceState({}, '', '/payment-success?status=approved');
                  const { data: payment } = await supabase
                    .from('payments')
                    .select(`
                      *,
                      checkouts (
                        *,
                        products (*)
                      )
                    `)
                    .eq('mp_payment_id', mpIdToCheck)
                    .maybeSingle();
                  
                  if (payment?.checkouts?.products) {
                    setProductData(payment.checkouts.products);
                  }
                  if (payment?.checkouts?.form_fields?.deliverable) {
                    setCheckoutDeliverable(payment.checkouts.form_fields.deliverable);
                  }

                  if (!deliverableLinkToDisplay && (payment?.checkouts?.form_fields?.deliverable?.type !== 'none' && (payment?.checkouts?.form_fields?.deliverable?.link || payment?.checkouts?.form_fields?.deliverable?.fileUrl))) {
                    setDeliverableLinkToDisplay(payment.checkouts.form_fields.deliverable.link || payment.checkouts.form_fields.deliverable.fileUrl);
                  } else if (!deliverableLinkToDisplay && (payment?.checkouts?.products?.member_area_link || payment?.checkouts?.products?.file_url)) {
                    setDeliverableLinkToDisplay(payment.checkouts.products.member_area_link || payment.checkouts.products.file_url);
                  }

                } else if (res.data.status === 'rejected' || res.data.payment?.status === 'failed') {
                  setPaymentStatus('failed');
                } else {
                  setLastDetail(res.data.status_detail || null);
                }
              }
            } catch (err) {
              console.warn('PaymentSuccess Debug: Erro ao verificar status:', err);
            }
          }
          
          if (currentPaymentData?.payment?.id && paymentStatus === 'pending') {
            const { data: payment } = await supabase
              .from('payments')
              .select(`
                status,
                mp_payment_status,
                checkouts (
                  *,
                  products (*)
                )
              `)
              .eq('id', currentPaymentData.payment.id)
              .maybeSingle();
              
            console.log('PaymentSuccess Debug: Fallback DB payment check:', payment);

            if (payment) {
              if (payment.status === 'completed' || payment.mp_payment_status === 'approved') {
                setPaymentStatus('completed');
                window.history.replaceState({}, '', '/payment-success?status=approved');
                if (payment.checkouts?.products) {
                  setProductData(payment.checkouts.products);
                }
                if (payment?.checkouts?.form_fields?.deliverable) {
                  setCheckoutDeliverable(payment.checkouts.form_fields.deliverable);
                }
              } else if (payment.status === 'failed') {
                setPaymentStatus('failed');
              }
            }
          }
        }
        
      } catch (error) {
        console.error('PaymentSuccess Debug: Erro geral ao verificar status do pagamento:', error);
      } finally {
        setIsChecking(false);
      }
    };

    checkPaymentStatus();
    
    const interval = setInterval(() => {
      if (paymentStatus === 'pending') {
        console.log('PaymentSuccess Debug: Re-checking payment status...');
        checkPaymentStatus();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [searchParams, paymentStatus, deliverableLinkToDisplay]);

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

  const getDeliverableButtonText = (link: string | null) => {
    if (!link) return 'Acessar Produto';
    const fileExtensions = ['.pdf', '.zip', '.rar', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.mp3', '.mp4', '.mov', '.avi'];
    const isDownloadableFile = fileExtensions.some(ext => link.toLowerCase().includes(ext));
    return isDownloadableFile ? 'Fazer Download' : 'Acessar Entregável';
  };

  if (paymentData?.paymentMethod === 'creditCard' && paymentStatus === 'pending') {
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

  if (paymentData?.paymentMethod === 'pix') {
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
                
                {productData && (
                  <div className="bg-white border border-green-200 rounded-lg p-6 space-y-4">
                    <h3 className="font-semibold text-lg text-gray-800">
                      {productData.name}
                    </h3>
                    
                    {productData.description && (
                      <p className="text-gray-600 text-sm">
                        {productData.description}
                      </p>
                    )}
                    
                    <div className="space-y-3">
                      {deliverableLinkToDisplay && (
                        <Button 
                          className="w-full bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => window.open(deliverableLinkToDisplay, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          {getDeliverableButtonText(deliverableLinkToDisplay)}
                        </Button>
                      )}
                      
                      {!deliverableLinkToDisplay && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <p className="text-yellow-800 text-sm">
                            O acesso ao produto será enviado por e-mail em breve.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold text-green-800 mb-2">Importante:</h3>
                  <ul className="text-sm text-green-700 space-y-1 text-left">
                    <li>• Você também receberá um e-mail com os detalhes</li>
                    <li>• Guarde este link para acessar quando quiser</li>
                    <li>• Entre em contato se tiver dúvidas</li>
                  </ul>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
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
                  <li>• Verifique seu e-mail (incluindo spam)</li>
                  <li>• Acesse o produto através do link enviado</li>
                  <li>• Entre em contato conosco se tiver dúvidas</li>
                </ul>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                className="flex-1"
                onClick={() => navigate('/')}
              >
                <Download className="h-4 w-4 mr-2" />
                Voltar ao início
              </Button>
            </div>

            <div className="text-center text-sm text-muted-foreground">
              <p>
                Precisa de ajuda? Entre em contato conosco através do WhatsApp ou e-mail.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PaymentSuccess;