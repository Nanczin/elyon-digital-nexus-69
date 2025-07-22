import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface PaymentRequest {
  checkoutId: string;
  amount: number;
  customerData: {
    name: string;
    email: string;
    phone?: string;
    cpf?: string;
  };
  selectedMercadoPagoAccount: string;
  orderBumps: number[];
  selectedPackage: number;
  paymentMethod: 'pix' | 'creditCard';
}

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

    const { checkoutId, amount, customerData, selectedMercadoPagoAccount, orderBumps, selectedPackage, paymentMethod }: PaymentRequest = await req.json();

    console.log('Payment request received:', { checkoutId, amount, paymentMethod, customerData });

    // Get the checkout to find the selected Mercado Pago account
    const { data: checkout, error: checkoutError } = await supabase
      .from('checkouts')
      .select('integrations')
      .eq('id', checkoutId)
      .single();

    console.log('Checkout data:', checkout);

    if (checkoutError || !checkout) {
      console.error('Checkout error:', checkoutError);
      throw new Error('Checkout não encontrado');
    }

    const integrations = checkout.integrations as any;
    console.log('Checkout integrations:', integrations);

    // Buscar as configurações do Mercado Pago da tabela integrations
    const { data: mpConfig, error: mpConfigError } = await supabase
      .from('integrations')
      .select('mercado_pago_access_token')
      .not('mercado_pago_access_token', 'is', null)
      .limit(1)
      .maybeSingle();

    console.log('MP Config from database:', { mpConfig, mpConfigError });

    let accessToken;
    if (mpConfig?.mercado_pago_access_token) {
      accessToken = mpConfig.mercado_pago_access_token;
      console.log('Using access token from database - token found');
    } else {
      console.log('No token found in database, checking env variable');
      // Fallback para secret do Supabase caso não encontre na tabela
      accessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
      if (accessToken) {
        console.log('Using access token from env variable');
      }
    }
    
    console.log('Access token configured:', !!accessToken);
    
    if (!accessToken) {
      throw new Error('Token do Mercado Pago não configurado. Configure nas integrações.');
    }

    // Create payment data based on payment method
    let paymentData: any = {
      transaction_amount: amount / 100, // Convert from cents to reais
      description: `Pagamento Checkout ${checkoutId}`,
      payer: {
        email: customerData.email,
        first_name: customerData.name.split(' ')[0],
        last_name: customerData.name.split(' ').slice(1).join(' ') || '',
        identification: customerData.cpf ? {
          type: 'CPF',
          number: customerData.cpf.replace(/\D/g, '')
        } : undefined
      },
      notification_url: `${supabaseUrl}/functions/v1/mercado-pago-webhook`,
      external_reference: checkoutId,
      metadata: {
        checkout_id: checkoutId,
        order_bumps: orderBumps,
        selected_package: selectedPackage,
        payment_method: paymentMethod
      }
    };

    // Configure payment method
    if (paymentMethod === 'pix') {
      paymentData.payment_method_id = 'pix';
    } else if (paymentMethod === 'creditCard') {
      // Para cartão de crédito, vamos criar uma preference para checkout
      paymentData = {
        items: [{
          title: `Pagamento Checkout ${checkoutId}`,
          quantity: 1,
          unit_price: amount / 100,
          currency_id: 'BRL'
        }],
        payer: paymentData.payer,
        back_urls: {
          success: `${req.headers.get('origin') || 'https://seu-dominio.com'}/payment-success`,
          failure: `${req.headers.get('origin') || 'https://seu-dominio.com'}/payment-failure`,
          pending: `${req.headers.get('origin') || 'https://seu-dominio.com'}/payment-pending`
        },
        auto_return: 'approved',
        external_reference: checkoutId,
        notification_url: `${supabaseUrl}/functions/v1/mercado-pago-webhook`,
        metadata: paymentData.metadata
      };
    }

    // Make request to Mercado Pago API
    const apiUrl = paymentMethod === 'creditCard' 
      ? 'https://api.mercadopago.com/checkout/preferences'
      : 'https://api.mercadopago.com/v1/payments';
    
    const mpResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `${checkoutId}-${Date.now()}`
      },
      body: JSON.stringify(paymentData)
    });

    const mpResult = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error('Mercado Pago API Error:', mpResult);
      throw new Error(mpResult.message || 'Erro ao criar pagamento');
    }

    // Create payment record in database
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        checkout_id: checkoutId,
        user_id: null, // Allow null for guest checkout
        amount: amount,
        payment_method: paymentMethod,
        status: 'pending',
        mp_payment_id: paymentMethod === 'creditCard' ? mpResult.id : mpResult.id.toString(),
        mp_payment_status: mpResult.status || 'pending',
        qr_code: paymentMethod === 'pix' ? (mpResult.point_of_interaction?.transaction_data?.qr_code || null) : null,
        qr_code_base64: paymentMethod === 'pix' ? (mpResult.point_of_interaction?.transaction_data?.qr_code_base64 || null) : null,
        payment_url: paymentMethod === 'pix' 
          ? (mpResult.point_of_interaction?.transaction_data?.ticket_url || null)
          : (mpResult.init_point || null),
        metadata: {
          customer_data: customerData,
          order_bumps: orderBumps,
          selected_package: selectedPackage,
          payment_method: paymentMethod,
          mp_response: mpResult
        }
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Database Error:', paymentError);
      throw new Error('Erro ao salvar pagamento no banco de dados');
    }

    return new Response(
      JSON.stringify({
        success: true,
        payment: {
          id: payment.id,
          mp_payment_id: paymentMethod === 'creditCard' ? mpResult.id : mpResult.id,
          status: mpResult.status || 'pending',
          qr_code: paymentMethod === 'pix' ? mpResult.point_of_interaction?.transaction_data?.qr_code : null,
          qr_code_base64: paymentMethod === 'pix' ? mpResult.point_of_interaction?.transaction_data?.qr_code_base64 : null,
          payment_url: paymentMethod === 'pix' 
            ? mpResult.point_of_interaction?.transaction_data?.ticket_url
            : mpResult.init_point,
          amount: amount / 100,
          payment_method: paymentMethod
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error creating payment:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Erro interno do servidor'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});