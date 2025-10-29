import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 });
  }

  try {
    const { to, subject, html, sellerUserId, smtpConfig } = await req.json();

    if (!to || !subject || !html || !sellerUserId || !smtpConfig || !smtpConfig.email || !smtpConfig.appPassword) {
      console.error('SEND_EMAIL_PROXY_DEBUG: Dados de e-mail incompletos:', { to, subject, html: html ? 'HTML_PRESENT' : 'HTML_MISSING', sellerUserId, smtpConfig });
      return new Response(
        JSON.stringify({ success: false, error: 'Dados de e-mail incompletos (to, subject, html, sellerUserId, smtpConfig.email, smtpConfig.appPassword são obrigatórios)' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const emailServiceUrl = Deno.env.get('EMAIL_SERVICE_URL');
    if (!emailServiceUrl) {
      console.error('SEND_EMAIL_PROXY_DEBUG: Variável de ambiente EMAIL_SERVICE_URL não configurada.');
      return new Response(
        JSON.stringify({ success: false, error: 'Serviço de e-mail não configurado. Contate o administrador.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('SEND_EMAIL_PROXY_DEBUG: Enviando requisição para o serviço de e-mail externo:', emailServiceUrl);
    let response;
    let result;
    try {
      response = await fetch(`${emailServiceUrl}/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ to, subject, html, sellerUserId, smtpConfig }),
      });
      console.log('SEND_EMAIL_PROXY_DEBUG: Resposta bruta do serviço externo (status):', response.status);
      result = await response.json();
      console.log('SEND_EMAIL_PROXY_DEBUG: Resposta JSON do serviço externo:', JSON.stringify(result, null, 2));
    } catch (fetchError: any) {
      console.error('SEND_EMAIL_PROXY_DEBUG: Erro na chamada fetch para o serviço externo:', fetchError.message, 'Stack:', fetchError.stack);
      return new Response(
        JSON.stringify({ success: false, error: `Erro de rede ou serviço de e-mail externo inacessível: ${fetchError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503 } // Service Unavailable
      );
    }


    if (!response.ok) {
      console.error('SEND_EMAIL_PROXY_DEBUG: Erro do serviço de e-mail externo (response.ok é false):', result.error || response.statusText);
      return new Response(
        JSON.stringify({ success: false, error: result.error || 'Erro ao enviar e-mail via serviço externo' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: response.status }
      );
    }

    if (!result?.success) { // Check if the external service explicitly returned success: false
      console.error('SEND_EMAIL_PROXY_DEBUG: Falha no envio de e-mail via proxy (result.success é false):', result?.error);
      return new Response(
        JSON.stringify({ success: false, error: result?.error || 'Falha ao enviar e-mail via proxy' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 } // Or result.status if available
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