# Guia de Deployment - Sistema de Acesso a Membros

## Passo 1: Executar Migrações de Banco

```bash
# Login no Supabase
supabase link --project-ref <SEU_PROJECT_ID>

# Fazer push das migrações
supabase db push

# Verificar status
supabase migration list
```

## Passo 2: Deploy das Edge Functions

```bash
# Deploy create-member
supabase functions deploy create-member

# Deploy mercadopago-webhook (atualizado)
supabase functions deploy mercadopago-webhook

# Listar funções deployadas
supabase functions list
```

## Passo 3: Configurar Variáveis de Ambiente

No console do Supabase, adicionar à configuração de Edge Functions:

```
SUPABASE_URL: https://<project-id>.supabase.co
SUPABASE_SERVICE_ROLE_KEY: <sua-service-role-key>
MERCADOPAGO_ACCESS_TOKEN: <seu-token>
MERCADOPAGO_WEBHOOK_SECRET: <seu-secret>
```

## Passo 4: Testar Deployment

### Testar criação de membro

```bash
curl -X POST https://<project-id>.supabase.co/functions/v1/create-member \
  -H "Authorization: Bearer $(echo $SUPABASE_SERVICE_ROLE_KEY)" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Teste Usuario",
    "email": "teste@example.com",
    "checkoutId": "12345",
    "paymentId": "67890",
    "planType": "premium",
    "productIds": ["uuid-do-produto"],
    "memberAreaId": "uuid-da-area"
  }'
```

### Verificar logs

```bash
supabase functions logs create-member --follow
supabase functions logs mercadopago-webhook --follow
```

## Passo 5: Validar no Banco

```sql
-- Verificar tabelas criadas
SELECT * FROM member_settings LIMIT 1;
SELECT * FROM members LIMIT 1;
SELECT * FROM member_access LIMIT 1;

-- Verificar índices
SELECT * FROM pg_indexes WHERE tablename IN ('members', 'member_access', 'member_settings');

-- Verificar RLS policies
SELECT * FROM pg_policies WHERE tablename IN ('members', 'member_access', 'member_settings');
```

## Troubleshooting

### Erro: "Function not found"
- Confirmar que `create-member/index.ts` existe
- Confirmar que `deno.json` está configurado
- Re-fazer deploy: `supabase functions deploy create-member --force`

### Erro: "Service role key missing"
- Verificar variáveis de ambiente no console
- Confirmar que Deno pode acessar `SUPABASE_SERVICE_ROLE_KEY`

### Erro: "bcrypt import failed"
- Atualizar import: `https://deno.land/x/bcrypt@v0.4.1/mod.ts`
- Confirmar que Deno tem acesso à internet

### Logs vazios
- Verificar se função foi realmente deployada
- Testar manualmente com curl acima
- Verificar CORS headers

## Rollback

Se houver problema após deployment:

```bash
# Reverter última migração
supabase db reset

# Ou fazer uncommit sem remover dados
supabase migration down

# Remover função deployada
supabase functions delete create-member
```

## Próximos Passos

1. ✅ Deployment das funções
2. ⏳ Integração do painel MemberSettingsPanel nas páginas de admin
3. ⏳ Testar fluxo end-to-end com pagamento real
4. ⏳ Configurar emails automáticos
5. ⏳ Monitores e alertas para falhas
