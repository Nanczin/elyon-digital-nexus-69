# Sistema Automatizado de Acesso a Membros

## Visão Geral

Sistema completo de criação automática de membros após pagamento PIX com suporte a:
- **Configuração de Senha**: Três modos (aleatória, fixa, forçar mudança)
- **Associação Automática**: Membros recebem acesso aos produtos comprados
- **Notificação por Email**: Template customizável com credenciais
- **Rastreamento**: Logs completos de criação de membros

## Fluxo de Funcionamento

```
1. Cliente finaliza compra (PIX)
   ↓
2. Webhook do Mercado Pago é acionado
   ↓
3. Pagamento é verificado e aprovado
   ↓
4. Sistema busca áreas de membros associadas ao produto
   ↓
5. Edge Function `create-member` é invocada com:
   - Nome do cliente
   - Email
   - ID do checkout
   - ID do pagamento
   - Tipo de plano
   - IDs dos produtos comprados
   - ID da área de membros
   ↓
6. `create-member` respeita configurações de senha:
   - Gera senha aleatória OU
   - Usa senha fixa OU
   - Gera senha temporária (força mudança)
   ↓
7. Membro é criado em:
   - `members` table (registro do membro)
   - `auth.users` (usuário de autenticação)
   - `member_access` (acesso aos produtos)
   ↓
8. Email de boas-vindas é enviado com credenciais
   ↓
9. Membro pode fazer login e acessar produtos
```

## Tabelas de Banco de Dados

### `members`
```sql
- id (uuid): Identificador único
- user_id (uuid): Referência ao auth.users
- name (text): Nome do membro
- email (text): Email único
- phone (text): Telefone (opcional)
- password_hash (text): Hash bcrypt da senha
- checkout_id (uuid): Referência ao checkout
- payment_id (uuid): ID do pagamento Mercado Pago
- plan_type (text): Tipo do plano (essencial, avançado, premium, oferta_unica)
- status (text): Status (active, inactive, suspended)
- created_at, updated_at: Timestamps
```

### `member_access`
```sql
- id (uuid): Identificador único
- member_id (uuid): Referência ao membro
- product_id (uuid): Referência ao produto
- granted_at (timestamp): Data de concessão
- expires_at (timestamp): Data de expiração (opcional)
- status (text): Status (active, inactive, expired)
- created_at, updated_at: Timestamps
```

### `member_settings`
```sql
- id (uuid): Identificador único
- member_area_id (uuid): Referência à área de membros (única por área)
- default_password_mode (text): 'random' | 'fixed' | 'force_change'
- default_fixed_password (text): Senha fixa (se modo = fixed)
- welcome_email_template (text): Template customizado (opcional)
- created_at, updated_at: Timestamps
```

## Edge Functions

### `create-member`
**Propósito**: Criar membro automaticamente após pagamento aprovado

**Entrada**:
```json
{
  "name": "João Silva",
  "email": "joao@example.com",
  "checkoutId": "uuid-do-checkout",
  "paymentId": "uuid-do-pagamento",
  "planType": "premium",
  "productIds": ["uuid-produto-1", "uuid-produto-2"],
  "memberAreaId": "uuid-area-membros"
}
```

**Saída**:
```json
{
  "success": true,
  "memberId": "uuid-do-membro",
  "userId": "uuid-do-usuario",
  "password": "senha-gerada",
  "message": "Member created successfully"
}
```

**Funcionamento**:
1. Busca configurações de `member_settings` para a área
2. Gera senha conforme modo configurado
3. Cria usuário em `auth.users`
4. Cria registro em `members`
5. Concede acesso aos produtos em `member_access`
6. Retorna credenciais

### `mercadopago-webhook`
**Atualizado para**:
- Chamar `create-member` ao invés de `create-member-user`
- Passar todos os dados necessários incluindo `productIds`
- Buscar `member_area_id` de `associated_products`

## Configuração de Modo de Senha

### Acesso ao Painel
1. Ir para **Admin → Áreas de Membros**
2. Abrir configurações da área
3. Ir para aba "Configurações de Membros"

### Modos Disponíveis

#### 1. **Senha Aleatória** (padrão)
- ✅ Cada membro recebe senha única
- ✅ Segurança máxima
- ✅ Senha é enviada por email

```
Exemplo: "K7mP9@xQ2nL!"
```

#### 2. **Senha Fixa**
- ✅ Todos os membros usam mesma senha
- ⚠️ Menor segurança
- ✅ Útil para áreas de conteúdo público

```
Configure em: Member Settings → Senha Fixa
Exemplo: "MinhaArea123"
```

#### 3. **Forçar Mudança**
- ✅ Senha temporária aleatória
- ✅ Membro deve mudar no primeiro login
- ✅ Força senha forte personalizada

```
Email: "Senha temporária: X9m@Pq2L8w - Você deve mudar no primeiro acesso"
```

## Email de Boas-vindas

### Template Padrão (se não configurado)
```html
Olá {{nome}},

Seu acesso foi criado com sucesso!

Email: {{email}}
Senha: {{password}}
Link de Acesso: {{url_acesso}}

Bem-vindo à nossa área de membros!
```

### Variáveis Disponíveis
- `{{nome}}`: Nome do membro
- `{{email}}`: Email do membro
- `{{password}}`: Senha (não incluir se força mudança!)
- `{{url_acesso}}`: Link para área de membros
- `{{data_expiracao}}`: Data de expiração (se aplicável)

### Template Customizado com Força de Mudança
```html
Olá {{nome}},

Bem-vindo! Sua conta foi criada.

Sua senha temporária é: {{password}}

Por favor, faça login e altere sua senha no primeiro acesso.

Link: {{url_acesso}}
```

## Logging e Debugging

### Logs da Função `create-member`
```
CREATE_MEMBER_DEBUG: Starting member creation
CREATE_MEMBER_DEBUG: Password mode determined
CREATE_MEMBER_DEBUG: Auth user created
CREATE_MEMBER_DEBUG: Member record created
CREATE_MEMBER_DEBUG: Product access granted
```

### Logs do Webhook
```
CREATE_MEMBER_DEBUG: Iniciando criação automática de membro
CREATE_MEMBER_DEBUG: Membro criado com sucesso
CREATE_MEMBER_DEBUG: Erro ao invocar create-member (com detalhes)
```

## Tratamento de Erros

### Email já existe
- Função retorna erro 409
- Webhook continua com próxima área
- Usuário existente recebe email notificando acesso concedido

### Falha na criação de auth user
- Exceção registrada em logs
- Webhook tenta próxima área
- Admin é notificado (requer integração com logs)

### Falha no acesso a produto
- Registrado em logs
- Membro é criado mas sem acesso
- Admin pode conceder manualmente

## Monitoramento

### Checks Recomendados
1. **Diariamente**: Verificar logs de `CREATE_MEMBER_DEBUG`
2. **Semanalmente**: Validar count de membros vs compras
3. **Mensalmente**: Revisar configurações de senha

### Query de Validação
```sql
-- Membros criados nos últimos 7 dias
SELECT COUNT(*), DATE(created_at)
FROM members
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at);

-- Taxa de sucesso
SELECT 
  COUNT(CASE WHEN status = 'active' THEN 1 END) as ativos,
  COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inativos,
  COUNT(*) as total
FROM members;
```

## Troubleshooting

### Problema: Membro não foi criado após compra
1. ✅ Verificar logs de webhook (`CREATE_MEMBER_DEBUG`)
2. ✅ Validar `member_area_id` no produto
3. ✅ Confirmar `associated_products` configurado
4. ✅ Testar função `create-member` manualmente

### Problema: Email não recebido
1. ✅ Verificar logs de email
2. ✅ Validar template customizado (se usado)
3. ✅ Confirmar integração email funciona

### Problema: Membro cria conta mas sem acesso a produtos
1. ✅ Verificar `member_access` table
2. ✅ Confirmar `product_id` está correto
3. ✅ Validar `associated_products` array

## Deployment

### Passos
```bash
# 1. Deploy migração de tabelas
supabase migration up

# 2. Deploy Edge Functions
supabase functions deploy create-member
supabase functions deploy mercadopago-webhook

# 3. Validar deployment
curl https://<project>.supabase.co/functions/v1/create-member \
  -H "Authorization: Bearer $ANON_KEY"

# 4. Testar webhook
curl -X POST https://<project>.supabase.co/functions/v1/mercadopago-webhook \
  -H "Content-Type: application/json" \
  -d '{...webhook-test-payload...}'
```

## Checklist de Implementação

- [x] Criar tabela `members`
- [x] Criar tabela `member_access`
- [x] Criar tabela `member_settings`
- [x] Implementar função `create-member`
- [x] Atualizar webhook para usar `create-member`
- [x] Criar painel UI `MemberSettingsPanel`
- [ ] Testar fluxo end-to-end
- [ ] Configurar email template padrão
- [ ] Documentar processo para suporte
- [ ] Implementar monitoramento de métricas
