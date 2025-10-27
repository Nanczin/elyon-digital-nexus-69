import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Definindo a interface PaymentRequest para a função Edge
interface PaymentRequest {
  checkoutId: string;
  amount: number; // Valor em centavos
  customerData: {
    name: string;
    email: string;
    phone?: string;
    cpf?: string;
  };
  selectedMercadoPagoAccount?: string;
  orderBumps?: any[]; // Pode ser mais específico se tivermos a estrutura
  selectedPackage?: number;
  paymentMethod: string;
  cardData?: {
    cardNumber?: string;
    cardholderName: string;
    expirationMonth?: string;
    expirationYear?: string;
    securityCode?: string;
    installments: number;
  };
  cardToken?: string; // Token gerado no frontend, se aplicável
}

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

    const requestBody = await req.json();
    console.log('Edge Function: Raw request body received:', JSON.stringify(requestBody, null, 2));

    // Desestruturar com a interface definida
    const { checkoutId, amount, customerData, selectedMercadoPagoAccount, orderBumps, selectedPackage, paymentMethod, cardData, cardToken }: PaymentRequest = requestBody;

    console.log('Edge Function: Raw amount received from requestBody:', amount, typeof amount);

    // Aplicar a conversão robusta sugerida para o 'amount' (que está em centavos)
    const numericAmountInCents = Number((amount || 0).toString().replace(",", "."));

    if (isNaN(numericAmountInCents) || numericAmountInCents <= 0) {
      console.error('Edge Function: Invalid numericAmountInCents after robust conversion:', numericAmountInCents, 'from raw:', amount);
      return new Response(
        JSON.stringify({ success: false, error: 'Valor do pagamento inválido ou ausente. O valor deve ser um número positivo.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Converter para reais e garantir duas casas decimais
    const transactionAmountInReais = parseFloat((numericAmountInCents / 100).toFixed(2));
    
    console.log('Edge Function: Converted transaction_amount (reais, fixed 2 decimals):', transactionAmountInReais);

    if (isNaN(transactionAmountInReais) || transactionAmountInReais <= 0) {
      console.error('Edge Function: Invalid transaction_amount detected after final formatting:', transactionAmountInReais);
      return new Response(
        JSON.stringify({ success: false, error: 'Valor inválido ou ausente para transaction_amount. O valor deve ser um número positivo.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Get the checkout to find the selected Mercado Pago account
    const { data: checkout, error: checkoutError } = await supabase
      .from('checkouts')
      .select('integrations, user_id')
      .eq('id', checkoutId)
      .single();

    console.log('Edge Function: Checkout data from DB:', checkout);

    if (checkoutError || !checkout) {
      console.error('Edge Function: Checkout error:', checkoutError);
      return new Response(
        JSON.stringify({ success: false, error: 'Checkout não encontrado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Buscar as configurações do Mercado Pago da tabela integrations
    const { data: mpConfig, error: mpConfigError } = await supabase
      .from('integrations')
      .select('mercado_pago_access_token, mercado_pago_token_public')
      .eq('user_id', checkout.user_id)
      .maybeSingle();

    console.log('Edge Function: MP Config from database:', { mpConfig, mpConfigError });

    const accessToken = (mpConfig?.mercado_pago_access_token as string) || Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN') || '';
    const publicKey = (mpConfig?.mercado_pago_token_public as string) || Deno.env.get('MERCADO_PAGO_PUBLIC_KEY') || '';

    console.log('Edge Function: Access Token (first 10 chars):', accessToken.substring(0, 10) + '...');
    console.log('Edge Function: Public Key (first 10 chars):', publicKey.substring(0, 10) + '...');
    
    if (!accessToken) {
      console.error('Edge Function: Access Token is empty or not configured.');
      return new Response(
        JSON.stringify({ success: false, error: 'Token do Mercado Pago não configurado. Configure nas integrações.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    if (paymentMethod === 'creditCard' && !publicKey) {
      console.error('Edge Function: Public Key is empty or not configured for credit card payment.');
      return new Response(
        JSON.stringify({ success: false, error: 'Chave pública do Mercado Pago não configurada. Configure nas integrações.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Construir o body da requisição para o Mercado Pago
    let mpRequestBody: any = {
      transaction_amount: transactionAmountInReais,
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
        customer_data: customerData,
        order_bumps: orderBumps,
        selected_package: selectedPackage,
        payment_method: paymentMethod
      }
    };

    // Configurar método de pagamento
    if (paymentMethod === 'pix') {
      mpRequestBody.payment_method_id = 'pix';
    } else if (paymentMethod === 'creditCard') {
      mpRequestBody.statement_descriptor = 'CHECKOUT';
      mpRequestBody.capture = true;
      mpRequestBody.binary_mode = true; // força decisão imediata
      mpRequestBody.installments = cardData?.installments || 1;

      mpRequestBody.additional_info = {
        items: [{
          id: checkoutId,
          title: `Pagamento Checkout ${checkoutId}`,
          description: mpRequestBody.description,
          quantity: 1,
          unit_price: mpRequestBody.transaction_amount
        }]
      };

      if (cardToken) {
        console.log('Edge Function: Usando card token recebido do frontend');
        mpRequestBody.token = cardToken;
      } else if (cardData) {
        console.log('Edge Function: Criando card token no backend (fallback)');
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
          console.error('Edge Function: Card Token Error:', tokenResult);
          return new Response(
            JSON.stringify({ success: false, error: tokenResult.message || 'Erro ao processar dados do cartão' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }
        mpRequestBody.token = tokenResult.id;
        console.log('Edge Function: Card token criado com sucesso');
      }
    }

    // Verificação de tipo antes da requisição fetch
    console.log("Edge Function: Valor enviado para MP (transaction_amount):", mpRequestBody.transaction_amount, typeof mpRequestBody.transaction_amount);

    // Requisição ao endpoint do Mercado Pago
    const apiUrl = 'https://api.mercadopago.com/v1/payments';

    const idempotencyKeyBase = `chk:${checkoutId}|email:${customerData.email}`;
    const idempotencyKey = paymentMethod === 'creditCard'
      ? `${idempotencyKeyBase}|attempt:${(crypto as any).randomUUID ? (crypto as any).randomUUID() : Date.now().toString()}`
      : idempotencyKeyBase;

    console.log('Edge Function: Enviando payload para MP:', { ...mpRequestBody, token: mpRequestBody.token ? '***' : undefined });

    const mpResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify(mpRequestBody)
    });

    // Tratamento de erro amigável
    if (!mpResponse.ok) {
      const errorBody = await mpResponse.text();
      console.error('Edge Function: Mercado Pago API Error:', errorBody);
      // Tentar parsear o erro para uma mensagem mais amigável, se for JSON
      try {
        const errorJson = JSON.parse(errorBody);
        const errorMessage = errorJson.message || errorJson.error || `Erro ao criar pagamento: ${mpResponse.status}`;
        return new Response(
          JSON.stringify({ success: false, error: errorMessage, mp_error_details: errorJson }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: mpResponse.status }
        );
      } catch {
        // Se não for JSON, retornar o texto bruto
        return new Response(
          JSON.stringify({ success: false, error: `Erro ao criar pagamento: ${mpResponse.status}`, mp_error_raw: errorBody }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: mpResponse.status }
        );
      }
    }

    const mpResult = await mpResponse.json();
    
    console.log('Edge Function: Mercado Pago Full Response:', JSON.stringify(mpResult, null, 2));

    console.log('Edge Function: Mercado Pago Response Summary:', { 
      ok: mpResponse.ok, 
      status: mpResponse.status,
      paymentStatus: mpResult.status,
      status_detail: mpResult.status_detail,
      paymentId: mpResult.id 
    });

    // Determinar o status baseado na resposta do Mercado Pago
    let paymentStatus = 'pending';
    if (mpResult.status === 'approved') {
      paymentStatus = 'completed';
    } else if (mpResult.status === 'rejected' || mpResult.status === 'cancelled') {
      paymentStatus = 'failed';
    }

    console.log('Edge Function: Salvando pagamento no banco com status:', paymentStatus);

    // Create payment record in database
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        checkout_id: checkoutId,
        user_id: null, // Allow null for guest checkout
        amount: numericAmountInCents, // Use the original amount in cents for DB storage
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
      console.error('Edge Function: Database Error:', paymentError);
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
          mp_payment_id: mpResult.id,
          status: mpResult.status || 'pending',
          status_detail: mpResult.status_detail || null,
          qr_code: paymentMethod === 'pix' ? mpResult.point_of_interaction?.transaction_data?.qr_code : null,
          payment_url: paymentMethod === 'pix' 
            ? mpResult.point_of_interaction?.transaction_data?.ticket_url
            : null,
          amount: transactionAmountInReais, // Return amount in reais
          payment_method: paymentMethod
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Edge Function: Error creating payment:', error);
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