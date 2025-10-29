import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

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
  console.log('SEND_EMAIL_DEBUG: Função send-transactional-email iniciada.'); // Log inicial
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

    // 1. Buscar configurações SMTP do vendedor
    console.log('SEND_EMAIL_DEBUG: Buscando configurações SMTP para sellerUserId:', sellerUserId);
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('smtp_config')
      .eq('user_id', sellerUserId)
      .maybeSingle();

    if (integrationError) {
      console.error('SEND_EMAIL_DEBUG: Erro ao buscar configurações de integração:', integrationError);
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao buscar configurações de e-mail do vendedor' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const smtpConfig = integration?.smtp_config as any; // Cast para any para acessar propriedades
    if (!smtpConfig || !smtpConfig.email || !smtpConfig.appPassword || !smtpConfig.displayName) {
      console.error('SEND_EMAIL_DEBUG: Configurações SMTP incompletas ou ausentes para o vendedor:', sellerUserId, 'Config:', JSON.stringify(smtpConfig));
      return new Response(
        JSON.stringify({ success: false, error: 'Configurações SMTP do vendedor incompletas ou ausentes (email, appPassword, displayName são obrigatórios)' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Derivar os campos SMTP da configuração simplificada, com fallbacks
    const finalHost = smtpConfig.host || 'smtp.gmail.com'; // Padrão para Gmail
    const finalPort = Number(smtpConfig.port || '587');
    const finalSecure = smtpConfig.secure ?? true; // Padrão para true
    const finalUsername = smtpConfig.email; // O email é o username
    const finalPassword = smtpConfig.appPassword; // A senha do app é a senha
    const finalFromEmail = smtpConfig.email; // O email é o remetente
    const finalFromName = smtpConfig.displayName || 'Elyon Digital'; // Nome de exibição ou padrão

    console.log('SEND_EMAIL_DEBUG: SMTP Config loaded:', {
      host: finalHost,
      port: finalPort,
      username: finalUsername,
      password: finalPassword ? '***MASKED***' : 'MISSING',
      fromEmail: finalFromEmail,
      fromName: finalFromName,
      secure: finalSecure,
    });
    console.log('SEND_EMAIL_DEBUG: Email details:', { to, subject, html: html ? 'HTML_PRESENT' : 'HTML_MISSING' });

    // 2. Configurar e enviar e-mail
    const client = new SmtpClient();
    try {
      console.log('SEND_EMAIL_DEBUG: Tentando conectar ao servidor SMTP...');
      await client.connect({
        hostname: finalHost,
        port: finalPort,
        tls: finalSecure,
        username: finalUsername,
        password: finalPassword,
      });
      console.log('SEND_EMAIL_DEBUG: Conectado ao servidor SMTP. Tentando enviar e-mail...');

      await client.send({
        from: `${finalFromName} <${finalFromEmail}>`,
        to,
        subject,
        content: html,
        html: html,
      });

      await client.close();
      console.log('SEND_EMAIL_DEBUG: E-mail enviado com sucesso para:', to);
      return new Response(
        JSON.stringify({ success: true, message: 'E-mail enviado com sucesso' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    } catch (emailError: any) {
      console.error('SEND_EMAIL_DEBUG: Erro ao enviar e-mail:', emailError.message, 'Stack:', emailError.stack);
      return new Response(
        JSON.stringify({ success: false, error: `Erro ao enviar e-mail: ${emailError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
  } catch (error: any) {
    console.error('SEND_EMAIL_DEBUG: Erro geral na função send-transactional-email:', error.message, 'Stack:', error.stack);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Erro interno do servidor' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});