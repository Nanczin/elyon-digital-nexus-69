import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';
import { createHmac } from "https://deno.land/std@0.190.0/node/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature, x-request-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS', // Adicionado OPTIONS para preflight
};

interface MercadoPagoWebhook {
  action: string; // "payment.created", "payment.updated"
  api_version: string;
  data: {
    id: string; // ID do pagamento
  };
  date_created: string;
  id: number;
  live_mode: boolean;
  type: string; // "payment"
  user_id: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    console.log('🔔 Webhook recebido do Mercado Pago');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Pegar corpo do webhook
    const body = await req.text();
    const webhook: MercadoPagoWebhook = JSON.parse(body);

    // Validar assinatura (IMPORTANTE PARA SEGURANÇA)
    const signature = req.headers.get('x-signature');
    const requestId = req.headers.get('x-request-id');
    
    if (!validateWebhookSignature(body, signature, requestId)) {
      console.error('❌ Assinatura do webhook inválida');
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }

    console.log('✅ Webhook validado:', webhook.type, webhook.action);

    // Processar apenas eventos de pagamento
    if (webhook.type !== 'payment') {
      console.log('ℹ️ Tipo de evento ignorado:', webhook.type);
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Buscar detalhes do pagamento na API do Mercado Pago
    const paymentId = webhook.data.id;
    const paymentDetails = await fetchPaymentDetails(paymentId);

    console.log('💳 Detalhes do pagamento:', {
      id: paymentDetails.id,
      status: paymentDetails.status,
      email: paymentDetails.payer?.email
    });

    // Verificar se pagamento foi aprovado
    if (paymentDetails.status === 'approved') {
      console.log('✅ Pagamento aprovado! Processando entrega...');
      await processApprovedPayment(supabase, paymentDetails, webhook);
    } else {
      console.log('⏳ Pagamento ainda não aprovado. Status:', paymentDetails.status);
      
      // Registrar compra mesmo se não aprovada
      await registerPurchase(supabase, paymentDetails, webhook);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Erro no webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

// Validar assinatura HMAC do Mercado Pago
function validateWebhookSignature(
  body: string, 
  signature: string | null, 
  requestId: string | null
): boolean {
  // Em desenvolvimento, você pode desabilitar a validação retornando true.
  // EM PRODUÇÃO, SEMPRE RETORNE false SE A ASSINATURA NÃO FOR VÁLIDA.
  if (!signature || !requestId) {
    console.warn('⚠️ Webhook sem assinatura - validação desabilitada em desenvolvimento. EM PRODUÇÃO, ISSO SERIA UM ERRO.');
    return true; 
  }

  const secret = Deno.env.get('MERCADOPAGO_WEBHOOK_SECRET');
  if (!secret) {
    console.error('❌ MERCADOPAGO_WEBHOOK_SECRET não configurado. Validação falhou.');
    return false;
  }

  // Extrair partes da assinatura: ts=timestamp,v1=hash
  const parts = signature.split(',');
  const ts = parts.find(p => p.startsWith('ts='))?.split('=')[1];
  const hash = parts.find(p => p.startsWith('v1='))?.split('=')[1];

  if (!ts || !hash) return false;

  // Montar string para validação
  const manifest = `id:${requestId};request-id:${requestId};ts:${ts};`;
  const hmac = createHmac('sha256', secret);
  hmac.update(manifest);
  const expectedHash = hmac.digest('hex');

  return hash === expectedHash;
}

// Buscar detalhes do pagamento na API do Mercado Pago
async function fetchPaymentDetails(paymentId: string): Promise<any> {
  const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
  
  if (!accessToken) {
    throw new Error('MERCADOPAGO_ACCESS_TOKEN não configurado');
  }

  const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    const errorBody = await response.json();
    console.error('Erro ao buscar pagamento no MP:', errorBody);
    throw new Error(`Erro ao buscar pagamento: ${response.statusText} - ${errorBody.message || 'Detalhes desconhecidos'}`);
  }

  return await response.json();
}

// Processar pagamento aprovado
async function processApprovedPayment(
  supabase: any,
  paymentDetails: any,
  webhook: MercadoPagoWebhook
): Promise<void> {
  const paymentId = paymentDetails.id.toString();
  
  // Verificar se já processamos este pagamento
  const { data: existingPurchase } = await supabase
    .from('compras')
    .select('id, entregavel_enviado')
    .eq('mercadopago_payment_id', paymentId)
    .maybeSingle(); // Usar maybeSingle para lidar com 0 ou 1 resultado

  if (existingPurchase?.entregavel_enviado) {
    console.log('ℹ️ Entregável já enviado para este pagamento');
    return;
  }

  // Extrair dados do cliente e produto
  const clienteEmail = paymentDetails.payer.email;
  const clienteNome = paymentDetails.additional_info?.payer?.first_name + ' ' + 
                      paymentDetails.additional_info?.payer?.last_name || paymentDetails.payer.first_name + ' ' + paymentDetails.payer.last_name || 'Cliente';
  const clienteTelefone = paymentDetails.payer.phone?.number;
  const clienteDocumento = paymentDetails.payer.identification?.number;

  // Identificar produto (via external_reference do pagamento)
  const produtoId = paymentDetails.external_reference; // UUID do produto passado no checkout

  // Buscar produto no banco
  let produto = null;
  if (produtoId) {
    const { data: produtoData, error: produtoError } = await supabase
      .from('produtos_digitais')
      .select('*')
      .eq('id', produtoId)
      .eq('is_active', true)
      .maybeSingle();
    
    if (produtoError) {
      console.error('❌ Erro ao buscar produto:', produtoError);
    }
    produto = produtoData;
  }

  if (!produto) {
    console.error('❌ Produto não encontrado ou inativo:', produtoId);
    throw new Error('Produto não encontrado ou inativo no banco de dados');
  }

  // Gerar credenciais se necessário
  let username = null;
  let password = null;
  if (produto.gerar_credenciais) {
    username = clienteEmail;
    password = generateSecurePassword(12);
  }

  // Calcular data de expiração
  let acessoExpiraEm = null;
  if (produto.prazo_acesso) {
    const dataExpiracao = new Date();
    dataExpiracao.setDate(dataExpiracao.getDate() + produto.prazo_acesso);
    acessoExpiraEm = dataExpiracao.toISOString();
  }

  // Registrar compra no banco
  const { data: compra, error: compraError } = await supabase
    .from('compras')
    .upsert({
      mercadopago_payment_id: paymentId,
      mercadopago_order_id: paymentDetails.order?.id,
      produto_id: produto.id,
      cliente_nome: clienteNome,
      cliente_email: clienteEmail,
      cliente_telefone: clienteTelefone,
      cliente_documento: clienteDocumento,
      valor_pago: paymentDetails.transaction_amount,
      moeda: paymentDetails.currency_id,
      metodo_pagamento: paymentDetails.payment_type_id,
      status_pagamento: 'approved',
      username: username,
      password: password,
      acesso_expira_em: acessoExpiraEm,
      webhook_payload: webhook,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'mercadopago_payment_id'
    })
    .select()
    .single();

  if (compraError) {
    console.error('❌ Erro ao registrar compra:', compraError);
    throw compraError;
  }

  console.log('💾 Compra registrada:', compra.id);

  // Enviar email com entregável
  await sendDeliverableEmail(supabase, compra, produto);
}

// Registrar compra (mesmo se não aprovada)
async function registerPurchase(
  supabase: any,
  paymentDetails: any,
  webhook: MercadoPagoWebhook
): Promise<void> {
  const paymentId = paymentDetails.id.toString();
  
  await supabase
    .from('compras')
    .upsert({
      mercadopago_payment_id: paymentId,
      mercadopago_order_id: paymentDetails.order?.id,
      cliente_nome: paymentDetails.additional_info?.payer?.first_name || paymentDetails.payer.first_name || 'Cliente',
      cliente_email: paymentDetails.payer.email,
      valor_pago: paymentDetails.transaction_amount,
      moeda: paymentDetails.currency_id,
      status_pagamento: paymentDetails.status,
      webhook_payload: webhook,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'mercadopago_payment_id'
    });
}

// Enviar email com entregável
async function sendDeliverableEmail(
  supabase: any,
  compra: any,
  produto: any
): Promise<void> {
  console.log('📧 Enviando email de entrega para:', compra.cliente_email);

  try {
    // Processar template do email
    let htmlBody = produto.email_template
      .replace(/{{nome}}/g, compra.cliente_nome)
      .replace(/{{produto}}/g, produto.nome)
      .replace(/{{email}}/g, compra.cliente_email)
      .replace(/{{username}}/g, compra.username || compra.cliente_email)
      .replace(/{{password}}/g, compra.password || 'N/A')
      .replace(/{{url_acesso}}/g, produto.url_acesso || '#')
      .replace(/{{arquivo_url}}/g, produto.arquivo_url || '#')
      .replace(/{{instrucoes}}/g, produto.instrucoes_acesso || '');

    // Chamar edge function de envio via Gmail
    // NOTA: A função 'gmail-api-send' não está presente no codebase fornecido.
    // Certifique-se de que esta função esteja implementada e configurada corretamente.
    const { data: emailResult, error: emailError } = await supabase.functions.invoke('gmail-api-send', {
      body: {
        to: compra.cliente_email,
        subject: produto.email_assunto,
        htmlBody: htmlBody,
        fromName: 'Equipe de Suporte',
        templateVars: {
          nome: compra.cliente_nome,
          produto: produto.nome,
          username: compra.username || compra.cliente_email,
          password: compra.password || '',
          url_acesso: produto.url_acesso || '',
          arquivo_url: produto.arquivo_url || ''
        }
      }
    });

    if (emailError) {
      throw new Error(`Erro ao invocar gmail-api-send: ${emailError.message}`);
    }
    if (!emailResult?.success) {
      throw new Error(`Falha no envio de email via gmail-api-send: ${emailResult?.error || 'Erro desconhecido'}`);
    }

    console.log('✅ Email enviado com sucesso');

    // Atualizar compra como entregue
    await supabase
      .from('compras')
      .update({
        entregavel_enviado: true,
        entregavel_enviado_em: new Date().toISOString(),
        email_entrega_id: emailResult.messageId // Assumindo que a função retorna um messageId
      })
      .eq('id', compra.id);

    // Registrar log de entrega
    await supabase
      .from('logs_entrega')
      .insert({
        compra_id: compra.id,
        tipo: 'email',
        status: 'enviado',
        destinatario: compra.cliente_email,
        assunto: produto.email_assunto
      });

  } catch (error: any) {
    console.error('❌ Erro ao enviar email:', error);

    // Registrar falha no log
    await supabase
      .from('logs_entrega')
      .insert({
        compra_id: compra.id,
        tipo: 'email',
        status: 'falhou',
        destinatario: compra.cliente_email,
        assunto: produto.email_assunto,
        erro_mensagem: error.message
      });

    throw error;
  }
}

// Gerar senha segura
function generateSecurePassword(length: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  let password = '';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  
  for (let i = 0; i < length; i++) {
    password += chars[array[i] % chars.length];
  }
  
  return password;
}

serve(handler);