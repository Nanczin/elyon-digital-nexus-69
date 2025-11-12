import React, { useState, useEffect } from 'react';
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
import { useToast } from '@/hooks/use-toast'; // Import useToast

const AdminIntegrations = () => {
  const { user, loading: authLoading } = useAuth(); // Removido isAdmin
  const { isConfigured, loading: integrationsLoading, loadIntegrations } = useIntegrations(); // Get loadIntegrations
  const [loadingPage, setLoadingPage] = useState(true); // New state for page-level loading
  const { toast } = useToast(); // Initialize useToast

  useEffect(() => {
    console.log('ADMIN_INTEGRATIONS_DEBUG: useEffect triggered. user:', user?.id, 'authLoading:', authLoading); // Removido isAdmin das dependências
    // Não esperar por authLoading aqui, o redirecionamento será tratado abaixo
    if (user) { // Qualquer usuário logado pode acessar
      const loadData = async () => {
        setLoadingPage(true);
        await loadIntegrations(); // Call loadIntegrations from useIntegrations
        setLoadingPage(false);
        console.log('ADMIN_INTEGRATIONS_DEBUG: Initial data loaded, setLoadingPage(false).');
      };
      loadData();
    } else if (!user) {
      console.log('ADMIN_INTEGRATIONS_DEBUG: Not authenticated, redirecting.');
    }
  }, [user, loadIntegrations]); // Removido authLoading das dependências

  // Removido: if (authLoading) { ... }

  if (!user) {
    console.log('ADMIN_INTEGRATIONS_DEBUG: Redirecting to login because no user.');
    return <Navigate to="/auth/login" replace />;
  }

  // REMOVIDO: if (!isAdmin) { ... }

  if (loadingPage || integrationsLoading) { // Show loading for integrations only after auth is done
    return <div className="flex items-center justify-center min-h-screen">Carregando integrações...</div>;
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
    <div className="container mx-auto p-4 sm:p-6">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Integrações</h1>
        <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">
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
                <CardTitle className="flex items-center gap-2 sm:gap-3 text-lg sm:text-xl">
                  <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg">
                    <IconComponent className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </div>
                  {integration.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-3 sm:mb-4 text-sm sm:text-base">
                  {integration.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    Status: <span className={status === 'Configurado' ? 'text-green-600' : 'text-orange-600'}>
                      {status}
                    </span>
                  </span>
                  <ConfigComponent>
                    <Button variant="outline" size="sm" className="text-xs sm:text-sm">
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