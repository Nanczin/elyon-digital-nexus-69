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
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const location = useLocation();

  const [memberArea, setMemberArea] = useState<MemberArea | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Determine the active tab based on the URL pathname
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
    if (!memberAreaId || !user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('member_areas')
      .select('*')
      .eq('id', memberAreaId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      toast({ title: "Erro", description: "Falha ao carregar detalhes da área de membros.", variant: "destructive" });
      console.error(error);
      setMemberArea(null);
    } else {
      setMemberArea(data);
    }
    setLoading(false);
  }, [memberAreaId, user?.id, toast]);

  useEffect(() => {
    fetchMemberArea();
  }, [fetchMemberArea]);

  if (authLoading || loading) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  if (!user || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (!memberArea) {
    return (
      <div className="container mx-auto p-4 sm:p-6 text-center"> {/* Ajustado padding */}
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-3 sm:mb-4">Área de Membros não encontrada</h1> {/* Ajustado text size */}
        <p className="text-muted-foreground mb-4 sm:mb-6 text-sm sm:text-base"> {/* Ajustado text size */}
          A área de membros que você tentou acessar não existe ou você não tem permissão.
        </p>
        <Button asChild className="text-sm sm:text-base"> {/* Ajustado text size */}
          <Link to="/admin/member-areas">
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Minhas Áreas
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6"> {/* Ajustado padding */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-3 sm:gap-0"> {/* Ajustado flex e gap */}
        <div>
          <Button variant="ghost" asChild className="mb-2 -ml-2 text-sm sm:text-base"> {/* Ajustado text size */}
            <Link to="/admin/member-areas">
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Áreas de Membros
            </Link>
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3"> {/* Ajustado flex e text size */}
            {memberArea.logo_url && (
              <img src={memberArea.logo_url} alt={memberArea.name} className="h-8 w-8 sm:h-10 sm:w-10 object-contain rounded-md" /> 
            )}
            {memberArea.name}
            <Badge variant="secondary" className="text-xs sm:text-sm"> {/* Ajustado text size */}
              <MonitorDot className="h-3 w-3 mr-1" /> {memberArea.slug}
            </Badge>
          </h1>
          <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base"> {/* Ajustado text size */}
            Gerencie todos os aspectos da sua área de membros: conteúdo, membros, design e mais.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 h-auto p-1"> {/* Ajustado grid-cols e padding */}
          <TabsTrigger value="content" asChild className="text-xs sm:text-sm py-2"> {/* Ajustado text size e padding */}
            <Link to={`/admin/member-areas/${memberAreaId}/content`}>
              <BookOpen className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" /> Conteúdo
            </Link>
          </TabsTrigger>
          <TabsTrigger value="products" asChild className="text-xs sm:text-sm py-2"> {/* Ajustado text size e padding */}
            <Link to={`/admin/member-areas/${memberAreaId}/products`}>
              <Package className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" /> Produtos
            </Link>
          </TabsTrigger>
          <TabsTrigger value="members" asChild className="text-xs sm:text-sm py-2"> {/* Ajustado text size e padding */}
            <Link to={`/admin/member-areas/${memberAreaId}/members`}>
              <UserSquare className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" /> Membros
            </Link>
          </TabsTrigger>
          <TabsTrigger value="design" asChild className="text-xs sm:text-sm py-2"> {/* Ajustado text size e padding */}
            <Link to={`/admin/member-areas/${memberAreaId}/design`}>
              <Palette className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" /> Design
            </Link>
          </TabsTrigger>
          <TabsTrigger value="analytics" asChild className="text-xs sm:text-sm py-2"> {/* Ajustado text size e padding */}
            <Link to={`/admin/member-areas/${memberAreaId}/analytics`}>
              <BarChart2 className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" /> Analytics
            </Link>
          </TabsTrigger>
          <TabsTrigger value="community" asChild className="text-xs sm:text-sm py-2"> {/* Ajustado text size e padding */}
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