// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Declare Deno namespace to resolve 'Cannot find name Deno' errors
declare namespace Deno {
  namespace env {
    function get(key: string): string | undefined;
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface PasswordResetRequest {
  email: string;
  memberAreaId: string;
}

serve(async (req) => {
  console.log('SEND_PASSWORD_RESET_EMAIL_DEBUG: Função send-password-reset-email iniciada.');
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const requestBody = await req.json(); // Log the full request body
    console.log('SEND_PASSWORD_RESET_EMAIL_DEBUG: Corpo da requisição recebido:', JSON.stringify(requestBody, null, 2));

    const { email, memberAreaId }: PasswordResetRequest = requestBody;
    console.log('SEND_PASSWORD_RESET_EMAIL_DEBUG: Dados desestruturados:', { email, memberAreaId });

    if (!email || !memberAreaId) {
      console.error('SEND_PASSWORD_RESET_EMAIL_DEBUG: Dados incompletos ou e-mail vazio após desestruturação:', { email, memberAreaId });
      return new Response(
        JSON.stringify({ success: false, error: 'E-mail e ID da área de membros são obrigatórios.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // 1. Buscar configurações da plataforma para obter o user_id do proprietário e templates de e-mail
    console.log('SEND_PASSWORD_RESET_EMAIL_DEBUG: Buscando configurações da plataforma para memberAreaId:', memberAreaId);
    const { data: platformSettings, error: settingsError } = await supabase
      .from('platform_settings')
      .select('user_id, password_reset_subject, password_reset_body')
      .eq('member_area_id', memberAreaId)
      .maybeSingle();

    if (settingsError) {
      console.error('SEND_PASSWORD_RESET_EMAIL_DEBUG: Erro ao buscar configurações da plataforma:', settingsError);
      return new Response(
        JSON.stringify({ success: false, error: `Erro ao buscar configurações da área de membros: ${settingsError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    if (!platformSettings) {
      console.error('SEND_PASSWORD_RESET_EMAIL_DEBUG: Configurações da plataforma não encontradas para memberAreaId:', memberAreaId);
      return new Response(
        JSON.stringify({ success: false, error: 'Configurações da área de membros não encontradas para enviar e-mail personalizado. Verifique se a área de membros existe e tem configurações de design salvas.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }
    console.log('SEND_PASSWORD_RESET_EMAIL_DEBUG: Configurações da plataforma obtidas:', JSON.stringify(platformSettings, null, 2));

    const sellerUserId = platformSettings.user_id;
    const customSubjectTemplate = platformSettings.password_reset_subject || 'Redefina sua senha da Área de Membros Elyon Digital';
    const customBodyTemplate = platformSettings.password_reset_body || 'Olá {customer_name},\n\nRecebemos uma solicitação para redefinir a senha da sua conta na Área de Membros {member_area_name}.\n\nPara redefinir sua senha, clique no link abaixo:\n{password_reset_link}\n\nSe você não solicitou esta redefinição, por favor, ignore este e-mail.\n\nAtenciosamente,\nEquipe {member_area_name}';

    if (!sellerUserId) {
      console.error('SEND_PASSWORD_RESET_EMAIL_DEBUG: User ID do proprietário da área de membros não encontrado nas configurações. platformSettings.user_id:', sellerUserId);
      return new Response(
        JSON.stringify({ success: false, error: 'ID do proprietário da área de membros não configurado nas configurações de design. Não é possível enviar e-mail personalizado.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 } // Changed to 400 as it's a configuration issue
      );
    }

    // 2. Buscar nome da área de membros para personalização
    const { data: memberArea, error: memberAreaError } = await supabase
      .from('member_areas')
      .select('name')
      .eq('id', memberAreaId)
      .maybeSingle();

    if (memberAreaError) {
      console.warn('SEND_PASSWORD_RESET_EMAIL_DEBUG: Erro ao buscar o nome da área de membros:', memberAreaError);
    }
    const memberAreaName = memberArea?.name || 'Elyon Digital';

    // 3. Gerar o link de redefinição de senha
    const redirectTo = `${Deno.env.get('SUPABASE_URL')}/auth/v1/callback?memberAreaId=${memberAreaId}`; // Pass memberAreaId to callback
    console.log('SEND_PASSWORD_RESET_EMAIL_DEBUG: RedirectTo para generateLink:', redirectTo);
    console.log('SEND_PASSWORD_RESET_EMAIL_DEBUG: Email sendo passado para generateLink:', email); // NEW LOG

    const { data: { user, properties }, error: generateLinkError } = await supabase.auth.admin.generateLink(
      'password_reset',
      email,
      { redirectTo: redirectTo }
    );

    if (generateLinkError) {
      console.error('SEND_PASSWORD_RESET_EMAIL_DEBUG: Erro ao gerar link de redefinição de senha:', generateLinkError);
      // Retornar 400 se o usuário não existir ou 500 para outros erros
      const statusCode = generateLinkError.message.includes('User not found') ? 400 : 500;
      return new Response(
        JSON.stringify({ success: false, error: generateLinkError.message || 'Falha ao gerar link de redefinição de senha.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: statusCode }
      );
    }
    const passwordResetLink = properties?.action_link;
    if (!passwordResetLink) {
      console.error('SEND_PASSWORD_RESET_EMAIL_DEBUG: Link de redefinição de senha não gerado (properties.action_link é nulo).');
      return new Response(
        JSON.stringify({ success: false, error: 'Link de redefinição de senha não gerado. Verifique se o e-mail está correto.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    console.log('SEND_PASSWORD_RESET_EMAIL_DEBUG: Link de redefinição de senha gerado.');

    // 4. Personalizar o assunto e corpo do e-mail
    const customerName = user?.user_metadata?.name || email.split('@')[0];
    
    const finalSubject = customSubjectTemplate
      .replace(/{customer_name}/g, customerName)
      .replace(/{member_area_name}/g, memberAreaName);

    const finalBody = customBodyTemplate
      .replace(/{customer_name}/g, customerName)
      .replace(/{member_area_name}/g, memberAreaName)
      .replace(/{password_reset_link}/g, passwordResetLink);

    console.log('SEND_PASSWORD_RESET_EMAIL_DEBUG: Assunto final do e-mail:', finalSubject);
    console.log('SEND_PASSWORD_RESET_EMAIL_DEBUG: Corpo final do e-mail (primeiros 200 caracteres):', finalBody.substring(0, 200) + '...');

    // 5. Invocar a Edge Function send-transactional-email para enviar o e-mail
    console.log('SEND_PASSWORD_RESET_EMAIL_DEBUG: Invocando send-transactional-email para enviar e-mail personalizado.');
    const { data: emailSendResult, error: emailSendError } = await supabase.functions.invoke(
      'send-transactional-email',
      {
        body: {
          to: email,
          subject: finalSubject,
          html: finalBody.replace(/\n/g, '<br/>'), // Converter quebras de linha para HTML
          sellerUserId: sellerUserId,
        },
        method: 'POST'
      }
    );

    if (emailSendError) {
      console.error('SEND_PASSWORD_RESET_EMAIL_DEBUG: Erro ao invocar send-transactional-email:', emailSendError);
      return new Response(
        JSON.stringify({ success: false, error: `Erro ao enviar e-mail de redefinição de senha: ${emailSendError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    if (!emailSendResult?.success) {
      console.error('SEND_PASSWORD_RESET_EMAIL_DEBUG: Falha no envio do e-mail transacional:', emailSendResult?.error);
      return new Response(
        JSON.stringify({ success: false, error: emailSendResult?.error || 'Falha ao enviar e-mail de redefinição de senha.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('SEND_PASSWORD_RESET_EMAIL_DEBUG: E-mail de redefinição de senha enviado com sucesso.');
    return new Response(
      JSON.stringify({ success: true, message: 'E-mail de redefinição de senha enviado com sucesso.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('SEND_PASSWORD_RESET_EMAIL_DEBUG: Erro geral na função send-password-reset-email:', error.message, 'Stack:', error.stack);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Erro interno do servidor.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});