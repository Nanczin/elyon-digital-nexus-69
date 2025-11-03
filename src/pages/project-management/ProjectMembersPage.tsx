import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Users, UserPlus, Mail, Calendar, BookOpen, CheckCircle, XCircle, Trash2, MoreVertical, Settings, Palette, BarChart3, MessageSquare } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { NewMemberDialog } from '@/components/elyon-builder/NewMemberDialog';
import { ManageMemberAccessDialog } from '@/components/elyon-builder/ManageMemberAccessDialog';
import { Switch } from '@/components/ui/switch';

interface Project {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
}

interface Member {
  id: string; // project_member_id
  user_id: string;
  role: string;
  status: string;
  created_at: string;
  profiles: {
    name: string;
    email: string;
  } | null;
  product_access: {
    product_id: string;
    products: {
      name: string;
    } | null;
  }[];
  last_purchase_date: string | null; // Data da última compra de um produto do projeto
}

const ProjectMembersPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingProject, setLoadingProject] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [isNewMemberDialogOpen, setIsNewMemberDialogOpen] = useState(false);
  const [isManageAccessDialogOpen, setIsManageAccessDialogOpen] = useState(false);
  const [selectedMemberForAccess, setSelectedMemberForAccess] = useState<Member | null>(null);

  useEffect(() => {
    const fetchProjectDetails = async () => {
      if (!projectId) return;
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('id, name, logo_url, primary_color, secondary_color')
          .eq('id', projectId)
          .single();

        if (error) throw error;
        setProject(data);
      } catch (error: any) {
        console.error('Erro ao carregar detalhes do projeto:', error);
        toast({
          title: "Erro",
          description: error.message || "Não foi possível carregar os detalhes do projeto.",
          variant: "destructive",
        });
        navigate('/admin/elyon-builder');
      } finally {
        setLoadingProject(false);
      }
    };

    fetchProjectDetails();
  }, [projectId, navigate, toast]);

  const fetchMembers = async () => {
    if (!projectId) return;
    setLoadingMembers(true);
    try {
      const { data, error } = await supabase
        .from('project_members')
        .select(`
          id,
          user_id,
          role,
          status,
          created_at,
          profiles (name, email),
          product_access (
            product_id,
            products (name)
          )
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Para cada membro, buscar a data da última compra de um produto do projeto
      const membersWithPurchaseDates = await Promise.all((data || []).map(async (member: any) => {
        const { data: purchaseData, error: purchaseError } = await supabase
          .from('product_purchases')
          .select('created_at')
          .eq('user_id', member.user_id)
          .in('product_id', member.product_access.map((pa: any) => pa.product_id)) // Apenas produtos que o membro tem acesso
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (purchaseError) {
          console.error(`Erro ao buscar data da última compra para o membro ${member.user_id}:`, purchaseError.message);
        }

        return {
          ...member,
          last_purchase_date: purchaseData?.created_at || null,
        };
      }));

      setMembers(membersWithPurchaseDates as Member[]);
    } catch (error: any) {
      console.error('Erro ao carregar membros:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível carregar os membros do projeto.",
        variant: "destructive",
      });
    } finally {
      setLoadingMembers(false);
    }
  };

  useEffect(() => {
    if (project) { // Só busca membros se o projeto já foi carregado
      fetchMembers();
    }
  }, [project]);

  const handleDeleteProject = async () => {
    if (!projectId) return;
    try {
      await supabase.from('projects').delete().eq('id', projectId);
      toast({
        title: "Projeto Excluído!",
        description: "O projeto foi removido com sucesso.",
      });
      navigate('/admin/elyon-builder');
    } catch (error: any) {
      console.error('Erro ao excluir projeto:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível excluir o projeto.",
        variant: "destructive",
      });
    }
  };

  const handleToggleMemberStatus = async (memberId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      const { error } = await supabase
        .from('project_members')
        .update({ status: newStatus })
        .eq('id', memberId);

      if (error) throw error;

      toast({
        title: "Status atualizado!",
        description: `Membro agora está ${newStatus === 'active' ? 'ativo' : 'inativo'}.`,
      });
      fetchMembers(); // Recarregar a lista
    } catch (error: any) {
      console.error('Erro ao atualizar status do membro:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível atualizar o status do membro.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    try {
      const { error } = await supabase
        .from('project_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      toast({
        title: "Membro removido!",
        description: `${memberName} foi removido do projeto.`,
      });
      fetchMembers(); // Recarregar a lista
    } catch (error: any) {
      console.error('Erro ao remover membro:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível remover o membro do projeto.",
        variant: "destructive",
      });
    }
  };

  const openManageAccessDialog = (member: Member) => {
    setSelectedMemberForAccess(member);
    setIsManageAccessDialogOpen(true);
  };

  if (loadingProject || loadingMembers) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card py-3 px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/elyon-builder')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          {project.logo_url && (
            <img src={project.logo_url} alt="Project Logo" className="h-8 w-8 object-contain rounded-md" />
          )}
          <div className="flex flex-col">
            <h1 className="text-lg font-semibold">{project.name}</h1>
            <p className="text-sm text-muted-foreground">Gerenciar projeto</p>
          </div>
        </div>
      </header>

      <div className="container mx-auto p-6 flex-1">
        <div className="flex justify-end mb-6">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir Projeto
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza de que deseja excluir o projeto "{project.name}"?
                  Esta ação não pode ser desfeita e todos os dados associados serão perdidos.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteProject}>
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Tabs Navigation */}
        <Tabs defaultValue="members" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="content" asChild>
              <Link to={`/admin/projects/${projectId}/content`}>
                <BookOpen className="mr-2 h-4 w-4" />
                Conteúdo
              </Link>
            </TabsTrigger>
            <TabsTrigger value="members" asChild>
              <Link to={`/admin/projects/${projectId}/members`}>
                <Users className="mr-2 h-4 w-4" />
                Membros
              </Link>
            </TabsTrigger>
            <TabsTrigger value="design" asChild>
              <Link to={`/admin/projects/${projectId}/design`}>
                <Palette className="mr-2 h-4 w-4" />
                Design
              </Link>
            </TabsTrigger>
            <TabsTrigger value="analytics" asChild>
              <Link to={`/admin/projects/${projectId}/analytics`}>
                <BarChart3 className="mr-2 h-4 w-4" />
                Analytics
              </Link>
            </TabsTrigger>
            <TabsTrigger value="community" asChild>
              <Link to={`/admin/projects/${projectId}/community`}>
                <MessageSquare className="mr-2 h-4 w-4" />
                Comunidade
              </Link>
            </TabsTrigger>
          </TabsList>

          {/* Members Tab Content */}
          <TabsContent value="members" className="mt-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">Membros do Projeto</h2>
                <p className="text-muted-foreground mt-1">
                  Gerencie os usuários com acesso à sua área de membros
                </p>
              </div>
              <NewMemberDialog projectId={projectId!} onMemberAdded={fetchMembers} />
            </div>

            {members.length === 0 ? (
              <Card className="min-h-[200px] flex items-center justify-center text-muted-foreground">
                <CardContent className="py-8 text-center">
                  <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p>Nenhum membro encontrado para este projeto.</p>
                  <p className="text-sm mt-2">Adicione seu primeiro membro para começar.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {members.map(member => (
                  <Card key={member.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">{member.profiles?.name || 'Nome Desconhecido'}</p>
                        <p className="text-sm text-muted-foreground">{member.profiles?.email || 'Email Desconhecido'}</p>
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1">
                          <Calendar className="h-3 w-3" />
                          <span>Membro desde: {format(new Date(member.created_at), 'dd/MM/yyyy', { locale: ptBR })}</span>
                          {member.last_purchase_date && (
                            <>
                              <span>•</span>
                              <span>Última compra: {format(new Date(member.last_purchase_date), 'dd/MM/yyyy', { locale: ptBR })}</span>
                            </>
                          )}
                        </div>
                        {member.product_access.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            <span className="text-xs font-medium text-muted-foreground">Produtos:</span>
                            {member.product_access.map((pa, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {pa.products?.name || 'Produto Desconhecido'}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <Switch
                        checked={member.status === 'active'}
                        onCheckedChange={() => handleToggleMemberStatus(member.id, member.status)}
                        title={member.status === 'active' ? 'Desativar Membro' : 'Ativar Membro'}
                      />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => openManageAccessDialog(member)}>
                            <BookOpen className="mr-2 h-4 w-4" />
                            <span>Gerenciar Acesso</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => console.log('Editar membro', member.id)}>
                            <Settings className="mr-2 h-4 w-4" />
                            <span>Configurações</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Remover Membro</span>
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar remoção</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza de que deseja remover "{member.profiles?.name || 'este membro'}" do projeto?
                                  Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleRemoveMember(member.id, member.profiles?.name || 'Membro')}>
                                  Remover
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Placeholder for other tabs */}
          <TabsContent value="content" className="mt-6">
            <Card>
              <CardHeader><CardTitle>Conteúdo do Projeto</CardTitle></CardHeader>
              <CardContent>Funcionalidade em desenvolvimento.</CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="design" className="mt-6">
            <Card>
              <CardHeader><CardTitle>Design do Projeto</CardTitle></CardHeader>
              <CardContent>Funcionalidade em desenvolvimento.</CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="analytics" className="mt-6">
            <Card>
              <CardHeader><CardTitle>Analytics do Projeto</CardTitle></CardHeader>
              <CardContent>Funcionalidade em desenvolvimento.</CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="community" className="mt-6">
            <Card>
              <CardHeader><CardTitle>Comunidade do Projeto</CardTitle></CardHeader>
              <CardContent>Funcionalidade em desenvolvimento.</CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {selectedMemberForAccess && (
        <ManageMemberAccessDialog
          open={isManageAccessDialogOpen}
          onOpenChange={setIsManageAccessDialogOpen}
          projectId={projectId!}
          memberId={selectedMemberForAccess.user_id}
          memberName={selectedMemberForAccess.profiles?.name || 'Membro'}
          onAccessUpdated={fetchMembers}
        />
      )}
    </div>
  );
};

export default ProjectMembersPage;