import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface MercadoPagoAccount {
  id: string;
  name: string;
  accessToken: string;
  publicKey: string;
  clientId: string;
  clientSecret: string;
}

interface MetaPixel {
  id: string;
  name: string;
  pixelId: string;
  accessToken?: string;
}

interface UTMifyConfig {
  apiKey: string;
  websiteId: string;
  trackPurchases: boolean;
  trackEvents: boolean;
  customDomain?: string;
}

interface EmailConfig {
  provider: string;
  host: string;
  port: string;
  username: string;
  password: string;
  fromEmail: string;
  fromName: string;
  secure: boolean;
}

export const useIntegrations = () => {
  const { user } = useAuth();
  const [mercadoPagoAccounts, setMercadoPagoAccounts] = useState<MercadoPagoAccount[]>([]);
  const [metaPixels, setMetaPixels] = useState<MetaPixel[]>([]);
  const [utmifyConfig, setUtmifyConfig] = useState<UTMifyConfig | null>(null);
  const [emailConfig, setEmailConfig] = useState<EmailConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadIntegrations();
    } else {
      // Limpar dados quando não há usuário logado
      setMercadoPagoAccounts([]);
      setMetaPixels([]);
      setUtmifyConfig(null);
      setEmailConfig(null);
      setLoading(false);
    }
  }, [user]);

  const loadIntegrations = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Erro ao carregar integrações:', error);
        return;
      }

      if (data) {
        // Parse dos dados salvos
        setMercadoPagoAccounts(data.mercado_pago_access_token ? [{
          id: '1',
          name: 'Conta Principal',
          accessToken: data.mercado_pago_access_token,
          publicKey: data.mercado_pago_token_public || '',
          clientId: '',
          clientSecret: ''
        }] : []);

        setMetaPixels(data.meta_pixel_id ? [{
          id: '1',
          name: 'Pixel Principal',
          pixelId: data.meta_pixel_id,
          accessToken: ''
        }] : []);

        setUtmifyConfig(data.utmify_code ? {
          apiKey: data.utmify_code,
          websiteId: '',
          trackPurchases: true,
          trackEvents: true,
          customDomain: ''
        } : null);

        setEmailConfig(data.smtp_config && typeof data.smtp_config === 'object' && Object.keys(data.smtp_config).length > 0 ? data.smtp_config as unknown as EmailConfig : null);
      }
    } catch (error) {
      console.error('Erro ao carregar integrações:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveIntegrations = async (updates: Partial<{
    mercadoPagoAccounts: MercadoPagoAccount[];
    metaPixels: MetaPixel[];
    utmifyConfig: UTMifyConfig | null;
    emailConfig: EmailConfig | null;
  }>) => {
    if (!user) return;

    try {
      const integrationData: any = {};

      if (updates.mercadoPagoAccounts !== undefined) {
        const account = updates.mercadoPagoAccounts[0];
        integrationData.mercado_pago_access_token = account?.accessToken || null;
        integrationData.mercado_pago_token_public = account?.publicKey || null;
        setMercadoPagoAccounts(updates.mercadoPagoAccounts);
      }

      if (updates.metaPixels !== undefined) {
        const pixel = updates.metaPixels[0];
        integrationData.meta_pixel_id = pixel?.pixelId || null;
        setMetaPixels(updates.metaPixels);
      }

      if (updates.utmifyConfig !== undefined) {
        integrationData.utmify_code = updates.utmifyConfig?.apiKey || null;
        setUtmifyConfig(updates.utmifyConfig);
      }

      if (updates.emailConfig !== undefined) {
        integrationData.smtp_config = updates.emailConfig || {};
        setEmailConfig(updates.emailConfig);
      }

      // Verificar se existe integração para este usuário
      const { data: existing } = await supabase
        .from('integrations')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (existing) {
        // Atualizar existente
        const { error } = await supabase
          .from('integrations')
          .update(integrationData)
          .eq('user_id', user.id);

        if (error) {
          console.error('Erro ao atualizar integrações:', error);
          throw error;
        }
      } else {
        // Criar nova
        const { error } = await supabase
          .from('integrations')
          .insert({
            user_id: user.id,
            ...integrationData
          });

        if (error) {
          console.error('Erro ao criar integrações:', error);
          throw error;
        }
      }
    } catch (error) {
      console.error('Erro ao salvar integrações:', error);
      throw error;
    }
  };

  const trackPurchase = (purchaseData: any) => {
    // Implementar tracking de compra para UTMify
    if (utmifyConfig && utmifyConfig.trackPurchases) {
      console.log('Tracking purchase with UTMify:', purchaseData);
      // Aqui você implementaria a chamada para a API do UTMify
    }
  };

  const trackEvent = (eventName: string, eventData: any) => {
    // Implementar tracking de evento para UTMify
    if (utmifyConfig && utmifyConfig.trackEvents) {
      console.log('Tracking event with UTMify:', eventName, eventData);
      // Aqui você implementaria a chamada para a API do UTMify
    }
  };

  const sendEmail = async (emailData: {
    to: string;
    subject: string;
    html: string;
  }) => {
    // Implementar envio de email
    if (emailConfig) {
      console.log('Sending email:', emailData);
      // Aqui você implementaria a chamada para o servidor SMTP
      // Geralmente isso seria feito através de uma API backend
    }
  };

  const fireMetaPixel = (eventName: string, eventData: any) => {
    // Implementar disparo de eventos para Meta Pixel
    if (metaPixels.length > 0) {
      metaPixels.forEach((pixel) => {
        if (typeof window !== 'undefined' && (window as any).fbq) {
          (window as any).fbq('track', eventName, eventData);
        }
      });
    }
  };

  // Lógica atualizada para verificar se a configuração de e-mail está ativa
  const isEmailConfigured = emailConfig && 
                             emailConfig.host && 
                             emailConfig.username && 
                             emailConfig.password && 
                             emailConfig.fromEmail;

  return {
    mercadoPagoAccounts,
    metaPixels,
    utmifyConfig,
    emailConfig,
    loading,
    saveIntegrations,
    loadIntegrations,
    trackPurchase,
    trackEvent,
    sendEmail,
    fireMetaPixel,
    isConfigured: {
      mercadoPago: mercadoPagoAccounts.length > 0,
      metaPixel: metaPixels.length > 0,
      utmify: utmifyConfig !== null,
      email: isEmailConfigured // Usar a nova variável de status
    }
  };
};