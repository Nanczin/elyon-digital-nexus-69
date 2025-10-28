// Shared types for checkout layouts
import { CardData } from './CreditCardForm';
import { DeliverableConfig } from '@/integrations/supabase/types'; // Importar DeliverableConfig

export interface OrderBump {
  id: number;
  selectedProduct: string;
  price: number;
  originalPrice: number;
  enabled: boolean;
  product?: {
    id: string;
    name: string;
    description: string;
    banner_url: string;
    logo_url: string;
  } | null;
}

export interface PaymentMethods {
  pix?: boolean;
  creditCard?: boolean;
  maxInstallments?: number;
  installmentsWithInterest?: boolean;
}

export interface FormFields {
  requireName?: boolean;
  requireEmail?: boolean;
  requireEmailConfirm?: boolean;
  requirePhone?: boolean;
  requireCpf?: boolean;
  packages?: any[]; // Assuming packages can be part of form_fields
  deliverable?: DeliverableConfig; // Usar o tipo DeliverableConfig
}

export interface CheckoutData {
  id: string;
  product_id: string;
  price: number;
  promotional_price: number | null;
  layout: string;
  form_fields: FormFields;
  payment_methods: PaymentMethods;
  order_bumps: OrderBump[];
  styles: {
    backgroundColor?: string;
    primaryColor?: string;
    textColor?: string;
    headlineText?: string;
    headlineColor?: string;
    description?: string;
    gradientColor?: string;
    highlightColor?: string;
  };
  timer?: {
    enabled?: boolean;
    duration?: number; // em minutos
    color?: string;
    text?: string;
  };
  support_contact: any;
  integrations: any;
  products: {
    id: string;
    name: string;
    description: string;
    banner_url: string;
    logo_url: string;
    member_area_link?: string | null; // Adicionado
    file_url?: string | null; // Adicionado
  };
}

export interface CustomerData {
  name: string;
  email: string;
  emailConfirm: string;
  phone: string;
  cpf: string;
}

export interface CheckoutLayoutProps {
  checkout: CheckoutData;
  customerData: CustomerData;
  selectedOrderBumps: number[];
  selectedPaymentMethod: string;
  selectedPackage?: number;
  setSelectedPackage?: (packageId: number) => void;
  processing: boolean;
  textColor: string;
  primaryColor: string;
  headlineText: string;
  headlineColor: string;
  description: string;
  gradientColor: string;
  calculateTotal: () => number;
  calculateSavings: () => number;
  handleInputChange: (field: keyof CustomerData, value: string) => void;
  handleOrderBumpToggle: (bumpId: number) => void;
  setSelectedPaymentMethod: (method: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
  cardData: CardData | null;
  setCardData: (cardData: CardData | null) => void;
  mpPublicKey?: string;
  selectedInstallments: number; // Added for standard checkout
  setSelectedInstallments: (installments: number) => void; // Added for standard checkout
}