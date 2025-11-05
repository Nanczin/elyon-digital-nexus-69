import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Palette, Image, Type, Save, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { deepMerge } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MemberAreaPreviewContent from '@/components/member-area/MemberAreaPreviewContent';
import { Tables } from '@/integrations/supabase/types';
import { getDefaultSettings } from '@/hooks/useGlobalPlatformSettings'; // Importar a função centralizada

interface PlatformSettings {
  id: string;
  user_id: string | null;
  member_area_id: string;
  logo_url: string | null;
  login_title: string | null;
  login_subtitle: string | null;
  global_font_family: string | null;
  colors: {
    background_login?: string;
    card_login?: string;
    header_background?: string;
    header_border?: string;
    button_background?: string;
    text_primary?: string;
    text_header?: string;
    text_cards?: string;
    text_secondary?: string;
    checkmark_background?: string;
    checkmark_icon?: string;
  } | null;
}

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
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { memberAreaId: urlMemberAreaId } = useParams<{ memberAreaId: string }>();
  const currentMemberAreaId = propMemberAreaId || urlMemberAreaId;

  const [settings, setSettings] = useState<PlatformSettings>(() => 
    getDefaultSettings(currentMemberAreaId || null, user?.id || null)
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isLoggedInPreview, setIsLoggedInPreview] = useState(false);
  const [memberAreaDetails, setMemberAreaDetails] = useState<MemberArea | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (user && isAdmin && currentMemberAreaId) {
      fetchSettings();
      fetchMemberAreaDetails();
      fetchModulesForPreview();
    }
  }, [user, isAdmin, currentMemberAreaId]);

  const fetchSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('platform_settings')
      .select('*')
      .eq('member_area_id', currentMemberAreaId)
      .maybeSingle();
    
    if (error && error.code !== 'PGRST116') {
      toast({ title: "Erro", description: "Falha ao carregar configurações de design.", variant: "destructive" });
      console.error(error);
    } else if (data) {
      setSettings(deepMerge(getDefaultSettings(currentMemberAreaId!, user?.id || null), data as Partial<PlatformSettings>));
    } else {
      setSettings(getDefaultSettings(currentMemberAreaId!, user?.id || null));
    }
    setLoading(false);
  };

  const fetchMemberAreaDetails = async () => {
    const { data, error } = await supabase
      .from('member_areas')
      .select('*')
      .eq('id', currentMemberAreaId)
      .single();
    if (error) console.error('Error fetching member area details:', error);
    else setMemberAreaDetails(data);
  };

  const fetchModulesForPreview = async () => {
    const { data, error } = await supabase
      .from('modules')
      .select('*')
      .eq('member_area_id', currentMemberAreaId)
      .eq('status', 'published')
      .order('order_index', { ascending: true });
    if (error) console.error('Error fetching modules for preview:', error);
    else setModules(data || []);
  };

  const handleInputChange = (field: keyof PlatformSettings, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleColorChange = (colorField: keyof (PlatformSettings['colors'] extends object ? PlatformSettings['colors'] : {}), value: string) => {
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
    setSaving(true);
    try {
      let newLogoUrl = settings.logo_url;
      if (logoFile) {
        newLogoUrl = await uploadFile(logoFile, 'platform-logos');
      }

      const payload = {
        user_id: user?.id,
        member_area_id: currentMemberAreaId,
        logo_url: newLogoUrl,
        login_title: settings.login_title,
        login_subtitle: settings.login_subtitle,
        global_font_family: settings.global_font_family,
        colors: settings.colors,
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
      setSaving(false);
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

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Carregando...
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (!currentMemberAreaId) {
    return <p>Nenhuma área de membros selecionada.</p>;
  }

  const currentDefaultSettings = getDefaultSettings(currentMemberAreaId, user?.id || null);

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
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

            <h3 className="font-semibold mt-6">Paleta de Cores</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(settings.colors || {}).map(([key, value]) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={`color-${key}`}>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</Label>
                  <div className="flex gap-2">
                    <Input type="color" value={value || '#ffffff'} onChange={(e) => handleColorChange(key as any, e.target.value)} className="w-16 h-10 p-1" />
                    <Input id={`color-${key}`} value={value || '#ffffff'} onChange={(e) => handleColorChange(key as any, e.target.value)} />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={handleRestoreDefault} disabled={saving}>
                <RotateCcw className="mr-2 h-4 w-4" /> Restaurar Padrão
              </Button>
              <Button onClick={handleSaveSettings} disabled={saving}>
                <Save className="mr-2 h-4 w-4" /> {saving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
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
                  className="w-full max-w-sm p-6 rounded-lg shadow-lg text-center space-y-4"
                  style={{ backgroundColor: settings.colors?.card_login || currentDefaultSettings.colors?.card_login }}
                >
                  {settings.logo_url && (
                    <img src={settings.logo_url} alt="Logo" className="mx-auto h-16 mb-4" />
                  )}
                  <h2 className="text-2xl font-bold" style={{ color: settings.colors?.text_primary || currentDefaultSettings.colors?.text_primary }}>
                    {settings.login_title || currentDefaultSettings.login_title}
                  </h2>
                  <p className="text-sm" style={{ color: settings.colors?.text_secondary || currentDefaultSettings.colors?.text_secondary }}>
                    {settings.login_subtitle || currentDefaultSettings.login_subtitle}
                  </p>
                  <Input placeholder="Email" type="email" className="mt-4" />
                  <Input placeholder="Senha" type="password" className="mt-2" />
                  <Button 
                    className="w-full mt-4" 
                    style={{ backgroundColor: settings.colors?.button_background || currentDefaultSettings.colors?.button_background }}
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