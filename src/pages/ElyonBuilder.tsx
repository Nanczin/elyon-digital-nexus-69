import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Layout, Users, Palette, BarChart3, MessageSquare, Shield, Blocks, FileText, BookOpen, Settings, Upload, Folder, Copy, ExternalLink } from 'lucide-react';
import { NewProjectDialog } from '@/components/elyon-builder/NewProjectDialog'; // Importar o novo diálogo
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Project {
  id: string;
  name: string;
  description: string | null;
  access_url: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  status: string;
  created_at: string;
}

const ElyonBuilder = () => {
  const { user, isAdmin, loading } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (user && isAdmin) {
      fetchProjects();
    }
  }, [user, isAdmin]);

  const fetchProjects = async () => {
    if (!user?.id) return;
    setLoadingProjects(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar projetos:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível carregar seus projetos.",
        variant: "destructive",
      });
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({
      title: "Link Copiado!",
      description: "O link de acesso ao projeto foi copiado para a área de transferência.",
    });
  };

  if (loading) {
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Blocks className="h-8 w-8 text-primary" />
            Meus Projetos
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Gerencie suas áreas de membros em um só lugar
          </p>
        </div>
        <NewProjectDialog onProjectCreated={fetchProjects} />
      </div>

      {loadingProjects ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="ml-3 text-muted-foreground">Carregando projetos...</p>
        </div>
      ) : projects.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Folder className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum projeto encontrado</h3>
            <p className="text-muted-foreground mb-4">
              Crie sua primeira área de membros para começar.
            </p>
            <NewProjectDialog onProjectCreated={fetchProjects}>
              <Button className="gradient-button">
                <Plus className="mr-2 h-4 w-4" />
                Criar Novo Projeto
              </Button>
            </NewProjectDialog>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Card key={project.id} className="hover:shadow-lg transition-shadow duration-200">
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="flex items-center gap-3">
                  {project.logo_url ? (
                    <img src={project.logo_url} alt="Project Logo" className="h-10 w-10 object-contain rounded-md" />
                  ) : (
                    <div className="h-10 w-10 bg-primary/10 rounded-md flex items-center justify-center">
                      <Folder className="h-5 w-5 text-primary" />
                    </div>
                  )}
                  <div className="flex flex-col">
                    <CardTitle className="text-xl">{project.name}</CardTitle>
                    {project.description && (
                      <CardDescription className="text-sm text-muted-foreground line-clamp-1">
                        {project.description}
                      </CardDescription>
                    )}
                  </div>
                </div>
                <div 
                  className="h-3 w-3 rounded-full" 
                  style={{ backgroundColor: project.status === 'active' ? '#22c55e' : '#ef4444' }} 
                  title={`Status: ${project.status}`}
                ></div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Criado em {format(new Date(project.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                </p>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleCopyLink(project.access_url)}
                    className="flex-1"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar Link
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={() => window.open(project.access_url, '_blank')}
                    className="flex-1"
                    style={{ 
                      background: `linear-gradient(135deg, ${project.primary_color}, ${project.secondary_color})`,
                      color: '#fff'
                    }}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Acessar
                  </Button>
                </div>
                <Button variant="ghost" className="w-full justify-start text-primary hover:text-primary/80">
                  Gerenciar Projeto
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ElyonBuilder;