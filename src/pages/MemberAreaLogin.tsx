import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';
import { useGlobalPlatformSettings } from '@/hooks/useGlobalPlatformSettings';
import { deepMerge } from '@/lib/utils';
import { Tables } from '@/integrations/supabase/types';

type PlatformSettings = Tables<'platform_settings'>;

// Function to generate default settings for a given memberAreaId
const getDefaultSettings = (memberAreaId: string): PlatformSettings => ({
  id: '', 
  user_id: null, // User ID is not relevant for default settings here
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

const MemberAreaLogin = () => {
  const { memberAreaId } = useParams<{ memberAreaId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);

  // Fetch platform settings for this member area
  useEffect(() => {
    const fetchSettings = async () => {
      if (!memberAreaId) {
        setLoadingSettings(false);
        return;
      }
      setLoadingSettings(true);
      const { data, error } = await supabase
        .from('platform_settings')
        .select('*')
        .eq('member_area_id', memberAreaId)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching platform settings:', error);
        toast({ title: "Erro", description: "Falha ao carregar configurações da área de membros.", variant: "destructive" });
        setSettings(getDefaultSettings(memberAreaId)); // Fallback to default
      } else if (data) {
        setSettings(deepMerge(getDefaultSettings(memberAreaId), data as Partial<PlatformSettings>));
      } else {
        setSettings(getDefaultSettings(memberAreaId)); // Use default if no settings found
      }
      setLoadingSettings(false);
    };
    fetchSettings();
  }, [memberAreaId, toast]);

  // Apply global font family from settings
  useEffect(() => {
    if (settings?.global_font_family) {
      document.documentElement.style.setProperty('--global-font-family', settings.global_font_family);
    } else {
      document.documentElement.style.setProperty('--global-font-family', 'Inter, sans-serif');
    }
  }, [settings?.global_font_family]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (!memberAreaId) {
      toast({ title: "Erro", description: "ID da área de membros não encontrado.", variant: "destructive" });
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        title: "Erro no login",
        description: error.message,
        variant: "destructive",
      });
    } else if (data.user) {
      // Verify if the user has access to this specific member area
      const { data: accessData, error: accessError } = await supabase
        .from('member_access')
        .select('id')
        .eq('user_id', data.user.id)
        .eq('member_area_id', memberAreaId)
        .eq('is_active', true)
        .maybeSingle();

      if (accessError) {
        console.error('Error checking member access:', accessError);
        toast({ title: "Erro", description: "Falha ao verificar acesso à área de membros.", variant: "destructive" });
        await supabase.auth.signOut(); // Log out user if access check fails
      } else if (!accessData) {
        toast({ title: "Acesso Negado", description: "Você não tem acesso a esta área de membros.", variant: "destructive" });
        await supabase.auth.signOut(); // Log out user if no access
      } else {
        toast({
          title: "Login realizado!",
          description: "Redirecionando para a área de membros...",
        });
        navigate(`/membros/${memberAreaId}`); // Redirect to member area dashboard
      }
    }
    setLoading(false);
  };

  if (loadingSettings) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: settings?.colors?.background_login || getDefaultSettings(memberAreaId || '').colors?.background_login }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const currentSettings = settings || getDefaultSettings(memberAreaId || '');

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: currentSettings.colors?.background_login }}
    >
      <Card className="w-full max-w-md" style={{ backgroundColor: currentSettings.colors?.card_login }}>
        <CardHeader className="text-center space-y-4">
          {currentSettings.logo_url && (
            <div className="mx-auto w-20 h-20 rounded-full flex items-center justify-center">
              <img 
                src={currentSettings.logo_url} 
                alt="Logo da Área de Membros" 
                className="w-20 h-20 object-contain animate-fade-in hover-scale"
              />
            </div>
          )}
          <div>
            <CardTitle className="text-2xl font-bold" style={{ color: currentSettings.colors?.text_primary }}>
              {currentSettings.login_title}
            </CardTitle>
            <CardDescription style={{ color: currentSettings.colors?.text_secondary }}>
              {currentSettings.login_subtitle}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" style={{ color: currentSettings.colors?.text_primary }}>Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" style={{ color: currentSettings.colors?.text_primary }}>Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" style={{ color: currentSettings.colors?.text_secondary }} />
                  ) : (
                    <Eye className="h-4 w-4" style={{ color: currentSettings.colors?.text_secondary }} />
                  )}
                </Button>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
              style={{ backgroundColor: currentSettings.colors?.button_background, color: currentSettings.colors?.text_primary }}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          {/* Opcional: Link para recuperação de senha ou registro, se aplicável */}
          {/* <div className="mt-6 text-center">
            <p className="text-sm" style={{ color: currentSettings.colors?.text_secondary }}>
              Esqueceu sua senha?{' '}
              <Link to={`/membros/${memberAreaId}/forgot-password`} style={{ color: currentSettings.colors?.button_background }} className="hover:underline font-medium">
                Recuperar
              </Link>
            </p>
          </div> */}
        </CardContent>
      </Card>
    </div>
  );
};

export default MemberAreaLogin;