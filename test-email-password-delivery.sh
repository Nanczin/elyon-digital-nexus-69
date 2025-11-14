#!/bin/bash

# Script de Teste: Entrega de Senha por Email
# Este script simula um fluxo completo de pagamento e entrega de senha

set -e

SUPABASE_URL="${SUPABASE_URL:-http://localhost:54321}"
SUPABASE_KEY="${SUPABASE_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9}"

echo "🧪 TESTE: Sistema de Entrega de Senha por Email"
echo "================================================"
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Verificar configuração SMTP do vendedor
echo -e "${YELLOW}[1/7] Verificando configuração SMTP do vendedor...${NC}"
SELLER_ID="seu-user-id-aqui"  # Substituir com ID real

SMTP_CONFIG=$(curl -s -X POST "$SUPABASE_URL/rest/v1/integrations" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"eq\": {\"user_id\": \"$SELLER_ID\"}}" \
  -G --data-urlencode "select=smtp_config" \
  --data-urlencode "limit=1")

if [[ "$SMTP_CONFIG" == *"email"* ]]; then
  echo -e "${GREEN}✅ Configuração SMTP encontrada${NC}"
else
  echo -e "${RED}❌ Configuração SMTP NÃO encontrada${NC}"
  echo "   Execute primeiro: Admin → Integrações → Configure SMTP"
  exit 1
fi

# 2. Verificar Member Area com configuração de senha
echo -e "${YELLOW}[2/7] Verificando Member Area com password_mode...${NC}"
AREA_ID="sua-area-id-aqui"  # Substituir com ID real

AREA_CONFIG=$(curl -s "$SUPABASE_URL/rest/v1/member_areas?id=eq.$AREA_ID" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  -H "Content-Type: application/json")

if [[ "$AREA_CONFIG" == *"password_mode"* ]]; then
  echo -e "${GREEN}✅ Configuração de área encontrada${NC}"
else
  echo -e "${YELLOW}⚠️  Member Area não possui password_mode configurado${NC}"
  echo "   Execute: Admin → Member Areas → [Editar] → Configure Senha"
fi

# 3. Listar produtos e member areas para teste
echo ""
echo -e "${YELLOW}[3/7] Produtos disponíveis para teste:${NC}"
curl -s "$SUPABASE_URL/rest/v1/products?limit=5&select=id,name,user_id,member_area_id" \
  -H "Authorization: Bearer $SUPABASE_KEY" | jq '.[] | {id, name, user_id, member_area_id}' 2>/dev/null || echo "  (Nenhum produto encontrado)"

echo ""
echo -e "${YELLOW}[4/7] Member Areas disponíveis para teste:${NC}"
curl -s "$SUPABASE_URL/rest/v1/member_areas?limit=5&select=id,name,user_id" \
  -H "Authorization: Bearer $SUPABASE_KEY" | jq '.[] | {id, name, user_id}' 2>/dev/null || echo "  (Nenhuma área encontrada)"

# 5. Simular webhook de pagamento aprovado
echo ""
echo -e "${YELLOW}[5/7] Simulando webhook de pagamento aprovado...${NC}"

PAYMENT_PAYLOAD=$(cat <<'EOF'
{
  "action": "payment.created",
  "data": {
    "id": "TEST_PAYMENT_$(date +%s)"
  },
  "type": "payment",
  "apiVersion": "v1"
}
EOF
)

echo "📤 Enviando para: $SUPABASE_URL/functions/v1/mercadopago-webhook"
echo "📨 Payload:"
echo "$PAYMENT_PAYLOAD" | jq '.'

WEBHOOK_RESPONSE=$(curl -s -X POST "$SUPABASE_URL/functions/v1/mercadopago-webhook" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  -H "Content-Type: application/json" \
  -d "$PAYMENT_PAYLOAD")

echo ""
echo "📥 Resposta:"
echo "$WEBHOOK_RESPONSE" | jq '.' 2>/dev/null || echo "$WEBHOOK_RESPONSE"

# 6. Verificar compra criada
echo ""
echo -e "${YELLOW}[6/7] Verificando compra criada...${NC}"
RECENT_PURCHASE=$(curl -s "$SUPABASE_URL/rest/v1/compras?order=created_at.desc&limit=1" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  -H "Content-Type: application/json")

echo "$RECENT_PURCHASE" | jq '.[] | {id, cliente_email, status_pagamento, entregavel_enviado, created_at}' 2>/dev/null || echo "  (Nenhuma compra encontrada)"

# 7. Verificar log de entrega de email
echo ""
echo -e "${YELLOW}[7/7] Verificando logs de entrega de email...${NC}"
DELIVERY_LOGS=$(curl -s "$SUPABASE_URL/rest/v1/logs_entrega?tipo=eq.email&order=created_at.desc&limit=3" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  -H "Content-Type: application/json")

echo "$DELIVERY_LOGS" | jq '.[] | {id, compra_id, status, destinatario, erro_mensagem, created_at}' 2>/dev/null || echo "  (Nenhum log encontrado)"

echo ""
echo -e "${GREEN}🎯 Teste concluído!${NC}"
echo ""
echo "📋 Próximos passos:"
echo "  1. Se logs mostram 'enviado' ✅ = Sistema funcionando corretamente"
echo "  2. Se logs mostram erro = Verifique:"
echo "     - Configuração SMTP do vendedor (Integrações)"
echo "     - User ID do produto ou member_area"
echo "     - Password mode da member_area"
echo "  3. Se sem logs = Verifique webhook logs do Supabase"
echo ""
