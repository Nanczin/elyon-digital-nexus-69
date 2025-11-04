import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, User, MessageSquare, Check, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useGlobalPlatformSettings } from '@/hooks/useGlobalPlatformSettings';
import { deepMerge } from '@/lib/utils';
import { Tables } from '@/integrations/supabase/types';

type PlatformSettings = Tables<'platform_settings'>;
type MemberArea = Tables<'member_areas'>;
type Module = Tables<'modules'>;

// Function to generate default settings for a given memberAreaId
const getDefaultSettings = (memberAreaId: string): PlatformSettings => ({
  id: '', 
  user_id: null, 
  member_area_id: memberAreaId,
  logo_url: null,
  login_title: 'Bem-vindo à sua Área de Membros',
  login_subtitle: 'Acesse seu conteúdo exclusivo',
  global_font_family: 'Inter', 
  colors: {
    background_login: '#F0F2F5',
    card_login: '#FFFFFF',
    header_background: '#FFFFFF',
    header_border: '#E5E7EB',
    button_background: '#3b82f6',
    text_primary: '#1F2937',
    text_header: '#1F2937',
    text_cards: '#1F2937',
    text_secondary: '#6B7280',
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

const MemberAreaDashboard = () => {
  const { memberAreaId } = useParams<{ memberAreaId: string }>();
  const navigate = useNavigate();
  const { user, signOut, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [memberAreaDetails, setMemberAreaDetails] = useState<MemberArea | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [loadingContent, setLoadingContent] = useState(true);

  // Fetch platform settings, member area details, and modules
  const fetchData = useCallback(async () => {
    if (!memberAreaId || !user?.id) {
      setLoadingContent(false);
      return;
    }
    setLoadingContent(true);

    try {
      // 1. Fetch platform settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('platform_settings')
        .select('*')
        .eq('member_area_id', memberAreaId)
        .maybeSingle();
      
      if (settingsError && settingsError.code !== 'PGRST116') {
        console.error('Error fetching platform settings:', settingsError);
        toast({ title: "Erro", description: "Falha ao carregar configurações da área de membros.", variant: "destructive" });
        setSettings(getDefaultSettings(memberAreaId));
      } else if (settingsData) {
        setSettings(deepMerge(getDefaultSettings(memberAreaId), settingsData as Partial<PlatformSettings>));
      } else {
        setSettings(getDefaultSettings(memberAreaId));
      }

      // 2. Fetch member area details
      const { data: areaData, error: areaError } = await supabase
        .from('member_areas')
        .select('*')
        .eq('id', memberAreaId)
        .single();
      if (areaError) throw areaError;
      setMemberAreaDetails(areaData);

      // 3. Fetch modules the user has access to
      const { data: modulesData, error: modulesError } = await supabase
        .from('member_access')
        .select(`
          modules (
            id, title, description, banner_url, status, order_index
          )
        `)
        .eq('user_id', user.id)
        .eq('member_area_id', memberAreaId)
        .eq('is_active', true)
        .order('order_index', { ascending: true });

      if (modulesError) throw modulesError;
      
      // Filter out null modules and only include published ones
      const accessibleModules = modulesData
        .map(item => item.modules)
        .filter((mod): mod is Module => mod !== null && mod.status === 'published');
      
      setModules(accessibleModules);

    } catch (error: any) {
      console.error('Error fetching member area content:', error);
      toast({ title: "Erro", description: error.message || "Falha ao carregar conteúdo da área de membros.", variant: "destructive" });
      // If there's an error, redirect to login
      signOut();
      navigate(`/membros/${memberAreaId}/login`);
    } finally {
      setLoadingContent(false);
    }
  }, [memberAreaId, user?.id, toast, navigate, signOut]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Apply global font family from settings
  useEffect(() => {
    if (settings?.global_font_family) {
      document.documentElement.style.setProperty('--global-font-family', settings.global_font_family);
    } else {
      document.documentElement.style.setProperty('--global-font-family', 'Inter, sans-serif');
    }
  }, [settings?.global_font_family]);

  const handleLogout = async () => {
    await signOut();
    navigate(`/membros/${memberAreaId}/login`);
  };

  // Redirect if not authenticated or if memberAreaId is missing
  if (authLoading || loadingContent) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: settings?.colors?.background_login || getDefaultSettings(memberAreaId || '').colors?.background_login }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !memberAreaId) {
    return <Navigate to={`/membros/${memberAreaId}/login`} replace />;
  }

  const currentSettings = settings || getDefaultSettings(memberAreaId);
  const primaryColor = currentSettings.colors?.button_background || '#3b82f6';
  const textColor = currentSettings.colors?.text_primary || '#1F2937';
  const secondaryTextColor = currentSettings.colors?.text_secondary || '#6B7280';
  const cardBackground = currentSettings.colors?.card_login || '#FFFFFF';
  const fontFamily = currentSettings.global_font_family || 'Inter';

  // Placeholder para o nome do usuário logado
  const userName = user.user_metadata?.name || user.email?.split('@')[0] || 'Membro'; 

  return (
    <div 
      className="w-full h-full flex flex-col overflow-auto p-4" 
      style={{ 
        backgroundColor: currentSettings.colors?.background_login || '#F0F2F5',
        fontFamily: fontFamily 
      }}
    >
      {/* Header da Área de Membros */}
      <header 
        className="flex items-center justify-between p-4 mb-6 rounded-lg shadow-sm"
        style={{ 
          backgroundColor: currentSettings.colors?.header_background || '#FFFFFF',
          borderBottom: `1px solid ${currentSettings.colors?.header_border || '#E5E7EB'}`,
          color: currentSettings.colors?.text_header || '#1F2937'
        }}
      >
        <div className="flex items-center space-x-3">
          {memberAreaDetails?.logo_url && (
            <img 
              src={memberAreaDetails.logo_url} 
              alt={memberAreaDetails.name || "Logo"} 
              className="h-8 w-8 object-contain" 
            />
          )}
          <span className="text-lg font-semibold">{memberAreaDetails?.name || "Área de Membros"}</span>
        </div>
        <Button onClick={handleLogout} variant="outline" size="sm" style={{ borderColor: primaryColor, color: primaryColor }}>
          <LogOut className="h-4 w-4 mr-2" /> Sair
        </Button>
      </header>

      {/* Conteúdo Principal */}
      <div className="flex-1 p-4 space-y-6">
        <h1 className="text-3xl font-bold" style={{ color: textColor }}>
          Olá, {userName}!
        </h1>
        <p className="text-lg" style={{ color: secondaryTextColor }}>
          Bem-vinda à sua área de membros. Escolha um módulo para começar.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.length === 0 ? (
            <p className="text-lg text-muted-foreground col-span-full text-center py-12">
              Nenhum módulo disponível para você nesta área de membros.
            </p>
          ) : (
            modules.map((module) => (
              <Card 
                key={module.id} 
                className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300"
                style={{ backgroundColor: cardBackground, color: currentSettings.colors?.text_cards || textColor }}
              >
                <div className="relative aspect-video w-full bg-gray-200">
                  {module.banner_url && (
                    <img 
                      src={module.banner_url} 
                      alt={module.title} 
                      className="w-full h-full object-cover" 
                    />
                  )}
                  {/* isCompleted logic would go here if we had lesson completion data */}
                  {/* <div 
                    className="absolute top-4 right-4 p-2 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Check className="h-5 w-5 text-white" />
                  </div> */}
                </div>
                <CardContent className="p-6 space-y-4">
                  <h3 className="text-xl font-bold" style={{ color: currentSettings.colors?.text_cards || textColor }}>
                    {module.title}
                  </h3>
                  <p className="text-sm" style={{ color: secondaryTextColor }}>
                    {module.description}
                  </p>
                  <Button 
                    className="w-full" 
                    style={{ backgroundColor: primaryColor, color: currentSettings.colors?.text_primary }}
                  >
                    Acessar Módulo
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