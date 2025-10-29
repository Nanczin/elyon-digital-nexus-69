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
  console.log('SEND_EMAIL_DEBUG: Função send-transactional-email iniciada.');
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { to, subject, html, sellerUserId }: EmailRequest = await req.json();

    if (!to || !subject || !html || !sellerUserId) {
      console.error('SEND_EMAIL_DEBUG: Dados de e-mail incompletos:', { to, subject, html: html ? 'HTML_PRESENT' : 'HTML_MISSING', sellerUserId });
      return new Response(
        JSON.stringify({ success: false, error: 'Dados de e-mail incompletos (to, subject, html, sellerUserId são obrigatórios)' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // 1. Buscar configurações SMTP do vendedor para obter o 'from'
    console.log('SEND_EMAIL_DEBUG: Buscando configurações SMTP para sellerUserId para obter o remetente formatado:', sellerUserId);
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('smtp_config')
      .eq('user_id', sellerUserId)
      .maybeSingle();

    if (integrationError) {
      console.error('SEND_EMAIL_DEBUG: Erro ao buscar configurações de integração para remetente:', integrationError);
      // Não é um erro crítico para o envio, mas o remetente pode ser genérico
    }

    const smtpConfig = integration?.smtp_config as any;
    const finalFromEmail = smtpConfig?.email || 'suporte@elyondigital.com'; // Fallback
    const finalFromName = smtpConfig?.displayName || 'Elyon Digital'; // Fallback
    const formattedFrom = `${finalFromName} <${finalFromEmail}>`;

    // Chamar a função proxy para enviar o e-mail
    console.log('SEND_EMAIL_DEBUG: Invocando função proxy send-email-proxy para enviar e-mail.');
    const { data: proxyResult, error: proxyError } = await supabase.functions.invoke(
      'send-email-proxy',
      {
        body: { to, subject, html, sellerUserId, from: formattedFrom }, // Passar o remetente formatado
        method: 'POST'
      }
    );

    if (proxyError) {
      console.error('SEND_EMAIL_DEBUG: Erro ao invocar send-email-proxy:', proxyError);
      return new Response(
        JSON.stringify({ success: false, error: proxyError.message || 'Erro ao enviar e-mail via proxy' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    if (!proxyResult?.success) {
      console.error('SEND_EMAIL_DEBUG: Falha no envio de e-mail via proxy:', proxyResult?.error);
      return new Response(
        JSON.stringify({ success: false, error: proxyResult?.error || 'Falha ao enviar e-mail via proxy' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('SEND_EMAIL_DEBUG: E-mail enviado com sucesso via proxy.');
    return new Response(
      JSON.stringify({ success: true, message: 'E-mail enviado com sucesso' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('SEND_EMAIL_DEBUG: Erro geral na função send-transactional-email:', error.message, 'Stack:', error.stack);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Erro interno do servidor' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});