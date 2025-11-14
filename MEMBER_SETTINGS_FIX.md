# ✅ Correção Aplicada

## Problema Encontrado

A senha fixa não estava sendo salva porque faltava uma **RLS Policy** na tabela `member_settings`. A política de INSERT não estava configurada, então apenas usuários com `service_role` podiam inserir dados.

## Solução

Foram adicionadas:

1. **Migração corrigida**: `supabase/migrations/20251114_create_member_tables.sql`
   - Adicionada política INSERT para que usuários autenticados possam criar configurações

2. **Nova migração de correção**: `supabase/migrations/20251114_fix_member_settings_rls.sql`
   - Aplica a política que estava faltando no banco já existente

## Como Aplicar

Se você já tinha feito deploy da migração anterior, execute:

```bash
# Deploy a nova migração de correção
supabase db push

# Ou se quiser fazer manualmente:
supabase sql
# E execute o conteúdo de: supabase/migrations/20251114_fix_member_settings_rls.sql
```

## Depois de Aplicar

Teste novamente:
1. Vá para **Admin → Áreas de Membros**
2. Clique em **"Nova Área de Membros"**
3. Preencha os dados
4. Escolha um modo de senha (ex: "Senha Fixa")
5. Se for "Senha Fixa", insira a senha
6. Clique em **"Salvar Área"**

✅ Agora a senha deve ser salva corretamente!

## Verificação no Banco

Se quiser verificar se ficou salvo:

```sql
SELECT * FROM member_settings WHERE member_area_id = 'seu-id';
```

Deveria retornar a configuração com `default_password_mode` = 'fixed' e `default_fixed_password` preenchida.
