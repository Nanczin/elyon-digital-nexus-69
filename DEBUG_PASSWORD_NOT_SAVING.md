# 🔧 Debugando: Senha não salva ao editar Member Area

## 🎯 Problema
Quando você salva a configuração de senha e volta para editar a mesma área, a opção escolhida não aparece mais.

## 🔍 Como Debugar

### Passo 1: Abra o Console do Navegador
```
F12 → Aba Console
```

### Passo 2: Procure pelos Logs
Quando você **editar uma área**, procure por mensagens como:
```
ADMIN_MEMBER_AREAS_DEBUG: handleEdit started for area: [area-id]
ADMIN_MEMBER_AREAS_DEBUG: Fetching member_settings for area: [area-id]
ADMIN_MEMBER_AREAS_DEBUG: member_settings query result: { data: {...}, error: null }
```

### Passo 3: Verifique o Resultado

Se vir:
```
{ data: null, error: null }
```
→ **Nenhum registro encontrado** (não salvou)

Se vir:
```
{ data: { default_password_mode: 'fixed', ... }, error: null }
```
→ **Dados foram salvos** (problema está no carregamento na UI)

## 🔧 Verificar Diretamente no Banco (Supabase)

### Opção 1: SQL Editor (Supabase Dashboard)

```sql
-- Ver todas as configurações de senha
SELECT 
  ms.id,
  ms.member_area_id,
  ma.name as area_name,
  ms.default_password_mode,
  ms.default_fixed_password
FROM member_settings ms
LEFT JOIN member_areas ma ON ma.id = ms.member_area_id
ORDER BY ms.created_at DESC;

-- Ver uma área específica
SELECT * FROM member_settings 
WHERE member_area_id = 'seu-area-id-aqui';
```

### Opção 2: Verificar Tabela Diretamente
1. Ir ao Supabase Dashboard
2. Tabelas → `member_settings`
3. Ver se existem registros com sua `member_area_id`

## 🐛 Possíveis Problemas

### 1. RLS Policy Bloqueando
```sql
-- Verificar se user_id está correto
SELECT 
  ma.id,
  ma.user_id,
  auth.uid() as current_user_id
FROM member_areas ma
WHERE ma.id = 'seu-area-id';
```

Se `ma.user_id ≠ current_user_id` → RLS está bloqueando

### 2. Upsert não funcionando
Verificar se há erro no console do navegador:
- `onConflict: 'member_area_id'` pode estar errado
- Precisa ser: `onConflict: 'member_area_id'` (com aspas)

### 3. Dados não sendo salvos
Se salva mas não carrega, o INSERT pode ter falhado silenciosamente

## 📝 Solução

### Se o problema é "dados não salvam":

1. **Adicione `.select()` ao upsert:**
```typescript
const { data, error } = await supabase
  .from('member_settings')
  .upsert(settingsPayload, { onConflict: 'member_area_id' })
  .select();  // ← Adicione esta linha
```

2. **Verifique o arquivo AdminMemberAreas.tsx**
   - Procure por: `ADMIN_MEMBER_AREAS_DEBUG: Settings save result:`
   - Se `data` for `[]` vazio → Upsert falhou silenciosamente

### Se o problema é "dados salvam mas não carregam":

1. **Verificar se é problema de Select:**
```typescript
const { data, error } = await supabase
  .from('member_settings')
  .select('*')  // ← Use '*' ao invés de coluna específica
  .eq('member_area_id', area.id)
  .maybeSingle();
```

2. **Adicionar delay:**
```typescript
// Depois de salvar
await new Promise(resolve => setTimeout(resolve, 500));
// Depois recarregar
fetchMemberAreas();
```

## 📱 Teste Prático

### Test Case 1: Criar Nova Área
1. Criar nova Member Area
2. Configurar: `Gerar Aleatória`
3. Salvar
4. **Verificar logs** no console (deve ver: "Password settings saved successfully")
5. Abrir formulário novamente
6. **Verificar logs** (deve ver dados carregados)

### Test Case 2: Editar Existente
1. Editar área existente
2. Mudar de `Aleatória` para `Fixa`
3. Preencher senha: `MinhaSenha@123`
4. Salvar
5. **Verificar logs** (deve ver confirmação de save)
6. Fechar e reabrir a área
7. **Verificar se aparece `Fixa` e a senha**

## 🚀 Próximas Etapas

1. **Verifique os logs** e copie a saída
2. **Verifique o banco de dados** SQL query acima
3. **Se tudo estiver ok no banco mas a UI não carregar:**
   - Problema pode ser com estado React
   - Pode ser necessário adicionar `key` ao Dialog
   - Ou usar `useEffect` para carregar dados depois de abrir

## 📞 Informações para Report

Se precisar de help, forneça:
1. Logs do console (F12 → Console)
2. Resultado do SQL query acima
3. ID da area que não está salvando
4. Qual modo tentou salvar (Aleatória, Fixa, Forçar Mudança)
