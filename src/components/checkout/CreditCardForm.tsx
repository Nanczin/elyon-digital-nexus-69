import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard } from 'lucide-react';

interface CreditCardFormProps {
  onCardDataChange: (cardData: CardData) => void;
  primaryColor: string;
  textColor: string;
  maxInstallments?: number;
  installmentsWithInterest?: boolean;
  totalAmount: number;
}

export interface CardData {
  cardNumber: string;
  cardholderName: string;
  expirationMonth: string;
  expirationYear: string;
  securityCode: string;
  installments: number;
}

export const CreditCardForm = ({ onCardDataChange, primaryColor, textColor, maxInstallments = 12, installmentsWithInterest = false, totalAmount }: CreditCardFormProps) => {
  const [cardData, setCardData] = useState<CardData>({
    cardNumber: '',
    cardholderName: '',
    expirationMonth: '',
    expirationYear: '',
    securityCode: '',
    installments: 1
  });

  useEffect(() => {
    onCardDataChange(cardData);
  }, [cardData]);

  const formatCardNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    const formatted = numbers.match(/.{1,4}/g)?.join(' ') || numbers;
    return formatted.substring(0, 19); // 16 digits + 3 spaces
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    setCardData(prev => ({ ...prev, cardNumber: formatted }));
  };

  const handleSecurityCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').substring(0, 4);
    setCardData(prev => ({ ...prev, securityCode: value }));
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 15 }, (_, i) => currentYear + i);
  const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));

  return (
    <div className="space-y-4 p-4 border rounded-lg" style={{ borderColor: `${primaryColor}40` }}>
      <div className="flex items-center gap-2 mb-4">
        <CreditCard className="h-5 w-5" style={{ color: primaryColor }} />
        <h3 className="font-semibold" style={{ color: textColor }}>Dados do Cartão</h3>
      </div>

      <div className="space-y-3">
        <div>
          <Label htmlFor="cardNumber" style={{ color: textColor }}>Número do Cartão</Label>
          <Input
            id="cardNumber"
            placeholder="1234 5678 9012 3456"
            value={cardData.cardNumber}
            onChange={handleCardNumberChange}
            maxLength={19}
            required
          />
        </div>

        <div>
          <Label htmlFor="cardholderName" style={{ color: textColor }}>Nome no Cartão</Label>
          <Input
            id="cardholderName"
            placeholder="Nome como está no cartão"
            value={cardData.cardholderName}
            onChange={(e) => setCardData(prev => ({ ...prev, cardholderName: e.target.value.toUpperCase() }))}
            required
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label htmlFor="expirationMonth" style={{ color: textColor }}>Mês</Label>
            <Select 
              value={cardData.expirationMonth} 
              onValueChange={(value) => setCardData(prev => ({ ...prev, expirationMonth: value }))}
            >
              <SelectTrigger id="expirationMonth">
                <SelectValue placeholder="MM" />
              </SelectTrigger>
              <SelectContent>
                {months.map(month => (
                  <SelectItem key={month} value={month}>{month}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="expirationYear" style={{ color: textColor }}>Ano</Label>
            <Select 
              value={cardData.expirationYear} 
              onValueChange={(value) => setCardData(prev => ({ ...prev, expirationYear: value }))}
            >
              <SelectTrigger id="expirationYear">
                <SelectValue placeholder="AAAA" />
              </SelectTrigger>
              <SelectContent>
                {years.map(year => (
                  <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="securityCode" style={{ color: textColor }}>CVV</Label>
            <Input
              id="securityCode"
              placeholder="123"
              value={cardData.securityCode}
              onChange={handleSecurityCodeChange}
              maxLength={4}
              required
            />
          </div>
        </div>

        <div>
          <Label htmlFor="installments" style={{ color: textColor }}>Parcelas</Label>
          <Select 
            value={String(cardData.installments)} 
            onValueChange={(value) => setCardData(prev => ({ ...prev, installments: parseInt(value) }))}
          >
            <SelectTrigger id="installments" className="bg-white dark:bg-gray-800">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-gray-800 z-50">
              {Array.from({ length: maxInstallments }, (_, i) => i + 1).map(num => {
                const installmentValue = totalAmount / num;
                return (
                  <SelectItem key={num} value={String(num)}>
                    {num}x de R$ {installmentValue.toFixed(2).replace('.', ',')} 
                    {installmentsWithInterest && num > 1 ? ' com juros' : ' sem juros'}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};
