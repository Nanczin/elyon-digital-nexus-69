import React, { useState, useEffect } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { deepMerge } from '@/lib/utils';
import { useMemberAreaAuth } from '@/hooks/useMemberAreaAuth';
import { getDefaultSettings } from '@/hooks/useGlobalPlatformSettings'; // Importar a função centralizada

type PlatformSettings = Tables<'platform_settings'>;

const MemberAreaLogin = () => {
  const { memberAreaId } = useParams<{ memberAreaId: string }>();
  const { signIn, user } = useMemberAreaAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      if (!memberAreaId) {
        setLoadingSettings(false);
        return;
      }
      const { data, error } = await supabase
        .from('platform_settings')
        .select('*')
        .eq('member_area_id', memberAreaId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching platform settings:', error);
      } else if (data) {
        setSettings(deepMerge(getDefaultSettings(memberAreaId), data as Partial<PlatformSettings>));
      } else {
        setSettings(getDefaultSettings(memberAreaId));
      }
      setLoadingSettings(false);
    };

    fetchSettings();
  }, [memberAreaId]);

  // Redirect if already logged in and has access to this member area
  useEffect(() => {
    const checkAccessAndRedirect = async () => {
      if (user && memberAreaId) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('member_area_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profileError) {
          console.error('Error checking user profile for member area access:', profileError);
        } else if (profile?.member_area_id === memberAreaId) {
          navigate(`/membros/${memberAreaId}`);
        }
      }
    };
    checkAccessAndRedirect();
  }, [user, memberAreaId, navigate]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    if (!error) {
      // Explicitly navigate to the member area dashboard on successful login
      // Add a small delay to ensure state updates and potential profile data propagation
      setTimeout(() => {
        navigate(`/membros/${memberAreaId}`);
      }, 500); // Reduced delay from 1000ms to 500ms, can be adjusted
    }
    setLoading(false);
  };

  if (loadingSettings) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const currentSettings = settings || getDefaultSettings(memberAreaId || null);

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{ 
        backgroundColor: currentSettings.colors?.background_login || 'hsl(var(--member-area-background))',
        fontFamily: currentSettings.global_font_family || 'Nunito'
      }}
    >
      <Card className="w-full max-w-md" style={{ backgroundColor: currentSettings.colors?.card_login || 'hsl(var(--member-area-card-background))' }}>
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
            <CardTitle className="text-2xl font-bold" style={{ color: currentSettings.colors?.text_primary || 'hsl(var(--member-area-text-dark))' }}>
              {currentSettings.login_title || 'Bem-vindo à sua Área de Membros'}
            </CardTitle>
            <CardDescription style={{ color: currentSettings.colors?.text_secondary || 'hsl(var(--member-area-text-muted))' }}>
              {currentSettings.login_subtitle || 'Acesse seu conteúdo exclusivo'}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" style={{ color: currentSettings.colors?.text_primary || 'hsl(var(--member-area-text-dark))' }}>Email</Label>
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
              <Label htmlFor="password" style={{ color: currentSettings.colors?.text_primary || 'hsl(var(--member-area-text-dark))' }}>Senha</Label>
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
                    <EyeOff className="h-4 w-4" style={{ color: currentSettings.colors?.text_secondary || 'hsl(var(--member-area-text-muted))' }} />
                  ) : (
                    <Eye className="h-4 w-4" style={{ color: currentSettings.colors?.text_secondary || 'hsl(var(--member-area-text-muted))' }} />
                  )}
                </Button>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
              style={{ backgroundColor: currentSettings.colors?.button_background || 'hsl(var(--member-area-primary))', color: '#FFFFFF' }}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm" style={{ color: currentSettings.colors?.text_secondary || 'hsl(var(--member-area-text-muted))' }}>
              Esqueceu sua senha?{' '}
              <Link to={`/membros/${memberAreaId}/forgot-password`} className="hover:underline font-medium" style={{ color: currentSettings.colors?.button_background || 'hsl(var(--member-area-primary))' }}>
                Recuperar senha
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MemberAreaLogin;