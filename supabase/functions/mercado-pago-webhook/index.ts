import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 }); // Explicitly set status 200
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const webhookData = await req.json();
    console.log('WEBHOOK_MP_DEBUG: Webhook received:', webhookData);

    // Verificar se é uma notificação de pagamento
    if (webhookData.type === 'payment') {
      const paymentId = webhookData.data?.id;
      
      if (!paymentId) {
        console.error('WEBHOOK_MP_DEBUG: No payment ID in webhook');
        return new Response('No payment ID', { headers: corsHeaders, status: 400 });
      }
      console.log('WEBHOOK_MP_DEBUG: Payment ID from webhook:', paymentId);

      // Get existing payment to preserve metadata and get latest status
      const { data: existingPayment, error: existingPaymentError } = await supabase
        .from('payments')
        .select('*, checkouts(user_id, products(name, description, member_area_link, file_url), form_fields)') // Select all payment fields and join checkouts/products
        .eq('mp_payment_id', paymentId.toString())
        .single();
      
      if (existingPaymentError || !existingPayment) {
        console.error('WEBHOOK_MP_DEBUG: Erro ao buscar pagamento existente ou não encontrado:', existingPaymentError);
        return new Response('Payment not found in DB or error fetching', { headers: corsHeaders, status: 404 });
      }
      console.log('WEBHOOK_MP_DEBUG: Pagamento existente no DB (com checkout e produto):', JSON.stringify(existingPayment, null, 2));

      const mpPaymentStatus = existingPayment.mp_payment_status; // Use status from DB, updated by verify-mercado-pago-payment
      const paymentStatus = existingPayment.status;

      // Extract customer data from Mercado Pago payment metadata
      const customerData = existingPayment.metadata?.customer_data || {};
      console.log('WEBHOOK_MP_DEBUG: Customer Data extraído do metadata do payment:', customerData);

      // Se o pagamento foi aprovado, garantir ordem e acesso ao produto (idempotente)
      if (paymentStatus === 'completed' || mpPaymentStatus === 'approved') { // Use both for robustness
        console.log(`WEBHOOK_MP_DEBUG: Payment ${paymentId} approved - ensuring order and product access.`);
        try {
          const email = (customerData as any)?.email || null;
          let userId: string | null = existingPayment?.user_id || null; // Prioritize existing user_id from payment
          console.log('WEBHOOK_MP_DEBUG: Email do cliente para pós-processamento:', email, 'User ID existente no pagamento:', userId);

          if (!userId && email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!email || !emailRegex.test(email)) {
                console.error('WEBHOOK_MP_DEBUG: ERROR: Email inválido para criação de usuário:', email);
            } else {
                console.log('WEBHOOK_MP_DEBUG: Buscando perfil por email:', email);
                const { data: profileRow, error: profileError } = await supabase
                  .from('profiles')
                  .select('user_id')
                  .eq('email', email)
                  .maybeSingle();
                
                if (profileError) {
                  console.error('WEBHOOK_MP_DEBUG: Erro ao buscar perfil por email:', profileError);
                }

                if (profileRow?.user_id) {
                  userId = profileRow.user_id;
                  console.log('WEBHOOK_MP_DEBUG: Perfil encontrado, userId:', userId);
                } else {
                  console.log('WEBHOOK_MP_DEBUG: Perfil não encontrado, tentando criar novo usuário...');
                  const customerName = (customerData as any)?.name || 'Cliente';
                  const customerPhone = (customerData as any)?.phone || null;
                  const customerCpf = (customerData as any)?.cpf || null;
                  const generatedPassword = Math.random().toString(36).slice(-8); 

                  const userMetadata = { 
                    name: customerName,
                    first_name: customerName.split(' ')[0],
                    last_name: customerName.split(' ').slice(1).join(' ') || '',
                    phone: customerPhone,
                    cpf: customerCpf
                  };
                  console.log('WEBHOOK_MP_DEBUG: Dados para criar novo usuário auth.users:', { email, userMetadata });

                  const { data: newUserAuth, error: userAuthErr } = await supabase.auth.admin.createUser({
                    email,
                    password: generatedPassword,
                    email_confirm: true,
                    user_metadata: userMetadata
                  });

                  if (userAuthErr) {
                    console.error('WEBHOOK_MP_DEBUG: CRITICAL ERROR creating auth.users user:', userAuthErr.message, JSON.stringify(userAuthErr));
                  } else {
                    userId = newUserAuth?.user?.id || null;
                    console.log('WEBHOOK_MP_DEBUG: Novo usuário auth.users criado, userId:', userId);
                  }
                }
            }
          }

          console.log('WEBHOOK_MP_DEBUG: Verificando se payment.user_id precisa ser atualizado. Current payment.user_id:', existingPayment?.user_id, 'Resolved userId:', userId);
          // Atualizar user_id no pagamento (se aplicável)
          if (userId && existingPayment?.id && !existingPayment?.user_id) {
            const { error: payUserErr } = await supabase
              .from('payments')
              .update({ user_id: userId })
              .eq('mp_payment_id', paymentId.toString());
            if (payUserErr) console.error('WEBHOOK_MP_DEBUG: Error updating payment user_id:', payUserErr);
            else console.log('WEBHOOK_MP_DEBUG: Payment user_id atualizado para:', userId);
          }

          // Obter produto a partir do checkout
          const productId = existingPayment.checkouts?.product_id || null;
          console.log('WEBHOOK_MP_DEBUG: Product ID para ordem/acesso:', productId);

          console.log('WEBHOOK_MP_DEBUG: Final userId for order/access:', userId, 'Final productId for order/access:', productId);
          // Criar ordem (idempotente) - SOMENTE SE userId E productId ESTIVEREM DISPONÍVEIS
          if (userId && productId) {
            console.log('WEBHOOK_MP_DEBUG: Tentando criar ordem...');
            const { data: existingOrder, error: orderExistsError } = await supabase
              .from('orders')
              .select('id')
              .eq('mp_payment_id', paymentId.toString())
              .maybeSingle();
            
            if (orderExistsError) console.error('WEBHOOK_MP_DEBUG: Erro ao buscar ordem existente:', orderExistsError);

            if (!existingOrder) {
                const orderAmount = existingPayment?.amount || 0;
                console.log('WEBHOOK_MP_DEBUG: Inserindo nova ordem com amount (cents):', orderAmount);
                const { data: orderIns, error: orderErr } = await supabase
                    .from('orders')
                    .insert({
                        mp_payment_id: paymentId.toString(),
                        payment_id: existingPayment?.id || null,
                        checkout_id: existingPayment?.checkout_id || null,
                        user_id: userId,
                        product_id: productId,
                        amount: orderAmount,
                        status: 'paid',
                        metadata: {
                          mp_status: mpPaymentStatus,
                          source: 'webhook'
                        }
                    })
                    .select('id')
                    .single();
                if (orderErr) console.error('WEBHOOK_MP_DEBUG: Error inserting order:', orderErr);
                else console.log('WEBHOOK_MP_DEBUG: Ordem criada:', orderIns);
            } else {
                console.log('WEBHOOK_MP_DEBUG: Ordem já existe para este mp_payment_id:', existingOrder.id);
            }
          } else {
            console.log('WEBHOOK_MP_DEBUG: Pulando criação de ordem: userId ou productId ausente. userId:', userId, 'productId:', productId);
          }

          // Garantir acesso ao produto (idempotente) - SOMENTE SE userId E productId ESTIVEREM DISPONÍVEIS
          if (userId && productId) {
            console.log('WEBHOOK_MP_DEBUG: Tentando criar acesso ao produto...');
            const { data: existingAccess, error: accessExistsError } = await supabase
              .from('product_access')
              .select('id')
              .eq('user_id', userId)
              .eq('product_id', productId)
              .maybeSingle();
            
            if (accessExistsError) console.error('WEBHOOK_MP_DEBUG: Erro ao buscar acesso existente:', accessExistsError);

            if (!existingAccess) {
                console.log('WEBHOOK_MP_DEBUG: Inserindo novo acesso ao produto.');
                const { data: accessIns, error: accessErr } = await supabase
                    .from('product_access')
                    .insert({
                        user_id: userId,
                        product_id: productId,
                        payment_id: existingPayment?.id || null,
                        source: 'purchase'
                    })
                    .select('id')
                    .single();
                if (accessErr) console.error('WEBHOOK_MP_DEBUG: Error creating product access:', accessErr);
                else console.log('WEBHOOK_MP_DEBUG: Acesso ao produto concedido:', accessIns);
            } else {
                console.log('WEBHOOK_MP_DEBUG: Acesso ao produto já existe:', existingAccess.id);
            }
          } else {
            console.log('WEBHOOK_MP_DEBUG: Pulando criação de acesso ao produto: userId ou productId ausente. userId:', userId, 'productId:', productId);
          }

          // --- Lógica de envio de e-mail transacional (após aprovação) ---
          const emailTransactionalData = (existingPayment?.metadata as any)?.email_transactional_data;
          console.log('WEBHOOK_MP_DEBUG: emailTransactionalData do payment metadata:', emailTransactionalData);

          if (emailTransactionalData?.sendTransactionalEmail && emailTransactionalData?.sellerUserId) {
            console.log('WEBHOOK_MP_DEBUG: Disparando e-mail transacional...');
            const productName = emailTransactionalData.productName || existingPayment.checkouts?.products?.name || 'Seu Produto';
            const customerName = (customerData as any).name || (customerData as any).email.split('@')[0];
            const customerEmail = (customerData as any).email || null;

            const accessLink = emailTransactionalData.deliverableLink || existingPayment.checkouts?.products?.member_area_link || existingPayment.checkouts?.products?.file_url || '';

            const emailSubjectTemplate = emailTransactionalData.transactionalEmailSubject || 'Seu acesso ao produto Elyon Digital!';
            const emailBodyTemplate = emailTransactionalData.transactionalEmailBody || 'Olá {customer_name},\n\nObrigado por sua compra! Seu acesso ao produto "{product_name}" está liberado.\n\nAcesse aqui: {access_link}\n\nQualquer dúvida, entre em contato com nosso suporte.\n\nAtenciosamente,\nEquipe Elyon Digital';

            const finalSubject = emailSubjectTemplate
              .replace(/{customer_name}/g, customerName)
              .replace(/{product_name}/g, productName);

            const finalBody = emailBodyTemplate
              .replace(/{customer_name}/g, customerName)
              .replace(/{product_name}/g, productName)
              .replace(/{access_link}/g, accessLink);

            if (customerEmail) {
              try {
                console.log('WEBHOOK_MP_DEBUG: Invoking send-transactional-email with:', {
                  to: customerEmail,
                  subject: finalSubject,
                  html: finalBody.replace(/\n/g, '<br/>'),
                  // fromEmail and fromName are now derived within send-transactional-email
                  sellerUserId: emailTransactionalData.sellerUserId,
                });
                const { data: emailSendResult, error: emailSendError } = await supabase.functions.invoke(
                  'send-transactional-email',
                  {
                    body: {
                      to: customerEmail,
                      subject: finalSubject,
                      html: finalBody.replace(/\n/g, '<br/>'), // Converter quebras de linha para HTML
                      sellerUserId: emailTransactionalData.sellerUserId,
                    }
                  }
                );

                if (emailSendError) {
                  console.error('WEBHOOK_MP_DEBUG: Erro ao invocar send-transactional-email:', emailSendError);
                } else if (!emailSendResult?.success) {
                  console.error('WEBHOOK_MP_DEBUG: Falha no envio do e-mail transacional:', emailSendResult?.error);
                } else {
                  console.log('WEBHOOK_MP_DEBUG: E-mail transacional disparado com sucesso para:', customerEmail);
                }
              } catch (invokeError) {
                console.error('WEBHOOK_MP_DEBUG: Exceção ao invocar send-transactional-email:', invokeError);
              }
            } else {
              console.warn('WEBHOOK_MP_DEBUG: Não foi possível enviar e-mail transacional: email do cliente ausente.');
            }
          } else {
            console.log('WEBHOOK_MP_DEBUG: Envio de e-mail transacional desabilitado ou dados incompletos no metadata.');
          }
          // --- Fim da lógica de envio de e-mail transacional ---

        } catch (postProcessErr) {
          console.error('WEBHOOK_MP_DEBUG: Post-approval processing error:', postProcessErr);
          // Re-throw to ensure the main catch block handles it and returns 500
          throw postProcessErr; 
        }
      }

      return new Response('OK', { 
        headers: corsHeaders,
        status: 200 
      });
    }

    return new Response('Webhook type not handled', { 
      headers: corsHeaders,
      status: 200 
    });

  } catch (error) {
    console.error('WEBHOOK_MP_DEBUG: Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno do servidor' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});