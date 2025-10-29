import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useIntegrations } from '@/hooks/useIntegrations';

interface EmailConfig {
  host: string;
  port: string;
  username: string;
  password: string;
  fromEmail: string;
  fromName: string;
  secure: boolean;
}

interface EmailConfigProps {
  children: React.ReactNode;
}

const EmailConfig: React.FC<EmailConfigProps> = ({ children }) => {
  const { emailConfig, saveIntegrations, loading } = useIntegrations();
  const [config, setConfig] = useState<EmailConfig>({
    host: '',
    port: '587',
    username: '',
    password: '',
    fromEmail: '',
    fromName: '',
    secure: true
  });
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (emailConfig) {
      setConfig(emailConfig);
    }
  }, [emailConfig]);

  const saveConfig = async () => {
    if (!config.host || !config.username || !config.password || !config.fromEmail) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      await saveIntegrations({ emailConfig: config });
      
      toast({
        title: "Sucesso",
        description: "Configuração de email salva com sucesso!",
      });
      
      setIsOpen(false);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao salvar configuração de email",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const clearConfig = async () => {
    try {
      setSaving(true);
      await saveIntegrations({ emailConfig: null });
      
      setConfig({
        host: '',
        port: '587',
        username: '',
        password: '',
        fromEmail: '',
        fromName: '',
        secure: true
      });
      
      toast({
        title: "Configuração limpa",
        description: "Configuração de email removida com sucesso!",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao remover configuração de email",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const isConfigured = config.host && config.username && config.password && config.fromEmail;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Configurar Email Transacional</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Status atual */}
          {isConfigured && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Status da Configuração</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-sm text-muted-foreground">
                  <p>Provedor: Personalizado</p>
                  <p>Host: {config.host}</p>
                  <p>Porta: {config.port}</p>
                  <p>Email de Envio: {config.fromEmail}</p>
                  <p>Nome de Envio: {config.fromName || 'Não configurado'}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Configuração */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Configurações SMTP</h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="host">Host SMTP *</Label>
                  <Input
                    id="host"
                    value={config.host}
                    onChange={(e) => setConfig({...config, host: e.target.value})}
                    placeholder="smtp.exemplo.com"
                  />
                </div>
                
                <div>
                  <Label htmlFor="port">Porta *</Label>
                  <Input
                    id="port"
                    value={config.port}
                    onChange={(e) => setConfig({...config, port: e.target.value})}
                    placeholder="587"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="username">Usuário/Email *</Label>
                <Input
                  id="username"
                  value={config.username}
                  onChange={(e) => setConfig({...config, username: e.target.value})}
                  placeholder="seu-email@exemplo.com"
                />
              </div>
              
              <div>
                <Label htmlFor="password">Senha *</Label>
                <Input
                  id="password"
                  type="password"
                  value={config.password}
                  onChange={(e) => setConfig({...config, password: e.target.value})}
                  placeholder="sua-senha-ou-app-password"
                />
              </div>
              
              <div>
                <Label htmlFor="fromEmail">Email de Envio *</Label>
                <Input
                  id="fromEmail"
                  value={config.fromEmail}
                  onChange={(e) => setConfig({...config, fromEmail: e.target.value})}
                  placeholder="noreply@seudominio.com"
                />
              </div>
              
              <div>
                <Label htmlFor="fromName">Nome de Envio</Label>
                <Input
                  id="fromName"
                  value={config.fromName}
                  onChange={(e) => setConfig({...config, fromName: e.target.value})}
                  placeholder="Sua Empresa"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={saveConfig} disabled={saving || loading} className="flex-1">
                {saving ? 'Salvando...' : (isConfigured ? 'Salvar Conta' : 'Adicionar Conta')}
              </Button>
              
              {isConfigured && (
                <Button variant="outline" onClick={clearConfig} disabled={saving || loading}>
                  Limpar
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EmailConfig;