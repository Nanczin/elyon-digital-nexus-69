import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Users, Palette, BarChart3, MessageSquare, BookOpen, Plus, Copy, ExternalLink, Mail, Phone, Wrench } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Project {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  access_url: string;
}

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  added_at: string;
}

const ProjectMembersPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [loadingProject, setLoadingProject] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  useEffect(() => {
    const fetchProjectDetails = async () => {
      if (!projectId) return;
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('id, name, logo_url, primary_color, secondary_color, access_url')
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
    fetchMembers(); // Chamar a função para buscar membros
  }, [projectId, navigate, toast]);

  const fetchMembers = async () => {
    if (!projectId) return;
    setLoadingMembers(true);
    try {
      // Por enquanto, vamos usar dados mockados, pois a tabela de membros não existe
      // Em uma implementação real, você buscaria os membros do Supabase
      const mockMembers: Member[] = [
        {
          id: '1',
          name: 'estevao',
          email: 'estevao.v.garcia10kk@gmail.com',
          role: 'member',
          status: 'Ativo',
          added_at: '2025-10-17T00:00:00Z',
        },
        // Adicione mais membros mockados aqui se desejar
      ];
      setMembers(mockMembers);
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

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({
      title: "Link Copiado!",
      description: "O link de acesso dos membros foi copiado para a área de transferência.",
    });
  };

  if (loadingProject) {
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
        {/* Botão "Sair" removido conforme a imagem */}
      </header>

      <div className="container mx-auto p-6 flex-1">
        {/* Título e Botão Adicionar Membro */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Gestão de Membros</h2>
            <p className="text-muted-foreground mt-1">
              Adicione e gerencie os membros da sua área
            </p>
          </div>
          <Button 
            style={{ 
              background: `linear-gradient(135deg, ${project.primary_color}, ${project.secondary_color})`,
              color: '#fff'
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Membro
          </Button>
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
          <TabsContent value="members" className="mt-6 space-y-6">
            {/* URL de Acesso dos Membros */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">URL de Acesso dos Membros</CardTitle>
                <p className="text-muted-foreground text-sm">
                  Compartilhe esta URL com seus membros para que eles possam acessar a área
                </p>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <Input 
                    value={project.access_url} 
                    readOnly 
                    className="flex-1 bg-muted/50 border-dashed" 
                  />
                  <Button 
                    variant="outline" 
                    onClick={() => handleCopyLink(project.access_url)}
                    className="flex-shrink-0"
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copiar
                  </Button>
                  <Button 
                    onClick={() => window.open(project.access_url, '_blank')}
                    className="flex-shrink-0"
                    style={{ 
                      background: `linear-gradient(135deg, ${project.primary_color}, ${project.secondary_color})`,
                      color: '#fff'
                    }}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Acessar Área
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Tabela de Membros */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Lista de Membros</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingMembers ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    <p className="ml-3 text-muted-foreground">Carregando membros...</p>
                  </div>
                ) : members.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum membro encontrado. Adicione seu primeiro membro!
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Função</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Adicionado em</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {members.map((member) => (
                          <TableRow key={member.id}>
                            <TableCell className="font-medium">{member.name}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                {member.email}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {member.role}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={member.status === 'Ativo' ? 'default' : 'secondary'}>
                                {member.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {format(new Date(member.added_at), 'dd/MM/yyyy', { locale: ptBR })}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm">
                                <Wrench className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
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
    </div>
  );
};

export default ProjectMembersPage;