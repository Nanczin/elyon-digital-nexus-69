import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"; // Updated Supabase JS version

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  sellerUserId: string; // ID do usuário (vendedor) que configurou o SMTP
  smtpConfig?: any; // Adicionado para receber a configuração SMTP diretamente
}

serve(async (req) => {
  console.log('SEND_EMAIL_PROXY_DEBUG: Função send-email-proxy iniciada.');
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { to, subject, html, sellerUserId, smtpConfig: directSmtpConfig }: EmailRequest = await req.json();

    if (!to || !subject || !html || !sellerUserId) {
      console.error('SEND_EMAIL_PROXY_DEBUG: Dados de e-mail incompletos:', { to, subject, html: html ? 'HTML_PRESENT' : 'HTML_MISSING', sellerUserId });
      return new Response(
        JSON.stringify({ success: false, error: 'Dados de e-mail incompletos (to, subject, html, sellerUserId são obrigatórios)' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    let smtpConfigToUse = directSmtpConfig;

    // Se smtpConfig não foi passado diretamente (como no send-transactional-email), buscar do DB
    if (!smtpConfigToUse) {
      console.log('SEND_EMAIL_PROXY_DEBUG: smtpConfig não fornecido diretamente, buscando do DB para sellerUserId:', sellerUserId);
      const { data: integration, error: integrationError } = await supabase
        .from('integrations')
        .select('smtp_config')
        .eq('user_id', sellerUserId)
        .maybeSingle();

      if (integrationError) {
        console.error('SEND_EMAIL_PROXY_DEBUG: Erro ao buscar configurações de integração para remetente:', integrationError);
        return new Response(
          JSON.stringify({ success: false, error: 'Erro ao buscar configurações de e-mail do vendedor' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
      smtpConfigToUse = integration?.smtp_config as any;
    }

    if (!smtpConfigToUse || !smtpConfigToUse.email || !smtpConfigToUse.appPassword || !smtpConfigToUse.displayName) {
      console.error('SEND_EMAIL_PROXY_DEBUG: Configurações SMTP incompletas ou ausentes para o vendedor:', sellerUserId, 'Config:', JSON.stringify(smtpConfigToUse));
      return new Response(
        JSON.stringify({ success: false, error: 'Configurações SMTP do vendedor incompletas ou ausentes (email, appPassword, displayName são obrigatórios)' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const emailServiceUrlBase = Deno.env.get('EMAIL_SERVICE_URL');
    if (!emailServiceUrlBase) {
      console.error('SEND_EMAIL_PROXY_DEBUG: Variável de ambiente EMAIL_SERVICE_URL não configurada.');
      return new Response(
        JSON.stringify({ success: false, error: 'Serviço de e-mail não configurado. Contate o administrador.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    console.log('SEND_EMAIL_PROXY_DEBUG: EMAIL_SERVICE_URL base:', emailServiceUrlBase);

    const vercelFunctionPath = 'api/send-email'; 
    let fullEmailServiceUrl: URL;
    try {
      const baseUrlString = emailServiceUrlBase.endsWith('/') ? emailServiceUrlBase : `${emailServiceUrlBase}/`;
      const baseUrl = new URL(baseUrlString);
      fullEmailServiceUrl = new URL(vercelFunctionPath, baseUrl);
    } catch (urlError) {
      console.error('SEND_EMAIL_PROXY_DEBUG: Erro ao construir URL completa:', urlError.message);
      return new Response(
        JSON.stringify({ success: false, error: `Erro na configuração da URL do serviço de e-mail: ${urlError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    console.log('SEND_EMAIL_PROXY_DEBUG: URL completa do serviço de e-mail externo:', fullEmailServiceUrl.toString());
    
    const vercelBypassToken = Deno.env.get('VERCEL_AUTOMATION_BYPASS_SECRET');
    if (!vercelBypassToken) {
      console.error('SEND_EMAIL_PROXY_DEBUG: VERCEL_AUTOMATION_BYPASS_SECRET não configurado no Supabase Secrets.');
      return new Response(
        JSON.stringify({ success: false, error: 'Token de bypass do Vercel não configurado. Contate o administrador.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    console.log('SEND_EMAIL_PROXY_DEBUG: VERCEL_AUTOMATION_BYPASS_SECRET obtido (length):', vercelBypassToken.length);

    console.log('SEND_EMAIL_PROXY_DEBUG: Enviando requisição para o serviço de e-mail externo:', fullEmailServiceUrl.toString());
    console.log('SEND_EMAIL_PROXY_DEBUG: Headers da requisição para o serviço externo:', JSON.stringify({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${vercelBypassToken.substring(0, 5)}...`, // Mask token for logs
    }));
    console.log('SEND_EMAIL_PROXY_DEBUG: Body da requisição para o serviço externo (smtpConfig masked):', JSON.stringify({ to, subject, html: html.substring(0, 50) + '...', sellerUserId, smtpConfig: { ...smtpConfigToUse, appPassword: '***' } }, null, 2));

    let response;
    let result;
    let responseText; // To store raw text if not JSON
    try {
      response = await fetch(fullEmailServiceUrl.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${vercelBypassToken}`, // Adicionar o token de bypass aqui
        },
        body: JSON.stringify({ to, subject, html, sellerUserId, smtpConfig: smtpConfigToUse }),
      });
      console.log('SEND_EMAIL_PROXY_DEBUG: Resposta bruta do serviço externo (status):', response.status);
      console.log('SEND_EMAIL_PROXY_DEBUG: Content-Type da resposta:', response.headers.get('Content-Type'));

      // Check if response is JSON before parsing
      const contentType = response.headers.get('Content-Type');
      if (contentType && contentType.includes('application/json')) {
        result = await response.json();
        console.log('SEND_EMAIL_PROXY_DEBUG: Resposta JSON do serviço externo:', JSON.stringify(result, null, 2));
      } else {
        responseText = await response.text();
        console.error('SEND_EMAIL_PROXY_DEBUG: Resposta não é JSON. Raw text:', responseText);
        // If it's not JSON, and not a successful status, treat as an error
        if (!response.ok) {
          return new Response(
            JSON.stringify({ success: false, error: `Serviço de e-mail externo retornou erro HTTP ${response.status} com resposta não-JSON.`, details: responseText }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: response.status }
          );
        }
        // If it's not JSON but status is OK, it's still an unexpected format
        return new Response(
          JSON.stringify({ success: false, error: `Serviço de e-mail externo retornou resposta não-JSON inesperada.`, details: responseText }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
    } catch (fetchError: any) {
      console.error('SEND_EMAIL_PROXY_DEBUG: Erro na chamada fetch para o serviço externo:', fetchError.message, 'Stack:', fetchError.stack);
      return new Response(
        JSON.stringify({ success: false, error: `Erro de rede ou serviço de e-mail externo inacessível: ${fetchError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503 } // Service Unavailable
      );
    }

    if (!response.ok) {
      console.error('SEND_EMAIL_PROXY_DEBUG: Erro do serviço de e-mail externo (response.ok é false):', result?.error || response.statusText);
      return new Response(
        JSON.stringify({ success: false, error: result?.error || 'Erro ao enviar e-mail via serviço externo' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: response.status }
      );
    }

    if (!result?.success) {
      console.error('SEND_EMAIL_PROXY_DEBUG: Falha no envio de e-mail via proxy (result.success é false):', result?.error);
      return new Response(
        JSON.stringify({ success: false, error: result?.error || 'Falha ao enviar e-mail via proxy' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('SEND_EMAIL_PROXY_DEBUG: E-mail enviado com sucesso via serviço externo.');
    return new Response(
      JSON.stringify({ success: true, message: 'E-mail enviado com sucesso via serviço externo' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('SEND_EMAIL_PROXY_DEBUG: Erro geral na função send-email-proxy:', error.message, 'Stack:', error.stack);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Erro interno do servidor' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});