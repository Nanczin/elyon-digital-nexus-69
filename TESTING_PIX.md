# Como Testar o PIX Corretamente

## ⚠️ O Erro

Você recebeu o erro:
```
invalid input syntax for type uuid: "preview"
```

**O que significa:** Você estava testando em modo **PREVIEW**, que é apenas para visualização. Pagamentos reais só funcionam em checkouts **PUBLICADOS**.

---

## ✅ Solução: Testar com Checkout Publicado

### Passo 1: Criar um Checkout (se ainda não tiver)

1. Vá para **Admin > Checkouts**
2. Clique em **"Novo Checkout"** (ou selecione um existente)
3. Configure:
   - Nome do checkout
   - Produto associado
   - Preço
   - Ativar PIX em "Formas de Pagamento"
4. Clique em **"Salvar Checkout"**

### Passo 2: Pegar o Link Público

Após salvar, você verá um botão **"Link de Pagamento Público"** ou **"Copiar Link"**

O link terá este formato:
```
https://seu-dominio.com/checkout/{uuid-do-checkout}
```

**NÃO** será:
```
http://localhost:5173/checkout/preview  ❌ (isso é preview)
```

### Passo 3: Testar com o Link Público

1. Copie o link público
2. Abra em uma aba anônima (ou limpe cookies)
3. Preencha os dados:
   - Nome
   - Email
   - CPF (opcional, depende da configuração)
   - Telefone (opcional)
4. Selecione **PIX**
5. Clique em **"Finalizar Compra"**

### Passo 4: Verificar Logs

Se aparecer o QR Code, significa que **funcionou! ✅**

Se der erro:
1. Abra F12 > Console
2. Procure por `CHECKOUT_FRONTEND_DEBUG`
3. Vá para https://app.supabase.com/ > Functions > create-mercado-pago-payment > Logs
4. Procure por `CREATE_MP_PAYMENT_DEBUG`

---

## 📋 Diferença: Preview vs Publicado

| Aspecto | Preview | Publicado |
|--------|---------|-----------|
| URL | `/checkout/preview` | `/checkout/{uuid}` |
| Salvo em BD | ❌ Não | ✅ Sim |
| Pode processar pagamento | ❌ Não | ✅ Sim |
| Uso | Visualização/teste | Pagamentos reais |
| Dados | localStorage | Supabase DB |

---

## 🔧 Se Ainda Não Tiver Credenciais Configuradas

Antes de testar, certifique-se:

1. Vá para **Admin > Integrações**
2. Clique em **"Configurar"** (Mercado Pago)
3. Cole:
   - **Access Token** (começa com `APP_USR-`)
   - **Public Key** (começa com `APP_USR-`)
4. Clique em **"Salvar"**

Se não souber onde encontrar:
- Vá para https://www.mercadopago.com/integrations/api-credentials
- Procure por "Credenciais de Produção" (não Sandbox)
- Copie o "Access Token" e "Public Key"

---

## 🎯 Fluxo Correto para Testar

```
1. Criar Checkout no Admin
   ↓
2. Salvar Checkout (salva em BD com UUID)
   ↓
3. Copiar Link Público
   ↓
4. Abrir Link em Navegador
   ↓
5. Preencher Dados
   ↓
6. Selecionar PIX
   ↓
7. Clicar "Finalizar Compra"
   ↓
8. Ver QR Code ✅
   ↓
9. Testar PIX (copiar código ou escanear)
```

---

## 💡 Por Que Preview Não Funciona?

O modo preview é apenas para **visualizar como ficará**, sem salvar dados no banco. Como o ID é `"preview"` (texto), não um UUID válido, a Edge Function rejeita.

Isso é **segurança**: evita que alguém acidentalmente processe um pagamento com dados de teste.

---

## ✅ Próximas Ações

1. ✅ Verifique se credenciais estão configuradas (`/debug/integrations`)
2. ✅ Crie um checkout no Admin
3. ✅ Salve o checkout (vai gerar um UUID)
4. ✅ Copie o link público
5. ✅ Abra em aba anônima
6. ✅ Teste o pagamento PIX

Quando conseguir, você verá o QR Code! 🚀
