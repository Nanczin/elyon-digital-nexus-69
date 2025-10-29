import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { SmtpClient } from "https://deno.land/x/smtp@v0.10.0/mod.ts"; // Atualizado para v0.10.0

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

    // 1. Buscar configurações SMTP do vendedor
    console.log('TEST_EMAIL_CONNECTION_DEBUG: Buscando configurações SMTP para sellerUserId:', sellerUserId);
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('smtp_config')
      .eq('user_id', sellerUserId)
      .maybeSingle();

    if (integrationError) {
      console.error('TEST_EMAIL_CONNECTION_DEBUG: Erro ao buscar configurações de integração:', integrationError);
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao buscar configurações de e-mail do vendedor.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const smtpConfig = integration?.smtp_config as any;
    if (!smtpConfig || !smtpConfig.email || !smtpConfig.appPassword || !smtpConfig.displayName) {
      console.error('TEST_EMAIL_CONNECTION_DEBUG: Configurações SMTP incompletas ou ausentes para o vendedor:', sellerUserId, 'Config:', JSON.stringify(smtpConfig));
      return new Response(
        JSON.stringify({ success: false, error: 'Configurações SMTP do vendedor incompletas ou ausentes. Verifique se email, appPassword e displayName estão preenchidos.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const finalHost = smtpConfig.host || 'smtp.gmail.com';
    const finalPort = Number(smtpConfig.port || '587');
    const finalSecure = smtpConfig.secure ?? true;
    const finalUsername = smtpConfig.email;
    const finalPassword = smtpConfig.appPassword;
    const finalFromEmail = smtpConfig.email;
    const finalFromName = smtpConfig.displayName || 'Elyon Digital';

    console.log('TEST_EMAIL_CONNECTION_DEBUG: SMTP Config loaded:', {
      host: finalHost,
      port: finalPort,
      username: finalUsername,
      password: finalPassword ? '***MASKED***' : 'MISSING',
      fromEmail: finalFromEmail,
      fromName: finalFromName,
      secure: finalSecure,
    });

    // 2. Configurar e enviar e-mail de teste
    const client = new SmtpClient();
    try {
      console.log('TEST_EMAIL_CONNECTION_DEBUG: Tentando conectar ao servidor SMTP...');
      await client.connect({
        hostname: finalHost,
        port: finalPort,
        tls: finalSecure,
        username: finalUsername,
        password: finalPassword,
      });
      console.log('TEST_EMAIL_CONNECTION_DEBUG: Conectado ao servidor SMTP. Tentando enviar e-mail de teste...');

      await client.send({
        from: `${finalFromName} <${finalFromEmail}>`,
        to,
        subject: 'Teste de Conexão Elyon Digital! ✅',
        content: `
          <h1>Olá!</h1>
          <p>Este é um e-mail de teste enviado com sucesso da sua integração Elyon Digital.</p>
          <p>Se você recebeu este e-mail, sua configuração de SMTP está funcionando!</p>
          <br/>
          <p>Atenciosamente,</p>
          <p>Equipe Elyon Digital</p>
        `,
        html: `
          <h1>Olá!</h1>
          <p>Este é um e-mail de teste enviado com sucesso da sua integração Elyon Digital.</p>
          <p>Se você recebeu este e-mail, sua configuração de SMTP está funcionando!</p>
          <br/>
          <p>Atenciosamente,</p>
          <p>Equipe Elyon Digital</p>
        `,
      });

      await client.close();
      console.log('TEST_EMAIL_CONNECTION_DEBUG: E-mail de teste enviado com sucesso para:', to);
      return new Response(
        JSON.stringify({ success: true, message: 'E-mail de teste enviado com sucesso!' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    } catch (emailError: any) {
      console.error('TEST_EMAIL_CONNECTION_DEBUG: Erro ao enviar e-mail de teste:', emailError.message, 'Stack:', emailError.stack);
      return new Response(
        JSON.stringify({ success: false, error: `Erro ao enviar e-mail de teste: ${emailError.message}. Verifique suas credenciais e as configurações de segurança do seu provedor de e-mail (ex: Senha de App do Gmail).` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
  } catch (error: any) {
    console.error('TEST_EMAIL_CONNECTION_DEBUG: Erro geral na função test-email-connection:', error.message, 'Stack:', error.stack);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Erro interno do servidor.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});