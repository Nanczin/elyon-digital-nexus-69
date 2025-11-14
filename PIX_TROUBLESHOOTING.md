# Guia de Troubleshooting - PIX Não Funciona

## Erro Recebido
```
Checkout Debug: Erro na edge function: FunctionsHttpError: Edge Function returned a non-2xx status code
```

Este erro significa que a Edge Function `create-mercado-pago-payment` retornou um status de erro (400, 401, 404, 500, etc).

---

## 🔍 Passo 1: Verificar se as Credenciais Estão Configuradas

### 1.1 Abra a página de debug:
```
http://localhost:5173/debug/integrations
```

Você deve ver:
- ✅ **Mercado Pago Access Token: CONFIGURADO**
- ✅ **Mercado Pago Token Public: CONFIGURADO**

Se aparecer ❌ **NÃO CONFIGURADO**, então:
1. Vá para Admin > Integrações
2. Clique em "Configurar" (Mercado Pago)
3. Cole seu Access Token (começa com `APP_USR-`)
4. Cole sua Public Key (começa com `APP_USR-`)
5. Clique em "Salvar"
6. Volte para a página de debug e recarregue

### 1.2 Se ainda não aparecer, verifique:
- Você tem conta no Mercado Pago?
- Você está logado no admin com o mesmo usuário que configurou?
- O token é válido (não expirou)?

---

## 🔍 Passo 2: Verificar o Checkout

No console do navegador (F12), execute:
```javascript
// Verificar o ID do checkout
console.log(window.location.pathname)

// Deve aparecer algo como:
// /checkout/abc123def456

// Se for /checkout/preview, você está testando com preview
```

### Se estiver em `/checkout/preview`:
1. Certifique-se de que um checkout em preview foi salvo
2. Vá para Admin > Checkouts
3. Selecione um checkout
4. Clique em "Visualizar (Preview)"
5. Isso carrega os dados em `/checkout/preview`

### Se estiver em `/checkout/{id}`:
1. O checkout deve existir no banco de dados
2. Deve ter o `product_id` correto
3. Deve estar com `payment_methods.pix = true`

---

## 🔍 Passo 3: Verificar os Logs (Mais Detalhes do Erro)

### 3.1 Abra os Logs da Edge Function:
1. Vá para https://app.supabase.com/
2. Selecione seu projeto
3. Vá para **Functions** (lado esquerdo)
4. Clique em **create-mercado-pago-payment**
5. Clique em **Logs**
6. Procure pela tentativa recente (deve estar no topo)

### 3.2 Procure por uma das mensagens de erro:

#### ❌ Erro: "Access Token is empty or not configured"
```
CREATE_MP_PAYMENT_DEBUG: 8.1. Access Token is empty or not configured.
```
**Solução:** Volte ao Passo 1, configure o token

#### ❌ Erro: "Preview checkout detected"
```
CREATE_MP_PAYMENT_DEBUG: 5.0. Preview checkout detected - cannot process payment in preview mode
```
**Solução:** 
- Você está testando em modo PREVIEW (`/checkout/preview`)
- Crie um checkout publicado (Admin > Checkouts > Salvar)
- Use o link público (`/checkout/{uuid}`)
- Veja: [TESTING_PIX.md](./TESTING_PIX.md)

#### ❌ Erro: "Checkout não encontrado"
```
CREATE_MP_PAYMENT_DEBUG: 5.1. Checkout error: PGRST116
```
**Solução:** 
- Verifique o checkoutId (deve ser um UUID válido)
- Verifique se o checkout existe no banco
- Se está em preview, certifique-se de que salvou o preview

#### ❌ Erro: "Mercado Pago API Error"
```
CREATE_MP_PAYMENT_DEBUG: 14. Mercado Pago API Error: {...}
```
**Leia o erro** e verifique:
- Access Token é inválido ou expirou?
- O token é para a conta PROD ou SANDBOX?
- A API do Mercado Pago está fora do ar?

#### ❌ Erro: "Error creating payment" (erro genérico)
```
CREATE_MP_PAYMENT_DEBUG: 21. Error creating payment: Error: ...
```
**Leia a mensagem de erro** após `Error:`

---

## 🔍 Passo 4: Verificar no Console do Navegador

### Abra o DevTools (F12) e vá em Console

Procure por logs iniciados com:
- `CHECKOUT_FRONTEND_DEBUG: handleSubmit called`
- `CHECKOUT_FRONTEND_DEBUG: checkoutId: ...`
- `CHECKOUT_FRONTEND_DEBUG: MP Response: ...`
- `CHECKOUT_FRONTEND_DEBUG: MP Error Status: ...`

### Exemplo de logs corretos:
```javascript
CHECKOUT_FRONTEND_DEBUG: handleSubmit called
CHECKOUT_FRONTEND_DEBUG: checkoutId: 123e4567-e89b-12d3-a456-426614174000
CHECKOUT_FRONTEND_DEBUG: checkout data: {id: "...", products: {...}, ...}
CHECKOUT_FRONTEND_DEBUG: MP Response: {success: true, payment: {...}, qr_code: "..."}
```

### Exemplo de logs com erro:
```javascript
CHECKOUT_FRONTEND_DEBUG: handleSubmit called
CHECKOUT_FRONTEND_DEBUG: checkoutId: 123e4567-e89b-12d3-a456-426614174000
CHECKOUT_FRONTEND_DEBUG: MP Response: undefined
CHECKOUT_FRONTEND_DEBUG: MP Error Status: 400
CHECKOUT_FRONTEND_DEBUG: MP Error Message: "Token do Mercado Pago não configurado..."
```

---

## 📋 Checklist de Verificação

- [ ] Credenciais do Mercado Pago estão configuradas? (`/debug/integrations`)
- [ ] Access Token começa com `APP_USR-`?
- [ ] Public Key começa com `APP_USR-`?
- [ ] O checkout existe no banco? (ou você está em preview válido?)
- [ ] O checkout tem `payment_methods.pix = true`?
- [ ] O formulário foi preenchido corretamente?
- [ ] Clicou em "Finalizar Compra"?
- [ ] Verificou os logs em `/functions/create-mercado-pago-payment/logs`?

---

## 🚀 Se Tudo Estiver Correto

Você deve ver:
1. **Após clicar "Finalizar Compra":**
   - Toast: "PIX Gerado!"
   - Redirecionamento para `/payment-success`

2. **Na página de sucesso:**
   - QR Code exibido
   - Botão "Copiar Código PIX"
   - Valor em reais

3. **Nos logs:**
   ```
   CREATE_MP_PAYMENT_DEBUG: 15.1. PIX Specific Data from MP Response: {
     qr_code: "00020126360014br.gov.bcb.pix...",
     qr_code_base64: "iVBORw0KGgoAAAANSUhEUg..."
   }
   ```

---

## 💬 Mensagens Comuns de Erro e Soluções

| Erro | Causa | Solução |
|------|-------|---------|
| "Token do Mercado Pago não configurado" | Access Token vazio | Configure em Admin > Integrações |
| "Checkout não encontrado" | ID inválido ou checkout deletado | Verifique URL e se checkout existe |
| "invalid_request" (MP) | Dados incompletos | Preencha todos os campos obrigatórios |
| "unauthorized" (MP) | Token inválido/expirado | Gere novo token no Mercado Pago |
| "insufficient_permissions" | Token sem permissões | Verifique escopo do token no MP |
| "Too many requests" | Rate limit | Aguarde e tente novamente |

---

## 🔗 Links Úteis

- [Mercado Pago - Gerar Access Token](https://www.mercadopago.com/integrations/api-credentials)
- [Supabase Logs](https://app.supabase.com/)
- [Debug Integrações (Local)](http://localhost:5173/debug/integrations)

---

## 📞 Próximas Ações

1. Abra http://localhost:5173/debug/integrations
2. Verifique se as credenciais aparecem como ✅ CONFIGURADO
3. Se não, configure-as em Admin > Integrações
4. Se sim, clique em "Finalizar Compra" novamente
5. Abra os logs em https://app.supabase.com/ > Functions > create-mercado-pago-payment > Logs
6. Me envie o erro que aparece nos logs

Pronto! 🚀
