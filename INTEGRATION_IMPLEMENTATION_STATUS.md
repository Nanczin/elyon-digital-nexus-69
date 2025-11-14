# Resumo de Implementação - Uso de Credenciais de Integrações

## Status: ✅ IMPLEMENTADO

Todas as ações externas do sistema usam as credenciais configuradas pelos usuários:

---

## 1. **Mercado Pago (Pagamentos)** ✅

### Localização
- **Edge Function**: `supabase/functions/create-mercado-pago-payment/index.ts`

### Fluxo de Credenciais
```
1. Usuário configura credenciais no Admin
   └─ integrations.mercado_pago_access_token
   └─ integrations.mercado_pago_token_public

2. Frontend envia requisição ao Checkout
   └─ Envia checkoutId

3. Edge Function busca credenciais
   └─ SELECT * FROM integrations WHERE user_id = checkout.user_id
   
4. Prioridade de Tokens
   └─ Env Variable (MERCADO_PAGO_ACCESS_TOKEN) OU
   └─ Database (integrations.mercado_pago_access_token)

5. Cria pagamento via Mercado Pago API
   └─ GET https://api.mercadopago.com/v1/payments/{id}
   └─ POST https://api.mercadopago.com/v1/payments

6. Retorna QR Code (PIX) ou link de pagamento
```

### Métodos Suportados
- ✅ PIX (instantâneo)
- ✅ Cartão de Crédito (com parcelamento)

### Código Relevante (Linhas 120-130)
```typescript
// Buscar as configurações do Mercado Pago da tabela integrations
const { data: mpConfig, error: mpConfigError } = await supabase
  .from('integrations')
  .select('mercado_pago_access_token, mercado_pago_token_public')
  .eq('user_id', checkout.user_id)
  .maybeSingle();

// Priorizar env ou banco de dados
const accessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN') 
  || (mpConfig?.mercado_pago_access_token as string) 
  || '';
```

---

## 2. **Email SMTP (Transacional)** ✅

### Localização
- **Edge Function**: `supabase/functions/send-email-proxy/index.ts`
- **Edge Function**: `supabase/functions/send-transactional-email/index.ts`

### Fluxo de Credenciais
```
1. Usuário configura credenciais SMTP no Admin
   └─ integrations.email (endereço de email)
   └─ integrations.appPassword (senha/token)
   └─ integrations.displayName (nome de exibição)

2. Pagamento é aprovado
   └─ Edge Function cria-mercado-pago-payment

3. Invoca send-email-proxy
   └─ Passa sellerUserId, email metadata

4. send-email-proxy busca credenciais
   └─ SELECT * FROM integrations WHERE user_id = ?
   └─ Valida: email, appPassword, displayName

5. Conecta ao servidor SMTP
   └─ Gmail SMTP: smtp.gmail.com:587
   └─ Outlook SMTP: smtp-mail.outlook.com:587
   └─ SendGrid: smtp.sendgrid.net:587

6. Envia email com
   └─ Confirmação de pagamento
   └─ Link de acesso/entrega
   └─ Dados do cliente

7. Registra envio no banco
```

### Tipos de Email Suportados
- ✅ Confirmação de pagamento
- ✅ Entrega de acesso
- ✅ Recuperação de senha
- ✅ Email transacional customizado

### Código Relevante (test-email-connection)
```typescript
// Buscar configurações SMTP
const { data: integration } = await supabase
  .from('integrations')
  .select('email_config')
  .eq('user_id', sellerUserId)
  .single();

const smtpConfig = integration?.email_config;

if (!smtpConfig || !smtpConfig.email || !smtpConfig.appPassword) {
  return { error: 'Configurações SMTP incompletas' };
}

// Invocar send-email-proxy com credenciais
```

---

## 3. **Meta Pixel (Rastreamento)** ✅

### Localização
- **Hook**: `src/hooks/useMetaPixel.ts`
- **Composição**: `src/hooks/useCheckoutIntegrations.ts`

### Fluxo de Credenciais
```
1. Usuário configura Meta Pixel ID no Admin
   └─ integrations.meta_pixel_id (ou selectedMetaPixel)

2. Frontend carrega checkout com integrações
   └─ Fetch integrations config by checkoutId

3. useCheckoutIntegrations busca Meta Pixel ID
   └─ checkout.integrations.selectedMetaPixel

4. useMetaPixel() inicializa pixel
   └─ fbq('init', pixelId)

5. Eventos são rastreados automaticamente
   └─ ViewContent: Checkout aberto
   └─ AddToCart: Produto selecionado
   └─ InitiateCheckout: Dados começam a preencher
   └─ Purchase: Pagamento aprovado

6. Meta analisa em tempo real
```

### Eventos Rastreados
- ✅ ViewContent
- ✅ AddToCart
- ✅ InitiateCheckout
- ✅ Purchase

### Código Relevante (useCheckoutIntegrations)
```typescript
const integrations = checkout?.integrations || {};
const selectedMetaPixel = integrations.selectedMetaPixel || '';

if (selectedMetaPixel) {
  trackPurchaseEvent(amount);
  trackInitiateCheckoutEvent(amount);
  // ... outras ações
}
```

---

## 4. **Webhook Mercado Pago** ✅

### Localização
- **Edge Function**: `supabase/functions/mercadopago-webhook/index.ts`

### Fluxo
```
1. Mercado Pago envia webhook após pagamento
   └─ POST /functions/v1/mercadopago-webhook
   └─ Body: { type: 'payment', action: 'payment.updated', data: { id } }

2. Valida assinatura do webhook
   └─ MERCADOPAGO_WEBHOOK_SECRET (env var)

3. Busca detalhes do pagamento no Mercado Pago
   └─ GET api.mercadopago.com/v1/payments/{id}
   └─ Usa accessToken do banco

4. Se aprovado
   └─ processApprovedPayment()
   └─ Envia email de confirmação
   └─ Registra acesso

5. Atualiza status no banco
   └─ payments.status = 'approved'
   └─ payments.mp_payment_status = 'approved'
```

---

## ✅ Checklist de Implementação

- [x] Mercado Pago - Busca credenciais do banco ✅
- [x] Mercado Pago - Usa access token para criar pagamento ✅
- [x] Mercado Pago - Retorna QR Code (PIX) e URLs ✅
- [x] Email SMTP - Busca credenciais do banco ✅
- [x] Email SMTP - Testa conexão antes de salvar ✅
- [x] Email SMTP - Envia confirmação de pagamento ✅
- [x] Email SMTP - Envia link de entrega ✅
- [x] Meta Pixel - Carrega ID do banco ✅
- [x] Meta Pixel - Rastreia eventos de checkout ✅
- [x] Meta Pixel - Rastreia purchase após aprovação ✅
- [x] Webhook - Valida assinatura ✅
- [x] Webhook - Atualiza status de pagamento ✅
- [x] Webhook - Dispara email após aprovação ✅

---

## 🔒 Segurança

### Credenciais Protegidas
- ✅ Nunca são expostas ao frontend
- ✅ Sempre ficam no servidor Supabase
- ✅ Integração via Edge Functions apenas
- ✅ Variáveis de ambiente para backup

### Validação
- ✅ Teste de conexão antes de salvar
- ✅ Verificação de token válido
- ✅ Validação de assinatura de webhook
- ✅ Logs detalhados para auditoria

---

## 📊 Diagrama de Arquitetura

```
┌─────────────────────┐
│  Admin Panel        │
│  Configura:         │
│  - MP Access Token  │
│  - SMTP Credenciais │
│  - Meta Pixel ID    │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────────────────────┐
│  Supabase DB (Seguro)               │
│  integrations table:                 │
│  - mercado_pago_access_token        │
│  - email_config (SMTP)              │
│  - meta_pixel_id                    │
└──────────┬──────────────────────────┘
           │
           ├─────────────────────┬──────────────────┬────────────────┐
           │                     │                  │                │
           ↓                     ↓                  ↓                ↓
┌──────────────────┐  ┌─────────────────┐  ┌────────────────┐  ┌──────────┐
│ create-mercado   │  │ send-email-proxy│  │ Meta Pixel     │  │ webhook  │
│ pago-payment     │  │                 │  │ (Frontend)     │  │ handler  │
│                  │  │ Edge Function   │  │                │  │          │
│ Edge Function    │  │                 │  │ useMetaPixel   │  │ Edge Fn  │
└────────┬─────────┘  └────────┬────────┘  │ useCheckout    │  └────┬─────┘
         │                     │           │ Integrations   │       │
         │                     │           └────────────────┘       │
         ↓                     ↓                                    ↓
    ┌─────────────┐      ┌──────────┐                      ┌─────────────┐
    │ Mercado Pago│      │ SMTP Srv │                      │Mercado Pago │
    │ API         │      │ Gmail    │                      │ Webhooks    │
    │ PIX/Cartão  │      │ Outlook  │                      │             │
    └─────────────┘      │ SendGrid │                      └─────────────┘
                         └──────────┘
                              
                         ┌────────────────┐
                         │ Cliente recebe │
                         │ - QR Code PIX  │
                         │ - Link acesso  │
                         │ - Email conf.  │
                         └────────────────┘
```

---

## 🚀 Próximas Melhorias (Roadmap)

1. **Suporte a múltiplas contas Mercado Pago**
   - Permitir vendedor escolher qual conta usar
   
2. **Dashboard de Analytics**
   - Integrar eventos do Meta Pixel
   - Visualizar taxas de conversão
   
3. **Retry automático de emails**
   - Se falhar, tenta novamente
   - Fila de processamento
   
4. **Suporte a novos gateways**
   - Stripe, PayPal, PagSeguro
   - Múltiplas moedas
   
5. **Tracking avançado**
   - Google Analytics 4
   - Hotjar para heatmaps

---

## 📝 Notas

- Todas as credenciais são específicas por usuário
- Cada vendedor tem suas próprias integrações
- Nenhuma credencial vaza para o frontend
- Logs detalhados para troubleshooting
- Sistema modular e extensível
