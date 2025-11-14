#!/bin/bash

# Script para testar a Edge Function create-member

PROJECT_ID="jgmwbovvydimvnmmkfpy"
FUNCTION_URL="https://${PROJECT_ID}.supabase.co/functions/v1/create-member"

# Você pode obter o token em:
# https://supabase.com/dashboard/project/${PROJECT_ID}/settings/api
SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY}"

if [ -z "$SERVICE_ROLE_KEY" ]; then
  echo "❌ Erro: SUPABASE_SERVICE_ROLE_KEY não está definida"
  echo "Execute: export SUPABASE_SERVICE_ROLE_KEY='sua-chave-aqui'"
  exit 1
fi

echo "🧪 Testando Edge Function: create-member"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "URL: $FUNCTION_URL"
echo ""

# Payload de teste
read -r -d '' PAYLOAD << 'EOF'
{
  "name": "João Silva Teste",
  "email": "joao.teste@example.com",
  "checkoutId": "test-checkout-123",
  "paymentId": "test-payment-456",
  "planType": "premium",
  "productIds": ["[UUID-DO-PRODUTO-1]", "[UUID-DO-PRODUTO-2]"],
  "memberAreaId": "[UUID-DA-AREA]"
}
EOF

echo "📤 Enviando payload:"
echo "$PAYLOAD" | jq .
echo ""

# Fazer requisição
echo "Aguardando resposta..."
RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

echo "📥 Resposta:"
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"

# Extrair status de sucesso
if echo "$RESPONSE" | grep -q '"success":true'; then
  echo ""
  echo "✅ Membro criado com sucesso!"
  MEMBER_ID=$(echo "$RESPONSE" | jq -r '.memberId')
  USER_ID=$(echo "$RESPONSE" | jq -r '.userId')
  PASSWORD=$(echo "$RESPONSE" | jq -r '.password')
  
  echo ""
  echo "Credenciais do novo membro:"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Member ID: $MEMBER_ID"
  echo "User ID: $USER_ID"
  echo "Email: joao.teste@example.com"
  echo "Senha Temporária: $PASSWORD"
  echo ""
  echo "💡 Próximos passos:"
  echo "1. Verificar tabela 'members' com SELECT * FROM members WHERE id = '$MEMBER_ID';"
  echo "2. Verificar tabela 'member_access' para ver produtos associados"
  echo "3. Testar login com email e senha fornecidos"
elif echo "$RESPONSE" | grep -q '"success":false'; then
  echo ""
  echo "❌ Erro ao criar membro"
  ERROR=$(echo "$RESPONSE" | jq -r '.error' 2>/dev/null || echo "Erro desconhecido")
  echo "Erro: $ERROR"
else
  echo ""
  echo "⚠️ Resposta inesperada"
  echo "Pode ser que a função não foi deployada ou há erro no CORS"
fi
