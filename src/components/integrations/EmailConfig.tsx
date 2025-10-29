import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useIntegrations } from '@/hooks/useIntegrations';
import { EmailConfig as SimplifiedEmailConfig } from '@/integrations/supabase/types'; // Importar a interface simplificada

interface EmailConfigProps {
  children: React.ReactNode;
}

const EmailConfig: React.FC<EmailConfigProps> = ({ children }) => {
  const { emailConfig, saveIntegrations, loading } = useIntegrations();
  const [newAccount, setNewAccount] = useState<SimplifiedEmailConfig>({
    email: '',
    appPassword: '',
    displayName: '',
  });
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!isOpen) {
      setNewAccount({
        email: '',
        appPassword: '',
        displayName: '',
      });
    }
  }, [isOpen]);

  const addAccount = async () => {
    if (!newAccount.email || !newAccount.appPassword || !newAccount.displayName) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      // Construir o objeto smtp_config com os campos simplificados e os padrões SMTP
      const smtpConfigPayload: SimplifiedEmailConfig = {
        email: newAccount.email,
        appPassword: newAccount.appPassword,
        displayName: newAccount.displayName,
        host: 'smtp.gmail.com', // Padrão para Gmail, pode ser ajustado se necessário
        port: '587',
        secure: true,
      };

      await saveIntegrations({ emailConfig: smtpConfigPayload });
      
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

  const removeCurrentAccount = async () => {
    try {
      setSaving(true);
      await saveIntegrations({ emailConfig: null });
      
      toast({
        title: "Configuração removida",
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

  const isNewAccountFormValid = newAccount.email && newAccount.appPassword && newAccount.displayName;

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
          {emailConfig && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Conta Configurada</h3>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-base">
                    {emailConfig.displayName || emailConfig.email}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={removeCurrentAccount}
                      disabled={saving || loading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-sm text-muted-foreground">
                    <p>Email: {emailConfig.email}</p>
                    <p>Nome de Exibição: {emailConfig.displayName}</p>
                    {/* Não exibir a senha do app aqui por segurança */}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Adicionar Nova Conta</h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={newAccount.email}
                  onChange={(e) => setNewAccount({...newAccount, email: e.target.value})}
                  placeholder="seu-email@exemplo.com"
                />
              </div>
              
              <div>
                <Label htmlFor="appPassword">Senha do App *</Label>
                <Input
                  id="appPassword"
                  type="password"
                  value={newAccount.appPassword}
                  onChange={(e) => setNewAccount({...newAccount, appPassword: e.target.value})}
                  placeholder="Sua senha de aplicativo (não a senha principal)"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Para Gmail, gere uma senha de app em Configurações de Segurança da sua conta Google.
                </p>
              </div>
              
              <div>
                <Label htmlFor="displayName">Nome de Exibição *</Label>
                <Input
                  id="displayName"
                  value={newAccount.displayName}
                  onChange={(e) => setNewAccount({...newAccount, displayName: e.target.value})}
                  placeholder="Nome da sua empresa ou seu nome"
                />
              </div>
            </div>
            
            <Button onClick={addAccount} disabled={saving || loading || !isNewAccountFormValid} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              {saving ? 'Salvando...' : 'Adicionar Conta'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EmailConfig;