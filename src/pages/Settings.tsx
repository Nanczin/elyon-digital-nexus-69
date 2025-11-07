import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { User, Bell, Shield, Database } from 'lucide-react';

const Settings = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-4xl">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">
          Gerencie suas preferências e configurações da conta
        </p>
      </div>

      <div className="grid gap-4 sm:gap-6">
        {/* Perfil */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <User className="h-5 w-5" />
              Informações do Perfil
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm">Email</Label>
                <Input
                  id="email"
                  value={user.email || ''}
                  disabled
                  className="bg-muted text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm">Nome</Label>
                <Input
                  id="name"
                  placeholder="Seu nome completo"
                  value={user.user_metadata?.name || ''}
                  className="text-sm"
                />
              </div>
            </div>
            <Button className="text-sm">Atualizar Perfil</Button>
          </CardContent>
        </Card>

        {/* Notificações */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Bell className="h-5 w-5" />
              Notificações
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <h4 className="font-medium text-sm sm:text-base">Notificações por Email</h4>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Receba atualizações sobre vendas e atividades
                </p>
              </div>
              <Button variant="outline" size="sm" className="text-xs sm:text-sm">Configurar</Button>
            </div>
            <Separator />
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <h4 className="font-medium text-sm sm:text-base">Notificações Push</h4>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Receba notificações instantâneas no navegador
                </p>
              </div>
              <Button variant="outline" size="sm" className="text-xs sm:text-sm">Configurar</Button>
            </div>
          </CardContent>
        </Card>

        {/* Segurança */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Shield className="h-5 w-5" />
              Segurança
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <h4 className="font-medium text-sm sm:text-base">Alterar Senha</h4>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Mantenha sua conta segura com uma senha forte
                </p>
              </div>
              <Button variant="outline" size="sm" className="text-xs sm:text-sm">Alterar</Button>
            </div>
            <Separator />
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <h4 className="font-medium text-sm sm:text-base">Autenticação de Dois Fatores</h4>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Adicione uma camada extra de segurança
                </p>
              </div>
              <Button variant="outline" size="sm" className="text-xs sm:text-sm">Configurar</Button>
            </div>
          </CardContent>
        </Card>

        {/* Dados */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Database className="h-5 w-5" />
              Dados da Conta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <h4 className="font-medium text-sm sm:text-base">Exportar Dados</h4>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Baixe uma cópia dos seus dados
                </p>
              </div>
              <Button variant="outline" size="sm" className="text-xs sm:text-sm">Exportar</Button>
            </div>
            <Separator />
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <h4 className="font-medium text-destructive text-sm sm:text-base">Excluir Conta</h4>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Excluir permanentemente sua conta e todos os dados
                </p>
              </div>
              <Button variant="destructive" size="sm" className="text-xs sm:text-sm">Excluir</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;