import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, MoreVertical, BookOpen, Video, FileText, Image, Code, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';
import { NewLessonDialog } from './NewLessonDialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';

interface ModuleCardProps {
  module: Tables<'modules'> & { lessons: Tables<'lessons'>[] };
  onModuleEdited: () => void;
  onModuleDeleted: () => void;
  onLessonSaved: () => void;
  onLessonDeleted: () => void;
  onModuleStatusChange: (moduleId: string, newStatus: 'draft' | 'published') => void;
}

export function ModuleCard({ module, onModuleEdited, onModuleDeleted, onLessonSaved, onLessonDeleted, onModuleStatusChange }: ModuleCardProps) {
  const [isNewLessonDialogOpen, setIsNewLessonDialogOpen] = useState(false);
  const [isEditLessonDialogOpen, setIsEditLessonDialogOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Tables<'lessons'> | null>(null);
  const [isLessonsExpanded, setIsLessonsExpanded] = useState(false);
  const { toast } = useToast();

  const handleEditLesson = (lesson: Tables<'lessons'>) => {
    setEditingLesson(lesson);
    setIsEditLessonDialogOpen(true);
  };

  const handleDeleteLesson = async (lessonId: string, lessonTitle: string) => {
    try {
      const { error } = await supabase
        .from('lessons')
        .delete()
        .eq('id', lessonId);

      if (error) throw error;

      toast({
        title: "Aula excluída!",
        description: `A aula "${lessonTitle}" foi removida com sucesso.`,
      });
      onLessonDeleted();
    } catch (error: any) {
      console.error('Erro ao excluir aula:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível excluir a aula.",
        variant: "destructive",
      });
    }
  };

  const getContentTypeIcon = (contentType: string) => {
    switch (contentType) {
      case 'video': return <Video className="h-4 w-4 text-red-500" />;
      case 'pdf': return <FileText className="h-4 w-4 text-blue-500" />;
      case 'image': return <Image className="h-4 w-4 text-green-500" />;
      case 'html': return <Code className="h-4 w-4 text-purple-500" />;
      case 'text': return <FileText className="h-4 w-4 text-gray-500" />;
      default: return <BookOpen className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <Card className="border-l-4" style={{ borderColor: module.status === 'published' ? '#22c55e' : '#f59e0b' }}>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-3">
          {module.banner_url && (
            <img src={module.banner_url} alt="Module Banner" className="h-12 w-12 object-cover rounded-md" />
          )}
          <div className="flex flex-col">
            <CardTitle className="text-lg">{module.title}</CardTitle>
            <p className="text-sm text-muted-foreground line-clamp-1">{module.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={module.status === 'published' ? 'default' : 'secondary'} className={module.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
            {module.status === 'published' ? 'Publicado' : 'Rascunho'}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={onModuleEdited}>
                <Edit className="mr-2 h-4 w-4" />
                <span>Editar Módulo</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <div className="flex items-center justify-between w-full">
                  <span>{module.status === 'published' ? 'Despublicar' : 'Publicar'}</span>
                  <Switch 
                    checked={module.status === 'published'} 
                    onCheckedChange={(checked) => onModuleStatusChange(module.id, checked ? 'published' : 'draft')}
                  />
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>Excluir Módulo</span>
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza de que deseja excluir o módulo "{module.title}"?
                      Esta ação não pode ser desfeita e todas as aulas associadas também serão excluídas.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={onModuleDeleted}>
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-md font-semibold flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Aulas ({module.lessons.length})
          </h3>
          <Button size="sm" onClick={() => setIsNewLessonDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Aula
          </Button>
        </div>

        {module.lessons.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">Nenhuma aula neste módulo ainda.</p>
        ) : (
          <>
            <Button 
              variant="outline" 
              className="w-full justify-between" 
              onClick={() => setIsLessonsExpanded(!isLessonsExpanded)}
            >
              {isLessonsExpanded ? 'Recolher Aulas' : 'Expandir Aulas'}
              {isLessonsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            {isLessonsExpanded && (
              <div className="space-y-3 mt-4">
                {module.lessons.sort((a, b) => (a.order_index || 0) - (b.order_index || 0)).map(lesson => (
                  <div key={lesson.id} className="flex items-center justify-between p-3 border rounded-md bg-muted/50">
                    <div className="flex items-center gap-3">
                      {getContentTypeIcon(lesson.content_type)}
                      <div>
                        <p className="font-medium text-sm">{lesson.title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{lesson.content_type}</span>
                          {lesson.duration_minutes && (
                            <>
                              <span>•</span>
                              <Clock className="h-3 w-3" />
                              <span>{lesson.duration_minutes} min</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={() => handleEditLesson(lesson)}>
                          <Edit className="mr-2 h-4 w-4" />
                          <span>Editar</span>
                        </DropdownMenuItem>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>Excluir</span>
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza de que deseja excluir a aula "{lesson.title}"?
                                Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteLesson(lesson.id, lesson.title)}>
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>

      <NewLessonDialog
        moduleId={module.id}
        onLessonSaved={onLessonSaved}
        open={isNewLessonDialogOpen}
        onOpenChange={setIsNewLessonDialogOpen}
      />

      {editingLesson && (
        <NewLessonDialog
          moduleId={module.id}
          onLessonSaved={() => {
            setIsEditLessonDialogOpen(false);
            setEditingLesson(null);
            onLessonSaved();
          }}
          initialLessonData={editingLesson}
          open={isEditLessonDialogOpen}
          onOpenChange={setIsEditLessonDialogOpen}
        />
      )}
    </Card>
  );
}