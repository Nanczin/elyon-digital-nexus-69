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
      console.log('WEBHOOK_MP_DEBUG: Access token obtido (primeiros 10 chars):', accessToken.substring(0, 10));

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
          .select('*')
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
        .select('metadata')
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
          let userId: string | null = null;
          console.log('WEBHOOK_MP_DEBUG: Email do cliente para pós-processamento:', email);

          if (email) {
            // Basic email validation before attempting to create user
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!email || !emailRegex.test(email)) {
                console.error('WEBHOOK_MP_DEBUG: ERROR: Email inválido para criação de usuário:', email);
                // Continue without userId, as payment might still be valid
            } else {
                // Tentar encontrar o perfil existente pelo email
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
                  // Se não encontrar perfil, criar um novo usuário auth.users e o trigger criará o perfil
                  console.log('WEBHOOK_MP_DEBUG: Perfil não encontrado, tentando criar novo usuário...');
                  const customerName = (customerData as any)?.name || mpPayment.payer?.first_name || 'Cliente';
                  const customerPhone = (customerData as any)?.phone || null;
                  const customerCpf = (customerData as any)?.cpf || mpPayment.payer?.identification?.number || null;

                  // Gerar uma senha aleatória para o usuário
                  const generatedPassword = Math.random().toString(36).slice(-8); 

                  console.log('WEBHOOK_MP_DEBUG: Attempting to create new auth.users user with email:', email, 'and user_metadata:', { 
                    name: customerName,
                    first_name: customerName.split(' ')[0],
                    last_name: customerName.split(' ').slice(1).join(' ') || '',
                    phone: customerPhone,
                    cpf: customerCpf
                  });

                  const { data: newUserAuth, error: userAuthErr } = await supabase.auth.admin.createUser({
                    email,
                    password: generatedPassword, // Senha temporária
                    email_confirm: true, // Confirmar email automaticamente
                    user_metadata: { 
                      name: customerName,
                      first_name: customerName.split(' ')[0],
                      last_name: customerName.split(' ').slice(1).join(' ') || '',
                      phone: customerPhone,
                      cpf: customerCpf
                    }
                  });

                  if (userAuthErr) {
                    console.error('WEBHOOK_MP_DEBUG: Erro ao criar usuário auth.users:', userAuthErr.message, userAuthErr);
                    // If user creation fails, userId remains null, which is handled by subsequent checks
                  } else {
                    userId = newUserAuth?.user?.id || null;
                    console.log('WEBHOOK_MP_DEBUG: Novo usuário auth.users criado, userId:', userId);
                  }
                }
            }
          }

          console.log('WEBHOOK_MP_DEBUG: Payment object before user_id update check:', payment);
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
          if (checkoutId) {
            const { data: checkoutRow, error: checkoutRowError } = await supabase
              .from('checkouts')
              .select('product_id')
              .eq('id', checkoutId)
              .maybeSingle();
            if (checkoutRowError) console.error('WEBHOOK_MP_DEBUG: Erro ao buscar product_id do checkout:', checkoutRowError);
            productId = checkoutRow?.product_id || null;
          }
          console.log('WEBHOOK_MP_DEBUG: Product ID para ordem/acesso:', productId);

          console.log('WEBHOOK_MP_DEBUG: Final userId for order/access:', userId, 'Final productId for order/access:', productId);
          // Criar ordem (idempotente) - SOMENTE SE userId E productId ESTIVEREM DISPONÍVEIS
          const { data: existingOrder, error: orderExistsError } = await supabase
            .from('orders')
            .select('id')
            .eq('mp_payment_id', paymentId.toString())
            .maybeSingle();
          
          if (orderExistsError) console.error('WEBHOOK_MP_DEBUG: Erro ao buscar ordem existente:', orderExistsError);

          if (!existingOrder) {
            const { data: orderIns, error: orderErr } = await supabase
              .from('orders')
              .insert({
                mp_payment_id: paymentId.toString(),
                payment_id: payment?.id || null,
                checkout_id: checkoutId || null,
                user_id: userId, // Agora garantido como não nulo aqui
                product_id: productId,
                amount: payment?.amount || (mpPayment.transaction_amount ? Math.round(Number(mpPayment.transaction_amount) * 100) : 0), // Prioriza payment.amount (cents), senão converte mpPayment.transaction_amount (reais)
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

          // Garantir acesso ao produto (idempotente) - SOMENTE SE userId E productId ESTIVEREM DISPONÍVEIS
          if (userId && productId) {
            const { data: existingAccess, error: accessExistsError } = await supabase
              .from('product_access')
              .select('id')
              .eq('user_id', userId)
              .eq('product_id', productId)
              .maybeSingle();
            
            if (accessExistsError) console.error('WEBHOOK_MP_DEBUG: Erro ao buscar acesso existente:', accessExistsError);

            if (!existingAccess) {
              const { data: accessIns, error: accessErr } = await supabase
                .from('product_access')
                .insert({
                  user_id: userId, // Agora garantido como não nulo aqui
                  product_id: productId,
                  payment_id: payment?.id || null,
                  source: 'purchase'
                })
                .select('id')
                .single();
              if (accessErr) console.error('WEBHOOK_MP_DEBUG: Erro ao criar acesso ao produto:', accessErr);
              else console.log('WEBHOOK_MP_DEBUG: Acesso ao produto concedido:', accessIns);
            } else {
              console.log('WEBHOOK_MP_DEBUG: Acesso ao produto já existe:', existingAccess.id);
            }
          } else {
            console.log('WEBHOOK_MP_DEBUG: Pulando criação de acesso ao produto: userId ou productId ausente. userId:', userId, 'productId:', productId);
          }
        } catch (postProcessErr) {
          console.error('WEBHOOK_MP_DEBUG: Post-approval processing error:', postProcessErr);
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