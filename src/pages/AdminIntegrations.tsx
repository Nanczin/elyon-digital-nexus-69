import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useIntegrations } from '@/hooks/useIntegrations';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, CreditCard, Mail, BarChart3, Facebook } from 'lucide-react';
import MercadoPagoConfig from '@/components/integrations/MercadoPagoConfig';
import MetaPixelConfig from '@/components/integrations/MetaPixelConfig';
import UTMifyConfig from '@/components/integrations/UTMifyConfig';
import EmailConfig from '@/components/integrations/EmailConfig';
import IntegrationsStatus from '@/components/integrations/IntegrationsStatus';

const AdminIntegrations = () => {
  const { user, isAdmin, loading } = useAuth();
  const { isConfigured } = useIntegrations();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const getIntegrationStatus = (name: string) => {
    switch (name) {
      case 'Mercado Pago':
        return isConfigured.mercadoPago ? 'Configurado' : 'Não configurado';
      case 'Meta Pixel':
        return isConfigured.metaPixel ? 'Configurado' : 'Não configurado';
      case 'SMTP Email':
        return isConfigured.email ? 'Configurado' : 'Não configurado';
      case 'UTMify':
        return isConfigured.utmify ? 'Configurado' : 'Não configurado';
      default:
        return 'Não configurado';
    }
  };

  const integrations = [
    {
      name: 'Mercado Pago',
      description: 'Configure seus tokens de acesso para processar pagamentos',
      icon: CreditCard,
      component: MercadoPagoConfig
    },
    {
      name: 'Meta Pixel',
      description: 'Adicione o ID do seu pixel para rastreamento de conversões',
      icon: Facebook,
      component: MetaPixelConfig
    },
    {
      name: 'SMTP Email',
      description: 'Configure o envio de emails transacionais',
      icon: Mail,
      component: EmailConfig
    },
    {
      name: 'UTMify',
      description: 'Adicione códigos de rastreamento para análise',
      icon: BarChart3,
      component: UTMifyConfig
    }
  ];

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Integrações</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-2">
          Configure as integrações externas da sua plataforma
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {integrations.map((integration) => {
          const IconComponent = integration.icon;
          const ConfigComponent = integration.component;
          const status = getIntegrationStatus(integration.name);
          
          return (
            <Card key={integration.name}>
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-lg sm:text-xl">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <IconComponent className="h-5 w-5 text-primary" />
                  </div>
                  {integration.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {integration.description}
                </p>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
                  <span className="text-sm text-muted-foreground">
                    Status: <span className={status === 'Configurado' ? 'text-green-600' : 'text-orange-600'}>
                      {status}
                    </span>
                  </span>
                  <ConfigComponent>
                    <Button variant="outline" size="sm">
                      Configurar
                    </Button>
                  </ConfigComponent>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      <IntegrationsStatus />
    </div>
  );
};

export default AdminIntegrations;