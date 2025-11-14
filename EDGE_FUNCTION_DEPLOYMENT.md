# Solução: Erro 404 - Edge Function Não Encontrada

## O Problema

```
Failed to load resource: the server responded with a status of 404
jgmwbovvydimvnmmkfpy.supabase.co/functions/v1/create-mercado-pago-payment
```

**Significa:** A Edge Function `create-mercado-pago-payment` não está deployada no seu Supabase.

---

## ✅ Solução: Deploy Manual

### Opção 1: Deploy com Supabase CLI (Recomendado)

```bash
# 1. Instalar Supabase CLI (se não tiver)
npm install -g supabase

# 2. Login no Supabase
supabase login

# 3. Link ao seu projeto
supabase link --project-ref jgmwbovvydimvnmmkfpy

# 4. Deploy as funções
supabase functions deploy
```

### Opção 2: Deploy pelo Dashboard

1. Vá para https://app.supabase.com/
2. Selecione seu projeto
3. Vá para **Functions** (lado esquerdo)
4. Clique em **"Deploy a new function"**
5. Selecione **"From template"** > **"HTTP request"**
6. Cole o código de `/supabase/functions/create-mercado-pago-payment/index.ts`
7. Clique em **Deploy**

---

## 🔍 Como Verificar se Está Deployada

1. Vá para https://app.supabase.com/
2. Selecione seu projeto
3. Vá para **Functions**
4. Procure por `create-mercado-pago-payment` na lista

Deve aparecer:
```
✅ create-mercado-pago-payment    (Active)
```

Se não aparecer ou estiver em erro, siga os passos de deploy acima.

---

## 🚨 Se Ainda Der Erro Após Deploy

### 1. Verifique os Logs
1. Clique na função na lista
2. Vá em **Logs**
3. Procure por erros: `CREATE_MP_PAYMENT_DEBUG`

### 2. Verifique as Variáveis de Ambiente
1. Clique na função
2. Vá em **Settings**
3. Certifique-se que existem:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` (ou gerada automaticamente)

### 3. Redeploye a Função
```bash
supabase functions deploy create-mercado-pago-payment
```

---

## 📋 Checklist

- [ ] Supabase CLI instalado
- [ ] Fez login com `supabase login`
- [ ] Linkedou o projeto com `supabase link`
- [ ] Executou `supabase functions deploy`
- [ ] Verificou na dashboard que função aparece como "Active"
- [ ] Tentou fazer um pagamento novamente

Pronto! Após fazer deploy, você não deve mais receber erro 404. 🚀
