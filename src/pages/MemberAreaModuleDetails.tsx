import React, { useState, useEffect, useCallback } from 'react';
import { Navigate, useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen, Video, Clock, Check, Settings, LogOut } from 'lucide-react';
import { deepMerge } from '@/lib/utils';
import { useMemberAreaAuth } from '@/hooks/useMemberAreaAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import ProfileSettingsDialog from '@/components/member-area/ProfileSettingsDialog';
import { getDefaultSettings } from '@/hooks/useGlobalPlatformSettings'; // Importar a função centralizada

type PlatformSettings = Tables<'platform_settings'>;
type MemberArea = Tables<'member_areas'>;
type Module = Tables<'modules'>;
type Lesson = Tables<'lessons'>;

const MemberAreaModuleDetails = () => {
  const { memberAreaId, moduleId } = useParams<{ memberAreaId: string; moduleId: string }>();
  const { user, loading: authLoading, signOut } = useMemberAreaAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [memberArea, setMemberArea] = useState<MemberArea | null>(null);
  const [module, setModule] = useState<Module | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [hasAccess, setHasAccess] = useState(false);

  const fetchModuleAndLessons = useCallback(async () => {
    if (!memberAreaId || !moduleId || !user?.id) {
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

      // 2. Fetch Platform Settings for this member area
      const { data: settingsData, error: settingsError } = await supabase
        .from('platform_settings')
        .select('*')
        .eq('member_area_id', memberAreaId)
        .maybeSingle();

      if (settingsError && settingsError.code !== 'PGRST116') {
        console.error('Error fetching platform settings:', settingsError);
      } else if (settingsData) {
        setSettings(deepMerge(getDefaultSettings(memberAreaId), settingsData as Partial<PlatformSettings>));
      } else {
        setSettings(getDefaultSettings(memberAreaId));
      }

      // 3. Check if user has access to this specific member area
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

      // 4. Fetch Module details
      const { data: moduleData, error: moduleError } = await supabase
        .from('modules')
        .select('*')
        .eq('id', moduleId)
        .eq('member_area_id', memberAreaId)
        .eq('status', 'published')
        .maybeSingle();

      if (moduleError || !moduleData) {
        console.error('Error fetching module:', moduleError);
        toast({ title: "Erro", description: "Módulo não encontrado ou não publicado.", variant: "destructive" });
        setLoading(false);
        return;
      }
      setModule(moduleData);

      // 5. Fetch Lessons for this module
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select('*')
        .eq('module_id', moduleId)
        .eq('status', 'published')
        .order('order_index', { ascending: true });

      if (lessonsError) {
        console.error('Error fetching lessons:', lessonsError);
        toast({ title: "Erro", description: "Falha ao carregar aulas do módulo.", variant: "destructive" });
      } else {
        setLessons(lessonsData || []);
      }

    } catch (error: any) {
      console.error('Error in MemberAreaModuleDetails:', error);
      toast({ title: "Erro", description: error.message || "Ocorreu um erro ao carregar o módulo.", variant: "destructive" });
      setHasAccess(false);
    } finally {
      setLoading(false);
    }
  }, [memberAreaId, moduleId, user?.id, toast]);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        toast({ title: "Não autenticado", description: "Faça login para acessar a área de membros.", variant: "destructive" });
        return;
      }
      fetchModuleAndLessons();
    }
  }, [user, authLoading, fetchModuleAndLessons, toast]);

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

  if (!module) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Módulo não encontrado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>O módulo que você tentou acessar não existe ou não está publicado.</p>
            <Button asChild>
              <Link to={`/membros/${memberAreaId}`}>Voltar para o Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentSettings = settings || getDefaultSettings(memberAreaId || null);
  const primaryColor = currentSettings.colors?.button_background || 'hsl(var(--member-area-primary))';
  const textColor = currentSettings.colors?.text_primary || 'hsl(var(--member-area-text-dark))';
  const secondaryTextColor = currentSettings.colors?.text_secondary || 'hsl(var(--member-area-text-muted))';
  const cardBackground = currentSettings.colors?.card_login || 'hsl(var(--member-area-card-background))';
  const fontFamily = currentSettings.global_font_family || 'Nunito';

  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Membro';
  const userInitial = userName.charAt(0).toUpperCase();
  const memberAreaNameInitials = memberArea?.name ? memberArea.name.split(' ').map(n => n[0]).join('').slice(0, 2) : 'MA';

  return (
    <div 
      className="w-full min-h-screen flex flex-col" 
      style={{ 
        backgroundColor: currentSettings.colors?.background_login || 'hsl(var(--member-area-background))',
        fontFamily: fontFamily 
      }}
    >
      {/* HEADER */}
      <header 
        className="flex items-center justify-between h-[72px] px-8 py-4 border-b"
        style={{ 
          backgroundColor: currentSettings.colors?.background_login || 'hsl(var(--member-area-background))',
          borderColor: currentSettings.colors?.header_border || 'hsl(var(--member-area-header-border))',
          color: currentSettings.colors?.text_header || 'hsl(var(--member-area-text-dark))'
        }}
      >
        <div className="flex items-center space-x-3">
          {currentSettings.logo_url ? (
            <img 
              src={currentSettings.logo_url} 
              alt={memberArea?.name || "Logo da Plataforma"} 
              className="h-16 w-16 object-contain" 
            />
          ) : (
            <Avatar className="h-16 w-16 border border-gray-200">
              <AvatarFallback className="bg-white text-memberArea-text-dark text-xl font-semibold">
                {memberAreaNameInitials}
              </AvatarFallback>
            </Avatar>
          )}
          <span className="text-xl font-semibold" style={{ color: textColor }}>{memberArea?.name || 'Área de Membros'}</span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="p-0 h-auto w-auto rounded-full" style={{ color: secondaryTextColor }}>
              <Avatar className="h-9 w-9 border border-gray-200">
                <AvatarImage src={user?.user_metadata?.avatar_url || undefined} alt={userName} />
                <AvatarFallback className="bg-white text-memberArea-text-dark text-base font-semibold">
                  {userInitial}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48" style={{ backgroundColor: cardBackground, color: textColor }}>
            <ProfileSettingsDialog memberAreaId={memberAreaId || ''}>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()} style={{ color: textColor }}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Configurações de Perfil</span>
              </DropdownMenuItem>
            </ProfileSettingsDialog>
            <DropdownMenuSeparator style={{ backgroundColor: secondaryTextColor + '40' }} />
            <DropdownMenuItem onClick={signOut} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Conteúdo Principal */}
      <div className="flex-1 px-4 sm:px-8 py-8 sm:py-16 max-w-6xl mx-auto w-full"> {/* Alterado max-w-4xl para max-w-6xl */}
        <Button variant="ghost" asChild className="mb-8 -ml-4" style={{ color: secondaryTextColor }}>
          <Link to={`/membros/${memberAreaId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para o painel
          </Link>
        </Button>

        <Card className="shadow-lg rounded-xl p-6 sm:p-8" style={{ backgroundColor: cardBackground }}>
          <CardHeader className="px-0 pt-0 mb-6">
            <CardTitle className="text-3xl sm:text-4xl font-bold leading-tight" style={{ color: textColor }}>
              {module.title}
            </CardTitle>
            {module.description && (
              <p className="text-lg sm:text-xl mt-2" style={{ color: secondaryTextColor }}>
                {module.description.trim()}
              </p>
            )}
          </CardHeader>
          <CardContent className="px-0 space-y-6">
            <h2 className="text-2xl font-semibold" style={{ color: textColor }}>Aulas do Módulo</h2>
            {lessons.length === 0 ? (
              <p className="text-muted-foreground">Nenhuma aula disponível neste módulo ainda.</p>
            ) : (
              <div className="space-y-4">
                {lessons.map((lesson) => (
                  <Card key={lesson.id} className="border-l-4" style={{ borderColor: primaryColor }}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Video className="h-6 w-6" style={{ color: primaryColor }} />
                        <div className="flex-1 flex flex-col">
                          <h4 className="font-semibold text-lg truncate" style={{ color: textColor }}>{lesson.title}</h4>
                          {lesson.description?.trim() && (
                            <p className="text-sm truncate" style={{ color: secondaryTextColor}}>
                              {lesson.description.trim()}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button asChild style={{ backgroundColor: primaryColor, color: '#FFFFFF' }}>
                        <Link to={`/membros/${memberAreaId}/modules/${moduleId}/lessons/${lesson.id}`}>
                          Acessar Aula
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MemberAreaModuleDetails;