import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, BookOpen, Video, TrendingUp, MessageCircle, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AnalyticsStats {
  totalMembers: number;
  activeMembers: number;
  totalModules: number;
  totalLessons: number;
  avgLessonCompletionRate: number;
  totalCommunityPosts: number;
  totalCommunityComments: number;
}

const AdminAnalytics = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && isAdmin) {
      fetchAnalytics();
    }
  }, [user, isAdmin]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Total de Membros
      const { count: totalMembers } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true });

      // Membros Ativos
      const { count: activeMembers } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active');

      // Total de Módulos
      const { count: totalModules } = await supabase
        .from('modules')
        .select('id', { count: 'exact', head: true });

      // Total de Aulas
      const { count: totalLessons } = await supabase
        .from('lessons')
        .select('id', { count: 'exact', head: true });

      // Total de Posts da Comunidade
      const { count: totalCommunityPosts } = await supabase
        .from('community_posts')
        .select('id', { count: 'exact', head: true });

      // Total de Comentários
      const { count: totalCommunityComments } = await supabase
        .from('community_comments')
        .select('id', { count: 'exact', head: true });

      // Taxa Média de Conclusão de Aulas (simplificado para esta versão inicial)
      // Para uma taxa real, precisaríamos de mais dados de engajamento por aula/membro.
      // Por enquanto, um placeholder ou cálculo básico.
      const { data: completionsData, count: totalCompletions } = await supabase
        .from('lesson_completions')
        .select('id', { count: 'exact', head: true });
      
      const avgLessonCompletionRate = totalLessons && totalCompletions ? (totalCompletions / (totalLessons * (totalMembers || 1))) * 100 : 0;


      setStats({
        totalMembers: totalMembers || 0,
        activeMembers: activeMembers || 0,
        totalModules: totalModules || 0,
        totalLessons: totalLessons || 0,
        avgLessonCompletionRate: parseFloat(avgLessonCompletionRate.toFixed(2)),
        totalCommunityPosts: totalCommunityPosts || 0,
        totalCommunityComments: totalCommunityComments || 0,
      });

    } catch (error) {
      console.error('Erro ao carregar analytics:', error);
      toast({ title: "Erro", description: "Falha ao carregar dados de analytics.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  if (!user || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (!stats) return <p>Nenhum dado de analytics disponível.</p>;

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Analytics da Área de Membros</h1>
        <p className="text-muted-foreground mt-2">
          Acompanhe o engajamento e o crescimento da sua plataforma
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Membros</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMembers}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeMembers} ativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Módulos</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalModules}</div>
            <p className="text-xs text-muted-foreground">
              Conteúdo organizado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Aulas</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLessons}</div>
            <p className="text-xs text-muted-foreground">
              Aulas disponíveis
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conclusão de Aulas</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgLessonCompletionRate}%</div>
            <p className="text-xs text-muted-foreground">
              Taxa média de conclusão
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Posts da Comunidade</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCommunityPosts}</div>
            <p className="text-xs text-muted-foreground">
              Total de publicações
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comentários</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCommunityComments}</div>
            <p className="text-xs text-muted-foreground">
              Total de interações
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos de engajamento (placeholder) */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo Visual de Engajamento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            Gráficos de engajamento virão aqui (ex: Recharts)
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAnalytics;