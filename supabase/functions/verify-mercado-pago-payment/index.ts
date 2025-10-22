import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { mp_payment_id } = await req.json();
    if (!mp_payment_id) {
      return new Response(JSON.stringify({ success: false, error: 'mp_payment_id ausente' }), { headers: corsHeaders, status: 400 });
    }

    // Buscar access token
    const { data: mpConfig } = await supabase
      .from('integrations')
      .select('mercado_pago_access_token')
      .not('mercado_pago_access_token', 'is', null)
      .limit(1)
      .maybeSingle();

    const accessToken = mpConfig?.mercado_pago_access_token || Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
    if (!accessToken) {
      return new Response(JSON.stringify({ success: false, error: 'Access token não configurado' }), { headers: corsHeaders, status: 500 });
    }

    // Consultar status diretamente no MP
    const resp = await fetch(`https://api.mercadopago.com/v1/payments/${mp_payment_id}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const mpPayment = await resp.json();
    if (!resp.ok) {
      console.error('MP verify error:', mpPayment);
      return new Response(JSON.stringify({ success: false, error: 'Erro ao consultar pagamento no MP' }), { headers: corsHeaders, status: 400 });
    }

    const status = mpPayment.status as string;

    // Buscar pagamento existente para preservar metadata
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('*')
      .eq('mp_payment_id', mp_payment_id.toString())
      .maybeSingle();

    // Atualizar pagamento
    const calcStatus = status === 'approved' ? 'completed' : (status === 'rejected' ? 'failed' : 'pending');
    const { data: payment, error: updateError } = await supabase
      .from('payments')
      .update({
        mp_payment_status: status,
        status: calcStatus,
        metadata: {
          ...(existingPayment?.metadata || {}),
          mp_verify_data: mpPayment,
        }
      })
      .eq('mp_payment_id', mp_payment_id.toString())
      .select()
      .single();

    if (updateError) {
      console.error('Erro ao atualizar pagamento:', updateError);
      return new Response(JSON.stringify({ success: false, error: 'Falha ao atualizar pagamento' }), { headers: corsHeaders, status: 500 });
    }

    // Se aprovado, garantir criação de order e acesso (idempotente)
    if (status === 'approved') {
      try {
        const checkoutId = mpPayment.external_reference || existingPayment?.checkout_id || (existingPayment?.metadata as any)?.checkout_id;

        // Obter product_id
        let productId: string | null = null;
        if (checkoutId) {
          const { data: chk } = await supabase
            .from('checkouts')
            .select('product_id')
            .eq('id', checkoutId)
            .maybeSingle();
          productId = chk?.product_id || null;
        }

        // Resolver usuário por email
        const email = existingPayment?.metadata?.customer_data?.email || mpPayment?.payer?.email || null;
        let userId: string | null = existingPayment?.user_id || null;
        if (!userId && email) {
          const { data: userRow } = await supabase.from('users').select('id').eq('email', email).maybeSingle();
          if (userRow?.id) userId = userRow.id;
          else {
            const { data: newUser } = await supabase
              .from('users')
              .insert({
                email,
                name: existingPayment?.metadata?.customer_data?.name || mpPayment?.payer?.first_name || 'Cliente',
                phone: existingPayment?.metadata?.customer_data?.phone || null,
                cpf: existingPayment?.metadata?.customer_data?.cpf || mpPayment?.payer?.identification?.number || null
              })
              .select('id')
              .single();
            userId = newUser?.id || null;
          }
        }

        if (userId && !payment?.user_id) {
          await supabase.from('payments').update({ user_id: userId }).eq('id', payment.id);
        }

        // Criar ordem se não existir
        const { data: orderExists } = await supabase
          .from('orders')
          .select('id')
          .eq('mp_payment_id', mp_payment_id.toString())
          .maybeSingle();
        if (!orderExists) {
          await supabase
            .from('orders')
            .insert({
              mp_payment_id: mp_payment_id.toString(),
              payment_id: payment.id,
              checkout_id: checkoutId || null,
              user_id: userId,
              product_id: productId,
              amount: payment.amount,
              status: 'paid',
              metadata: { mp_status: status, source: 'manual-verify' }
            });
        }

        // Garantir acesso
        if (userId && productId) {
          const { data: accessExists } = await supabase
            .from('product_access')
            .select('id')
            .eq('user_id', userId)
            .eq('product_id', productId)
            .maybeSingle();
          if (!accessExists) {
            await supabase
              .from('product_access')
              .insert({ user_id: userId, product_id: productId, payment_id: payment.id, source: 'purchase' });
          }
        }
      } catch (postErr) {
        console.error('Erro pós-aprovação (verify):', postErr);
      }
    }

    return new Response(JSON.stringify({ success: true, status: status, payment }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
  } catch (error) {
    console.error('Verify function error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
});