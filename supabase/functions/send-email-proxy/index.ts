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
    const { to, subject, html, sellerUserId, from } = await req.json(); // Adicionado 'from'

    if (!to || !subject || !html || !sellerUserId) {
      console.error('SEND_EMAIL_PROXY_DEBUG: Dados de e-mail incompletos:', { to, subject, html: html ? 'HTML_PRESENT' : 'HTML_MISSING', sellerUserId });
      return new Response(
        JSON.stringify({ success: false, error: 'Dados de e-mail incompletos (to, subject, html, sellerUserId são obrigatórios)' }),
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
    const response = await fetch(`${emailServiceUrl}/send-email`, { // Assumindo um endpoint /send-email no seu server.js
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to, subject, html, sellerUserId, from }), // Passar 'from' para o serviço externo
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('SEND_EMAIL_PROXY_DEBUG: Erro do serviço de e-mail externo:', result.error || response.statusText);
      return new Response(
        JSON.stringify({ success: false, error: result.error || 'Erro ao enviar e-mail via serviço externo' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: response.status }
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