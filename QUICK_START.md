#!/bin/bash
# QUICK_START.sh - Resumo rápido de comandos úteis

cat << 'EOF'

╔═══════════════════════════════════════════════════════════════════════╗
║              QUICK START - ATIVAR MEMBROS AUTOMÁTICOS                ║
║                        (copie e cole)                                 ║
╚═══════════════════════════════════════════════════════════════════════╝


📋 LISTAS DE VERIFICAÇÃO
───────────────────────────────────────────────────────────────────────

LEIA ESTES ARQUIVOS (na ordem):
  1. 📘 PASSO_A_PASSO_COMPLETO.md      ← Começa aqui!
  2. 📄 MIGRATION_SQL_READY_TO_PASTE.sql ← SQL para colar
  3. 📘 STATUS_SUMMARY.md             ← Para referência

ATALHOS IMPORTANTES:
  🔗 Supabase Console:
     https://app.supabase.com/projects/jgmwbovvydimvnmmkfpy
  
  🔗 SQL Editor (onde colar):
     https://app.supabase.com/projects/jgmwbovvydimvnmmkfpy/sql/new

  🔗 Mercado Pago Dashboard:
     https://www.mercadopago.com/developers/panel


⚡ RESUMO DE 3 PASSOS
───────────────────────────────────────────────────────────────────────

PASSO 1: Executar Migração (2 min)
  └─ Abra: MIGRATION_SQL_READY_TO_PASTE.sql
  └─ Copie: Ctrl+A, Ctrl+C
  └─ Vá para: SQL Editor do Supabase
  └─ Cole: Ctrl+V
  └─ Execute: Clique "Run"
  └─ Resultado: ✅ (verde)

PASSO 2: Configurar Tokens (1 min)
  └─ Mercado Pago → Credenciais → Copie "Access Token"
  └─ Mercado Pago → Webhooks → Copie "Token"
  └─ Supabase → Functions → create-member → Settings
  └─ Adicione secrets (copie os valores)

PASSO 3: Testar (5 min)
  └─ Abra seu app: http://localhost:5173
  └─ Faça checkout
  └─ Complete pagamento
  └─ Verifique aba "Membros" ✅


🔍 VERIFICAÇÃO RÁPIDA (após migração)
───────────────────────────────────────────────────────────────────────

Execute no terminal:

  # Testar se tabelas foram criadas:
  curl -s "https://jgmwbovvydimvnmmkfpy.supabase.co/rest/v1/members?limit=1" \
    -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpnbXdib3Z2eWRpbXZubW1rZnB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1ODk3NTYsImV4cCI6MjA2ODE2NTc1Nn0.-Ez2vpFaX8B8uD1bfbaCEt1-JkRYA8xZBGowhD8ts4k" | jq .

  # Resultado esperado:
  # [] ← vazio é OK (tabela criada mas sem dados)


🆘 SOLUÇÕES RÁPIDAS
───────────────────────────────────────────────────────────────────────

❌ "relation already exists"
   ✅ Suas tabelas já existem! Prossiga para configurar tokens.

❌ "function not found: update_updated_at_column"
   ✅ Execute no SQL Editor:
      CREATE OR REPLACE FUNCTION public.update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

❌ "relation does not exist"
   ✅ Migração não foi executada.
      Volte para PASSO 1 e tente novamente.

❌ Membros não aparecem após testar
   ✅ Verifique:
      1. Logs da função: Supabase → Functions → create-member → Logs
      2. Webhook configurado: Mercado Pago → Webhooks
      3. Tokens configurados: Supabase → Functions → create-member → Settings


📊 O QUE FOI IMPLEMENTADO
───────────────────────────────────────────────────────────────────────

Código (100% pronto):
  ✅ supabase/functions/create-member/index.ts
  ✅ supabase/functions/mercadopago-webhook/index.ts
  ✅ supabase/functions/send-transactional-email/index.ts
  ✅ src/pages/AdminMembers.tsx
  ✅ Migration SQL

Faltando (apenas execução):
  ⏳ Você precisa executar a migração
  ⏳ Configurar variáveis de ambiente
  ⏳ Testar um checkout


🎯 FLUXO APÓS CONCLUSÃO
───────────────────────────────────────────────────────────────────────

Cliente compra
    ↓
Webhook recebido
    ↓
create-member invocado
    ↓
User criado em auth.users ✅
    ↓
Member criado em members ✅
    ↓
Access concedido em member_access ✅
    ↓
Email com senha enviado ✅
    ↓
Cliente acessa área de membros ✅


📞 CONTATO RÁPIDO
───────────────────────────────────────────────────────────────────────

Se tiver dúvida:
  1. Leia: PASSO_A_PASSO_COMPLETO.md (está bem completo)
  2. Procure por "Solucionando Problemas" em STATUS_SUMMARY.md
  3. Veja logs em Supabase Console → Functions


═══════════════════════════════════════════════════════════════════════

RESUMO FINAL:

  Problema:  ❌ Membros não são criados
  Causa:     ❌ Tabelas não existem
  Solução:   ✅ Executar SQL (2 minutos)
  Status:    🟡 Aguardando ação
  Tempo:     ⏱️  10-15 minutos total

  Próximo passo: Abra PASSO_A_PASSO_COMPLETO.md e siga!

═══════════════════════════════════════════════════════════════════════

EOF
