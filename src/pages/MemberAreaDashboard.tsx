import React, { useState, useEffect, useCallback } from 'react';
import { Navigate, useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, BookOpen, User, MessageSquare, ArrowRight, Settings, LogOut, Lock } from 'lucide-react'; // Adicionado Lock
import { deepMerge } from '@/lib/utils';
import { useMemberAreaAuth } from '@/hooks/useMemberAreaAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import ProfileSettingsDialog from '@/components/member-area/ProfileSettingsDialog';
import { getDefaultSettings } from '@/hooks/useGlobalPlatformSettings'; // Importar a função centralizada

type PlatformSettings = Tables<'platform_settings'>;
type MemberArea = Tables<'member_areas'>;
type Module = Tables<'modules'>;
type ProductAccess = Tables<'product_access'>;
type Checkout = Tables<'checkouts'>;

const MemberAreaDashboard = () => {
  const { memberAreaId } = useParams<{ memberAreaId: string }>();
  const { user, loading: authLoading, signOut } = useMemberAreaAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [memberArea, setMemberArea] = useState<MemberArea | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [userProductAccessIds, setUserProductAccessIds] = useState<string[]>([]); // IDs dos produtos que o usuário tem acesso
  const [productCheckoutLinks, setProductCheckoutLinks] = useState<Record<string, string>>({}); // Mapeia productId para checkoutLink

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

      // 4. Fetch modules the user has access to (or all modules if not restricted by product_id)
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

      // 5. Fetch user's product access
      const { data: accessData, error: accessError } = await supabase
        .from('product_access')
        .select('product_id')
        .eq('user_id', user.id);
      if (accessError) console.error('Error fetching product access:', accessError);
      const accessedProductIds = accessData?.map(a => a.product_id).filter(Boolean) as string[] || [];
      setUserProductAccessIds(accessedProductIds);
      console.log('MEMBER_AREA_DASHBOARD_DEBUG: User has access to products:', accessedProductIds);

      // 6. Fetch checkout links for products associated with modules
      const moduleProductIds = modulesData?.map(m => m.product_id).filter(Boolean) as string[] || [];
      const uniqueModuleProductIds = [...new Set(moduleProductIds)];
      const checkoutLinksMap: Record<string, string> = {};

      if (uniqueModuleProductIds.length > 0) {
        const { data: checkoutsForProducts, error: checkoutsError } = await supabase
          .from('checkouts')
          .select('id, product_id')
          .in('product_id', uniqueModuleProductIds);

        if (checkoutsError) console.error('Error fetching checkouts for products:', checkoutsError);

        checkoutsForProducts?.forEach(chk => {
          if (chk.product_id && !checkoutLinksMap[chk.product_id]) {
            checkoutLinksMap[chk.product_id] = `/checkout/${chk.id}`;
          }
        });
      }
      setProductCheckoutLinks(checkoutLinksMap);
      console.log('MEMBER_AREA_DASHBOARD_DEBUG: Product checkout links:', checkoutLinksMap);

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
        toast({ title: "Não autenticado", description: "Faça login para acessar a área de membros.", variant: "destructive" });
        return;
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

  const currentSettings = settings || getDefaultSettings(memberAreaId || null);
  const primaryColor = currentSettings.colors?.button_background || 'hsl(var(--member-area-primary))';
  const textColor = currentSettings.colors?.text_primary || 'hsl(var(--member-area-text-dark))';
  const secondaryTextColor = currentSettings.colors?.text_secondary || 'hsl(var(--member-area-text-muted))';
  const cardBackground = currentSettings.colors?.card_login || 'hsl(var(--member-area-card-background))';
  const fontFamily = currentSettings.global_font_family || 'Nunito';
  const checkmarkBgColor = currentSettings.colors?.checkmark_background || 'hsl(var(--member-area-checkmark-bg))'; // Definido aqui
  const checkmarkIconColor = currentSettings.colors?.checkmark_icon || 'hsl(var(--member-area-checkmark-icon))'; // Definido aqui

  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Membro';
  const userInitial = userName.charAt(0).toUpperCase();
  const memberAreaNameInitials = memberArea?.name ? memberArea.name.split(' ').map(n => n[0]).join('').slice(0, 2) : 'MA';

  console.log('MEMBER_AREA_DASHBOARD_DEBUG: User avatar_url before AvatarImage:', user?.user_metadata?.avatar_url);

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
                <AvatarImage 
                  key={user?.user_metadata?.avatar_url || 'default-avatar'}
                  src={user?.user_metadata?.avatar_url || undefined} 
                  alt={userName} 
                />
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

      {/* SEÇÃO DE BOAS-VINDAS */}
      <div className="flex-1 px-8 py-16 text-center space-y-6 max-w-6xl mx-auto w-full">
        <h1 className="text-5xl font-semibold leading-tight" style={{ color: textColor }}>
          Olá, {userName}!
        </h1>
        <p className="text-xl font-normal leading-relaxed" style={{ color: secondaryTextColor }}>
          Bem-vindo(a) à sua área de membros. Escolha um módulo para começar.
        </p>

        {/* CARDS DE MÓDULOS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-16">
          {modules.length === 0 && (
            <p className="text-memberArea-text-muted">Nenhum módulo disponível para você ainda.</p>
          )}
          {modules.length > 0 && (
            modules.map((module) => {
              const isLocked = module.product_id && !userProductAccessIds.includes(module.product_id);
              const checkoutLink = module.product_id ? productCheckoutLinks[module.product_id] : null;

              return (
                <Card 
                  key={module.id} 
                  className="overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300 rounded-xl relative"
                  style={{ backgroundColor: cardBackground }}
                >
                  <div className="relative aspect-video w-full bg-gray-200 h-48">
                    {module.banner_url && (
                      <img 
                        src={module.banner_url} 
                        alt={module.title} 
                        className={`w-full h-full object-cover ${isLocked ? 'filter blur-sm' : ''}`} 
                      />
                    )}
                    {/* Placeholder para o badge de concluído */}
                    {!isLocked && (module.title.includes('Boas-vindas') || module.title.includes('30 Dias') || module.title.includes('Exercícios')) ? (
                      <div 
                        className="absolute top-4 right-4 p-2 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: checkmarkBgColor }}
                      >
                        <Check className="h-5 w-5" style={{ color: checkmarkIconColor }} />
                      </div>
                    ) : null}
                  </div>
                  <CardContent className="p-6 space-y-4 flex flex-col h-[calc(100%-12rem)]">
                    <h3 className="text-xl font-bold" style={{ color: textColor }}>
                      {module.title}
                    </h3>
                    <p className="text-sm flex-1" style={{ color: secondaryTextColor }}>
                      {module.description}
                    </p>
                    {isLocked ? (
                      <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-4 rounded-xl">
                          <Lock className="h-12 w-12 text-white mb-4" />
                          <p className="text-white text-lg font-semibold text-center mb-4">
                              Módulo Bloqueado
                          </p>
                          {checkoutLink ? (
                              <Button asChild style={{ backgroundColor: primaryColor, color: '#FFFFFF' }}>
                                  <Link to={checkoutLink}>
                                      Comprar Acesso <ArrowRight className="h-4 w-4 ml-2" />
                                  </Link>
                              </Button>
                          ) : (
                              <p className="text-white text-sm text-center">
                                  Produto associado não encontrado ou sem checkout.
                              </p>
                          )}
                      </div>
                    ) : (
                      <Button 
                        className="w-full h-12 rounded-lg flex items-center justify-center gap-2 font-semibold hover:bg-memberArea-primary-hover transition-colors duration-300" 
                        style={{ backgroundColor: primaryColor, color: '#FFFFFF' }}
                        asChild
                      >
                        <Link to={`/membros/${memberAreaId}/modules/${module.id}`}>
                          Acessar Módulo <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default MemberAreaDashboard;