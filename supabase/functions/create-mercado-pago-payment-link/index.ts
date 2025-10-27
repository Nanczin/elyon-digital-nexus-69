import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 }); // Explicitly set status 200
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { checkoutId, amount, installments, customerEmail, customerName, productName }: PaymentLinkRequest = await req.json();

    if (!checkoutId || !amount || !installments || !customerEmail || !productName) {
      return new Response(
        JSON.stringify({ success: false, error: 'Dados obrigatórios ausentes' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Get the checkout to find the user_id
    const { data: checkout, error: checkoutError } = await supabase
      .from('checkouts')
      .select('user_id')
      .eq('id', checkoutId)
      .single();

    if (checkoutError || !checkout) {
      console.error('Checkout not found:', checkoutError);
      return new Response(
        JSON.stringify({ success: false, error: 'Checkout não encontrado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Fetch Mercado Pago access token for the checkout's user
    const { data: mpConfig, error: mpConfigError } = await supabase
      .from('integrations')
      .select('mercado_pago_access_token')
      .eq('user_id', checkout.user_id)
      .maybeSingle();

    const accessToken = (mpConfig?.mercado_pago_access_token as string) || Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN') || '';
    
    if (!accessToken) {
      return new Response(
        JSON.stringify({ success: false, error: 'Token do Mercado Pago não configurado para este usuário. Configure nas integrações ou variáveis de ambiente.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const transactionAmount = amount / 100; // Convert cents to reais

    const appBaseUrl = Deno.env.get('APP_BASE_URL') || 'http://localhost:8080'; // Use APP_BASE_URL env var

    const preferencePayload = {
      items: [
        {
          title: productName,
          description: `Pagamento para o checkout ${checkoutId}`,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: transactionAmount,
        },
      ],
      payer: {
        email: customerEmail,
        name: customerName,
      },
      payment_methods: {
        installments: installments,
        excluded_payment_types: [
          { id: "ticket" } // Excluir boleto se não for desejado
        ]
      },
      // Redirecionar diretamente para a página de sucesso, passando os parâmetros do MP
      back_urls: {
        success: `${appBaseUrl}/payment-success?payment_id={collection_id}&status={collection_status}`,
        failure: `${appBaseUrl}/payment-success?payment_id={collection_id}&status={collection_status}`,
        pending: `${appBaseUrl}/payment-success?payment_id={collection_id}&status={collection_status}`,
      },
      notification_url: `${supabaseUrl}/functions/v1/mercado-pago-webhook`, // Webhook continua para notificações assíncronas
      auto_return: 'approved',
      external_reference: checkoutId,
      metadata: {
        checkout_id: checkoutId,
        customer_email: customerEmail,
        customer_name: customerName,
        product_name: productName,
        installments: installments,
        source: 'standard-checkout-link'
      }
    };

    const apiUrl = 'https://api.mercadopago.com/checkout/preferences';

    const mpResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preferencePayload)
    });

    const mpResult = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error('Mercado Pago API Error creating preference:', mpResult);
      return new Response(
        JSON.stringify({ success: false, error: mpResult.message || mpResult.error || 'Erro ao criar preferência de pagamento' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Return the init_point (payment link)
    return new Response(
      JSON.stringify({
        success: true,
        init_point: mpResult.init_point,
        sandbox_init_point: mpResult.sandbox_init_point,
        preference_id: mpResult.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in create-mercado-pago-payment-link function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Erro interno do servidor'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});