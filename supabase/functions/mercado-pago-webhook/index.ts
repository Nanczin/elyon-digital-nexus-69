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

      // Se o pagamento foi aprovado, podemos disparar outras ações aqui
      if (mpPayment.status === 'approved') {
        console.log(`Payment ${paymentId} was approved!`);
        
        // Aqui você pode adicionar lógica para:
        // - Enviar email de confirmação
        // - Dar acesso ao produto
        // - Registrar logs, etc.
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