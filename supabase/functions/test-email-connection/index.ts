import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"; // Updated Supabase JS version

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
    console.log('TEST_EMAIL_CONNECTION_DEBUG: Dados recebidos:', { to, sellerUserId });

    if (!to || !sellerUserId) {
      console.error('TEST_EMAIL_CONNECTION_DEBUG: Dados incompletos:', { to, sellerUserId });
      return new Response(
        JSON.stringify({ success: false, error: 'E-mail do destinatário e ID do vendedor são obrigatórios.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // 1. Buscar configurações SMTP do vendedor
    console.log('TEST_EMAIL_CONNECTION_DEBUG: Buscando configurações SMTP para sellerUserId:', sellerUserId);
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('smtp_config')
      .eq('user_id', sellerUserId)
      .maybeSingle();

    if (integrationError) {
      console.error('TEST_EMAIL_CONNECTION_DEBUG: Erro ao buscar configurações de integração para remetente:', integrationError);
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao buscar configurações de e-mail do vendedor.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const smtpConfig = integration?.smtp_config as any;
    console.log('TEST_EMAIL_CONNECTION_DEBUG: smtpConfig do DB:', JSON.stringify(smtpConfig));

    if (!smtpConfig || !smtpConfig.email || !smtpConfig.appPassword || !smtpConfig.displayName) {
      console.error('TEST_EMAIL_CONNECTION_DEBUG: Configurações SMTP incompletas ou ausentes para o vendedor:', sellerUserId, 'Config:', JSON.stringify(smtpConfig));
      return new Response(
        JSON.stringify({ success: false, error: 'Configurações SMTP do vendedor incompletas ou ausentes. Verifique se email, appPassword e displayName estão preenchidos.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const testSubject = 'Teste de Conexão Elyon Digital! ✅';
    const testHtml = `
      <h1>Olá!</h1>
      <p>Este é um e-mail de teste enviado com sucesso da sua integração Elyon Digital.</p>
      <p>Se você recebeu este e-mail, sua configuração de SMTP está funcionando!</p>
      <br/>
      <p>Atenciosamente,</p>
      <p>Equipe Elyon Digital</p>
    `;

    // Chamar a função proxy para enviar o e-mail de teste, passando o smtpConfig completo
    console.log('TEST_EMAIL_CONNECTION_DEBUG: Invocando função proxy send-email-proxy para enviar e-mail de teste.');
    const { data: proxyResult, error: proxyError } = await supabase.functions.invoke(
      'send-email-proxy',
      {
        body: { 
          to, 
          subject: testSubject, 
          html: testHtml, 
          sellerUserId,
          smtpConfig // Passar o smtpConfig completo
        },
        method: 'POST'
      }
    );
    console.log('TEST_EMAIL_CONNECTION_DEBUG: Resultado da invocação do proxy:', { proxyResult, proxyError });

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