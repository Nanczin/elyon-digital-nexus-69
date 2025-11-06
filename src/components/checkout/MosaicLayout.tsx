import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Shield, CheckCircle, CreditCard, Star, Heart, ArrowRight, Clock, ShoppingBag, QrCode } from 'lucide-react';
import { CheckoutLayoutProps } from './CheckoutLayoutProps';
import { getOrderBumpPrefix } from '@/utils/orderBumpUtils';
import { processHeadlineText, formatCurrency } from '@/utils/textFormatting';
import PackageSelector from './PackageSelector';
import SecuritySection from './SecuritySection';
import CountdownTimer from './CountdownTimer';
import { CreditCardForm } from './CreditCardForm';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';


const MosaicLayout = ({
  checkout,
  customerData,
  selectedOrderBumps,
  selectedPaymentMethod,
  selectedPackage = 1,
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
  mpPublicKey,
  selectedInstallments,
  setSelectedInstallments
}: CheckoutLayoutProps) => {
  const handlePackageSelect = (packageId: number) => {
    setSelectedPackage?.(packageId);
  };
  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Countdown Timer */}
      {(() => {
        console.log('Verificando timer no Mosaic:', checkout.timer);
        console.log('Timer enabled no Mosaic?', checkout.timer?.enabled);
        return checkout.timer?.enabled && (
          <div className="mb-4 sm:mb-8">
            <CountdownTimer
              duration={checkout.timer.duration || 15}
              color={checkout.timer.color || primaryColor}
              text={checkout.timer.text || "Oferta por tempo limitado"}
            />
          </div>
        );
      })()}

      {/* Header centralizado */}
      <div className="text-center space-y-4 sm:space-y-6 py-8 sm:py-12 mb-8 sm:mb-12">
        {checkout.products.logo_url && (
          <div className="flex justify-center mb-6 sm:mb-8">
            <img 
              src={checkout.products.logo_url} 
              alt={checkout.products.name}
              className="h-24 sm:h-32 lg:h-40 w-auto object-contain animate-fade-in hover-scale"
            />
          </div>
        )}
        <div className="space-y-4 sm:space-y-6">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold animate-fade-in leading-tight" style={{ color: headlineColor }}>
            {processHeadlineText(headlineText, checkout.styles?.highlightColor || primaryColor)}
          </h1>
          
          <p className="text-base sm:text-lg lg:text-2xl text-gray-600 max-w-4xl mx-auto leading-relaxed animate-fade-in">
            {description}
          </p>
        </div>
      </div>
      
      {/* Container Principal com todas as seções */}
      <Card className="shadow-2xl border-2 max-w-5xl mx-auto mb-8 sm:mb-12">
        <CardContent className="p-4 sm:p-8 lg:p-10">
          <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-10">
            {/* Section 1: Seus dados */}
            <div className="space-y-4 sm:space-y-6">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 border-b-2 pb-3 sm:pb-4 text-center">Seus dados</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mt-4 sm:mt-8">
                {(checkout.form_fields?.requireName !== false) && (
                  <div>
                    <Label htmlFor="name" className="text-sm">Nome completo</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Seu nome completo"
                      value={customerData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      required
                      className="text-sm"
                    />
                  </div>
                )}

                {(checkout.form_fields?.requireEmail !== false) && (
                  <div>
                    <Label htmlFor="email" className="text-sm">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu.melhor@email.com"
                      value={customerData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      required
                      className="text-sm"
                    />
                  </div>
                )}

                {(checkout.form_fields?.requireEmailConfirm !== false) && (
                  <div>
                    <Label htmlFor="emailConfirm" className="text-sm">Confirmar E-mail</Label>
                    <Input
                      id="emailConfirm"
                      type="email"
                      placeholder="Confirme seu e-mail"
                      value={customerData.emailConfirm}
                      onChange={(e) => handleInputChange('emailConfirm', e.target.value)}
                      required
                      className="text-sm"
                    />
                  </div>
                )}

                {(checkout.form_fields?.requirePhone !== false) && (
                  <div>
                    <Label htmlFor="phone" className="text-sm">Telefone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="(11) 99999-9999"
                      value={customerData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      required
                      className="text-sm"
                    />
                  </div>
                )}

                {(checkout.form_fields?.requireCpf !== false) && (
                  <div>
                    <Label htmlFor="cpf" className="text-sm">CPF</Label>
                    <Input
                      id="cpf"
                      type="text"
                      placeholder="000.000.000-00"
                      value={customerData.cpf}
                      onChange={(e) => handleInputChange('cpf', e.target.value)}
                      required
                      className="text-sm"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Section 2: Escolha seu pacote */}
            {(checkout.form_fields as any)?.packages && (checkout.form_fields as any).packages.length > 0 && (
              <div className="space-y-4 sm:space-y-8">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 border-b-2 pb-3 sm:pb-4 text-center">Escolha seu pacote</h2>
                
                <PackageSelector
                  packages={(checkout.form_fields as any).packages}
                  selectedPackage={selectedPackage}
                  onSelectPackage={setSelectedPackage}
                  primaryColor={primaryColor}
                  textColor="#1f2937"
                />
              </div>
            )}

            {/* Section 3: Turbine sua jornada */}
            {checkout.order_bumps && checkout.order_bumps.length > 0 && checkout.order_bumps.some(bump => bump.enabled) && (
              <div className="space-y-4 sm:space-y-8">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 border-b-2 pb-3 sm:pb-4 text-center">Turbine sua jornada</h2>
                <p className="text-sm sm:text-lg lg:text-xl text-gray-600 text-center max-w-3xl mx-auto">Aproveite o desconto exclusivo e adicione estes guias complementares.</p>
                
                <div className="space-y-3 sm:space-y-4 mt-4 sm:mt-8">
                  {checkout.order_bumps
                    .filter(bump => bump.enabled)
                    .map((bump) => {
                      const product = bump.product;
                      const productName = product?.name || 'Produto adicional';
                      const productDescription = product?.description || 'Produto adicional para complementar sua compra';
                      
                      return (
                         <div key={bump.id} className={`order-bump-container cursor-pointer ${selectedOrderBumps.includes(bump.id) ? 'selected' : ''}`} style={{
                           borderColor: selectedOrderBumps.includes(bump.id) ? primaryColor : undefined,
                           boxShadow: selectedOrderBumps.includes(bump.id) ? `0 4px 16px ${primaryColor}40, 0 2px 8px rgba(0, 0, 0, 0.1), 0 0 0 3px ${primaryColor}20` : undefined
                         }} onClick={() => handleOrderBumpToggle(bump.id)}>
                          <div className="flex items-start space-x-2 sm:space-x-3">
                             <div className="relative mt-1 flex-shrink-0">
                                <div 
                                  className="w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200"
                                  style={{
                                    borderColor: selectedOrderBumps.includes(bump.id) ? primaryColor : '#d1d5db',
                                    backgroundColor: selectedOrderBumps.includes(bump.id) ? primaryColor : 'transparent'
                                  }}
                                >
                                 {selectedOrderBumps.includes(bump.id) && (
                                   <svg 
                                     width="8" 
                                     height="6" 
                                     viewBox="0 0 12 9" 
                                     fill="none" 
                                     xmlns="http://www.w3.org/2000/svg"
                                     className="sm:w-3 sm:h-2.5"
                                   >
                                     <path 
                                       d="M1 4.5L4.5 8L11 1.5" 
                                       stroke="white" 
                                       strokeWidth="2" 
                                       strokeLinecap="round" 
                                       strokeLinejoin="round"
                                     />
                                   </svg>
                                 )}
                               </div>
                             </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                                <h4 className="font-semibold text-sm sm:text-base lg:text-lg line-clamp-2">{productName}</h4>
                                <span className="font-bold text-sm sm:text-base lg:text-lg flex-shrink-0" style={{ color: primaryColor }}>
                                  {formatCurrency(bump.price)}
                                </span>
                              </div>
                              <p className="text-xs sm:text-sm text-gray-600 mt-1 line-clamp-2">{productDescription}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Section 4: Método de Pagamento */}
            <div className="space-y-4 sm:space-y-6">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 border-b-2 pb-3 sm:pb-4 text-center">Forma de Pagamento</h2>
              
              <div className="space-y-3 sm:space-y-4 mt-4 sm:mt-8">
                {checkout.payment_methods?.pix && (
                  <div
                    onClick={() => setSelectedPaymentMethod('pix')}
                    className={`p-3 sm:p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedPaymentMethod === 'pix' ? 'border-current shadow-lg' : 'border-gray-200'
                    }`}
                    style={{ borderColor: selectedPaymentMethod === 'pix' ? primaryColor : undefined }}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedPaymentMethod === 'pix' ? 'border-current' : 'border-gray-300'
                      }`} style={{ borderColor: selectedPaymentMethod === 'pix' ? primaryColor : undefined }}>
                        {selectedPaymentMethod === 'pix' && (
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: primaryColor }}></div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <QrCode className="h-5 w-5" />
                          <span className="font-semibold text-sm sm:text-base">PIX</span>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-600">Aprovação instantânea</p>
                      </div>
                    </div>
                  </div>
                )}

                {checkout.payment_methods?.creditCard && (
                  <div className="space-y-3 sm:space-y-4">
                    <div
                      onClick={() => setSelectedPaymentMethod('creditCard')}
                      className={`p-3 sm:p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedPaymentMethod === 'creditCard' ? 'border-current shadow-lg' : 'border-gray-200'
                      }`}
                      style={{ borderColor: selectedPaymentMethod === 'creditCard' ? primaryColor : undefined }}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          selectedPaymentMethod === 'creditCard' ? 'border-current' : 'border-gray-300'
                        }`} style={{ borderColor: selectedPaymentMethod === 'creditCard' ? primaryColor : undefined }}>
                          {selectedPaymentMethod === 'creditCard' && (
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: primaryColor }}></div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5" />
                            <span className="font-semibold text-sm sm:text-base">Cartão de Crédito</span>
                          </div>
                          <p className="text-xs sm:text-sm text-gray-600">Parcelamento em até 12x sem juros</p>
                        </div>
                      </div>
                    </div>

                    {selectedPaymentMethod === 'creditCard' && (
                      <CreditCardForm
                        onCardDataChange={setCardData}
                        primaryColor={primaryColor}
                        textColor={textColor}
                        maxInstallments={checkout.payment_methods?.maxInstallments || 12}
                        installmentsWithInterest={checkout.payment_methods?.installmentsWithInterest || false}
                        totalAmount={calculateTotal()}
                        mpPublicKey={mpPublicKey}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Section 5: Resumo do pedido */}
            <div className="space-y-4 sm:space-y-6 bg-gray-50 p-4 sm:p-8 rounded-xl border-2">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 border-b-2 pb-3 sm:pb-4 text-center">Resumo do Pedido</h2>
              
              <div className="space-y-2 sm:space-y-3">
                {(() => {
                  const packages = (checkout.form_fields as any)?.packages;
                  if (packages && packages.length > 0) {
                    const selectedPkg = packages.find((pkg: any) => pkg.id === selectedPackage);
                    if (selectedPkg) {
                      return (
                        <div className="flex justify-between text-sm sm:text-base">
                          <span className="text-gray-700">Pacote Completo</span>
                          <span className="font-semibold text-gray-800">
                            {formatCurrency(selectedPkg.price || (checkout.promotional_price || checkout.price))}
                          </span>
                        </div>
                      );
                    }
                  }
                  return (
                    <div className="flex justify-between text-sm sm:text-base">
                      <span className="text-gray-700">Pacote Completo</span>
                      <span className="font-semibold text-gray-800">
                        {formatCurrency(checkout.promotional_price || checkout.price)}
                      </span>
                    </div>
                  );
                })()}

                {selectedOrderBumps.map(bumpId => {
                  const bump = checkout.order_bumps.find(b => b.id === bumpId);
                  if (bump && bump.enabled) {
                    const productName = bump.product?.name || 'Produto adicional';
                    return (
                      <div key={bumpId} className="flex justify-between text-sm sm:text-base">
                        <span className="text-gray-600">{productName}</span>
                      <span className="text-gray-600">
                        + {formatCurrency(bump.price)}
                      </span>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>

              <div className="border-t-2 pt-4 sm:pt-6 mt-4 sm:mt-6">
                <div className="flex justify-between text-xl sm:text-2xl lg:text-3xl font-bold mb-4 sm:mb-8">
                  <span className="text-gray-800">Total a pagar</span>
                  <span className="text-gray-800">
                    {formatCurrency(calculateTotal())}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={processing}
                className="w-full py-3 sm:py-4 text-white font-bold text-lg sm:text-xl lg:text-2xl rounded-xl transition-all duration-300 hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-3 group shadow-xl"
                style={{
                  background: `linear-gradient(135deg, ${primaryColor}, ${gradientColor}dd)`,
                  boxShadow: `0 8px 25px ${primaryColor}40`
                }}
              >
                <span>{processing ? 'Processando...' : 'Finalizar Compra Agora'}</span>
                {!processing && (
                  <svg 
                    className="w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-300 group-hover:translate-x-1" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                )}
              </button>

              <div className="text-center text-xs sm:text-sm text-gray-600 mt-4 sm:mt-6 flex flex-col sm:flex-row items-center justify-center gap-2">
                <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 flex-shrink-0" />
                <span className="text-center">
                  {selectedPaymentMethod === 'pix' 
                    ? 'Pagamento via PIX processado pelo Mercado Pago. Aprovação imediata e ambiente 100% seguro.'
                    : selectedPaymentMethod === 'creditCard'
                      ? 'Pagamento via Cartão de Crédito processado pelo Mercado Pago. Ambiente 100% seguro.'
                      : 'Pagamento processado pelo Mercado Pago. Ambiente 100% seguro.'}
                </span>
              </div>

                {checkout.support_contact && (
                  <div className="text-center text-xs sm:text-sm text-gray-600 mt-2">
                    Dúvidas? Entre em contato: {checkout.support_contact.whatsapp || checkout.support_contact.email}
                  </div>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Seção de Segurança */}
        <div className="mt-8 sm:mt-16">
          <SecuritySection 
            supportEmail={checkout.support_contact?.email} 
            primaryColor={checkout.styles?.primaryColor || '#3b82f6'}
          />
        </div>
    </div>
  );
};

export default MosaicLayout;