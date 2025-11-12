// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  console.log('EDGE_FUNCTION_DEBUG: update-member-profile function started.');
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 });
  }

  try {
    // @ts-ignore
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    // @ts-ignore
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, name, status, memberAreaId, selectedModules } = await req.json();
    console.log('EDGE_FUNCTION_DEBUG: Received data:', { userId, name, status, memberAreaId, selectedModules });

    if (!userId || !name || !status || !memberAreaId) {
      console.error('EDGE_FUNCTION_DEBUG: Incomplete data received for member update.');
      return new Response(
        JSON.stringify({ success: false, error: 'Dados incompletos para atualizar o membro (userId, name, status, memberAreaId são obrigatórios).' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // 1. Atualizar auth.users metadata
    console.log('EDGE_FUNCTION_DEBUG: Attempting to update user_metadata for user:', userId);
    const { error: authUpdateError } = await supabase.auth.admin.updateUserById(
      userId,
      {
        user_metadata: { 
          name, 
          first_name: name.split(' ')[0], 
          last_name: name.split(' ').slice(1).join(' ') || '',
          member_area_id: memberAreaId,
          status: status,
        }
      }
    );

    if (authUpdateError) {
      console.error('EDGE_FUNCTION_DEBUG: Error updating user_metadata:', authUpdateError);
      return new Response(
        JSON.stringify({ success: false, error: authUpdateError.message || 'Falha ao atualizar metadados do usuário.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    console.log('EDGE_FUNCTION_DEBUG: User_metadata updated for user:', userId);

    // 2. Atualizar public.profiles table
    console.log('EDGE_FUNCTION_DEBUG: Attempting to update public.profiles for user:', userId);
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ name, status, member_area_id: memberAreaId })
      .eq('user_id', userId);

    if (profileError) {
      console.error('EDGE_FUNCTION_DEBUG: Error updating public.profiles:', profileError);
      return new Response(
        JSON.stringify({ success: false, error: profileError.message || 'Falha ao atualizar perfil público.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    console.log('EDGE_FUNCTION_DEBUG: Public profile updated for user:', userId);

    // 3. Atualizar member_access
    console.log('EDGE_FUNCTION_DEBUG: Attempting to update member_access for user:', userId);
    // Primeiro, deletar todos os acessos existentes para este usuário nesta área de membros
    const { error: deleteAccessError } = await supabase
      .from('member_access')
      .delete()
      .eq('user_id', userId)
      .eq('member_area_id', memberAreaId);
    
    if (deleteAccessError) {
      console.error('EDGE_FUNCTION_DEBUG: Error deleting existing member_access:', deleteAccessError);
      return new Response(
        JSON.stringify({ success: false, error: deleteAccessError.message || 'Falha ao remover acessos existentes.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    console.log('EDGE_FUNCTION_DEBUG: Existing member_access deleted for user:', userId);

    // Em seguida, inserir novos registros de acesso para esta área de membros
    const accessInserts = selectedModules.map((moduleId: string) => ({
      user_id: userId,
      module_id: moduleId,
      is_active: true,
      member_area_id: memberAreaId,
    }));

    if (accessInserts.length > 0) {
      console.log('EDGE_FUNCTION_DEBUG: Inserting new member_access records:', JSON.stringify(accessInserts, null, 2));
      const { error: insertAccessError } = await supabase
        .from('member_access')
        .insert(accessInserts);
      
      if (insertAccessError) {
        console.error('EDGE_FUNCTION_DEBUG: Error inserting new member_access:', insertAccessError);
        return new Response(
          JSON.stringify({ success: false, error: insertAccessError.message || 'Falha ao conceder novos acessos aos módulos.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
      console.log('EDGE_FUNCTION_DEBUG: New member_access records inserted for user:', userId);
    } else {
      console.log('EDGE_FUNCTION_DEBUG: No new modules selected for access.');
    }

    console.log('EDGE_FUNCTION_DEBUG: Member update process completed successfully.');
    return new Response(
      JSON.stringify({ success: true, message: 'Membro atualizado com sucesso.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('EDGE_FUNCTION_DEBUG: General error in update-member-profile function:', error.message, 'Stack:', error.stack);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Erro interno do servidor.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});