import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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
}

serve(async (req) => {
  console.log('SEND_EMAIL_PROXY_DEBUG: Função send-transactional-email iniciada.');
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { to, subject, html, sellerUserId }: EmailRequest = await req.json();

    if (!to || !subject || !html || !sellerUserId) {
      console.error('SEND_EMAIL_PROXY_DEBUG: Dados de e-mail incompletos:', { to, subject, html: html ? 'HTML_PRESENT' : 'HTML_MISSING', sellerUserId });
      return new Response(
        JSON.stringify({ success: false, error: 'Dados de e-mail incompletos (to, subject, html, sellerUserId são obrigatórios)' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // 1. Buscar configurações SMTP do vendedor
    console.log('SEND_EMAIL_PROXY_DEBUG: Buscando configurações SMTP para sellerUserId:', sellerUserId);
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

    const smtpConfig = integration?.smtp_config as any;
    if (!smtpConfig || !smtpConfig.email || !smtpConfig.appPassword || !smtpConfig.displayName) {
      console.error('SEND_EMAIL_PROXY_DEBUG: Configurações SMTP incompletas ou ausentes para o vendedor:', sellerUserId, 'Config:', JSON.stringify(smtpConfig));
      return new Response(
        JSON.stringify({ success: false, error: 'Configurações SMTP do vendedor incompletas ou ausentes (email, appPassword, displayName são obrigatórios)' }),
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
    console.log('SEND_EMAIL_PROXY_DEBUG: EMAIL_SERVICE_URL:', emailServiceUrl); // Log explícito da URL

    console.log('SEND_EMAIL_PROXY_DEBUG: Enviando requisição para o serviço de e-mail externo:', emailServiceUrl);
    let response;
    let result;
    try {
      response = await fetch(`${emailServiceUrl}`, { // Removido '/send-email' pois a Vercel Function já é o endpoint
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