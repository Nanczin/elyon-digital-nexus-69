import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, BookOpen, Video, TrendingUp, MessageCircle, BarChart3, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Tables } from '@/integrations/supabase/types'; // Import Tables

interface AnalyticsStats {
  totalMembers: number;
  activeMembers: number;
  totalModules: number;
  publishedModules: number;
  totalLessons: number;
  publishedLessons: number;
  avgLessonsPerModule: number;
  avgLessonCompletionRate: number;
  totalCommunityComments: number;
  avgCommentsPerLesson: number;
}

interface DailyDataPoint {
  date: string;
  newMembers?: number;
  lessonCompletions?: number;
}

const AdminAnalytics = ({ memberAreaId: propMemberAreaId }: { memberAreaId?: string }) => {
  const { user, loading: authLoading } = useAuth(); // Removido isAdmin
  const { memberAreaId: urlMemberAreaId } = useParams<{ memberAreaId: string }>();
  const currentMemberAreaId = propMemberAreaId || urlMemberAreaId;

  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [membersGrowthData, setMembersGrowthData] = useState<DailyDataPoint[]>([]);
  const [lessonCompletionsTrend, setLessonCompletionsTrend] = useState<DailyDataPoint[]>([]);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true); // Renamed from loadingPage for clarity
  const { toast } = useToast();

  const generateDailyData = (rawData: { created_at: string }[], days: number, key: string): DailyDataPoint[] => {
    const dataMap = new Map<string, number>();
    const today = new Date();

    for (let i = 0; i < days; i++) {
      const date = format(subDays(today, i), 'dd/MM', { locale: ptBR });
      dataMap.set(date, 0);
    }

    rawData.forEach(item => {
      const date = format(new Date(item.created_at), 'dd/MM', { locale: ptBR });
      if (dataMap.has(date)) {
        dataMap.set(date, (dataMap.get(date) || 0) + 1);
      }
    });

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
    console.log('ADMIN_ANALYTICS_DEBUG: useEffect triggered. user:', user?.id, 'authLoading:', authLoading, 'currentMemberAreaId:', currentMemberAreaId);
    // Não esperar por authLoading aqui, o redirecionamento será tratado abaixo
    if (user && currentMemberAreaId) { 
      fetchAnalytics();
    } else if (!user) {
      console.log('ADMIN_ANALYTICS_DEBUG: Not authenticated, redirecting.');
    } else if (!currentMemberAreaId) {
      setLoadingAnalytics(false); // If no memberAreaId, stop loading and show message
    }
  }, [user, currentMemberAreaId]); 

  const fetchAnalytics = async () => {
    console.log('ADMIN_ANALYTICS_DEBUG: fetchAnalytics started for ID:', currentMemberAreaId);
    try {
      setLoadingAnalytics(true); 
      
      // Fetch modules to get module_ids for filtering lessons and comments
      console.log('ADMIN_ANALYTICS_DEBUG: Fetching modules for memberAreaId:', currentMemberAreaId);
      const { data: modulesData, error: modulesError } = await supabase
        .from('modules')
        .select('id')
        .eq('member_area_id', currentMemberAreaId);
      if (modulesError) {
        console.error('ADMIN_ANALYTICS_DEBUG: Error fetching modules:', modulesError);
        throw modulesError;
      }
      const moduleIds = modulesData.map(m => m.id);
      console.log('ADMIN_ANALYTICS_DEBUG: Fetched modulesData:', modulesData);
      console.log('ADMIN_ANALYTICS_DEBUG: Derived moduleIds:', moduleIds);

      // Fetch lessons to get lesson_ids for filtering completions and comments
      console.log('ADMIN_ANALYTICS_DEBUG: Fetching lessons for moduleIds:', moduleIds);
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select('id')
        .in('module_id', moduleIds.length > 0 ? moduleIds : ['00000000-0000-0000-0000-000000000000']); // Use a dummy non-existent ID if moduleIds is empty
      if (lessonsError) {
        console.error('ADMIN_ANALYTICS_DEBUG: Error fetching lessons:', lessonsError);
        throw lessonsError;
      }
      const lessonIds = lessonsData.map(l => l.id);
      console.log('ADMIN_ANALYTICS_DEBUG: Fetched lessonsData:', lessonsData);
      console.log('ADMIN_ANALYTICS_DEBUG: Derived lessonIds:', lessonIds);

      // Total Members
      const { count: totalMembers, error: totalMembersError } = await supabase
        .from('profiles')
        .select('user_id', { count: 'exact', head: true }) // Alterado de 'id' para 'user_id'
        .eq('member_area_id', currentMemberAreaId);
      const fetchedTotalMembers = totalMembers || 0; // Ensure it's a number
      console.log('ADMIN_ANALYTICS_DEBUG: fetchedTotalMembers:', fetchedTotalMembers, 'Error:', totalMembersError);
      if (totalMembersError) throw totalMembersError;

      // Active Members
      const { count: activeMembers, error: activeMembersError } = await supabase
        .from('profiles')
        .select('user_id', { count: 'exact', head: true }) // Alterado de 'id' para 'user_id'
        .eq('status', 'active')
        .eq('member_area_id', currentMemberAreaId);
      const fetchedActiveMembers = activeMembers || 0; // Ensure it's a number
      console.log('ADMIN_ANALYTICS_DEBUG: fetchedActiveMembers:', fetchedActiveMembers, 'Error:', activeMembersError);
      if (activeMembersError) throw activeMembersError;

      // Total Modules
      const { count: totalModules, error: totalModulesError } = await supabase
        .from('modules')
        .select('id', { count: 'exact', head: true })
        .eq('member_area_id', currentMemberAreaId);
      const fetchedTotalModules = totalModules || 0; // Ensure it's a number
      console.log('ADMIN_ANALYTICS_DEBUG: fetchedTotalModules:', fetchedTotalModules, 'Error:', totalModulesError);
      if (totalModulesError) throw totalModulesError;

      // Published Modules
      const { count: publishedModules, error: publishedModulesError } = await supabase
        .from('modules')
        .select('id', { count: 'exact', head: true })
        .eq('member_area_id', currentMemberAreaId)
        .eq('status', 'published');
      const fetchedPublishedModules = publishedModules || 0; // Ensure it's a number
      console.log('ADMIN_ANALYTICS_DEBUG: fetchedPublishedModules:', fetchedPublishedModules, 'Error:', publishedModulesError);
      if (publishedModulesError) throw publishedModulesError;

      // Total Lessons
      const { count: totalLessons, error: totalLessonsError } = await supabase
        .from('lessons')
        .select('id', { count: 'exact', head: true })
        .in('module_id', moduleIds.length > 0 ? moduleIds : ['00000000-0000-0000-0000-000000000000']);
      const fetchedTotalLessons = totalLessons || 0; // Ensure it's a number
      console.log('ADMIN_ANALYTICS_DEBUG: fetchedTotalLessons:', fetchedTotalLessons, 'Error:', totalLessonsError);
      if (totalLessonsError) throw totalLessonsError;

      // Published Lessons
      const { count: publishedLessons, error: publishedLessonsError } = await supabase
        .from('lessons')
        .select('id', { count: 'exact', head: true })
        .in('module_id', moduleIds.length > 0 ? moduleIds : ['00000000-0000-0000-0000-000000000000'])
        .eq('status', 'published');
      const fetchedPublishedLessons = publishedLessons || 0; // Ensure it's a number
      console.log('ADMIN_ANALYTICS_DEBUG: fetchedPublishedLessons:', fetchedPublishedLessons, 'Error:', publishedLessonsError);
      if (publishedLessonsError) throw publishedLessonsError;

      // Total Community Comments
      const { count: totalCommunityComments, error: totalCommunityCommentsError } = await supabase
        .from('lesson_comments')
        .select('id', { count: 'exact', head: true })
        .in('lesson_id', lessonIds.length > 0 ? lessonIds : ['00000000-0000-0000-0000-000000000000']);
      const fetchedTotalCommunityComments = totalCommunityComments || 0; // Ensure it's a number
      console.log('ADMIN_ANALYTICS_DEBUG: fetchedTotalCommunityComments:', fetchedTotalCommunityComments, 'Error:', totalCommunityCommentsError);
      if (totalCommunityCommentsError) throw totalCommunityCommentsError;

      // Total Lesson Completions
      const { count: totalCompletions, error: totalCompletionsError } = await supabase
        .from('lesson_completions')
        .select('id', { count: 'exact', head: true })
        .in('lesson_id', lessonIds.length > 0 ? lessonIds : ['00000000-0000-0000-0000-000000000000']);
      const fetchedTotalCompletions = totalCompletions || 0; // Ensure it's a number
      console.log('ADMIN_ANALYTICS_DEBUG: fetchedTotalCompletions:', fetchedTotalCompletions, 'Error:', totalCompletionsError);
      if (totalCompletionsError) throw totalCompletionsError;
      
      // Calculate average lesson completion rate
      const avgLessonCompletionRate = (fetchedTotalLessons > 0 && fetchedTotalMembers > 0) 
        ? (fetchedTotalCompletions / (fetchedTotalLessons * fetchedTotalMembers)) * 100 
        : 0;

      // Calculate average lessons per module
      const avgLessonsPerModule = (fetchedTotalModules > 0) 
        ? (fetchedTotalLessons / fetchedTotalModules) 
        : 0;

      // Calculate average comments per lesson
      const avgCommentsPerLesson = (fetchedTotalLessons > 0) 
        ? (fetchedTotalCommunityComments / fetchedTotalLessons) 
        : 0;


      setStats({
        totalMembers: fetchedTotalMembers,
        activeMembers: fetchedActiveMembers,
        totalModules: fetchedTotalModules,
        publishedModules: fetchedPublishedModules,
        totalLessons: fetchedTotalLessons,
        publishedLessons: fetchedPublishedLessons,
        avgLessonsPerModule: parseFloat(avgLessonsPerModule.toFixed(2)),
        avgLessonCompletionRate: parseFloat(avgLessonCompletionRate.toFixed(2)),
        totalCommunityComments: fetchedTotalCommunityComments,
        avgCommentsPerLesson: parseFloat(avgCommentsPerLesson.toFixed(2)),
      });

      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

      // Fetch new members data for chart
      console.log('ADMIN_ANALYTICS_DEBUG: Fetching new members data for chart.');
      const { data: newMembersRawData, error: newMembersError } = await supabase
        .from('profiles')
        .select('created_at')
        .eq('member_area_id', currentMemberAreaId)
        .gte('created_at', thirtyDaysAgo);
      if (newMembersError) console.error('ADMIN_ANALYTICS_DEBUG: Error fetching new members data:', newMembersError);
      console.log('ADMIN_ANALYTICS_DEBUG: newMembersRawData:', newMembersRawData);
      setMembersGrowthData(generateDailyData(newMembersRawData || [], 30, 'newMembers'));

      // Fetch lesson completions data for chart
      console.log('ADMIN_ANALYTICS_DEBUG: Fetching lesson completions data for chart.');
      const { data: lessonCompletionsRawData, error: lessonCompletionsError } = await supabase
        .from('lesson_completions')
        .select('created_at')
        .in('lesson_id', lessonIds.length > 0 ? lessonIds : ['00000000-0000-0000-0000-000000000000']) // Use a dummy non-existent ID if lessonIds is empty
        .gte('created_at', thirtyDaysAgo);
      if (lessonCompletionsError) console.error('ADMIN_ANALYTICS_DEBUG: Error fetching lesson completions data:', lessonCompletionsError);
      console.log('ADMIN_ANALYTICS_DEBUG: lessonCompletionsRawData:', lessonCompletionsRawData);
      setLessonCompletionsTrend(generateDailyData(lessonCompletionsRawData || [], 30, 'lessonCompletions'));
      console.log('ADMIN_ANALYTICS_DEBUG: fetchAnalytics completed successfully.');

    } catch (error: any) {
      console.error('ADMIN_ANALYTICS_DEBUG: Erro ao carregar analytics:', error);
      toast({ title: "Erro", description: error.message || "Falha ao carregar dados de analytics.", variant: "destructive" });
    } finally {
      setLoadingAnalytics(false); // Use loadingAnalytics
      console.log('ADMIN_ANALYTICS_DEBUG: setLoadingAnalytics(false) called.');
    }
  };

  // Removido: if (authLoading) { ... }

  if (!user) {
    console.log('ADMIN_ANALYTICS_DEBUG: Redirecting to login because no user.');
    return <Navigate to="/auth/login" replace />;
  }

  // REMOVIDO: if (!isAdmin) { ... }

  if (loadingAnalytics) { // Show loading for analytics only after auth is done
    return <div className="flex items-center justify-center min-h-screen">Carregando dados de analytics...</div>;
  }

  if (!currentMemberAreaId) {
    console.log('ADMIN_ANALYTICS_DEBUG: No memberAreaId, showing message.');
    return <p>Nenhuma área de membros selecionada.</p>;
  }

  if (!stats) return <p>Nenhum dado de analytics disponível.</p>;

  return (
    <div className="p-4 sm:p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Membros</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{stats.totalMembers}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeMembers} ativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Membros Ativos</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{stats.activeMembers}</div>
            <p className="text-xs text-muted-foreground">
              Membros com status 'ativo'
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Módulos</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{stats.totalModules}</div>
            <p className="text-xs text-muted-foreground">
              Módulos criados (rascunho + publicado)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Módulos Publicados</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{stats.publishedModules}</div>
            <p className="text-xs text-muted-foreground">
              Módulos visíveis para membros
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Aulas</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{stats.totalLessons}</div>
            <p className="text-xs text-muted-foreground">
              Aulas criadas (rascunho + publicado)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aulas Publicadas</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{stats.publishedLessons}</div>
            <p className="text-xs text-muted-foreground">
              Aulas visíveis para membros
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Média de Aulas/Módulo</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{stats.avgLessonsPerModule}</div>
            <p className="text-xs text-muted-foreground">
              Aulas por módulo em média
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conclusão de Aulas</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{stats.avgLessonCompletionRate}%</div>
            <p className="text-xs text-muted-foreground">
              Taxa média de conclusão
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comentários da Comunidade</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{stats.totalCommunityComments}</div>
            <p className="text-xs text-muted-foreground">
              Total de comentários em aulas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Média de Comentários/Aula</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{stats.avgCommentsPerLesson}</div>
            <p className="text-xs text-muted-foreground">
              Comentários por aula em média
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Novos Membros (Últimos 30 dias)</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={membersGrowthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" tickFormatter={(value) => window.innerWidth < 768 ? value.split('/')[0] : value} />
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
            <CardTitle className="text-lg sm:text-xl">Conclusão de Aulas (Últimos 30 dias)</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lessonCompletionsTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" tickFormatter={(value) => window.innerWidth < 768 ? value.split('/')[0] : value} />
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