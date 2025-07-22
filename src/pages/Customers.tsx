import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Users, UserPlus, Mail, Phone, Trash2 } from 'lucide-react';
import { NewCustomerDialog } from '@/components/dialogs/NewCustomerDialog';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  cpf?: string;
  created_at: string;
  last_purchase?: string;
  total_spent: number;
  purchase_count: number;
  status: string;
}

const Customers = () => {
  const { user, loading, isAdmin } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const { toast } = useToast();
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    newThisMonth: 0
  });

  useEffect(() => {
    if (user && isAdmin) {
      loadCustomers();
    }
  }, [user, isAdmin]);

  const loadCustomers = async () => {
    try {
      setLoadingCustomers(true);
      
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar clientes:', error);
        return;
      }

      setCustomers(data || []);
      
      // Calcular estatísticas
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const total = data?.length || 0;
      const active = data?.filter(c => c.status === 'active').length || 0;
      const newThisMonth = data?.filter(c => new Date(c.created_at) >= startOfMonth).length || 0;
      
      setStats({ total, active, newThisMonth });
      
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const handleDeleteCustomer = async (customerId: string, customerName: string) => {
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId);

      if (error) {
        throw error;
      }

      toast({
        title: 'Cliente excluído',
        description: `${customerName} foi removido com sucesso.`,
      });

      // Recarregar a lista de clientes
      loadCustomers();
    } catch (error: any) {
      console.error('Erro ao excluir cliente:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao excluir cliente. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  if (loading || loadingCustomers) {
    return <div className="container mx-auto px-4 py-8">Carregando...</div>;
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }


  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">
            Gerencie seus clientes e relacionamentos
          </p>
        </div>
        <NewCustomerDialog onCustomerCreated={loadCustomers} />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Clientes
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              Total de clientes cadastrados
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Clientes Ativos
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
            <p className="text-xs text-muted-foreground">
              {((stats.active / Math.max(stats.total, 1)) * 100).toFixed(0)}% do total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Novos Este Mês
            </CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.newThisMonth}</div>
            <p className="text-xs text-muted-foreground">
              Novos clientes este mês
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Clientes</CardTitle>
          <CardDescription>
            Visualize e gerencie todos os seus clientes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {customers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum cliente encontrado</h3>
              <p className="text-muted-foreground">
                Os clientes aparecerão aqui quando realizarem compras
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {customers.map((customer) => (
                <div
                  key={customer.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <Avatar>
                      <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${customer.name}`} />
                      <AvatarFallback>
                        {customer.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <p className="font-medium">{customer.name}</p>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <Mail className="h-3 w-3" />
                          <span>{customer.email}</span>
                        </div>
                        {customer.phone && (
                          <div className="flex items-center space-x-1">
                            <Phone className="h-3 w-3" />
                            <span>{customer.phone}</span>
                          </div>
                        )}
                      </div>
                      {customer.last_purchase && (
                        <p className="text-xs text-muted-foreground">
                          Última compra: {formatDistanceToNow(new Date(customer.last_purchase), { 
                            addSuffix: true, 
                            locale: ptBR 
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right space-y-1">
                      <p className="text-sm font-medium">
                        R$ {(customer.total_spent / 100).toFixed(2).replace('.', ',')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {customer.purchase_count} compra{customer.purchase_count !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <Badge variant={customer.status === 'active' ? 'default' : 'secondary'}>
                      {customer.status === 'active' ? 'Ativo' : 'Inativo'}
                    </Badge>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir Cliente</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir <strong>{customer.name}</strong>? 
                            Esta ação não pode ser desfeita e todos os dados do cliente serão perdidos permanentemente.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDeleteCustomer(customer.id, customer.name)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Customers;