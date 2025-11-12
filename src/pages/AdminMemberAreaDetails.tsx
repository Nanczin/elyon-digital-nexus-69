import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { MonitorDot, LayoutDashboard, BookOpen, UserSquare, Palette, BarChart2, MessageSquare, ArrowLeft, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import AdminContent from './AdminContent';
import AdminMembers from './AdminMembers';
import AdminDesign from './AdminDesign';
import AdminAnalytics from './AdminAnalytics';
import AdminCommunity from './AdminCommunity';
import ProductsAssociation from '@/components/member-area/ProductsAssociation';
import { Tables } from '@/integrations/supabase/types';

type MemberArea = Tables<'member_areas'>;

const AdminMemberAreaDetails = () => {
  const { memberAreaId } = useParams<{ memberAreaId: string }>();
  const { user, loading: authLoading } = useAuth(); // Removido isAdmin
  const { toast } = useToast();
  const location = useLocation();

  const [memberArea, setMemberArea] = useState<MemberArea | null>(null);
  const [loadingMemberArea, setLoadingMemberArea] = useState(true); // Renamed from loadingPage for clarity
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    if (location.pathname.includes('/content')) {
      setActiveTab('content');
    } else if (location.pathname.includes('/products')) {
      setActiveTab('products');
    } else if (location.pathname.includes('/members')) {
      setActiveTab('members');
    } else if (location.pathname.includes('/design')) {
      setActiveTab('design');
    } else if (location.pathname.includes('/analytics')) {
      setActiveTab('analytics');
    } else if (location.pathname.includes('/community')) {
      setActiveTab('community');
    } else {
      setActiveTab('dashboard');
    }
  }, [location.pathname]);

  const fetchMemberArea = useCallback(async () => {
    console.log('ADMIN_MEMBER_AREA_DETAILS_DEBUG: fetchMemberArea started for ID:', memberAreaId);
    if (!memberAreaId || !user?.id) {
      setLoadingMemberArea(false);
      console.log('ADMIN_MEMBER_AREA_DETAILS_DEBUG: fetchMemberArea skipped, missing ID or user.');
      return;
    }
    setLoadingMemberArea(true); // Use loadingMemberArea
    try {
      const { data, error } = await supabase
        .from('member_areas')
        .select('*')
        .eq('id', memberAreaId)
        .eq('user_id', user.id) // Ainda mantém a verificação de propriedade do usuário
        .maybeSingle();

      if (error) throw error;
      setMemberArea(data);
      console.log('ADMIN_MEMBER_AREA_DETAILS_DEBUG: fetchMemberArea completed successfully.');
    } catch (error: any) {
      console.error('ADMIN_MEMBER_AREA_DETAILS_DEBUG: Falha ao carregar detalhes da área de membros:', error);
      toast({ title: "Erro", description: error.message || "Falha ao carregar detalhes da área de membros.", variant: "destructive" });
      setMemberArea(null);
    } finally {
      setLoadingMemberArea(false); // Use loadingMemberArea
      console.log('ADMIN_MEMBER_AREA_DETAILS_DEBUG: setLoadingMemberArea(false) called.');
    }
  }, [memberAreaId, user?.id, toast]);

  useEffect(() => {
    // Não esperar por authLoading aqui, o redirecionamento será tratado abaixo
    fetchMemberArea();
  }, [user, fetchMemberArea]); // Removido isAdmin das dependências

  // Removido: if (authLoading) { ... }

  if (!user) {
    console.log('ADMIN_MEMBER_AREA_DETAILS_DEBUG: Redirecting to login because no user.');
    return <Navigate to="/auth/login" replace />;
  }

  // REMOVIDO: if (!isAdmin) { ... }

  if (loadingMemberArea) { // Show loading for member area details only after auth is done
    return <div className="flex items-center justify-center min-h-screen">Carregando detalhes da área de membros...</div>;
  }

  if (!memberArea) {
    console.log('ADMIN_MEMBER_AREA_DETAILS_DEBUG: Member area not found, showing error message.');
    return (
      <div className="container mx-auto p-4 sm:p-6 text-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-3 sm:mb-4">Área de Membros não encontrada</h1>
        <p className="text-muted-foreground mb-4 sm:mb-6 text-sm sm:text-base">
          A área de membros que você tentou acessar não existe ou você não tem permissão.
        </p>
        <Button asChild className="text-sm sm:text-base">
          <Link to="/admin/member-areas">
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Minhas Áreas
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-3 sm:gap-0">
        <div>
          <Button variant="ghost" asChild className="mb-2 -ml-2 text-sm sm:text-base">
            <Link to="/admin/member-areas">
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Áreas de Membros
            </Link>
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
            {memberArea.logo_url && (
              <img src={memberArea.logo_url} alt={memberArea.name} className="h-8 w-8 sm:h-10 sm:w-10 object-contain rounded-md" /> 
            )}
            {memberArea.name}
            <Badge variant="secondary" className="text-xs sm:text-sm">
              <MonitorDot className="h-3 w-3 mr-1" /> {memberArea.slug}
            </Badge>
          </h1>
          <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">
            Gerencie todos os aspectos da sua área de membros: conteúdo, membros, design e mais.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 h-auto p-1">
          <TabsTrigger value="content" asChild className="text-xs sm:text-sm py-2">
            <Link to={`/admin/member-areas/${memberAreaId}/content`}>
              <BookOpen className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" /> Conteúdo
            </Link>
          </TabsTrigger>
          <TabsTrigger value="products" asChild className="text-xs sm:text-sm py-2">
            <Link to={`/admin/member-areas/${memberAreaId}/products`}>
              <Package className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" /> Produtos
            </Link>
          </TabsTrigger>
          <TabsTrigger value="members" asChild className="text-xs sm:text-sm py-2">
            <Link to={`/admin/member-areas/${memberAreaId}/members`}>
              <UserSquare className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" /> Membros
            </Link>
          </TabsTrigger>
          <TabsTrigger value="design" asChild className="text-xs sm:text-sm py-2">
            <Link to={`/admin/member-areas/${memberAreaId}/design`}>
              <Palette className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" /> Design
            </Link>
          </TabsTrigger>
          <TabsTrigger value="analytics" asChild className="text-xs sm:text-sm py-2">
            <Link to={`/admin/member-areas/${memberAreaId}/analytics`}>
              <BarChart2 className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" /> Analytics
            </Link>
          </TabsTrigger>
          <TabsTrigger value="community" asChild className="text-xs sm:text-sm py-2">
            <Link to={`/admin/member-areas/${memberAreaId}/community`}>
              <MessageSquare className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" /> Comunidade
            </Link>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="mt-6">
          <AdminContent memberAreaId={memberAreaId} />
        </TabsContent>
        <TabsContent value="products" className="mt-6">
          <ProductsAssociation memberAreaId={memberAreaId!} />
        </TabsContent>
        <TabsContent value="members" className="mt-6">
          <AdminMembers memberAreaId={memberAreaId} />
        </TabsContent>
        <TabsContent value="design" className="mt-6">
          <AdminDesign memberAreaId={memberAreaId} />
        </TabsContent>
        <TabsContent value="analytics" className="mt-6">
          <AdminAnalytics memberAreaId={memberAreaId} />
        </TabsContent>
        <TabsContent value="community" className="mt-6">
          <AdminCommunity memberAreaId={memberAreaId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminMemberAreaDetails;