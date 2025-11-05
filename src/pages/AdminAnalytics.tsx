import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, useParams } from 'react-router-dom'; // Import useParams
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, BookOpen, Video, TrendingUp, MessageCircle, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast'; // Import useToast
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'; // Import recharts components
import { format, subDays } from 'date-fns'; // Import date-fns utilities
import { ptBR } from 'date-fns/locale'; // Import locale for date-fns

interface AnalyticsStats {
  totalMembers: number;
  activeMembers: number;
  totalModules: number;
  totalLessons: number;
  avgLessonCompletionRate: number;
  totalCommunityPosts: number;
  totalCommunityComments: number;
}

interface DailyDataPoint {
  date: string;
  newMembers?: number;
  lessonCompletions?: number;
}

const AdminAnalytics = ({ memberAreaId: propMemberAreaId }: { memberAreaId?: string }) => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { memberAreaId: urlMemberAreaId } = useParams<{ memberAreaId: string }>();
  const currentMemberAreaId = propMemberAreaId || urlMemberAreaId;

  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [membersGrowthData, setMembersGrowthData] = useState<DailyDataPoint[]>([]);
  const [lessonCompletionsTrend, setLessonCompletionsTrend] = useState<DailyDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast(); // Initialize useToast

  const generateDailyData = (rawData: { created_at: string }[], days: number, key: string): DailyDataPoint[] => {
    const dataMap = new Map<string, number>();
    const today = new Date();

    // Initialize map with 0 for each of the last 'days' days
    for (let i = 0; i < days; i++) {
      const date = format(subDays(today, i), 'dd/MM', { locale: ptBR });
      dataMap.set(date, 0);
    }

    // Populate map with actual data
    rawData.forEach(item => {
      const date = format(new Date(item.created_at), 'dd/MM', { locale: ptBR });
      if (dataMap.has(date)) {
        dataMap.set(date, (dataMap.get(date) || 0) + 1);
      }
    });

    // Convert map to array of objects, sorted by date
    return Array.from(dataMap.entries())
      .map(([date, count]) => ({ date, [key]: count }))
      .sort((a, b) => {
        const [dayA, monthA] = a.date.split('/').map(Number);
        const [dayB, monthB] = b.date.split('/').map(Number);
        const dateObjA = new Date(today.getFullYear(), monthA - 1, dayA);
        const dateObjB = new Date(today.getFullYear(), monthB - 1, dayB);
        return dateObjA.getTime() - dateObjB.getTime();
      });
  };

  useEffect(() => {
    if (user && isAdmin && currentMemberAreaId) {
      fetchAnalytics();
    }
  }, [user, isAdmin, currentMemberAreaId]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Basic Stats
      // Total de Membros
      const { count: totalMembers } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('member_area_id', currentMemberAreaId);

      // Membros Ativos
      const { count: activeMembers } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active')
        .eq('member_area_id', currentMemberAreaId);

      // Total de Módulos
      const { count: totalModules } = await supabase
        .from('modules')
        .select('id', { count: 'exact', head: true })
        .eq('member_area_id', currentMemberAreaId);

      // Total de Aulas
      const { count: totalLessons } = await supabase
        .from('lessons')
        .select('id', { count: 'exact', head: true })
        .in('module_id', supabase.from('modules').select('id').eq('member_area_id', currentMemberAreaId));

      // Total de Posts da Comunidade
      const { count: totalCommunityPosts } = await supabase
        .from('community_posts')
        .select('id', { count: 'exact', head: true })
        .eq('member_area_id', currentMemberAreaId);

      // Total de Comentários
      const { count: totalCommunityComments } = await supabase
        .from('community_comments')
        .select('id', { count: 'exact', head: true })
        .in('post_id', supabase.from('community_posts').select('id').eq('member_area_id', currentMemberAreaId));

      // Taxa Média de Conclusão de Aulas (simplificado)
      const { count: totalCompletions } = await supabase
        .from('lesson_completions')
        .select('id', { count: 'exact', head: true })
        .in('lesson_id', supabase.from('lessons').select('id').in('module_id', supabase.from('modules').select('id').eq('member_area_id', currentMemberAreaId)));
      
      const avgLessonCompletionRate = (totalLessons && totalCompletions) ? (totalCompletions / (totalLessons * (totalMembers || 1))) * 100 : 0;

      setStats({
        totalMembers: totalMembers || 0,
        activeMembers: activeMembers || 0,
        totalModules: totalModules || 0,
        totalLessons: totalLessons || 0,
        avgLessonCompletionRate: parseFloat(avgLessonCompletionRate.toFixed(2)),
        totalCommunityPosts: totalCommunityPosts || 0,
        totalCommunityComments: totalCommunityComments || 0,
      });

      // Chart Data - Last 30 days
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

      // New Members Growth
      const { data: newMembersRawData, error: newMembersError } = await supabase
        .from('profiles')
        .select('created_at')
        .eq('member_area_id', currentMemberAreaId)
        .gte('created_at', thirtyDaysAgo);
      if (newMembersError) console.error('Error fetching new members data:', newMembersError);
      setMembersGrowthData(generateDailyData(newMembersRawData || [], 30, 'newMembers'));

      // Lesson Completions Trend
      const { data: lessonCompletionsRawData, error: lessonCompletionsError } = await supabase
        .from('lesson_completions')
        .select('created_at')
        .in('lesson_id', supabase.from('lessons').select('id').in('module_id', supabase.from('modules').select('id').eq('member_area_id', currentMemberAreaId)))
        .gte('created_at', thirtyDaysAgo);
      if (lessonCompletionsError) console.error('Error fetching lesson completions data:', lessonCompletionsError);
      setLessonCompletionsTrend(generateDailyData(lessonCompletionsRawData || [], 30, 'lessonCompletions'));

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

  if (!currentMemberAreaId) {
    return <p>Nenhuma área de membros selecionada.</p>;
  }

  if (!stats) return <p>Nenhum dado de analytics disponível.</p>;

  return (
    <div className="p-6">
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

      {/* Gráficos de engajamento */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Novos Membros (Últimos 30 dias)</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={membersGrowthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem' }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Line type="monotone" dataKey="newMembers" stroke="hsl(var(--primary))" activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conclusão de Aulas (Últimos 30 dias)</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lessonCompletionsTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem' }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Line type="monotone" dataKey="lessonCompletions" stroke="hsl(var(--secondary))" activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminAnalytics;