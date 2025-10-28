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

      // Buscar as configurações do Mercado Pago
      const { data: mpConfig, error: mpConfigError } = await supabase
        .from('integrations')
        .select('mercado_pago_access_token')
        .not('mercado_pago_access_token', 'is', null)
        .limit(1)
        .maybeSingle();

      if (mpConfigError) {
        console.error('WEBHOOK_MP_DEBUG: Erro ao buscar mpConfig:', mpConfigError);
      }
      let accessToken = mpConfig?.mercado_pago_access_token || Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
      
      if (!accessToken) {
        console.error('WEBHOOK_MP_DEBUG: No access token available');
        return new Response('No access token', { headers: corsHeaders, status: 500 });
      }
      console.log('WEBHOOK_MP_DEBUG: Access token obtido (length):', accessToken.length);

      // Buscar detalhes do pagamento no Mercado Pago
      const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        }
      });

      const mpPayment = await mpResponse.json();
      console.log('WEBHOOK_MP_DEBUG: MP Payment details:', mpPayment);

      if (!mpResponse.ok) {
        console.error('WEBHOOK_MP_DEBUG: Error fetching payment from MP:', mpPayment);
        return new Response('Error fetching payment', { headers: corsHeaders, status: 400 });
      }

      // Extract customer data from Mercado Pago payment
      const checkoutId = mpPayment.external_reference;
      let customerData = {};
      
      // Try to get customer data from the checkout or create default
      if (checkoutId) {
        const { data: checkoutData, error: checkoutDataError } = await supabase
          .from('checkouts')
          .select('user_id, form_fields, products(name, member_area_link, file_url)') // Selecionar user_id, form_fields e dados do produto
          .eq('id', checkoutId)
          .single();
        
        if (checkoutDataError) console.error('WEBHOOK_MP_DEBUG: Erro ao buscar checkoutData:', checkoutDataError);

        // Create customer data from MP payment info
        customerData = {
          name: mpPayment.payer?.first_name && mpPayment.payer?.last_name 
            ? `${mpPayment.payer.first_name} ${mpPayment.payer.last_name}`
            : mpPayment.payer?.email?.split('@')[0] || `Cliente ${mpPayment.id}`,
          email: mpPayment.payer?.email || `customer_${mpPayment.id}@checkout.com`,
          phone: mpPayment.payer?.phone?.number 
            ? `${mpPayment.payer.phone.area_code || ''}${mpPayment.payer.phone.number}`
            : null,
          cpf: mpPayment.payer?.identification?.number || null
        };
      }
      console.log('WEBHOOK_MP_DEBUG: Customer Data extraído:', customerData);

      // Get existing payment to preserve metadata
      const { data: existingPayment, error: existingPaymentError } = await supabase
        .from('payments')
        .select('metadata, user_id, checkout_id, amount') // Also select user_id and amount
        .eq('mp_payment_id', paymentId.toString())
        .single();
      
      if (existingPaymentError) console.error('WEBHOOK_MP_DEBUG: Erro ao buscar pagamento existente:', existingPaymentError);
      console.log('WEBHOOK_MP_DEBUG: Pagamento existente no DB:', existingPayment);

      // Atualizar o pagamento no banco de dados
      const { data: payment, error: updateError } = await supabase
        .from('payments')
        .update({
          mp_payment_status: mpPayment.status,
          status: mpPayment.status === 'approved' ? 'completed' : 
                 mpPayment.status === 'rejected' ? 'failed' : 'pending',
          metadata: {
            ...existingPayment?.metadata || {},
            mp_webhook_data: webhookData, // Use webhookData directly here
            customer_data: customerData
          }
        })
        .eq('mp_payment_id', paymentId.toString())
        .select()
        .single();

      if (updateError) {
        console.error('WEBHOOK_MP_DEBUG: Error updating payment:', updateError);
        return new Response('Error updating payment', { headers: corsHeaders, status: 500 });
      }

      console.log('WEBHOOK_MP_DEBUG: Payment updated:', payment);

      // Se o pagamento foi aprovado, garantir ordem e acesso ao produto (idempotente)
      if (mpPayment.status === 'approved') {
        console.log(`WEBHOOK_MP_DEBUG: Payment ${paymentId} approved - ensuring order and product access.`);
        try {
          const email = (customerData as any)?.email || mpPayment.payer?.email || null;
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
                  const customerName = (customerData as any)?.name || mpPayment.payer?.first_name || 'Cliente';
                  const customerPhone = (customerData as any)?.phone || null;
                  const customerCpf = (customerData as any)?.cpf || mpPayment.payer?.identification?.number || null;
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

          console.log('WEBHOOK_MP_DEBUG: Verificando se payment.user_id precisa ser atualizado. Current payment.user_id:', payment?.user_id, 'Resolved userId:', userId);
          // Atualizar user_id no pagamento (se aplicável)
          if (userId && payment?.id && !payment?.user_id) {
            const { error: payUserErr } = await supabase
              .from('payments')
              .update({ user_id: userId })
              .eq('mp_payment_id', paymentId.toString());
            if (payUserErr) console.error('WEBHOOK_MP_DEBUG: Error updating payment user_id:', payUserErr);
            else console.log('WEBHOOK_MP_DEBUG: Payment user_id atualizado para:', userId);
          }

          // Obter produto a partir do checkout
          let productId: string | null = null;
          let checkoutSellerUserId: string | null = null; // Adicionado para pegar o user_id do checkout
          let checkoutFormFields: any = null; // Adicionado para pegar form_fields
          let productData: any = null; // Adicionado para pegar dados do produto
          if (checkoutId) {
            console.log('WEBHOOK_MP_DEBUG: Buscando product_id para checkoutId:', checkoutId);
            const { data: checkoutRow, error: checkoutRowError } = await supabase
              .from('checkouts')
              .select('product_id, user_id, form_fields, products(name, member_area_link, file_url)')
              .eq('id', checkoutId)
              .maybeSingle();
            if (checkoutRowError) console.error('WEBHOOK_MP_DEBUG: Erro ao buscar product_id do checkout:', checkoutRowError);
            productId = checkoutRow?.product_id || null;
            checkoutSellerUserId = checkoutRow?.user_id || null; // Atribuir user_id do checkout
            checkoutFormFields = checkoutRow?.form_fields || null; // Atribuir form_fields
            productData = checkoutRow?.products || null; // Atribuir dados do produto
          }
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
                const orderAmount = payment?.amount || (mpPayment.transaction_amount ? Math.round(Number(mpPayment.transaction_amount) * 100) : 0);
                console.log('WEBHOOK_MP_DEBUG: Inserindo nova ordem com amount (cents):', orderAmount);
                const { data: orderIns, error: orderErr } = await supabase
                    .from('orders')
                    .insert({
                        mp_payment_id: paymentId.toString(),
                        payment_id: payment?.id || null,
                        checkout_id: checkoutId || null,
                        user_id: userId,
                        product_id: productId,
                        amount: orderAmount,
                        status: 'paid',
                        metadata: {
                          mp_status: mpPayment.status,
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
                        payment_id: payment?.id || null,
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
          if (checkoutFormFields?.sendTransactionalEmail && checkoutSellerUserId) {
            console.log('WEBHOOK_MP_DEBUG: Disparando e-mail transacional...');
            const productName = productData?.name || 'Seu Produto';
            const customerName = (customerData as any).name || (customerData as any).email.split('@')[0];

            let accessLink = '';
            const checkoutDeliverable = checkoutFormFields?.deliverable;
            const productMemberAreaLink = productData?.member_area_link;
            const productFileUrl = productData?.file_url;

            if (checkoutDeliverable?.type !== 'none' && (checkoutDeliverable?.link || checkoutDeliverable?.fileUrl)) {
              accessLink = checkoutDeliverable.link || checkoutDeliverable.fileUrl || '';
            } else if (productMemberAreaLink || productFileUrl) {
              accessLink = productMemberAreaLink || productFileUrl || '';
            }

            const emailSubjectTemplate = checkoutFormFields?.transactionalEmailSubject || 'Seu acesso ao produto Elyon Digital!';
            const emailBodyTemplate = checkoutFormFields?.transactionalEmailBody || 'Olá {customer_name},\n\nObrigado por sua compra! Seu acesso ao produto "{product_name}" está liberado.\n\nAcesse aqui: {access_link}\n\nQualquer dúvida, entre em contato com nosso suporte.\n\nAtenciosamente,\nEquipe Elyon Digital';

            const finalSubject = emailSubjectTemplate
              .replace(/{customer_name}/g, customerName)
              .replace(/{product_name}/g, productName);

            const finalBody = emailBodyTemplate
              .replace(/{customer_name}/g, customerName)
              .replace(/{product_name}/g, productName)
              .replace(/{access_link}/g, accessLink);

            try {
              const { data: emailSendResult, error: emailSendError } = await supabase.functions.invoke(
                'send-transactional-email',
                {
                  body: {
                    to: (customerData as any).email,
                    subject: finalSubject,
                    html: finalBody.replace(/\n/g, '<br/>'), // Converter quebras de linha para HTML
                    fromEmail: (checkoutData as any)?.support_contact?.email || 'noreply@elyondigital.com', // Usar email de suporte do checkout ou um padrão
                    fromName: 'Elyon Digital',
                    sellerUserId: checkoutSellerUserId,
                  }
                }
              );

              if (emailSendError) {
                console.error('WEBHOOK_MP_DEBUG: Erro ao invocar send-transactional-email:', emailSendError);
              } else if (!emailSendResult?.success) {
                console.error('WEBHOOK_MP_DEBUG: Falha no envio do e-mail transacional:', emailSendResult?.error);
              } else {
                console.log('WEBHOOK_MP_DEBUG: E-mail transacional disparado com sucesso para:', (customerData as any).email);
              }
            } catch (invokeError) {
              console.error('WEBHOOK_MP_DEBUG: Exceção ao invocar send-transactional-email:', invokeError);
            }
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