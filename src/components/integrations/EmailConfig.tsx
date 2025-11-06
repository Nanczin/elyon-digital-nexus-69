import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Plus, Send } from 'lucide-react'; // Adicionado ícone Send
import { useToast } from '@/hooks/use-toast';
import { useIntegrations } from '@/hooks/useIntegrations';
import { EmailConfig as SimplifiedEmailConfig } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client'; // Importar o cliente Supabase
import { useAuth } from '@/hooks/useAuth'; // Importar useAuth para obter o user.id

interface EmailConfigProps {
  children: React.ReactNode;
}

const EmailConfig: React.FC<EmailConfigProps> = ({ children }) => {
  const { user } = useAuth(); // Obter o usuário logado
  const { emailConfig, saveIntegrations, loading } = useIntegrations();
  const [newAccount, setNewAccount] = useState<SimplifiedEmailConfig>({
    email: '',
    appPassword: '',
    displayName: '',
  });
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false); // Novo estado para o botão de teste
  const [testRecipientEmail, setTestRecipientEmail] = useState(''); // Novo estado para o e-mail de teste
  const { toast } = useToast();

  useEffect(() => {
    if (!isOpen) {
      setNewAccount({
        email: '',
        appPassword: '',
        displayName: '',
      });
      setTestRecipientEmail(''); // Limpar e-mail de teste ao fechar
    } else if (emailConfig?.email) {
      setTestRecipientEmail(emailConfig.email); // Preencher com o e-mail configurado
    }
  }, [isOpen, emailConfig]);

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
      const smtpConfigPayload: SimplifiedEmailConfig = {
        email: newAccount.email,
        appPassword: newAccount.appPassword,
        displayName: newAccount.displayName,
        host: 'smtp.gmail.com',
        port: '465', // Alterado para 465
        secure: true, // Alterado para true para a porta 465
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

  const handleTestConnection = async () => {
    if (!user?.id) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado. Faça login para testar a conexão.",
        variant: "destructive",
      });
      return;
    }

    if (!testRecipientEmail || !testRecipientEmail.includes('@')) {
      toast({
        title: "Erro",
        description: "Por favor, insira um e-mail de destinatário válido para o teste.",
        variant: "destructive",
      });
      return;
    }

    setTestingConnection(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        'test-email-connection',
        {
          body: {
            to: testRecipientEmail,
            sellerUserId: user.id,
          }
        }
      );

      if (error) {
        console.error('Erro ao invocar função de teste:', error);
        toast({
          title: "Erro no Teste",
          description: error.message || "Não foi possível testar a conexão. Verifique os logs do Supabase.",
          variant: "destructive",
        });
      } else if (data?.success) {
        toast({
          title: "Teste de Conexão Bem-Sucedido! ✅",
          description: `E-mail de teste enviado para ${testRecipientEmail}. Verifique sua caixa de entrada.`,
        });
      } else {
        toast({
          title: "Falha no Teste de Conexão",
          description: data?.error || "O e-mail de teste não pôde ser enviado. Verifique suas credenciais e os logs do Supabase.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      console.error('Erro inesperado ao testar conexão:', err);
      toast({
        title: "Erro Inesperado",
        description: err.message || "Ocorreu um erro inesperado ao tentar testar a conexão.",
        variant: "destructive",
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const isNewAccountFormValid = newAccount.email && newAccount.appPassword && newAccount.displayName;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-xs sm:max-w-lg lg:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Configurar Email Transacional</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {emailConfig && (
            <div className="space-y-4">
              <h3 className="text-base sm:text-lg font-semibold">Conta Configurada</h3>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-sm sm:text-base">
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
                  <div className="text-xs sm:text-sm text-muted-foreground">
                    <p>Email: {emailConfig.email}</p>
                    <p>Nome de Exibição: {emailConfig.displayName}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Seção de Teste de Conexão */}
              <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                <h4 className="font-semibold flex items-center gap-2 text-base sm:text-lg">
                  <Send className="h-4 w-4" />
                  Testar Conexão
                </h4>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Envie um e-mail de teste para verificar se sua configuração SMTP está funcionando.
                </p>
                <div>
                  <Label htmlFor="testRecipientEmail">Enviar e-mail de teste para:</Label>
                  <Input
                    id="testRecipientEmail"
                    type="email"
                    value={testRecipientEmail}
                    onChange={(e) => setTestRecipientEmail(e.target.value)}
                    placeholder="seu-email-de-teste@exemplo.com"
                    className="mt-1"
                  />
                </div>
                <Button 
                  onClick={handleTestConnection} 
                  disabled={testingConnection || !testRecipientEmail.includes('@')} 
                  className="w-full"
                >
                  {testingConnection ? 'Enviando Teste...' : 'Enviar E-mail de Teste'}
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-base sm:text-lg font-semibold">Adicionar Nova Conta</h3>
            
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