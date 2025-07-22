import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Download, Calendar, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface SaleReport {
  id: string;
  created_at: string;
  product_name: string;
  amount: number;
  net_amount: number;
  commission_amount: number;
  payment_method: string;
  status: string;
  order_bumps: any;
  customers?: {
    name: string;
    email: string;
    phone?: string;
    cpf?: string;
  };
}

const Reports = () => {
  const { user, loading, isAdmin } = useAuth();
  const [sales, setSales] = useState<SaleReport[]>([]);
  const [loadingSales, setLoadingSales] = useState(true);
  const [dateRange, setDateRange] = useState('all');
  const { toast } = useToast();

  useEffect(() => {
    if (user && isAdmin) {
      loadSalesReport();
    }
  }, [user, isAdmin, dateRange]);

  const loadSalesReport = async () => {
    try {
      setLoadingSales(true);
      
      let query = supabase
        .from('sales')
        .select(`
          *,
          customers (
            name,
            email,
            phone,
            cpf
          )
        `)
        .order('created_at', { ascending: false });

      // Filtrar por data se necessário
      if (dateRange !== 'all') {
        const now = new Date();
        let startDate = new Date();
        
        switch (dateRange) {
          case '7days':
            startDate.setDate(now.getDate() - 7);
            break;
          case '30days':
            startDate.setDate(now.getDate() - 30);
            break;
          case '90days':
            startDate.setDate(now.getDate() - 90);
            break;
        }
        
        query = query.gte('created_at', startDate.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao carregar relatório:', error);
        toast({
          title: 'Erro',
          description: 'Erro ao carregar relatório. Tente novamente.',
          variant: 'destructive',
        });
        return;
      }

      setSales(data || []);
      
    } catch (error) {
      console.error('Erro ao carregar relatório:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar relatório. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoadingSales(false);
    }
  };

  const exportToCSV = () => {
    if (sales.length === 0) {
      toast({
        title: 'Aviso',
        description: 'Não há dados para exportar.',
        variant: 'destructive',
      });
      return;
    }

    const headers = [
      'Data',
      'Cliente',
      'Email',
      'Produto',
      'Valor Bruto',
      'Comissão',
      'Valor Líquido',
      'Método Pagamento',
      'Status'
    ];

    const csvData = sales.map(sale => [
      new Date(sale.created_at).toLocaleDateString('pt-BR'),
      sale.customers?.name || 'N/A',
      sale.customers?.email || 'N/A',
      sale.product_name,
      `R$ ${(sale.amount / 100).toFixed(2).replace('.', ',')}`,
      `R$ ${(sale.commission_amount / 100).toFixed(2).replace('.', ',')}`,
      `R$ ${(sale.net_amount / 100).toFixed(2).replace('.', ',')}`,
      sale.payment_method,
      sale.status === 'completed' ? 'Concluída' : 'Pendente'
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_vendas_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Sucesso',
      description: 'Relatório exportado com sucesso!',
    });
  };

  if (loading || loadingSales) {
    return <div className="container mx-auto px-4 py-8">Carregando...</div>;
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const totalRevenue = sales.reduce((sum, sale) => sum + sale.amount, 0);
  const totalCommission = sales.reduce((sum, sale) => sum + sale.commission_amount, 0);
  const totalNet = sales.reduce((sum, sale) => sum + sale.net_amount, 0);

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Relatórios de Vendas</h1>
          <p className="text-muted-foreground">
            Análise detalhada das vendas e faturamento
          </p>
        </div>
        <div className="flex gap-4">
          <select 
            value={dateRange} 
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="all">Todas as vendas</option>
            <option value="7days">Últimos 7 dias</option>
            <option value="30days">Últimos 30 dias</option>
            <option value="90days">Últimos 90 dias</option>
          </select>
          <Button onClick={exportToCSV} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Vendas</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sales.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Bruta</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {(totalRevenue / 100).toFixed(2).replace('.', ',')}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comissões</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {(totalCommission / 100).toFixed(2).replace('.', ',')}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Líquida</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">R$ {(totalNet / 100).toFixed(2).replace('.', ',')}</div>
          </CardContent>
        </Card>
      </div>

      {/* Sales Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detalhamento das Vendas</CardTitle>
          <CardDescription>
            Lista completa de todas as vendas realizadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sales.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma venda encontrada</h3>
              <p className="text-muted-foreground">
                Não há vendas para o período selecionado
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Valor Bruto</TableHead>
                    <TableHead>Comissão</TableHead>
                    <TableHead>Valor Líquido</TableHead>
                    <TableHead>Pagamento</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">
                            {new Date(sale.created_at).toLocaleDateString('pt-BR')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(sale.created_at), { 
                              addSuffix: true, 
                              locale: ptBR 
                            })}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">{sale.customers?.name || 'N/A'}</p>
                          <p className="text-xs text-muted-foreground">{sale.customers?.email || 'N/A'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">{sale.product_name}</p>
                          {sale.order_bumps && Array.isArray(sale.order_bumps) && sale.order_bumps.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              +{sale.order_bumps.length} order bump(s)
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">
                          R$ {(sale.amount / 100).toFixed(2).replace('.', ',')}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-red-600">
                          R$ {(sale.commission_amount / 100).toFixed(2).replace('.', ',')}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium text-green-600">
                          R$ {(sale.net_amount / 100).toFixed(2).replace('.', ',')}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{sale.payment_method}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant={sale.status === 'completed' ? 'default' : 'secondary'}>
                          {sale.status === 'completed' ? 'Concluída' : 'Pendente'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;