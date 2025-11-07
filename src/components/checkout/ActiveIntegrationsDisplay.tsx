import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, CreditCard, Facebook, Mail, MonitorDot, BarChart3 } from 'lucide-react';

interface ActiveIntegrationsDisplayProps {
  activeIntegrations: string[];
  primaryColor?: string;
}

const integrationIcons: { [key: string]: React.ElementType } = {
  'Mercado Pago': CreditCard,
  'Meta Pixel': Facebook,
  'Email SMTP': Mail,
  'Área de Membros': MonitorDot,
  'UTMify': BarChart3, // Assuming UTMify is also an integration to display
};

const ActiveIntegrationsDisplay: React.FC<ActiveIntegrationsDisplayProps> = ({ activeIntegrations, primaryColor = '#3b82f6' }) => {
  if (!activeIntegrations || activeIntegrations.length === 0) {
    return null;
  }

  return (
    <Card className="bg-gray-50 rounded-lg p-4 sm:p-6 mt-4 sm:mt-8">
      <CardHeader className="text-center pb-4 sm:pb-6">
        <CardTitle className="text-lg sm:text-xl font-bold text-gray-800 flex items-center justify-center gap-2">
          <CheckCircle className="h-5 w-5" style={{ color: primaryColor }} />
          Integrações Ativas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
          {activeIntegrations.map((integrationName) => {
            const IconComponent = integrationIcons[integrationName];
            return (
              <Badge 
                key={integrationName} 
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium"
                style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
              >
                {IconComponent && <IconComponent className="h-4 w-4" />}
                {integrationName}
              </Badge>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default ActiveIntegrationsDisplay;