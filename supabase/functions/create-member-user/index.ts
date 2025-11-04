import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Função para gerar string aleatória para senhas
function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { name, email, password, memberAreaId, selectedModules, isActive } = await req.json();

    if (!name || !email || !password || !memberAreaId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Dados incompletos para criar o membro.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // 1. Criar usuário no Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirmar o email
      user_metadata: { name, first_name: name.split(' ')[0], last_name: name.split(' ').slice(1).join(' ') },
    });

    if (authError) {
      console.error('EDGE_FUNCTION_DEBUG: Erro ao criar usuário auth.admin.createUser:', authError);
      return new Response(
        JSON.stringify({ success: false, error: authError.message || 'Falha ao criar usuário.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const newUserId = authData.user?.id;
    if (!newUserId) {
      return new Response(
        JSON.stringify({ success: false, error: 'ID do novo usuário não retornado.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    console.log('EDGE_FUNCTION_DEBUG: Usuário auth.users criado com ID:', newUserId);

    // 2. Atualizar o perfil do usuário (o trigger handle_new_user já cria, mas precisamos adicionar member_area_id e status)
    const { error: profileUpdateError } = await supabase
      .from('profiles')
      .update({ 
        member_area_id: memberAreaId, 
        status: isActive ? 'active' : 'inactive',
        name: name, // Garantir que o nome seja atualizado
        email: email, // Garantir que o email seja atualizado
      })
      .eq('user_id', newUserId);

    if (profileUpdateError) {
      console.error('EDGE_FUNCTION_DEBUG: Erro ao atualizar perfil:', profileUpdateError);
      // Tentar reverter a criação do usuário se o perfil não puder ser atualizado
      await supabase.auth.admin.deleteUser(newUserId);
      return new Response(
        JSON.stringify({ success: false, error: profileUpdateError.message || 'Falha ao atualizar perfil do membro.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    console.log('EDGE_FUNCTION_DEBUG: Perfil atualizado para user_id:', newUserId, 'com memberAreaId:', memberAreaId, 'e status:', isActive);

    // 3. Conceder acesso aos módulos
    const accessInserts = selectedModules.map((moduleId: string) => ({
      user_id: newUserId,
      module_id: moduleId,
      is_active: true,
      member_area_id: memberAreaId,
    }));

    if (accessInserts.length > 0) {
      const { error: insertAccessError } = await supabase
        .from('member_access')
        .insert(accessInserts);

      if (insertAccessError) {
        console.error('EDGE_FUNCTION_DEBUG: Erro ao inserir acessos aos módulos:', insertAccessError);
        // Não revertemos a criação do usuário aqui, pois o perfil já foi criado.
        // O acesso pode ser corrigido manualmente ou por outra lógica.
        return new Response(
          JSON.stringify({ success: false, error: insertAccessError.message || 'Falha ao conceder acesso aos módulos.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
      console.log('EDGE_FUNCTION_DEBUG: Acessos aos módulos concedidos para user_id:', newUserId);
    } else {
      console.log('EDGE_FUNCTION_DEBUG: Nenhum módulo selecionado para conceder acesso.');
    }

    return new Response(
      JSON.stringify({ success: true, userId: newUserId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('EDGE_FUNCTION_DEBUG: Erro geral na função create-member-user:', error.message, 'Stack:', error.stack);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Erro interno do servidor.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});