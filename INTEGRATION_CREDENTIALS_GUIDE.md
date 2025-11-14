# Guia de Credenciais de Integrações

## Visão Geral

Este documento descreve como o sistema utiliza as credenciais das integrações configuradas pelos usuários para executar ações externas como pagamentos, rastreamento e envio de emails.

## Estrutura de Credenciais

### 1. Mercado Pago (Pagamentos)

**Tabela**: `integrations`
**Campos**:
- `mercado_pago_access_token` - Token de acesso para API do Mercado Pago
- `mercado_pago_token_public` - Token público para operações no frontend

**Uso**:
- Função Edge: `create-mercado-pago-payment`
- Métodos: PIX, Cartão de Crédito
- Fluxo:
  1. Frontend carrega os dados do checkout + integração selecionada
  2. Frontend valida dados do cartão com SDK do Mercado Pago
  3. Frontend envia requisição para Edge Function com os dados
  4. Edge Function busca credenciais do usuário no banco
  5. Edge Function cria pagamento via API do Mercado Pago
  6. Resposta com status e dados do pagamento (QR Code para PIX, etc.)

**Prioridade de Credenciais**:
```
1. Variável de ambiente (MERCADO_PAGO_ACCESS_TOKEN)
2. Banco de dados (integrations.mercado_pago_access_token)
```

---

### 2. Email SMTP (Transacional)

**Tabela**: `integrations`
**Campos**:
- `email` - Email do remetente
- `appPassword` - Senha de aplicação (não a senha principal)
- `displayName` - Nome a exibir no campo "De"

**Uso**:
- Função Edge: `send-email-proxy`
- Tipos de Email:
  - Confirmação de pagamento
  - Link de acesso/entrega (após pagamento confirmado)
  - Recuperação de senha
  
**Fluxo**:
1. Após pagamento aprovado, função `create-mercado-pago-payment` invoca `send-email-proxy`
2. `send-email-proxy` busca credenciais SMTP do vendedor
3. Conecta via SMTP e envia email transacional
4. Registra envio no banco de dados

**Suportes**: Gmail, Outlook, SendGrid e outros serviços SMTP

---

### 3. Meta Pixel (Rastreamento)

**Tabela**: `integrations`
**Campo**:
- `meta_pixel_id` - ID do Pixel do Facebook

**Uso**:
- Hook: `useMetaPixel()`
- Eventos rastreados:
  - `ViewContent` - Quando cliente acessa checkout
  - `AddToCart` - Quando seleciona pacote/bônus
  - `InitiateCheckout` - Ao iniciar preenchimento
  - `Purchase` - Ao pagamento ser aprovado

**Fluxo**:
1. Frontend carrega integração configurada do checkout
2. useCheckoutIntegrations busca Meta Pixel ID
3. `useMetaPixel()` inicializa o Pixel
4. Eventos são disparados automaticamente em cada etapa

---

## Fluxo Completo de Pagamento com Integrações

```
┌─────────────────────────────────────────────────────────┐
│ 1. Cliente acessa checkout                              │
│    - Frontend carrega checkout + integrações           │
│    - Meta Pixel: ViewContent                            │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 2. Cliente seleciona produtos/bônus                     │
│    - Meta Pixel: AddToCart                              │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 3. Cliente preenche dados                               │
│    - Meta Pixel: InitiateCheckout                       │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 4. Cliente clica "Finalizar Compra"                    │
│    - Frontend valida dados                              │
│    - Se cartão: valida com SDK Mercado Pago            │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 5. Edge Function: create-mercado-pago-payment          │
│    - Busca credenciais Mercado Pago do banco           │
│    - Cria pagamento via API                             │
│    - Salva no banco (tabela payments)                   │
└─────────────────────────────────────────────────────────┘
                         ↓
           ┌─────────────────────────┐
           │ Pagamento Aprovado?     │
           └─────────────────────────┘
              ↙               ↘
           SIM               NÃO
            ↓                ↓
     ┌──────────────┐  Retorna erro
     │ Enviar Email │  Solicita retry
     └──────────────┘
            ↓
┌─────────────────────────────────────────────────────────┐
│ 6. Edge Function: send-email-proxy                      │
│    - Busca credenciais SMTP do banco                    │
│    - Conecta ao servidor SMTP                           │
│    - Envia email de confirmação + link de acesso        │
│    - Meta Pixel: Purchase                               │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 7. Cliente recebe email com acesso                      │
│    - Clica link e acessa conteúdo                       │
└─────────────────────────────────────────────────────────┘
```

---

## Configuração de Credenciais

### Para o Vendedor (Admin)

1. **Mercado Pago**:
   - Acesse conta Mercado Pago
   - Gere Access Token em Aplicações & Integrações
   - Configure no painel de integrações

2. **Email SMTP**:
   - Gmail: Ativar "Senhas de aplicativo"
   - Outlook: Gerar token de acesso
   - SendGrid: Usar API Key como password
   - Configure email, senha e nome de exibição

3. **Meta Pixel**:
   - Crie Pixel no Meta Business Manager
   - Copie ID do Pixel
   - Configure no painel de integrações

### Validação de Credenciais

**Email**: Função `test-email-connection` valida antes de salvar
**Mercado Pago**: Testado na primeira transação
**Meta Pixel**: Validado ao carregar checkout

---

## Fluxo de Dados - Requisições

### create-mercado-pago-payment

```typescript
Request Body:
{
  checkoutId: string;
  amount: number; // em centavos
  customerData: {
    name: string;
    email: string;
    phone?: string;
    cpf?: string;
  };
  paymentMethod: 'pix' | 'creditCard';
  cardData?: { /* dados do cartão */ };
  emailMetadata?: {
    sendTransactionalEmail: boolean;
    transactionalEmailSubject: string;
    transactionalEmailBody: string;
    deliverableLink?: string;
    sellerUserId: string;
  };
}

Response:
{
  success: true/false;
  payment: {
    id: string;
    mp_payment_id: string;
    status: string;
    qr_code?: string; // Para PIX
    payment_url?: string; // Para PIX
    amount: number;
  };
}
```

### send-email-proxy

```typescript
Request Body:
{
  to: string; // email destinatário
  subject: string;
  body: string;
  sellerUserId: string; // para buscar credenciais SMTP
}

Response:
{
  success: true/false;
  messageId?: string;
  error?: string;
}
```

---

## Boas Práticas

1. **Nunca exponha credenciais no frontend**
   - Sempre use Edge Functions
   - Credenciais ficam apenas no servidor Supabase

2. **Valide credenciais antes de usar**
   - Teste conexão ao salvar
   - Trate erros de autenticação

3. **Use variáveis de ambiente para segurança**
   - Fallback para banco de dados
   - Prioridade: ENV > BD

4. **Registre todas as operações**
   - Logs detalhados para debugging
   - Rastreie erros de integração

5. **Tratamento de erros**
   - Retorne mensagens claras ao usuário
   - Log completo no servidor para análise

---

## Troubleshooting

### Pagamento não processa
- Verifique Access Token do Mercado Pago
- Confirme que a conta está ativa
- Valide dados do cliente
- Verifique logs da Edge Function

### Email não envia
- Teste conexão SMTP
- Valide credenciais de email
- Confirme que "Menos segurança" está habilitada (Gmail)
- Verifique limites de envio do provedor

### Meta Pixel não rastreia
- Confirme Pixel ID
- Verifique que Pixel está ativo na conta Meta
- Valide eventos em Meta Pixel Helper
- Confirme que checkout carrega integração

---

## Próximas Melhorias

- [ ] Webhook para atualizar status de pagamento em tempo real
- [ ] Retry automático para emails falhados
- [ ] Dashboard de analytics com eventos Meta Pixel
- [ ] Suporte a múltiplas contas Mercado Pago
- [ ] Backup de emails enviados
