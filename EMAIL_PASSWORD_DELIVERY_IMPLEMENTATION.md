# Implementação de Entrega de Senha por Email

## 📋 Resumo Executivo

O sistema foi atualizado para **entregar automaticamente a senha de membro por email** quando um membro é criado via automação (através de pagamento). Agora o fluxo completo está funcionando:

```
Pagamento Aprovado → Membro Criado → Senha Gerada → Email Enviado
```

## 🔄 Fluxo Completo de Entrega de Senha

### 1. **Pagamento Aprovado (Mercado Pago Webhook)**
- Webhook recebe `payment.approved` do Mercado Pago
- Extrai dados do cliente e identifica o produto

### 2. **Busca de Configuração de Vendedor**
- Sistema busca o `user_id` (proprietário) através de:
  - Campo `user_id` do produto (se disponível)
  - Campo `user_id` da `member_area` associada (fallback)
- ⚠️ Se `sellerUserId` não for encontrado, email **não será enviado**

```typescript
// Busca sequencial de user_id:
if (produto.user_id) {
  sellerUserId = produto.user_id;
} else if (produto.member_area_id) {
  // Query na member_areas para obter user_id
  sellerUserId = memberArea.user_id;
}
```

### 3. **Registro de Compra**
- Compra é inserida/atualizada na tabela `compras`
- Campos salvos: `cliente_email`, `cliente_nome`, `valor_pago`, etc.

### 4. **Criação de Membro (Edge Function)**
- Função `create-member` invocada com:
  - `name`: Nome do cliente
  - `email`: Email do cliente
  - `memberAreaId`: ID da área de membros
  - `productIds`: IDs dos produtos associados

- **Processamento interno:**
  1. Valida se membro já existe
  2. Busca `member_settings` para obter configuração de senha
  3. Gera/atribui senha conforme configurado:
     - `random`: Gera senha aleatória de 12 caracteres
     - `fixed`: Usa senha configurada na area
     - `force_change`: Usa senha fixa mas força mudança no login
  4. Cria usuário no Supabase Auth com a senha
  5. **Retorna** na resposta: `{ success: true, memberId, userId, password }`

### 5. **Captura de Senha**
```typescript
const { data: createRes, error: createErr } = 
  await supabase.functions.invoke('create-member', { ... });

// Capturar senha da resposta
if (createRes?.success && createRes.password) {
  memberPassword = createRes.password;
}

// Adicionar ao objeto compra para email
compra.memberPassword = memberPassword;
```

### 6. **Envio de Email com Credenciais**
Função `sendDeliverableEmail` invocada com:
- `supabase`: Cliente Supabase
- `compra`: Objeto com dados da compra (incluindo `memberPassword`)
- `produto`: Dados do produto
- `sellerUserId`: ID do vendedor (proprietário das configurações SMTP)

**Lógica de montagem do email:**

```typescript
if (compra.memberPassword) {
  // Email formatado com credenciais de acesso
  emailBody = `
    <h2>Bem-vindo, ${compra.cliente_nome}!</h2>
    <p>Sua compra foi confirmada com sucesso! 🎉</p>
    
    <h3>Suas Credenciais de Acesso:</h3>
    <p>
      <strong>Email:</strong> ${compra.cliente_email}<br>
      <strong>Senha:</strong> <code>${compra.memberPassword}</code>
    </p>
    
    <p><a href="${produto.url_acesso}">Acessar Área de Membros</a></p>
    ...
  `;
} else {
  // Email com template genérico (sem credenciais)
  emailBody = produto.email_template.replace(/{{...}}/g, valores);
}
```

### 7. **Invocação de send-transactional-email**
```typescript
const { data: emailResult, error: emailError } = 
  await supabase.functions.invoke('send-transactional-email', {
    body: {
      to: compra.cliente_email,
      subject: emailSubject,
      html: emailBody,
      text: emailBody (versão em texto puro),
      sellerUserId: sellerUserId  // ✅ Parâmetro obrigatório
    }
  });
```

### 8. **Processamento de Email (send-transactional-email)**
- Recebe `sellerUserId`
- Busca configurações SMTP do vendedor em `integrations.smtp_config`
- Requer: `email`, `appPassword`, `displayName`
- Invoca `send-email-proxy` para envio efetivo
- Retorna resultado

### 9. **Atualização de Status**
Se email enviado com sucesso:
- Tabela `compras`: `entregavel_enviado = true`, `entregavel_enviado_em = timestamp`
- Tabela `logs_entrega`: Registra envio bem-sucedido

Se houver erro:
- Tabela `logs_entrega`: Registra falha com mensagem de erro

## 🛠️ Configuração Necessária (Checklist)

### Para cada Vendedor:
1. ✅ **Ter configuração SMTP em Integrations**
   - Email SMTP configurado
   - Senha de aplicativo (app password)
   - Nome exibição configurado

2. ✅ **Produto deve ter user_id**
   - Ou via campo direto no produto
   - Ou via member_area associada

3. ✅ **Member Area deve ter configuração de senha**
   - Acessar: Admin → Member Areas → [Editar] → "Configuração de Senha"
   - Opções:
     - **Gerar Aleatória**: Sistema gera senha automática
     - **Fixa**: Usa senha configurada no campo
     - **Forçar Mudança**: Usa fixa mas força mudança na primeiro login

## 📊 Fluxo Visual

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. PAGAMENTO APROVADO (Webhook Mercado Pago)                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. BUSCAR CONFIGURAÇÃO DE VENDEDOR                              │
│    • user_id do produto ou member_area                          │
│    • Usar para buscar SMTP config                               │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. REGISTRAR COMPRA NA TABELA                                   │
│    • Dados básicos: email, nome, valor                          │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. INVOCAR create-member (Edge Function)                        │
│    • Recebe: name, email, memberAreaId, productIds              │
│    • Retorna: { success, memberId, userId, password }           │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. CAPTURAR SENHA DA RESPOSTA                                   │
│    • compra.memberPassword = createRes.password                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. INVOCAR send-transactional-email                             │
│    • Parâmetros: to, subject, html, text, sellerUserId         │
│    • Email inclui credenciais de acesso                         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. ATUALIZAR STATUS                                             │
│    • compras: entregavel_enviado = true                         │
│    • logs_entrega: Registra resultado                           │
└─────────────────────────────────────────────────────────────────┘
```

## 🔍 Troubleshooting

### Email não é enviado
1. **Verificar user_id do produto**
   ```sql
   SELECT id, name, user_id, member_area_id FROM products WHERE id = 'seu_id';
   ```

2. **Verificar member_area user_id** (se produto não tem user_id)
   ```sql
   SELECT id, name, user_id FROM member_areas WHERE id = 'seu_id';
   ```

3. **Verificar configuração SMTP do vendedor**
   ```sql
   SELECT user_id, smtp_config FROM integrations WHERE user_id = 'seu_user_id';
   ```
   - Deve ter: `email`, `appPassword`, `displayName`

4. **Verificar logs do webhook**
   - Procurar por: "⚠️ Vendedor não identificado" ou "❌ Erro ao enviar email"

### Senha não é gerada
1. **Verificar member_area password_mode**
   ```sql
   SELECT id, password_mode, fixed_password FROM member_areas 
   WHERE id = 'seu_id';
   ```

2. **Verificar member_settings da área**
   ```sql
   SELECT area_id, password_mode, fixed_password FROM member_settings
   WHERE area_id = 'seu_id';
   ```

### Logs de sucesso/falha
- Verificar tabela `logs_entrega`
- Campos: `compra_id`, `tipo` (sempre 'email'), `status` ('enviado'/'falhou'), `erro_mensagem`

## 📝 Códigos Modificados

### 1. `/supabase/functions/mercadopago-webhook/index.ts`
- **Linhas 200-250**: Adicionado `sellerUserId` e busca de user_id
- **Linhas 265-390**: Captura de senha de `create-member` response
- **Linha 402**: Passou `sellerUserId` para `sendDeliverableEmail`
- **Linhas 436-540**: Atualizada função `sendDeliverableEmail`:
  - Novo parâmetro `sellerUserId`
  - Validação se user_id existe
  - Lógica de email com/sem credenciais
  - Invocação correta de `send-transactional-email`

### 2. Configuração de Membros (UI)
- **Arquivo**: `/src/pages/AdminMemberAreas.tsx`
- **Funcionalidade**: 3 modos de senha
  - Gerar Aleatória
  - Fixa (inserida admin)
  - Forçar Mudança

### 3. Database
- **Tabela**: `member_settings`
- **Campos**: `password_mode`, `fixed_password`
- **RLS Policy**: INSERT permission adicionada (corrigido em migração)

## ✅ Verificação Final

```bash
# 1. Testar webhook (simular pagamento)
curl -X POST http://localhost:54321/functions/v1/mercadopago-webhook \
  -H "Content-Type: application/json" \
  -d '{...payload...}'

# 2. Verificar logs
SELECT * FROM logs_entrega ORDER BY created_at DESC LIMIT 5;

# 3. Verificar email enviado
SELECT * FROM compras WHERE entregavel_enviado = true;

# 4. Verificar membro criado
SELECT * FROM members WHERE email = 'teste@email.com';
```

## 🎯 Resultado Final

✅ **Sistema de entrega de senha totalmente integrado:**
- Senha gerada automaticamente conforme configuração
- Email enviado com credenciais incluídas
- Status rastreado em logs
- Suporta 3 modos de configuração
- Usa SMTP configurado pelo vendedor
