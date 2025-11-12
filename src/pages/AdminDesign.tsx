import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Palette, Image, Type, Save, RotateCcw, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { deepMerge } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MemberAreaPreviewContent from '@/components/member-area/MemberAreaPreviewContent';
import { Tables, TablesInsert, TablesUpdate, Json } from '@/integrations/supabase/types';
import { getDefaultSettings, PlatformSettings, PlatformColors } from '@/hooks/useGlobalPlatformSettings';
import { Separator } from '@/components/ui/separator';

type MemberArea = Tables<'member_areas'>;
type Module = Tables<'modules'>;

const FONT_OPTIONS = [
  { value: 'Nunito', label: 'Nunito' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Open Sans', label: 'Open Sans' },
  { value: 'Lato', label: 'Lato' },
  { value: 'Montserrat', label: 'Montserrat' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Arial', label: 'Arial' },
  { value: 'Helvetica', label: 'Helvetica' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Georgia', label: 'Georgia' },
];

const AdminDesign = ({ memberAreaId: propMemberAreaId }: { memberAreaId?: string }) => {
  const { user, loading: authLoading } = useAuth(); // Removido isAdmin
  const { memberAreaId: urlMemberAreaId } = useParams<{ memberAreaId: string }>();
  const currentMemberAreaId = propMemberAreaId || urlMemberAreaId;

  const [settings, setSettings] = useState<PlatformSettings>(() => 
    getDefaultSettings(currentMemberAreaId || null, user?.id || null)
  );
  const [loadingDesign, setLoadingDesign] = useState(true); // Renamed from loadingPage for clarity
  const [isSaving, setIsSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isLoggedInPreview, setIsLoggedInPreview] = useState(false);
  const [memberAreaDetails, setMemberAreaDetails] = useState<MemberArea | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    console.log('ADMIN_DESIGN_DEBUG: useEffect triggered. user:', user?.id, 'authLoading:', authLoading, 'currentMemberAreaId:', currentMemberAreaId);
    // Não esperar por authLoading aqui, o redirecionamento será tratado abaixo
    if (user && currentMemberAreaId) { 
      const loadAllData = async () => {
        setLoadingDesign(true);
        await Promise.all([
          fetchSettings(),
          fetchMemberAreaDetails(),
          fetchModulesForPreview()
        ]);
        setLoadingDesign(false);
        console.log('ADMIN_DESIGN_DEBUG: All initial data loaded, setLoadingDesign(false).');
      };
      loadAllData();
    } else if (!user) {
      console.log('ADMIN_DESIGN_DEBUG: Not authenticated, redirecting.');
    } else if (!currentMemberAreaId) {
      setLoadingDesign(false); // If no memberAreaId, stop loading and show message
    }
  }, [user, currentMemberAreaId]); 

  const fetchSettings = async () => {
    console.log('ADMIN_DESIGN_DEBUG: fetchSettings started for ID:', currentMemberAreaId);
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('*')
        .eq('member_area_id', currentMemberAreaId || '')
        .maybeSingle();
    
      if (error && error.code !== 'PGRST116') {
        console.error('ADMIN_DESIGN_DEBUG: Erro ao buscar configurações de design:', error);
        toast({ title: "Erro", description: error.message || "Falha ao carregar configurações de design.", variant: "destructive" });
        setSettings(getDefaultSettings(currentMemberAreaId!, user?.id || null));
      } else if (data) {
        setSettings(deepMerge(getDefaultSettings(currentMemberAreaId!, user?.id || null), { ...data, colors: data.colors as PlatformColors | null } as Partial<PlatformSettings>));
      } else {
        setSettings(getDefaultSettings(currentMemberAreaId!, user?.id || null));
      }
      console.log('ADMIN_DESIGN_DEBUG: fetchSettings completed successfully.');
    } catch (error: any) {
      console.error('ADMIN_DESIGN_DEBUG: Exceção ao buscar configurações de design:', error);
      toast({ title: "Erro", description: error.message || "Falha ao carregar configurações de design.", variant: "destructive" });
    } finally {
      setLoadingDesign(false); // Use loadingDesign
      console.log('ADMIN_DESIGN_DEBUG: fetchSettings setLoadingDesign(false) called.');
    }
  };

  const fetchMemberAreaDetails = async () => {
    console.log('ADMIN_DESIGN_DEBUG: fetchMemberAreaDetails started for ID:', currentMemberAreaId);
    if (!currentMemberAreaId) {
      console.log('ADMIN_DESIGN_DEBUG: fetchMemberAreaDetails skipped, no memberAreaId.');
      return;
    }
    try {
      const { data, error } = await supabase
        .from('member_areas')
        .select('*')
        .eq('id', currentMemberAreaId)
        .single();
      if (error) throw error;
      setMemberAreaDetails(data as MemberArea);
      console.log('ADMIN_DESIGN_DEBUG: fetchMemberAreaDetails completed successfully.');
    } catch (error: any) {
      console.error('ADMIN_DESIGN_DEBUG: Erro ao buscar detalhes da área de membros:', error);
      toast({ title: "Erro", description: error.message || "Falha ao carregar detalhes da área de membros.", variant: "destructive" });
    }
  };

  const fetchModulesForPreview = async () => {
    console.log('ADMIN_DESIGN_DEBUG: fetchModulesForPreview started for ID:', currentMemberAreaId);
    if (!currentMemberAreaId) {
      console.log('ADMIN_DESIGN_DEBUG: fetchModulesForPreview skipped, no memberAreaId.');
      return;
    }
    try {
      const { data, error } = await supabase
        .from('modules')
        .select('*')
        .eq('member_area_id', currentMemberAreaId)
        .eq('status', 'published')
        .order('order_index', { ascending: true });
      if (error) throw error;
      setModules(data as Module[] || []);
      console.log('ADMIN_DESIGN_DEBUG: fetchModulesForPreview completed successfully.');
    } catch (error: any) {
      console.error('ADMIN_DESIGN_DEBUG: Erro ao buscar módulos para preview:', error);
      toast({ title: "Erro", description: error.message || "Falha ao carregar módulos para preview.", variant: "destructive" });
    }
  };

  const handleInputChange = (field: keyof PlatformSettings, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleColorChange = (colorField: keyof PlatformColors, value: string) => {
    setSettings(prev => ({
      ...prev,
      colors: {
        ...prev.colors,
        [colorField]: value,
      },
    }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLogoFile(e.target.files[0]);
    }
  };

  const uploadFile = async (file: File, folder: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('member-area-content')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('member-area-content')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      let newLogoUrl = settings.logo_url;
      if (logoFile) {
        newLogoUrl = await uploadFile(logoFile, 'platform-logos');
      }

      const payload: TablesInsert<'platform_settings'> = {
        user_id: user?.id || null,
        member_area_id: currentMemberAreaId || '',
        logo_url: newLogoUrl,
        login_title: settings.login_title,
        login_subtitle: settings.login_subtitle,
        global_font_family: settings.global_font_family,
        colors: settings.colors as Json,
        password_reset_subject: settings.password_reset_subject,
        password_reset_body: settings.password_reset_body,
      };

      const { error } = await supabase
        .from('platform_settings')
        .upsert(payload, { onConflict: 'member_area_id' });

      if (error) throw error;

      toast({ title: "Sucesso", description: "Configurações de design salvas!" });
      setLogoFile(null);
      fetchSettings();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Falha ao salvar configurações.", variant: "destructive" });
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestoreDefault = () => {
    setSettings(getDefaultSettings(currentMemberAreaId!, user?.id || null));
    setLogoFile(null);
    toast({ title: "Restaurado", description: "Configurações restauradas para o padrão." });
  };

  const handleMockLogin = () => {
    setIsLoggedInPreview(true);
    toast({ title: "Login de Preview", description: "Você está logado no preview da área de membros.", duration: 2000 });
  };

  const handleMockLogout = () => {
    setIsLoggedInPreview(false);
    toast({ title: "Logout de Preview", description: "Você saiu do preview da área de membros.", duration: 2000 });
  };

  if (!user) {
    console.log('ADMIN_DESIGN_DEBUG: Redirecting to login because no user.');
    return <Navigate to="/auth/login" replace />;
  }

  if (loadingDesign) { 
    return (
      <div className="flex items-center justify-center min-h-screen">
        Carregando design...
      </div>
    );
  }

  if (!currentMemberAreaId) {
    console.log('ADMIN_DESIGN_DEBUG: No memberAreaId, showing message.');
    return <p>Nenhuma área de membros selecionada.</p>;
  }

  const currentDefaultSettings = getDefaultSettings(currentMemberAreaId, user?.id || null);

  return (
    <div className="p-4 sm:p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Palette className="h-5 w-5" /> Configurações Visuais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="logoUpload">Logo da Plataforma</Label>
              <Input id="logoUpload" type="file" accept="image/*" onChange={handleLogoUpload} />
              {logoFile && <p className="text-sm text-muted-foreground">Arquivo selecionado: {logoFile.name}</p>}
              {settings.logo_url && !logoFile && (
                <div className="mt-2">
                  <img src={settings.logo_url} alt="Logo atual" className="h-16 w-auto object-contain" />
                  <Button variant="ghost" size="sm" onClick={() => handleInputChange('logo_url', null)} className="text-destructive">Remover Logo</Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="loginTitle">Título da Página de Login</Label>
              <Input id="loginTitle" value={settings.login_title || ''} onChange={(e) => handleInputChange('login_title', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="loginSubtitle">Subtítulo da Página de Login</Label>
              <Textarea id="loginSubtitle" value={settings.login_subtitle || ''} onChange={(e) => handleInputChange('login_subtitle', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="globalFont">Família de Fonte Global</Label>
              <Select
                value={settings.global_font_family || 'Nunito'}
                onValueChange={(value) => handleInputChange('global_font_family', value)}
              >
                <SelectTrigger id="globalFont">
                  <SelectValue placeholder="Selecione uma fonte" />
                </SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS.map((font) => (
                    <SelectItem key={font.value} value={font.value}>
                      {font.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <h3 className="font-semibold mt-6 text-base sm:text-lg">Paleta de Cores</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(settings.colors || {}).map(([key, value]) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={`color-${key}`}>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</Label>
                  <div className="flex gap-2">
                    <Input type="color" value={value || '#ffffff'} onChange={(e) => handleColorChange(key as keyof PlatformColors, e.target.value)} className="w-16 h-10 p-1" />
                    <Input id={`color-${key}`} value={value || '#ffffff'} onChange={(e) => handleColorChange(key as keyof PlatformColors, e.target.value)} placeholder="#ffffff" />
                  </div>
                </div>
              ))}
            </div>

            <Separator />

            <h3 className="font-semibold mt-6 text-base sm:text-lg flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Templates de E-mail
            </h3>
            <p className="text-sm text-muted-foreground">
              Personalize os e-mails transacionais da sua área de membros.
            </p>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="passwordResetSubject">Assunto do E-mail de Redefinição de Senha</Label>
                <Input 
                  id="passwordResetSubject" 
                  value={settings.password_reset_subject || ''} 
                  onChange={e => handleInputChange('password_reset_subject', e.target.value)} 
                  placeholder="Redefina sua senha da Área de Membros" 
                />
                <p className="text-xs text-muted-foreground">
                  Use `{`{customer_name}`}` e `{`{member_area_name}`}` para personalizar.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="passwordResetBody">Corpo do E-mail de Redefinição de Senha</Label>
                <Textarea 
                  id="passwordResetBody" 
                  value={settings.password_reset_body || ''} 
                  onChange={e => handleInputChange('password_reset_body', e.target.value)} 
                  placeholder="Olá {customer_name},\n\nClique no link para redefinir sua senha: {password_reset_link}" 
                  rows={8}
                />
                <p className="text-xs text-muted-foreground">
                  Use `{`{customer_name}`}`, `{`{member_area_name}`}` e `{`{password_reset_link}`}` para personalizar.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2 mt-6">
              <Button variant="outline" onClick={handleRestoreDefault} disabled={isSaving} className="w-full sm:w-auto text-sm">
                <RotateCcw className="mr-2 h-4 w-4" /> Restaurar Padrão
              </Button>
              <Button onClick={handleSaveSettings} disabled={isSaving} className="w-full sm:w-auto text-sm">
                <Save className="mr-2 h-4 w-4" /> {isSaving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Type className="h-5 w-5" /> Pré-visualização
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[600px] bg-gray-100 flex items-center justify-center p-4 rounded-lg overflow-hidden">
            {isLoggedInPreview ? (
              <MemberAreaPreviewContent 
                settings={settings} 
                onLogout={handleMockLogout} 
                memberArea={memberAreaDetails}
                modules={modules}
              />
            ) : (
              <div 
                className="w-full h-full flex items-center justify-center p-4" 
                style={{ 
                  backgroundColor: settings.colors?.background_login || currentDefaultSettings.colors?.background_login,
                  fontFamily: settings.global_font_family || currentDefaultSettings.global_font_family 
                }}
              >
                <div 
                  className="w-full max-w-xs sm:max-w-sm p-6 rounded-lg shadow-lg text-center space-y-4"
                  style={{ backgroundColor: settings.colors?.card_login || currentDefaultSettings.colors?.card_login }}
                >
                  {settings.logo_url && (
                    <img src={settings.logo_url} alt="Logo" className="mx-auto h-16 mb-4" />
                  )}
                  <h2 className="text-xl sm:text-2xl font-bold" style={{ color: settings.colors?.text_primary || currentDefaultSettings.colors?.text_primary }}>
                    {settings.login_title || currentDefaultSettings.login_title}
                  </h2>
                  <p className="text-sm sm:text-base" style={{ color: settings.colors?.text_secondary || currentDefaultSettings.colors?.text_secondary }}>
                    {settings.login_subtitle || currentDefaultSettings.login_subtitle}
                  </p>
                  <Input placeholder="Email" type="email" className="mt-4" />
                  <Input placeholder="Senha" type="password" className="mt-2" />
                  <Button 
                    className="w-full mt-4" 
                    style={{ backgroundColor: settings.colors?.button_background || currentDefaultSettings.colors?.button_background, color: '#FFFFFF' }}
                    onClick={handleMockLogin}
                  >
                    Entrar
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDesign;