import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Palette, Image, Type, Save, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { deepMerge } from '@/lib/utils';

interface PlatformSettings {
  id: string;
  user_id: string | null;
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
  } | null;
}

const defaultSettings: PlatformSettings = {
  id: '00000000-0000-0000-0000-000000000001', // Fixed ID
  user_id: null,
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
};

const AdminDesign = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [settings, setSettings] = useState<PlatformSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (user && isAdmin) {
      fetchSettings();
    }
  }, [user, isAdmin]);

  const fetchSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('platform_settings')
      .select('*')
      .eq('id', defaultSettings.id)
      .maybeSingle();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      toast({ title: "Erro", description: "Falha ao carregar configurações de design.", variant: "destructive" });
      console.error(error);
    } else if (data) {
      // Deep merge para garantir que todos os campos padrão estejam presentes
      setSettings(deepMerge(defaultSettings, data as Partial<PlatformSettings>));
    } else {
      setSettings(defaultSettings); // Use default if no settings found
    }
    setLoading(false);
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
      .from('member-area-content') // Usar um bucket específico para área de membros
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
        ...settings,
        user_id: user?.id,
        logo_url: newLogoUrl,
      };

      const { error } = await supabase
        .from('platform_settings')
        .upsert(payload, { onConflict: 'id' }); // Upsert para criar ou atualizar

      if (error) throw error;

      toast({ title: "Sucesso", description: "Configurações de design salvas!" });
      setLogoFile(null); // Clear file input after successful upload
      fetchSettings(); // Re-fetch to ensure latest data is displayed
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Falha ao salvar configurações.", variant: "destructive" });
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleRestoreDefault = () => {
    setSettings(defaultSettings);
    setLogoFile(null);
    toast({ title: "Restaurado", description: "Configurações restauradas para o padrão." });
  };

  if (authLoading || loading) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  if (!user || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Design da Área de Membros</h1>
        <p className="text-muted-foreground mt-2">
          Personalize a aparência da sua plataforma
        </p>
      </div>

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
              <Input id="globalFont" value={settings.global_font_family || ''} onChange={(e) => handleInputChange('global_font_family', e.target.value)} placeholder="Ex: Inter, Arial, 'Open Sans'" />
            </div>

            <h3 className="font-semibold mt-6">Paleta de Cores</h3>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(settings.colors || {}).map(([key, value]) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={`color-${key}`}>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</Label>
                  <div className="flex gap-2">
                    <Input type="color" value={value || '#ffffff'} onChange={(e) => handleColorChange(key as any, e.target.value)} className="w-12 h-8 p-1" />
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
              <Type className="h-5 w-5" /> Pré-visualização (Login)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[600px] bg-gray-100 flex items-center justify-center p-4 rounded-lg overflow-hidden">
            {/* Simulação da página de login com as cores e textos */}
            <div 
              className="w-full h-full flex items-center justify-center p-4" 
              style={{ backgroundColor: settings.colors?.background_login || defaultSettings.colors?.background_login }}
            >
              <div 
                className="w-full max-w-sm p-6 rounded-lg shadow-lg text-center space-y-4"
                style={{ backgroundColor: settings.colors?.card_login || defaultSettings.colors?.card_login }}
              >
                {settings.logo_url && (
                  <img src={settings.logo_url} alt="Logo" className="mx-auto h-16 mb-4" />
                )}
                <h2 className="text-2xl font-bold" style={{ color: settings.colors?.text_primary || defaultSettings.colors?.text_primary }}>
                  {settings.login_title || defaultSettings.login_title}
                </h2>
                <p className="text-sm" style={{ color: settings.colors?.text_secondary || defaultSettings.colors?.text_secondary }}>
                  {settings.login_subtitle || defaultSettings.login_subtitle}
                </p>
                <Input placeholder="Email" type="email" className="mt-4" />
                <Input placeholder="Senha" type="password" className="mt-2" />
                <Button className="w-full mt-4" style={{ backgroundColor: settings.colors?.button_background || defaultSettings.colors?.button_background }}>
                  Entrar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDesign;