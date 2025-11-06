import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Info } from 'lucide-react';
import { useIntegrations } from '@/hooks/useIntegrations';

const IntegrationsStatus = () => {
  const { mercadoPagoAccounts, metaPixels, utmifyConfig, emailConfig, isConfigured } = useIntegrations();

  const getStatusIcon = (configured: boolean) => {
    return configured ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  const getStatusBadge = (configured: boolean) => {
    return configured ? (
      <Badge variant="default" className="bg-green-100 text-green-800">
        Ativo
      </Badge>
    ) : (
      <Badge variant="secondary">
        Inativo
      </Badge>
    );
  };

  return (
    <Card className="mt-6 sm:mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <Info className="h-5 w-5" />
          Status das Integrações
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon(isConfigured.mercadoPago)}
                <span className="text-sm font-medium">Mercado Pago</span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(isConfigured.mercadoPago)}
                {isConfigured.mercadoPago && (
                  <span className="text-xs text-muted-foreground">
                    {mercadoPagoAccounts.length} conta(s)
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon(isConfigured.metaPixel)}
                <span className="text-sm font-medium">Meta Pixel</span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(isConfigured.metaPixel)}
                {isConfigured.metaPixel && (
                  <span className="text-xs text-muted-foreground">
                    {metaPixels.length} pixel(s)
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon(isConfigured.utmify)}
                <span className="text-sm font-medium">UTMify</span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(isConfigured.utmify)}
                {isConfigured.utmify && utmifyConfig && (
                  <span className="text-xs text-muted-foreground">
                    ID: {utmifyConfig.websiteId}
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon(isConfigured.email)}
                <span className="text-sm font-medium">Email SMTP</span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(isConfigured.email)}
                {isConfigured.email && emailConfig && (
                  <span className="text-xs text-muted-foreground">
                    {emailConfig.provider || 'Personalizado'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default IntegrationsStatus;