import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useIntegrations } from '@/hooks/useIntegrations';

interface MercadoPagoAccount {
  id: string;
  name: string;
  accessToken: string | null;
  publicKey: string | null;
  clientId: string | null;
  clientSecret: string | null;
}

interface MercadoPagoConfigProps {
  children: React.ReactNode;
}

const MercadoPagoConfig: React.FC<MercadoPagoConfigProps> = ({ children }) => {
  const { mercadoPagoAccounts, saveIntegrations, loading } = useIntegrations();
  const [isOpen, setIsOpen] = useState(false);
  const [newAccount, setNewAccount] = useState<MercadoPagoAccount>({
    id: '',
    name: '',
    accessToken: null,
    publicKey: null,
    clientId: null,
    clientSecret: null
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const addAccount = async () => {
    if (!newAccount.name || !newAccount.accessToken || !newAccount.publicKey) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      const account: MercadoPagoAccount = {
        id: Date.now().toString(),
        ...newAccount
      };

      const updatedAccounts = [...mercadoPagoAccounts, account];
      await saveIntegrations({ mercadoPagoAccounts: updatedAccounts });
      
      setNewAccount({
        id: '',
        name: '',
        accessToken: null,
        publicKey: null,
        clientId: null,
        clientSecret: null
      });

      toast({
        title: "Sucesso",
        description: "Conta do Mercado Pago salva com sucesso!",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao salvar conta do Mercado Pago",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const removeAccount = async (id: string) => {
    try {
      setSaving(true);
      const updatedAccounts = mercadoPagoAccounts.filter(account => account.id !== id);
      await saveIntegrations({ mercadoPagoAccounts: updatedAccounts });
      
      toast({
        title: "Conta removida",
        description: "Conta do Mercado Pago removida com sucesso!",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao remover conta do Mercado Pago",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-xs sm:max-w-lg lg:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Configurar Mercado Pago</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Contas existentes */}
          {mercadoPagoAccounts.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-base sm:text-lg font-semibold">Contas Configuradas</h3>
              {mercadoPagoAccounts.map((account) => (
                <Card key={account.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between text-sm sm:text-base">
                      {account.name}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAccount(account.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      <p>Access Token: {account.accessToken?.substring(0, 20) || ''}...</p>
                      <p>Public Key: {account.publicKey?.substring(0, 20) || ''}...</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Nova conta */}
          <div className="space-y-4">
            <h3 className="text-base sm:text-lg font-semibold">Adicionar Nova Conta</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nome da Conta *</Label>
                <Input
                  id="name"
                  value={newAccount.name}
                  onChange={(e) => setNewAccount({...newAccount, name: e.target.value})}
                  placeholder="Ex: Conta Principal"
                />
              </div>
              
              <div>
                <Label htmlFor="accessToken">Access Token *</Label>
                <Input
                  id="accessToken"
                  type="password"
                  value={newAccount.accessToken || ''}
                  onChange={(e) => setNewAccount({...newAccount, accessToken: e.target.value})}
                  placeholder="APP_USR-..."
                />
              </div>
              
              <div>
                <Label htmlFor="publicKey">Public Key *</Label>
                <Input
                  id="publicKey"
                  value={newAccount.publicKey || ''}
                  onChange={(e) => setNewAccount({...newAccount, publicKey: e.target.value})}
                  placeholder="APP_USR-..."
                />
              </div>
              
              <div>
                <Label htmlFor="clientId">Client ID</Label>
                <Input
                  id="clientId"
                  value={newAccount.clientId || ''}
                  onChange={(e) => setNewAccount({...newAccount, clientId: e.target.value})}
                  placeholder="123456789"
                />
              </div>
              
              <div className="col-span-1 md:col-span-2">
                <Label htmlFor="clientSecret">Client Secret</Label>
                <Input
                  id="clientSecret"
                  type="password"
                  value={newAccount.clientSecret || ''}
                  onChange={(e) => setNewAccount({...newAccount, clientSecret: e.target.value})}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                />
              </div>
            </div>
            
            <Button onClick={addAccount} disabled={saving || loading} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              {saving ? 'Salvando...' : 'Adicionar Conta'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MercadoPagoConfig;