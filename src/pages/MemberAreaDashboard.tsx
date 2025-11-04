import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, BookOpen, User, MessageSquare } from 'lucide-react';
// import { deepMerge } from '@/lib/utils'; // Não é mais necessário aqui

type PlatformSettings = Tables<'platform_settings'>;
type MemberArea = Tables<'member_areas'>;
type Module = Tables<'modules'>;

const MemberAreaDashboard = () => {
  const { memberAreaId } = useParams<{ memberAreaId: string }>();
  const { user, loading: authLoading, signOut } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [memberArea, setMemberArea] = useState<MemberArea | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  // const [settings, setSettings] = useState<PlatformSettings | null>(null); // Removido
  const [hasAccess, setHasAccess] = useState(false);

  const fetchMemberAreaAndContent = useCallback(async () => {
    if (!memberAreaId || !user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // 1. Fetch Member Area details
      const { data: areaData, error: areaError } = await supabase
        .from('member_areas')
        .select('*')
        .eq('id', memberAreaId)
        .maybeSingle();

      if (areaError || !areaData) {
        console.error('Error fetching member area:', areaError);
        toast({ title: "Erro", description: "Área de membros não encontrada.", variant: "destructive" });
        setHasAccess(false);
        setLoading(false);
        return;
      }
      setMemberArea(areaData);

      // 2. Check if user has access to this specific member area
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('member_area_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError || profileData?.member_area_id !== memberAreaId) {
        setHasAccess(false);
        toast({ title: "Acesso Negado", description: "Você não tem permissão para acessar esta área de membros.", variant: "destructive" });
        setLoading(false);
        return;
      }
      setHasAccess(true);

      // 3. Fetch modules the user has access to
      const { data: modulesData, error: modulesError } = await supabase
        .from('modules')
        .select(`
          *,
          member_access!inner(user_id, is_active)
        `)
        .eq('member_area_id', memberAreaId)
        .eq('status', 'published')
        .eq('member_access.user_id', user.id)
        .eq('member_access.is_active', true)
        .order('order_index', { ascending: true });

      if (modulesError) {
        console.error('Error fetching user modules:', modulesError);
        toast({ title: "Erro", description: "Falha ao carregar seus módulos.", variant: "destructive" });
      } else {
        setModules(modulesData || []);
      }

    } catch (error: any) {
      console.error('Error in MemberAreaDashboard:', error);
      toast({ title: "Erro", description: error.message || "Ocorreu um erro ao carregar a área de membros.", variant: "destructive" });
      setHasAccess(false);
    } finally {
      setLoading(false);
    }
  }, [memberAreaId, user?.id, toast]);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        // If not authenticated, redirect to login
        toast({ title: "Não autenticado", description: "Faça login para acessar a área de membros.", variant: "destructive" });
        return; // Prevent further execution until redirected
      }
      fetchMemberAreaAndContent();
    }
  }, [user, authLoading, fetchMemberAreaAndContent, toast]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={`/membros/${memberAreaId}/login`} replace />;
  }

  if (!hasAccess) {
    // If user is logged in but doesn't have access to this specific member area
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Acesso Negado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>Você não tem permissão para acessar esta área de membros.</p>
            <Button onClick={() => signOut()}>Sair</Button>
            <Button asChild variant="outline">
              <Link to="/">Voltar para o Início</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Estilos agora serão aplicados pelo Layout, mas podemos usar variáveis CSS ou classes Tailwind
  // para elementos internos que precisam de cores específicas do tema da área de membros.
  // Por exemplo, `text-primary` ou `bg-card` ainda funcionarão, mas o `background-color` do body
  // e a `font-family` global virão do Layout.

  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Membro';

  return (
    <div className="w-full h-full flex flex-col overflow-auto p-4">
      {/* Header da Área de Membros - Removido daqui, agora no Layout */}

      {/* Conteúdo Principal */}
      <div className="flex-1 p-4 space-y-6">
        <h1 className="text-3xl font-bold text-foreground">
          Olá, {userName}!
        </h1>
        <p className="text-lg text-muted-foreground">
          Bem-vinda à sua área de membros. Escolha um módulo para começar.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.length === 0 ? (
            <p className="text-muted-foreground">Nenhum módulo disponível para você ainda.</p>
          ) : (
            modules.map((module) => (
              <Card 
                key={module.id} 
                className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 bg-card text-card-foreground"
              >
                <div className="relative aspect-video w-full bg-gray-200">
                  {module.banner_url && (
                    <img 
                      src={module.banner_url} 
                      alt={module.title} 
                      className="w-full h-full object-cover" 
                    />
                  )}
                  {/* No preview, não temos status de conclusão real, então não exibimos o check */}
                </div>
                <CardContent className="p-6 space-y-4">
                  <h3 className="text-xl font-bold text-foreground">
                    {module.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {module.description}
                  </p>
                  <Button 
                    className="w-full bg-primary text-primary-foreground"
                    asChild
                  >
                    <Link to={`/membros/${memberAreaId}/modules/${module.id}`}>Acessar Módulo</Link>
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default MemberAreaDashboard;