import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface TestEmailRequest {
  to: string;
  sellerUserId: string;
}

serve(async (req) => {
  console.log('TEST_EMAIL_CONNECTION_DEBUG: Função test-email-connection iniciada.');
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { to, sellerUserId }: TestEmailRequest = await req.json();

    if (!to || !sellerUserId) {
      console.error('TEST_EMAIL_CONNECTION_DEBUG: Dados incompletos:', { to, sellerUserId });
      return new Response(
        JSON.stringify({ success: false, error: 'E-mail do destinatário e ID do vendedor são obrigatórios.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // 1. Buscar configurações SMTP do vendedor para obter o 'from'
    console.log('TEST_EMAIL_CONNECTION_DEBUG: Buscando configurações SMTP para sellerUserId para obter o remetente formatado:', sellerUserId);
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('smtp_config')
      .eq('user_id', sellerUserId)
      .maybeSingle();

    if (integrationError) {
      console.error('TEST_EMAIL_CONNECTION_DEBUG: Erro ao buscar configurações de integração para remetente:', integrationError);
      // Não é um erro crítico para o envio, mas o remetente pode ser genérico
    }

    const smtpConfig = integration?.smtp_config as any;
    const finalFromEmail = smtpConfig?.email || 'suporte@elyondigital.com'; // Fallback
    const finalFromName = smtpConfig?.displayName || 'Elyon Digital'; // Fallback
    const formattedFrom = `${finalFromName} <${finalFromEmail}>`;

    const testSubject = 'Teste de Conexão Elyon Digital! ✅';
    const testHtml = `
      <h1>Olá!</h1>
      <p>Este é um e-mail de teste enviado com sucesso da sua integração Elyon Digital.</p>
      <p>Se você recebeu este e-mail, sua configuração de SMTP está funcionando!</p>
      <br/>
      <p>Atenciosamente,</p>
      <p>Equipe Elyon Digital</p>
    `;

    // Chamar a função proxy para enviar o e-mail de teste
    console.log('TEST_EMAIL_CONNECTION_DEBUG: Invocando função proxy send-email-proxy para enviar e-mail de teste.');
    const { data: proxyResult, error: proxyError } = await supabase.functions.invoke(
      'send-email-proxy',
      {
        body: { 
          to, 
          subject: testSubject, 
          html: testHtml, 
          sellerUserId,
          from: formattedFrom // Passar o remetente formatado
        },
        method: 'POST'
      }
    );

    if (proxyError) {
      console.error('TEST_EMAIL_CONNECTION_DEBUG: Erro ao invocar send-email-proxy:', proxyError);
      return new Response(
        JSON.stringify({ success: false, error: proxyError.message || 'Erro ao enviar e-mail de teste via proxy' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    if (!proxyResult?.success) {
      console.error('TEST_EMAIL_CONNECTION_DEBUG: Falha no envio de e-mail de teste via proxy:', proxyResult?.error);
      return new Response(
        JSON.stringify({ success: false, error: proxyResult?.error || 'Falha ao enviar e-mail de teste via proxy' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('TEST_EMAIL_CONNECTION_DEBUG: E-mail de teste enviado com sucesso via proxy.');
    return new Response(
      JSON.stringify({ success: true, message: 'E-mail de teste enviado com sucesso!' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('TEST_EMAIL_CONNECTION_DEBUG: Erro geral na função test-email-connection:', error.message, 'Stack:', error.stack);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Erro interno do servidor.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});