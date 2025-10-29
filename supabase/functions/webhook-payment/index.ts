import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Função para gerar string aleatória para senhas
function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Função para gerar credenciais
function generateCredentials(email: string) {
  const username = email;
  const password = generateRandomString(12); // Alfanumérico seguro
  return { username, password };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const webhookData = await req.json();
    console.log('WEBHOOK_PAYMENT_DEBUG: Webhook received:', JSON.stringify(webhookData, null, 2));

    // --- 1. Validar assinatura do webhook (Exemplo genérico, adaptar para o gateway) ---
    // Para Stripe, Hotmart, Kiwify, etc., você precisaria de uma lógica específica aqui.
    // Por enquanto, vamos assumir que o webhook é confiável para fins de demonstração.
    // Ex: const signature = req.headers.get('x-signature');
    // Ex: const webhookSecret = Deno.env.get('WEBHOOK_SECRET');
    // if (!validateWebhookSignature(webhookData, signature, webhookSecret)) {
    //   return new Response(JSON.stringify({ success: false, error: 'Assinatura do webhook inválida' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 });
    // }

    // --- 2. Extrair dados do pagamento (Exemplo para Mercado Pago, adaptar para outros) ---
    const paymentStatus = webhookData.type === 'payment' ? webhookData.data?.status : 'unknown';
    const mpPaymentId = webhookData.type === 'payment' ? webhookData.data?.id : null;
    const externalReference = webhookData.type === 'payment' ? webhookData.data?.external_reference : null; // Geralmente o checkoutId
    const customerEmail = webhookData.type === 'payment' ? webhookData.data?.payer?.email : null;
    const customerName = webhookData.type === 'payment' ? `${webhookData.data?.payer?.first_name || ''} ${webhookData.data?.payer?.last_name || ''}`.trim() : null;
    const amountInCents = webhookData.type === 'payment' ? webhookData.data?.transaction_amount * 100 : 0; // Converter para centavos

    if (!mpPaymentId || !externalReference || !customerEmail || !customerName || amountInCents <= 0) {
      console.error('WEBHOOK_PAYMENT_DEBUG: Dados essenciais do webhook ausentes:', { mpPaymentId, externalReference, customerEmail, customerName, amountInCents });
      return new Response(
        JSON.stringify({ success: false, error: 'Dados essenciais do webhook ausentes' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // --- 3. Verificar se o pagamento foi aprovado ---
    if (paymentStatus === 'approved') {
      console.log('WEBHOOK_PAYMENT_DEBUG: Pagamento aprovado detectado para MP ID:', mpPaymentId);

      // Tentar encontrar o usuário no Supabase profiles
      let userId: string | null = null;
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('email', customerEmail)
        .maybeSingle();

      if (profileError) {
        console.error('WEBHOOK_PAYMENT_DEBUG: Erro ao buscar perfil por email:', profileError);
      } else if (profile) {
        userId = profile.user_id;
        console.log('WEBHOOK_PAYMENT_DEBUG: Usuário encontrado no perfil:', userId);
      } else {
        // Se o perfil não existir, criar um novo usuário auth.users
        console.log('WEBHOOK_PAYMENT_DEBUG: Perfil não encontrado, tentando criar novo usuário auth.users...');
        const generatedPassword = generateRandomString(12);
        const { data: newUserAuth, error: userAuthErr } = await supabase.auth.admin.createUser({
          email: customerEmail,
          password: generatedPassword,
          email_confirm: true,
          user_metadata: { name: customerName }
        });

        if (userAuthErr) {
          console.error('WEBHOOK_PAYMENT_DEBUG: Erro ao criar usuário auth.users:', userAuthErr.message);
          // Continuar sem userId se a criação falhar, mas logar o erro
        } else {
          userId = newUserAuth?.user?.id || null;
          console.log('WEBHOOK_PAYMENT_DEBUG: Novo usuário auth.users criado, userId:', userId);
        }
      }

      // --- 4. Inserir ou atualizar em product_purchases (idempotente) ---
      let purchaseId: string;
      const { data: existingPurchase, error: purchaseExistsError } = await supabase
        .from('product_purchases')
        .select('id, access_sent, username, password')
        .eq('payment_id', mpPaymentId.toString())
        .maybeSingle();

      if (purchaseExistsError) console.error('WEBHOOK_PAYMENT_DEBUG: Erro ao buscar compra existente:', purchaseExistsError);

      let username = existingPurchase?.username;
      let password = existingPurchase?.password;
      let accessSent = existingPurchase?.access_sent || false;

      if (!existingPurchase) {
        const credentials = generateCredentials(customerEmail);
        username = credentials.username;
        password = credentials.password;

        const { data: newPurchase, error: insertPurchaseError } = await supabase
          .from('product_purchases')
          .insert({
            user_id: userId,
            product_id: externalReference, // Assumindo externalReference é o product_id ou checkout_id
            customer_email: customerEmail,
            customer_name: customerName,
            payment_id: mpPaymentId.toString(),
            payment_status: paymentStatus,
            amount: amountInCents,
            username: username,
            password: password,
            access_sent: false,
          })
          .select('id')
          .single();

        if (insertPurchaseError) throw insertPurchaseError;
        purchaseId = newPurchase.id;
        console.log('WEBHOOK_PAYMENT_DEBUG: Nova compra registrada:', purchaseId);
      } else {
        purchaseId = existingPurchase.id;
        console.log('WEBHOOK_PAYMENT_DEBUG: Compra já existe:', purchaseId);
      }

      // --- 5. Buscar o pagamento completo para obter o metadata do email transacional ---
      const { data: paymentRecord, error: paymentRecordError } = await supabase
        .from('payments')
        .select('*, checkouts(user_id, products(name, description, member_area_link, file_url), form_fields)')
        .eq('mp_payment_id', mpPaymentId.toString())
        .single();

      if (paymentRecordError || !paymentRecord) {
        console.error('WEBHOOK_PAYMENT_DEBUG: Erro ao buscar registro de pagamento completo ou não encontrado:', paymentRecordError);
        // Registrar falha na entrega
        await supabase.from('product_deliveries').insert({
          purchase_id: purchaseId,
          user_id: userId,
          status: 'failed',
          error_message: `Registro de pagamento ${mpPaymentId} não encontrado ou erro ao buscar.`,
        });
        return new Response(
          JSON.stringify({ success: false, error: 'Registro de pagamento não encontrado ou erro ao buscar' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        );
      }
      console.log('WEBHOOK_PAYMENT_DEBUG: Registro de pagamento completo:', JSON.stringify(paymentRecord, null, 2));

      // --- 6. Lógica de envio de e-mail transacional (após aprovação) ---
      const emailTransactionalData = (paymentRecord?.metadata as any)?.email_transactional_data;
      console.log('WEBHOOK_PAYMENT_DEBUG: emailTransactionalData do payment metadata:', emailTransactionalData);

      if (emailTransactionalData?.sendTransactionalEmail && emailTransactionalData?.sellerUserId) {
        console.log('WEBHOOK_PAYMENT_DEBUG: Disparando e-mail transacional...');
        const productName = emailTransactionalData.productName || paymentRecord.checkouts?.products?.name || 'Seu Produto';
        const customerNameForEmail = (customerData as any).name || (customerData as any).email.split('@')[0];
        const customerEmailForEmail = (customerData as any).email || null;

        const accessLink = emailTransactionalData.deliverableLink || paymentRecord.checkouts?.products?.member_area_link || paymentRecord.checkouts?.products?.file_url || '';

        const emailSubjectTemplate = emailTransactionalData.transactionalEmailSubject || 'Seu acesso ao produto Elyon Digital!';
        const emailBodyTemplate = emailTransactionalData.transactionalEmailBody || 'Olá {customer_name},\n\nObrigado por sua compra! Seu acesso ao produto "{product_name}" está liberado.\n\nAcesse aqui: {access_link}\n\nQualquer dúvida, entre em contato com nosso suporte.\n\nAtenciosamente,\nEquipe Elyon Digital';

        const finalSubject = emailSubjectTemplate
          .replace(/{customer_name}/g, customerNameForEmail)
          .replace(/{product_name}/g, productName);

        const finalBody = emailBodyTemplate
          .replace(/{customer_name}/g, customerNameForEmail)
          .replace(/{product_name}/g, productName)
          .replace(/{access_link}/g, accessLink);

        if (customerEmailForEmail) {
          try {
            console.log('WEBHOOK_PAYMENT_DEBUG: Invoking send-transactional-email with:', {
              to: customerEmailForEmail,
              subject: finalSubject,
              html: finalBody.replace(/\n/g, '<br/>'),
              sellerUserId: emailTransactionalData.sellerUserId,
            });
            const { data: emailSendResult, error: emailSendError } = await supabase.functions.invoke(
              'send-transactional-email',
              {
                body: {
                  to: customerEmailForEmail,
                  subject: finalSubject,
                  html: finalBody.replace(/\n/g, '<br/>'), // Converter quebras de linha para HTML
                  sellerUserId: emailTransactionalData.sellerUserId,
                }
              }
            );

            if (emailSendError) {
              console.error('WEBHOOK_PAYMENT_DEBUG: Erro ao invocar send-transactional-email:', emailSendError);
              await supabase.from('product_deliveries').insert({
                purchase_id: purchaseId,
                user_id: userId,
                status: 'failed',
                error_message: `Erro ao invocar função de email: ${emailSendError.message}`,
              });
            } else if (!emailSendResult?.success) {
              console.error('WEBHOOK_PAYMENT_DEBUG: Falha no envio do e-mail transacional:', emailSendResult?.error);
              await supabase.from('product_deliveries').insert({
                purchase_id: purchaseId,
                user_id: userId,
                status: 'failed',
                error_message: `Falha no envio do e-mail: ${emailSendResult?.error}`,
              });
            } else {
              console.log('WEBHOOK_PAYMENT_DEBUG: E-mail transacional disparado com sucesso para:', customerEmailForEmail);
              // --- 7. Atualizar access_sent e registrar em product_deliveries ---
              await supabase.from('product_purchases').update({
                access_sent: true,
                access_sent_at: new Date().toISOString(),
              }).eq('id', purchaseId);

              await supabase.from('product_deliveries').insert({
                purchase_id: purchaseId,
                user_id: userId,
                status: 'sent',
                error_message: null,
              });
            }
          } catch (invokeError) {
            console.error('WEBHOOK_PAYMENT_DEBUG: Exceção ao invocar send-transactional-email:', invokeError);
            await supabase.from('product_deliveries').insert({
              purchase_id: purchaseId,
              user_id: userId,
              status: 'failed',
              error_message: `Exceção ao invocar função de email: ${invokeError.message}`,
            });
          }
        } else {
          console.warn('WEBHOOK_PAYMENT_DEBUG: Não foi possível enviar e-mail transacional: email do cliente ausente.');
          await supabase.from('product_deliveries').insert({
            purchase_id: purchaseId,
            user_id: userId,
            status: 'failed',
            error_message: 'Não foi possível enviar e-mail transacional: email do cliente ausente.',
          });
        }
      } else {
        console.log('WEBHOOK_PAYMENT_DEBUG: Envio de e-mail transacional desabilitado ou dados incompletos no metadata.');
        await supabase.from('product_deliveries').insert({
          purchase_id: purchaseId,
          user_id: userId,
          status: 'skipped',
          error_message: 'Envio de e-mail transacional desabilitado ou dados incompletos no metadata.',
        });
      }
    } else {
      console.log('WEBHOOK_PAYMENT_DEBUG: Pagamento não aprovado, ignorando envio de acesso.');
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook processado' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('WEBHOOK_PAYMENT_DEBUG: Erro geral na função webhook-payment:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Erro interno do servidor' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});