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

      // --- 5. Buscar dados do produto e template de email ---
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('name, access_url, email_template')
        .eq('id', externalReference) // Assumindo externalReference é o product_id
        .single();

      if (productError || !product) {
        console.error('WEBHOOK_PAYMENT_DEBUG: Erro ao buscar produto ou produto não encontrado:', productError);
        // Registrar falha na entrega
        await supabase.from('product_deliveries').insert({
          purchase_id: purchaseId,
          user_id: userId,
          status: 'failed',
          error_message: `Produto ${externalReference} não encontrado ou erro ao buscar.`,
        });
        return new Response(
          JSON.stringify({ success: false, error: 'Produto não encontrado ou erro ao buscar' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        );
      }

      // --- 6. Processar template com variáveis ---
      const emailTemplate = product.email_template || `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Acesso ao Produto</title>
        </head>
        <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px;">
            <h1 style="color: #2c3e50;">🎉 Pagamento Confirmado!</h1>
            
            <p>Olá, <strong>{{nome}}</strong>!</p>
            
            <p>Seu pagamento foi aprovado e você já pode acessar o produto:</p>
            
            <div style="background: #667eea; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <h2 style="color: white; margin: 0;">{{produto}}</h2>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea;">
              <h3 style="margin-top: 0;">🔐 Suas Credenciais de Acesso</h3>
              <p><strong>Usuário:</strong> {{username}}</p>
              <p><strong>Senha:</strong> <code style="background: #fff; padding: 5px 10px; border-radius: 4px;">{{password}}</code></p>
              <p><strong>Link:</strong> <a href="{{url_acesso}}" style="color: #667eea;">{{url_acesso}}</a></p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{url_acesso}}" style="background: #667eea; color: white; padding: 15px 40px; text-decoration: none; border-radius: 50px; font-weight: bold; display: inline-block;">
                ACESSAR AGORA
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              <strong>⚠️ Importante:</strong> Guarde essas credenciais em local seguro. Você pode alterá-las após o primeiro acesso.
            </p>
            
            <p style="color: #666; font-size: 14px;">
              Dúvidas? Entre em contato: <a href="mailto:{{suporte}}">{{suporte}}</a>
            </p>
          </div>
        </body>
        </html>
      `; // Template padrão se não houver um no produto

      const supportEmail = Deno.env.get('SUPPORT_EMAIL') || 'suporte@elyondigital.com'; // Definir um email de suporte padrão

      const processedHtmlBody = emailTemplate
        .replace(/{{nome}}/g, customerName)
        .replace(/{{produto}}/g, product.name)
        .replace(/{{username}}/g, username || customerEmail)
        .replace(/{{password}}/g, password || 'Senha gerada automaticamente')
        .replace(/{{url_acesso}}/g, product.access_url || 'https://elyondigital.com/acesso')
        .replace(/{{suporte}}/g, supportEmail);

      // --- 7. Chamar a Edge Function de envio de email (send-transactional-email) ---
      if (!accessSent) { // Evitar reenvio se já foi enviado
        console.log('WEBHOOK_PAYMENT_DEBUG: Chamando send-transactional-email...');
        const { data: emailSendResult, error: emailSendError } = await supabase.functions.invoke(
          'send-transactional-email',
          {
            body: {
              to: customerEmail,
              subject: `Seu acesso ao produto: ${product.name}`,
              html: processedHtmlBody,
              fromEmail: supportEmail,
              fromName: 'Elyon Digital',
              sellerUserId: checkout.user_id, // Assumindo que o checkout tem user_id do vendedor
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
          console.log('WEBHOOK_PAYMENT_DEBUG: E-mail transacional disparado com sucesso para:', customerEmail);
          // --- 8. Atualizar access_sent e registrar em product_deliveries ---
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
      } else {
        console.log('WEBHOOK_PAYMENT_DEBUG: Acesso já enviado para esta compra.');
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