import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Plus } from 'lucide-react'; // Importar ícones
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
  const [newAccount, setNewAccount] = useState<EmailConfig>({ // Renomeado para newAccount
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

  // Resetar o formulário de nova conta quando o diálogo abre ou fecha
  useEffect(() => {
    if (!isOpen) {
      setNewAccount({
        host: '',
        port: '587',
        username: '',
        password: '',
        fromEmail: '',
        fromName: '',
        secure: true
      });
    }
  }, [isOpen]);

  const addAccount = async () => { // Renomeado para addAccount
    if (!newAccount.host || !newAccount.username || !newAccount.password || !newAccount.fromEmail) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos obrigatórios para a nova conta",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      await saveIntegrations({ emailConfig: newAccount }); // Salva a nova conta
      
      toast({
        title: "Sucesso",
        description: "Configuração de email salva com sucesso!",
      });
      
      setIsOpen(false); // Fecha o diálogo após salvar
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

  const removeCurrentAccount = async () => { // Nova função para remover a conta atual
    try {
      setSaving(true);
      await saveIntegrations({ emailConfig: null }); // Remove a conta
      
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

  const isNewAccountFormValid = newAccount.host && newAccount.username && newAccount.password && newAccount.fromEmail;

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
          {/* Contas existentes (apenas uma, no caso do email) */}
          {emailConfig && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Conta Configurada</h3>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-base">
                    {emailConfig.fromName || emailConfig.fromEmail}
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
                    <p>Host: {emailConfig.host}</p>
                    <p>Porta: {emailConfig.port}</p>
                    <p>Email de Envio: {emailConfig.fromEmail}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Adicionar Nova Conta */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Adicionar Nova Conta</h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="host">Host SMTP *</Label>
                  <Input
                    id="host"
                    value={newAccount.host}
                    onChange={(e) => setNewAccount({...newAccount, host: e.target.value})}
                    placeholder="smtp.exemplo.com"
                  />
                </div>
                
                <div>
                  <Label htmlFor="port">Porta *</Label>
                  <Input
                    id="port"
                    value={newAccount.port}
                    onChange={(e) => setNewAccount({...newAccount, port: e.target.value})}
                    placeholder="587"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="username">Usuário/Email *</Label>
                <Input
                  id="username"
                  value={newAccount.username}
                  onChange={(e) => setNewAccount({...newAccount, username: e.target.value})}
                  placeholder="seu-email@exemplo.com"
                />
              </div>
              
              <div>
                <Label htmlFor="password">Senha *</Label>
                <Input
                  id="password"
                  type="password"
                  value={newAccount.password}
                  onChange={(e) => setNewAccount({...newAccount, password: e.target.value})}
                  placeholder="sua-senha-ou-app-password"
                />
              </div>
              
              <div>
                <Label htmlFor="fromEmail">Email de Envio *</Label>
                <Input
                  id="fromEmail"
                  value={newAccount.fromEmail}
                  onChange={(e) => setNewAccount({...newAccount, fromEmail: e.target.value})}
                  placeholder="noreply@seudominio.com"
                />
              </div>
              
              <div>
                <Label htmlFor="fromName">Nome de Envio</Label>
                <Input
                  id="fromName"
                  value={newAccount.fromName}
                  onChange={(e) => setNewAccount({...newAccount, fromName: e.target.value})}
                  placeholder="Sua Empresa"
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