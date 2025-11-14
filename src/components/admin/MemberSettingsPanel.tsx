import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface MemberSettings {
  id: string;
  member_area_id: string;
  default_password_mode: 'fixed' | 'random' | 'force_change';
  default_fixed_password: string | null;
  welcome_email_template: string | null;
  created_at: string;
  updated_at: string;
}

export function MemberSettingsPanel({ memberAreaId }: { memberAreaId: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<MemberSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordMode, setPasswordMode] = useState<'fixed' | 'random' | 'force_change'>('random');
  const [fixedPassword, setFixedPassword] = useState('');
  const [welcomeEmailTemplate, setWelcomeEmailTemplate] = useState('');

  useEffect(() => {
    loadSettings();
  }, [memberAreaId]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('member_settings')
        .select('*')
        .eq('member_area_id', memberAreaId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setSettings(data);
        setPasswordMode(data.default_password_mode);
        setFixedPassword(data.default_fixed_password || '');
        setWelcomeEmailTemplate(data.welcome_email_template || '');
      } else {
        // Settings não existem, inicializar com valores padrão
        setPasswordMode('random');
        setFixedPassword('');
        setWelcomeEmailTemplate('');
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as configurações',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);

      // Validar campos
      if (passwordMode === 'fixed' && !fixedPassword.trim()) {
        toast({
          title: 'Erro',
          description: 'Insira uma senha fixa quando o modo for "Senha Fixa"',
          variant: 'destructive',
        });
        setSaving(false);
        return;
      }

      const payload = {
        member_area_id: memberAreaId,
        default_password_mode: passwordMode,
        default_fixed_password: passwordMode === 'fixed' ? fixedPassword : null,
        welcome_email_template: welcomeEmailTemplate || null,
      };

      if (settings?.id) {
        // Atualizar
        const { error } = await supabase
          .from('member_settings')
          .update(payload)
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        // Criar novo
        const { error } = await supabase
          .from('member_settings')
          .insert([payload]);

        if (error) throw error;
      }

      toast({
        title: 'Sucesso',
        description: 'Configurações de membro salvas com sucesso',
      });

      await loadSettings();
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as configurações',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Carregando...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configurações de Membros</CardTitle>
        <CardDescription>
          Configure como os membros serão criados automaticamente após a compra
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Modo de Senha */}
        <div className="space-y-2">
          <Label htmlFor="password-mode">Modo de Geração de Senha</Label>
          <Select value={passwordMode} onValueChange={(value: any) => setPasswordMode(value)}>
            <SelectTrigger id="password-mode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="random">
                <div className="flex flex-col">
                  <span>Senha Aleatória</span>
                  <span className="text-xs text-gray-500">Gera uma nova senha para cada membro</span>
                </div>
              </SelectItem>
              <SelectItem value="fixed">
                <div className="flex flex-col">
                  <span>Senha Fixa</span>
                  <span className="text-xs text-gray-500">Usa a mesma senha para todos</span>
                </div>
              </SelectItem>
              <SelectItem value="force_change">
                <div className="flex flex-col">
                  <span>Forçar Mudança</span>
                  <span className="text-xs text-gray-500">Gera senha aleatória e força mudança no primeiro acesso</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-gray-500">
            {passwordMode === 'random' && 'Cada membro receberá uma senha aleatória única.'}
            {passwordMode === 'fixed' && 'Todos os membros usarão a mesma senha fixa.'}
            {passwordMode === 'force_change' && 'Membros receberão uma senha temporária e serão forçados a mudar no primeiro login.'}
          </p>
        </div>

        {/* Senha Fixa (só aparece se mode === 'fixed') */}
        {passwordMode === 'fixed' && (
          <div className="space-y-2">
            <Label htmlFor="fixed-password">Senha Fixa</Label>
            <Input
              id="fixed-password"
              type="password"
              value={fixedPassword}
              onChange={(e) => setFixedPassword(e.target.value)}
              placeholder="Digite a senha que todos os membros usarão"
              autoComplete="new-password"
            />
            <Alert className="mt-2">
              <AlertDescription>
                ⚠️ Esta senha será usada por todos os membros. Recomenda-se usar uma senha forte.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Template de Email de Boas-vindas */}
        <div className="space-y-2">
          <Label htmlFor="welcome-email">Template de Email de Boas-vindas (Opcional)</Label>
          <textarea
            id="welcome-email"
            value={welcomeEmailTemplate}
            onChange={(e) => setWelcomeEmailTemplate(e.target.value)}
            placeholder="Deixe em branco para usar o template padrão. Use {{nome}}, {{email}}, {{password}}, {{url_acesso}} como variáveis."
            className="min-h-[200px] rounded-md border border-gray-300 p-2 text-sm"
          />
          <p className="text-xs text-gray-500">
            Variáveis disponíveis: {'{{nome}}'}, {'{{email}}'}, {'{{password}}'}, {'{{url_acesso}}'}, {'{{data_expiracao}}'}
          </p>
        </div>

        {/* Botão Salvar */}
        <div className="flex gap-2 pt-4">
          <Button onClick={saveSettings} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
          <Button variant="outline" onClick={loadSettings} disabled={saving}>
            Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
