# ⚡ Guia Rápido: Entrega de Senha por Email

## O que foi implementado?

Quando um membro é criado automaticamente após um pagamento, o sistema:
1. Gera/atribui uma senha conforme configurado
2. **Envia um email com as credenciais de acesso**
3. Registra o resultado em logs

## 🎯 3 Modos de Senha

### 1️⃣ **Gerar Aleatória** (Recomendado)
- Sistema gera uma senha aleatória segura (12 caracteres)
- Cada membro recebe uma senha única
- Enviada por email automaticamente

### 2️⃣ **Fixa**
- Você define uma senha padrão
- Todos os membros usam a mesma senha inicial
- ⚠️ Menos seguro, mas conveniente para testes

### 3️⃣ **Forçar Mudança**
- Usa senha fixa, mas força mudança no primeiro login
- Bom para integração com contas corporativas

---

## ✅ Pré-Requisitos

### 1. Configurar SMTP (Integração de Email)

**Caminho:** Admin → Integrações → Gmail/SMTP

Configure:
- ✅ Email SMTP (ex: seu-email@gmail.com)
- ✅ Senha de Aplicativo (app password)
- ✅ Nome de Exibição (ex: "Seu Nome ou Empresa")

> **Para Gmail:** Use [app password](https://support.google.com/accounts/answer/185833), não sua senha normal!

### 2. Configurar Member Area

**Caminho:** Admin → Áreas de Membros → [Editar Área]

Na seção "Configuração de Senha":
- Selecione o modo de geração (Aleatória, Fixa ou Forçar Mudança)
- Se **Fixa**: Defina a senha padrão
- Clique em **Salvar**

### 3. Criar Produto com Acesso à Member Area

O produto precisa estar associado à member area:
- Via campo `member_area_id` direto
- Ou via `associated_products` array

---

## 🔄 Fluxo Prático

```
1. Cliente faz compra
   ↓
2. Pagamento é aprovado
   ↓
3. Membro é criado automaticamente
   ↓
4. Senha é gerada conforme configuração
   ↓
5. EMAIL É ENVIADO com:
   - Email do membro
   - Senha temporária
   - Link para acessar a área
   ↓
6. Cliente faz login e começa a usar
```

---

## 📧 Exemplo de Email Recebido

```
De: seu-email@gmail.com
Para: cliente@email.com
Assunto: Bem-vindo ao [Produto]!

─────────────────────────────

Bem-vindo, João da Silva!

Sua compra foi confirmada com sucesso! 🎉

Suas Credenciais de Acesso:

Email: cliente@email.com
Senha: xK9mP2dL5qR8

[Acessar Área de Membros] ← botão clicável

─────────────────────────────

Produto: Nome do Seu Curso

Qualquer dúvida, entre em contato conosco!
```

---

## 🧪 Como Testar

### Teste 1: Verificar Configuração

1. Admin → Integrações
   - ✅ SMTP configurado?

2. Admin → Áreas de Membros → [Editar]
   - ✅ Modo de senha selecionado?
   - ✅ Senha fixa preenchida (se modo Fixa)?

### Teste 2: Simular Pagamento

```bash
# Execute o script de teste
chmod +x test-email-password-delivery.sh
./test-email-password-delivery.sh
```

Procure por:
- ✅ "Configuração SMTP encontrada"
- ✅ "Email enviado com sucesso"
- Ou ❌ "Vendedor não identificado" (erro de configuração)

### Teste 3: Verificar Logs

**Admin → Analytics** (ou query direta no Supabase):

```sql
SELECT * FROM logs_entrega 
WHERE tipo = 'email' 
ORDER BY created_at DESC 
LIMIT 5;
```

Procure por:
- `status = 'enviado'` ✅ Email foi enviado
- `status = 'falhou'` ❌ Email falhou (veja `erro_mensagem`)

---

## 🔍 Troubleshooting

### ❌ Email não é enviado

**Verificar #1: SMTP Configurado?**
```sql
SELECT user_id, smtp_config 
FROM integrations 
WHERE user_id = 'seu-user-id';
```
Se vazio → Configure em Admin → Integrações

**Verificar #2: User ID do Produto**
```sql
SELECT id, name, user_id, member_area_id 
FROM products 
WHERE id = 'produto-id';
```
Se `user_id` vazio:
- Configure user_id no produto, OU
- Associe product_id à member_area com user_id

**Verificar #3: Logs de Erro**
```sql
SELECT * FROM logs_entrega 
WHERE status = 'falhou' 
ORDER BY created_at DESC 
LIMIT 1;
```
Leia a coluna `erro_mensagem` para detalhes

### ❌ Membro não é criado

Verifique se `create-member` function está funcionando:
```sql
SELECT * FROM members 
WHERE email = 'cliente@email.com';
```

Se vazio → Verifique logs do webhook para erros em CREATE_MEMBER_DEBUG

### ❌ Logs mostram "Vendedor não identificado"

Significa que `sellerUserId` não foi encontrado.

**Solução:**
1. Vá a **Admin → Products**
2. Edite o produto
3. Certifique-se que:
   - Produto tem `user_id`, OU
   - Produto está associado a member_area que tem `user_id`

---

## 📊 Status da Implementação

| Funcionalidade | Status | Nota |
|---|---|---|
| Geração de senha aleatória | ✅ Completo | Via `create-member` |
| Captura de senha no webhook | ✅ Completo | Armazenada em `compra.memberPassword` |
| Envio de email | ✅ Completo | Via `send-transactional-email` |
| 3 modos de senha | ✅ Completo | Random, Fixed, Force Change |
| Logs de entrega | ✅ Completo | Tabela `logs_entrega` |
| SMTP configurável | ✅ Completo | Via Integrações |

---

## 📝 Arquivos Modificados

- `supabase/functions/mercadopago-webhook/index.ts`
  - Adicionada captura de `memberPassword` da resposta `create-member`
  - Adicionada busca de `sellerUserId` (user_id do vendedor)
  - Atualizada função `sendDeliverableEmail` para invocar `send-transactional-email`
  - Email inclui credenciais quando membro é criado

- `src/pages/AdminMemberAreas.tsx`
  - UI para 3 modos de configuração de senha
  - Validação de senha fixa
  - Salva em `member_settings`

- `supabase/migrations/20251114_fix_member_settings_rls.sql`
  - Adicionada policy INSERT para `member_settings`

---

## 🆘 Suporte

Se algo não funcionar:

1. **Verifique os 3 pré-requisitos** acima
2. **Execute o teste** com `test-email-password-delivery.sh`
3. **Examine os logs** em `logs_entrega` ou `compras`
4. **Procure por mensagens de erro** nos console logs

---

## 🎉 Próximos Passos

- [ ] Configurar SMTP em Admin → Integrações
- [ ] Definir modo de senha em Admin → Member Areas
- [ ] Criar um produto teste
- [ ] Fazer um pagamento teste
- [ ] Verificar email recebido
- [ ] Consultar logs para confirmar

**Sucesso!** Agora seus clientes receberão suas senhas por email automaticamente! 🚀
