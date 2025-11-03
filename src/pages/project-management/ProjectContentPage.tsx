import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, BookOpen, Plus, Trash2, Lightbulb } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import ProjectNavigationTabs, { Project } from '@/components/project-management/ProjectNavigationTabs';
import { NewModuleDialog } from '@/components/elyon-builder/NewModuleDialog';
import { ModuleCard } from '@/components/elyon-builder/ModuleCard';
import { Tables } from '@/integrations/supabase/types';

interface ModuleWithLessons extends Tables<'modules'> {
  lessons: Tables<'lessons'>[];
}

const ProjectContentPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [modules, setModules] = useState<ModuleWithLessons[]>([]);
  const [loadingProject, setLoadingProject] = useState(true);
  const [loadingModules, setLoadingModules] = useState(true);
  const [isNewModuleDialogOpen, setIsNewModuleDialogOpen] = useState(false);
  const [isEditModuleDialogOpen, setIsEditModuleDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<Tables<'modules'> | null>(null);

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

  const fetchModulesAndLessons = async () => {
    if (!projectId) return;
    setLoadingModules(true);
    try {
      const { data: modulesData, error: modulesError } = await supabase
        .from('modules')
        .select(`
          *,
          lessons (*)
        `)
        .eq('project_id', projectId)
        .order('order_index', { ascending: true })
        .order('order_index', { foreignTable: 'lessons', ascending: true }); // Ordenar aulas dentro dos módulos

      if (modulesError) throw modulesError;
      setModules(modulesData || []);
    } catch (error: any) {
      console.error('Erro ao carregar módulos e aulas:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível carregar os módulos e aulas.",
        variant: "destructive",
      });
    } finally {
      setLoadingModules(false);
    }
  };

  useEffect(() => {
    if (project) {
      fetchModulesAndLessons();
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

  const handleEditModule = (module: Tables<'modules'>) => {
    setEditingModule(module);
    setIsEditModuleDialogOpen(true);
  };

  const handleDeleteModule = async (moduleId: string, moduleTitle: string) => {
    try {
      await supabase.from('modules').delete().eq('id', moduleId);
      toast({
        title: "Módulo excluído!",
        description: `O módulo "${moduleTitle}" foi removido com sucesso.`,
      });
      fetchModulesAndLessons();
    } catch (error: any) {
      console.error('Erro ao excluir módulo:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível excluir o módulo.",
        variant: "destructive",
      });
    }
  };

  const handleModuleStatusChange = async (moduleId: string, newStatus: 'draft' | 'published') => {
    try {
      const { error } = await supabase
        .from('modules')
        .update({ status: newStatus })
        .eq('id', moduleId);

      if (error) throw error;

      toast({
        title: "Status atualizado!",
        description: `Módulo agora está ${newStatus === 'published' ? 'publicado' : 'em rascunho'}.`,
      });
      fetchModulesAndLessons();
    } catch (error: any) {
      console.error('Erro ao atualizar status do módulo:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível atualizar o status do módulo.",
        variant: "destructive",
      });
    }
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

        {/* Project Navigation Tabs */}
        <ProjectNavigationTabs projectId={projectId!} activeTab="content" />

        {/* Content Tab Content */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold">Módulos e Aulas</h2>
              <p className="text-muted-foreground mt-1">
                Gerencie o conteúdo da sua área de membros
              </p>
              <p className="text-sm text-yellow-600 mt-2 flex items-center gap-1">
                <Lightbulb className="h-4 w-4" /> Novos módulos são automaticamente liberados para todos os membros ativos
              </p>
            </div>
            <NewModuleDialog 
              projectId={projectId!} 
              onModuleSaved={fetchModulesAndLessons} 
              open={isNewModuleDialogOpen} 
              onOpenChange={setIsNewModuleDialogOpen} 
            />
          </div>

          <h3 className="text-xl font-semibold mb-4">Módulos</h3>
          {loadingModules ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="ml-3 text-muted-foreground">Carregando módulos...</p>
            </div>
          ) : modules.length === 0 ? (
            <Card className="min-h-[200px] flex items-center justify-center text-muted-foreground">
              <CardContent className="py-8 text-center">
                <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p>Nenhum módulo criado ainda.</p>
                <p className="text-sm mt-2">Crie seu primeiro módulo para organizar o conteúdo.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {modules.map(module => (
                <ModuleCard
                  key={module.id}
                  module={module}
                  onModuleEdited={() => handleEditModule(module)}
                  onModuleDeleted={() => handleDeleteModule(module.id, module.title)}
                  onLessonSaved={fetchModulesAndLessons}
                  onLessonDeleted={fetchModulesAndLessons}
                  onModuleStatusChange={handleModuleStatusChange}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {editingModule && (
        <NewModuleDialog
          projectId={projectId!}
          initialModuleData={editingModule}
          onModuleSaved={() => {
            setIsEditModuleDialogOpen(false);
            setEditingModule(null);
            fetchModulesAndLessons();
          }}
          open={isEditModuleDialogOpen}
          onOpenChange={setIsEditModuleDialogOpen}
        />
      )}
    </div>
  );
};

export default ProjectContentPage;