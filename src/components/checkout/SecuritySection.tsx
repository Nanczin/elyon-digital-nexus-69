import { Shield, Heart, Star, Lock, Headphones } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface SecuritySectionProps {
  supportEmail?: string;
  primaryColor?: string;
}

const SecuritySection = ({ supportEmail, primaryColor = '#3b82f6' }: SecuritySectionProps) => {
  const securityFeatures = [
    {
      icon: Heart,
      title: "Garantia de 7 Dias",
      description: "Se não gostar, devolvemos seu dinheiro sem burocracia."
    },
    {
      icon: Star,
      title: "Acesso Imediato", 
      description: "Receba o acesso completo assim que o pagamento for aprovado."
    },
    {
      icon: Lock,
      title: "Pagamento Seguro",
      description: "Processado por Mercado Pago. Ambiente criptografado e protegido para seus dados."
    },
    {
      icon: Headphones,
      title: "Suporte Exclusivo",
      description: "Nossa equipe está pronta para te ajudar no que precisar."
    }
  ];

  // Função para gerar cor transparente a partir da cor principal
  const getTransparentColor = (color: string) => {
    // Remover # se existir
    const hex = color.replace('#', '');
    // Converter hex para RGB
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    return `rgba(${r}, ${g}, ${b}, 0.1)`;
  };

  return (
    <div className="bg-gray-50 rounded-lg p-6 mt-8">
      <div className="text-center mb-6">
        <div className="flex justify-center mb-3">
          <div 
            className="p-3 rounded-full"
            style={{ backgroundColor: getTransparentColor(primaryColor) }}
          >
            <Shield className="h-8 w-8" style={{ color: primaryColor }} />
          </div>
        </div>
        <h3 className="text-xl font-bold text-gray-800">Sua Compra 100% Segura</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {securityFeatures.map((feature, index) => {
          const IconComponent = feature.icon;
          return (
            <div key={index} className="text-center">
              <div className="flex justify-center mb-3">
                <div 
                  className="p-2 rounded-full"
                  style={{ backgroundColor: getTransparentColor(primaryColor) }}
                >
                  <IconComponent className="h-6 w-6" style={{ color: primaryColor }} />
                </div>
              </div>
              <h4 className="font-semibold text-gray-800 mb-2">{feature.title}</h4>
              <p className="text-sm text-gray-600 leading-relaxed">{feature.description}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-8 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
        <div className="mb-2">
          Copyright © 2025 Elyon Digital. Todos os direitos reservados.
        </div>
        {supportEmail && (
          <div className="mt-2">
            Email para suporte: <span style={{ color: primaryColor }}>{supportEmail}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SecuritySection;