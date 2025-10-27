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

    const { checkoutId, amount, customerData, selectedMercadoPagoAccount, orderBumps, selectedPackage, paymentMethod, cardData }: PaymentRequest = await req.json();

    console.log('Payment request received:', { checkoutId, amount, paymentMethod, customerData });

    // Get the checkout to find the selected Mercado Pago account
    const { data: checkout, error: checkoutError } = await supabase
      .from('checkouts')
      .select('integrations, user_id')
      .eq('id', checkoutId)
      .single();

    console.log('Checkout data:', checkout);

    if (checkoutError || !checkout) {
      console.error('Checkout error:', checkoutError);
      return new Response(
        JSON.stringify({ success: false, error: 'Checkout não encontrado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    const integrations = checkout.integrations as any;
    console.log('Checkout integrations:', integrations);

    // Buscar as configurações do Mercado Pago da tabela integrations
    const { data: mpConfig, error: mpConfigError } = await supabase
      .from('integrations')
      .select('mercado_pago_access_token, mercado_pago_token_public')
      .eq('user_id', checkout.user_id)
      .maybeSingle();

    console.log('MP Config from database:', { mpConfig, mpConfigError });

    const accessToken = (mpConfig?.mercado_pago_access_token as string) || Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN') || '';
    const publicKey = (mpConfig?.mercado_pago_token_public as string) || Deno.env.get('MERCADO_PAGO_PUBLIC_KEY') || '';

    console.log('Access/Public keys configured:', { hasAccessToken: !!accessToken, hasPublicKey: !!publicKey });
    
    if (!accessToken) {
      return new Response(
        JSON.stringify({ success: false, error: 'Token do Mercado Pago não configurado. Configure nas integrações.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    if (paymentMethod === 'creditCard' && !publicKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Chave pública do Mercado Pago não configurada. Configure nas integrações.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
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
      // Pagamento direto com cartão - manter notification_url e external_reference
      paymentData.statement_descriptor = 'CHECKOUT';
      paymentData.capture = true;
      paymentData.binary_mode = true; // força decisão imediata
      paymentData.installments = cardData?.installments || 1;

      // Dados adicionais (melhora aprovação e reconciliação)
      paymentData.additional_info = {
        items: [{
          id: checkoutId,
          title: `Pagamento Checkout ${checkoutId}`,
          description: paymentData.description,
          quantity: 1,
          unit_price: paymentData.transaction_amount
        }]
      };

      // Se veio token do frontend, usa diretamente
      if (typeof (cardToken as any) === 'string' && cardToken) {
        console.log('Usando card token recebido do frontend');
        paymentData.token = cardToken;
      } else if (cardData) {
        // Fallback: criar token no backend (menos recomendado)
        console.log('Criando card token no backend (fallback)');
        const tokenResponse = await fetch(`https://api.mercadopago.com/v1/card_tokens?public_key=${publicKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            card_number: cardData.cardNumber?.replace(/\s/g, ''),
            cardholder: {
              name: cardData.cardholderName,
              identification: customerData.cpf ? { type: 'CPF', number: customerData.cpf.replace(/\D/g, '') } : undefined
            },
            expiration_month: cardData.expirationMonth ? Number(cardData.expirationMonth) : undefined,
            expiration_year: cardData.expirationYear ? Number(cardData.expirationYear) : undefined,
            security_code: cardData.securityCode
          })
        });
        const tokenResult = await tokenResponse.json();
        if (!tokenResponse.ok) {
          console.error('Card Token Error:', tokenResult);
          return new Response(
            JSON.stringify({ success: false, error: tokenResult.message || 'Erro ao processar dados do cartão' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }
        paymentData.token = tokenResult.id;
        console.log('Card token criado com sucesso');
      }

      // Observação: sem PAN não conseguimos resolver BIN/issuer aqui.
      // O MP consegue inferir o payment_method_id a partir do token.
    }

    // Make request to Mercado Pago API
    const apiUrl = 'https://api.mercadopago.com/v1/payments';

    const idempotencyKeyBase = `chk:${checkoutId}|email:${customerData.email}`;
    const idempotencyKey = paymentMethod === 'creditCard'
      ? `${idempotencyKeyBase}|attempt:${(crypto as any).randomUUID ? (crypto as any).randomUUID() : Date.now().toString()}`
      : idempotencyKeyBase;

    console.log('Enviando payload para MP:', { ...paymentData, token: paymentData.token ? '***' : undefined });

    const mpResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify(paymentData)
    });

    const mpResult = await mpResponse.json();
    
    console.log('Mercado Pago Full Response for PIX:', JSON.stringify(mpResult, null, 2));

    console.log('Mercado Pago Response:', { 
      ok: mpResponse.ok, 
      status: mpResponse.status,
      paymentStatus: mpResult.status,
      status_detail: mpResult.status_detail,
      paymentId: mpResult.id 
    });

    if (!mpResponse.ok) {
      console.error('Mercado Pago API Error:', mpResult);
      const errorMessage = mpResult.message || mpResult.error || 'Erro ao criar pagamento';
      return new Response(
        JSON.stringify({ success: false, error: errorMessage }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Determinar o status baseado na resposta do Mercado Pago
    let paymentStatus = 'pending';
    if (mpResult.status === 'approved') {
      paymentStatus = 'completed';
    } else if (mpResult.status === 'rejected' || mpResult.status === 'cancelled') {
      paymentStatus = 'failed';
    }

    console.log('Salvando pagamento no banco com status:', paymentStatus);

    // Create payment record in database
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        checkout_id: checkoutId,
        user_id: null, // Allow null for guest checkout
        amount: amount,
        payment_method: paymentMethod,
        status: paymentStatus,
        mp_payment_id: mpResult.id.toString(),
        mp_payment_status: mpResult.status || 'pending',
        qr_code: paymentMethod === 'pix' ? (mpResult.point_of_interaction?.transaction_data?.qr_code || null) : null,
        qr_code_base64: paymentMethod === 'pix' ? (mpResult.point_of_interaction?.transaction_data?.qr_code_base64 || null) : null,
        payment_url: paymentMethod === 'pix' 
          ? (mpResult.point_of_interaction?.transaction_data?.ticket_url || null)
          : null,
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
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao salvar pagamento no banco de dados' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        payment: {
          id: payment.id,
          mp_payment_id: paymentMethod === 'creditCard' ? mpResult.id : mpResult.id,
          status: mpResult.status || 'pending',
          status_detail: mpResult.status_detail || null,
          qr_code: paymentMethod === 'pix' ? mpResult.point_of_interaction?.transaction_data?.qr_code : null,
          payment_url: paymentMethod === 'pix' 
            ? mpResult.point_of_interaction?.transaction_data?.ticket_url
            : null,
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
        status: 500,
      }
    );
  }
});