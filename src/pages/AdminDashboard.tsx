import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, ShoppingCart, Users, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const AdminDashboard = () => {
  const { user, isAdmin, loading } = useAuth();
  const [stats, setStats] = useState({
    totalRevenue: 0,
    approvedSales: 0,
    totalCustomers: 0,
    totalCheckouts: 0,
    recentSales: [] as any[],
    topProducts: [] as any[]
  });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (user && isAdmin) {
      loadDashboardStats();
    }
  }, [user, isAdmin]);

  const loadDashboardStats = async () => {
    try {
      setLoadingStats(true);

      // Buscar estatísticas de vendas
      const { data: salesData } = await supabase
        .from('sales')
        .select('*, customers(name, email)');

      // Buscar total de clientes
      const { data: customersData } = await supabase
        .from('customers')
        .select('id');

      // Buscar total de checkouts
      const { data: checkoutsData } = await supabase
        .from('checkouts')
        .select('id');

      const totalRevenue = salesData?.reduce((sum, sale) => sum + sale.amount, 0) || 0;
      const approvedSales = salesData?.filter(sale => sale.status === 'completed').length || 0;
      const totalCustomers = customersData?.length || 0;
      const totalCheckouts = checkoutsData?.length || 0;

      // Vendas recentes (últimas 5)
      const recentSales = salesData?.slice(0, 5) || [];

      // Produtos mais vendidos
      const productSales = salesData?.reduce((acc, sale) => {
        const productName = sale.product_name;
        if (!acc[productName]) {
          acc[productName] = { name: productName, count: 0, revenue: 0 };
        }
        acc[productName].count += 1;
        acc[productName].revenue += sale.amount;
        return acc;
      }, {} as Record<string, any>);

      const topProducts = Object.values(productSales || {})
        .sort((a: any, b: any) => b.count - a.count)
        .slice(0, 5);

      setStats({
        totalRevenue,
        approvedSales,
        totalCustomers,
        totalCheckouts,
        recentSales,
        topProducts
      });

    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  if (loading || loadingStats) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Dashboard Administrativo</h1>
        <p className="text-muted-foreground mt-2">
          Visão geral da sua plataforma Elyon
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faturamento Total</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">R$ {(stats.totalRevenue / 100).toFixed(2).replace('.', ',')}</div>
            <p className="text-xs text-muted-foreground">
              Total de vendas realizadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendas Aprovadas</CardTitle>
            <ShoppingCart className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-secondary">{stats.approvedSales}</div>
            <p className="text-xs text-muted-foreground">
              Vendas concluídas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Cadastrados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCustomers}</div>
            <p className="text-xs text-muted-foreground">
              Total de clientes cadastrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Checkouts Iniciados</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCheckouts}</div>
            <p className="text-xs text-muted-foreground">
              Checkouts criados
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Vendas Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentSales.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                Nenhuma venda registrada ainda
              </div>
            ) : (
              <div className="space-y-3">
                {stats.recentSales.map((sale) => (
                  <div key={sale.id} className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium">{sale.customers?.name || 'Cliente'}</p>
                      <p className="text-xs text-muted-foreground">{sale.product_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">R$ {(sale.amount / 100).toFixed(2).replace('.', ',')}</p>
                      <p className="text-xs text-muted-foreground">{sale.payment_method}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Produtos Mais Vendidos</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.topProducts.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                Nenhum produto vendido ainda
              </div>
            ) : (
              <div className="space-y-3">
                {stats.topProducts.map((product, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.count} vendas</p>
                    </div>
                    <p className="text-sm font-medium">R$ {(product.revenue / 100).toFixed(2).replace('.', ',')}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;