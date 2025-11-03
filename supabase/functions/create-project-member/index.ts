import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface CreateMemberRequest {
  email: string;
  password: string;
  name: string;
  role: 'member' | 'admin';
  projectId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email, password, name, role, projectId }: CreateMemberRequest = await req.json();

    if (!email || !password || !name || !role || !projectId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Dados incompletos para criar membro.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // 1. Criar usuário no Supabase Auth (usando service_role_key)
    const { data: userAuth, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });

    if (authError) {
      console.error('EDGE_FUNCTION_DEBUG: Erro ao criar usuário auth.users:', authError.message);
      return new Response(
        JSON.stringify({ success: false, error: authError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const newUserId = userAuth.user?.id;
    if (!newUserId) {
      console.error('EDGE_FUNCTION_DEBUG: Erro ao obter ID do novo usuário após criação.');
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao obter ID do novo usuário.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // 2. Adicionar membro ao projeto na tabela project_members
    const { error: memberError } = await supabase
      .from('project_members')
      .insert({
        project_id: projectId,
        user_id: newUserId,
        role,
        status: 'active',
      });

    if (memberError) {
      console.error('EDGE_FUNCTION_DEBUG: Erro ao adicionar membro ao project_members:', memberError.message);
      // Rollback user creation if member insertion fails (optional, but good practice)
      await supabase.auth.admin.deleteUser(newUserId);
      return new Response(
        JSON.stringify({ success: false, error: memberError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // 3. Conceder acesso a todos os produtos (módulos) publicados do projeto
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id')
      .eq('project_id', projectId)
      .eq('is_active', true);

    if (productsError) {
      console.error('EDGE_FUNCTION_DEBUG: Erro ao buscar produtos do projeto para acesso automático:', productsError.message);
      // Log error, but don't fail the entire operation for this non-critical step
    } else if (products && products.length > 0) {
      const accessEntries = products.map(product => ({
        user_id: newUserId,
        product_id: product.id,
        source: 'project_member_auto_access',
      }));

      const { error: accessError } = await supabase
        .from('product_access')
        .insert(accessEntries);

      if (accessError) {
        console.error('EDGE_FUNCTION_DEBUG: Erro ao conceder acesso automático aos produtos:', accessError.message);
        // Log error, but don't fail the entire operation
      } else {
        console.log(`EDGE_FUNCTION_DEBUG: Acesso concedido a ${products.length} produtos para o novo membro.`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, userId: newUserId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('EDGE_FUNCTION_DEBUG: Erro geral na função create-project-member:', error.message, 'Stack:', error.stack);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Erro interno do servidor.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});