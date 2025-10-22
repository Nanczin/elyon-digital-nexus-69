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
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const webhookData = await req.json();
    console.log('Webhook received:', webhookData);

    // Verificar se é uma notificação de pagamento
    if (webhookData.type === 'payment') {
      const paymentId = webhookData.data?.id;
      
      if (!paymentId) {
        console.error('No payment ID in webhook');
        return new Response('No payment ID', { status: 400 });
      }

      // Buscar as configurações do Mercado Pago
      const { data: mpConfig } = await supabase
        .from('integrations')
        .select('mercado_pago_access_token')
        .not('mercado_pago_access_token', 'is', null)
        .limit(1)
        .maybeSingle();

      let accessToken = mpConfig?.mercado_pago_access_token || Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
      
      if (!accessToken) {
        console.error('No access token available');
        return new Response('No access token', { status: 500 });
      }

      // Buscar detalhes do pagamento no Mercado Pago
      const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        }
      });

      const mpPayment = await mpResponse.json();
      console.log('MP Payment details:', mpPayment);

      if (!mpResponse.ok) {
        console.error('Error fetching payment from MP:', mpPayment);
        return new Response('Error fetching payment', { status: 400 });
      }

      // Extract customer data from Mercado Pago payment
      const checkoutId = mpPayment.external_reference;
      let customerData = {};
      
      // Try to get customer data from the checkout or create default
      if (checkoutId) {
        const { data: checkoutData } = await supabase
          .from('checkouts')
          .select('*')
          .eq('id', checkoutId)
          .single();

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

      // Get existing payment to preserve metadata
      const { data: existingPayment } = await supabase
        .from('payments')
        .select('metadata')
        .eq('mp_payment_id', paymentId.toString())
        .single();

      // Atualizar o pagamento no banco de dados
      const { data: payment, error: updateError } = await supabase
        .from('payments')
        .update({
          mp_payment_status: mpPayment.status,
          status: mpPayment.status === 'approved' ? 'completed' : 
                 mpPayment.status === 'rejected' ? 'failed' : 'pending',
          metadata: {
            ...existingPayment?.metadata || {},
            mp_webhook_data: mpPayment,
            customer_data: customerData
          }
        })
        .eq('mp_payment_id', paymentId.toString())
        .select()
        .single();

      if (updateError) {
        console.error('Error updating payment:', updateError);
        return new Response('Error updating payment', { status: 500 });
      }

      console.log('Payment updated:', payment);

      // Se o pagamento foi aprovado, garantir ordem e acesso ao produto (idempotente)
      if (mpPayment.status === 'approved') {
        console.log(`Payment ${paymentId} approved - ensuring order and product access.`);
        try {
          const email = (customerData as any)?.email || mpPayment.payer?.email || null;
          let userId: string | null = null;

          if (email) {
            const { data: existingUser } = await supabase
              .from('users')
              .select('id')
              .eq('email', email)
              .maybeSingle();

            if (existingUser?.id) {
              userId = existingUser.id;
            } else {
              const { data: newUser, error: userErr } = await supabase
                .from('users')
                .insert({
                  email,
                  name: (customerData as any)?.name || mpPayment.payer?.first_name || 'Cliente',
                  phone: (customerData as any)?.phone || null,
                  cpf: (customerData as any)?.cpf || mpPayment.payer?.identification?.number || null
                })
                .select('id')
                .single();
              if (userErr) {
                console.error('Error creating user record:', userErr);
              } else {
                userId = newUser?.id || null;
              }
            }
          }

          // Atualizar user_id no pagamento (se aplicável)
          if (userId && !payment?.user_id) {
            const { error: payUserErr } = await supabase
              .from('payments')
              .update({ user_id: userId })
              .eq('mp_payment_id', paymentId.toString());
            if (payUserErr) console.error('Error updating payment user_id:', payUserErr);
          }

          // Obter produto a partir do checkout
          let productId: string | null = null;
          if (checkoutId) {
            const { data: checkoutRow } = await supabase
              .from('checkouts')
              .select('product_id')
              .eq('id', checkoutId)
              .maybeSingle();
            productId = checkoutRow?.product_id || null;
          }

          // Criar ordem (idempotente)
          const { data: existingOrder } = await supabase
            .from('orders')
            .select('id')
            .eq('mp_payment_id', paymentId.toString())
            .maybeSingle();

          if (!existingOrder) {
            const { data: orderIns, error: orderErr } = await supabase
              .from('orders')
              .insert({
                mp_payment_id: paymentId.toString(),
                payment_id: payment?.id || null,
                checkout_id: checkoutId || null,
                user_id: userId,
                product_id: productId,
                amount: mpPayment.transaction_amount ? Math.round(Number(mpPayment.transaction_amount) * 100) : payment?.amount,
                status: 'paid',
                metadata: {
                  mp_status: mpPayment.status,
                  source: 'webhook'
                }
              })
              .select('id')
              .single();
            if (orderErr) console.error('Error inserting order:', orderErr);
            else console.log('Order created:', orderIns);
          } else {
            console.log('Order already exists for this mp_payment_id:', existingOrder.id);
          }

          // Garantir acesso ao produto (idempotente)
          if (userId && productId) {
            const { data: existingAccess } = await supabase
              .from('product_access')
              .select('id')
              .eq('user_id', userId)
              .eq('product_id', productId)
              .maybeSingle();

            if (!existingAccess) {
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
              if (accessErr) console.error('Error creating product access:', accessErr);
              else console.log('Product access granted:', accessIns);
            } else {
              console.log('Product access already exists:', existingAccess.id);
            }
          }
        } catch (postProcessErr) {
          console.error('Post-approval processing error:', postProcessErr);
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
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});