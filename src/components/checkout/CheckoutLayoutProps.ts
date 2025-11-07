// Shared types for checkout layouts
import { CardData } from './CreditCardForm';
import { DeliverableConfig, PackageConfig, GuaranteeConfig, ReservedRightsConfig } from '@/integrations/supabase/types'; // Importar DeliverableConfig e os novos tipos

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

// Atualizado para usar os tipos aninhados
export interface FormFields {
  requireName?: boolean;
  requireEmail?: boolean;
  requireEmailConfirm?: boolean;
  requirePhone?: boolean;
  requireCpf?: boolean;
  packages?: PackageConfig[]; // Usar o novo tipo PackageConfig
  deliverable?: DeliverableConfig; // Usar o tipo DeliverableConfig (this is the checkout-level deliverable)
  sendTransactionalEmail?: boolean; // Adicionado para controlar o envio de e-mail transacional
  transactionalEmailSubject?: string; // Novo campo para o assunto do e-mail
  transactionalEmailBody?: string; // Novo campo para o corpo do e-mail
  guarantee?: GuaranteeConfig; // Adicionado
  reservedRights?: ReservedRightsConfig; // Adicionado
}

// NEW: Interface for banner feature cards
export interface BannerFeatureCard {
  id: number;
  title: string;
  description: string;
}

export interface CheckoutData {
  id: string;
  product_id: string; // This will now represent the *default* product if no package is selected, or the primary product.
  price: number;
  promotional_price: number | null;
  layout: string;
  form_fields: FormFields; // Usar a interface FormFields atualizada
  payment_methods: PaymentMethods;
  order_bumps: OrderBump[];
  styles: {
    backgroundColor?: string;
    primaryColor?: string;
    textColor?: string;
    headlineText?: string;
    headlineColor?: string;
    description?: string; // A descrição principal do checkout vive aqui
    gradientColor?: string;
    highlightColor?: string;
    logo_url?: string | null; // Adicionado logo_url
    banner_url?: string | null; // NOVO: Adicionado banner_url
    banner_background_color?: string; // NEW: Background color for the banner section
    banner_feature_card_color?: string; // NEW: Background color for feature cards
  };
  timer?: {
    enabled?: boolean;
    duration?: number; // em minutos
    color?: string;
    text?: string;
  };
  support_contact: any;
  integrations: any;
  extra_content?: {
    banner_features?: BannerFeatureCard[]; // NEW: Banner feature cards
  };
  products: { // This refers to the `checkouts.product_id`
    id: string;
    name: string;
    description: string;
    banner_url: string;
    logo_url: string;
    member_area_link?: string | null; // Adicionado
    file_url?: string | null; // Adicionado
  };
  user_id?: string | null; // Adicionado
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