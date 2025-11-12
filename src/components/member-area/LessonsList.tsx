import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Edit, Trash2, Video, ChevronDown, ChevronUp, FileText, ImageIcon } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';
import { useAuth } from '@/hooks/useAuth';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

type Lesson = Tables<'lessons'>;

interface LessonsListProps {
  moduleId: string | null;
  onEditLesson: (lesson: Lesson) => void;
  onLessonDeleted: () => void;
}

export const LessonsList: React.FC<LessonsListProps> = ({ moduleId, onEditLesson, onLessonDeleted }) => {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();
  const [openLessons, setOpenLessons] = useState<Set<string>>(() => new Set());

  const fetchLessons = useCallback(async (id: string) => {
    console.log('LESSONS_LIST_DEBUG: fetchLessons started for moduleId:', id);
    if (!user?.id || !id) {
      setLessons([]);
      setLoading(false);
      console.log('LESSONS_LIST_DEBUG: fetchLessons skipped, missing user ID or module ID.');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('module_id', id)
        .order('order_index', { ascending: true });
      
      if (error) throw error;
      setLessons(data as Lesson[] || []);
      console.log('LESSONS_LIST_DEBUG: fetchLessons completed successfully.');
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Falha ao carregar aulas.", variant: "destructive" });
      console.error('LESSONS_LIST_DEBUG: Erro ao carregar aulas:', error);
    } finally {
      setLoading(false);
      console.log('LESSONS_LIST_DEBUG: fetchLessons setLoading(false) called.');
    }
  }, [user?.id, toast]);

  useEffect(() => {
    if (moduleId) {
      fetchLessons(moduleId);
    }
  }, [moduleId, fetchLessons]);

  const handleDeleteLesson = async (lessonId: string, lessonTitle: string) => {
    try {
      const { error } = await supabase
        .from('lessons')
        .delete()
        .eq('id', lessonId);
      
      if (error) throw error;
      toast({ title: "Sucesso", description: `Aula "${lessonTitle}" excluída.` });
      onLessonDeleted();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Falha ao excluir aula.", variant: "destructive" });
      console.error(error);
    }
  };

  const toggleLesson = (lessonId: string) => {
    setOpenLessons(prev => {
      const newSet = new Set(prev);
      if (newSet.has(lessonId)) {
        newSet.delete(lessonId);
      } else {
        newSet.add(lessonId);
      }
      return newSet;
    });
  };

  const renderLessonContent = (lesson: Lesson) => {
    if (!lesson.content_url && !lesson.text_content) {
      return <p className="text-muted-foreground text-sm">Nenhum conteúdo para esta aula.</p>;
    }

    switch (lesson.content_type) {
      case 'video_link':
        const youtubeMatch = lesson.content_url?.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=|embed\/|v\/|)([\w-]{11})/);
        const vimeoMatch = lesson.content_url?.match(/(?:https?:\/\/)?(?:www\.)?(?:vimeo\.com)\/(?:video\/|)(\d+)/);

        if (youtubeMatch && youtubeMatch[1]) {
          return (
            <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
              <iframe
                className="absolute top-0 left-0 w-full h-full rounded-lg"
                src={`https://www.youtube.com/embed/${youtubeMatch[1]}`}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={lesson.title}
              ></iframe>
            </div>
          );
        } else if (vimeoMatch && vimeoMatch[1]) {
          return (
            <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
              <iframe
                className="absolute top-0 left-0 w-full h-full rounded-lg"
                src={`https://player.vimeo.com/video/${vimeoMatch[1]}`}
                frameBorder="0"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                title={lesson.title}
              ></iframe>
            </div>
          );
        }
        return <p className="text-red-500 text-sm">Link de vídeo inválido ou não suportado.</p>;

      case 'video_upload':
        return (
          <video controls className="w-full h-auto rounded-lg">
            <source src={lesson.content_url || ''} type="video/mp4" />
            Seu navegador não suporta a tag de vídeo.
          </video>
        );

      case 'pdf_upload':
        return (
          <div className="relative w-full" style={{ paddingTop: '100%' }}>
            <iframe
              className="absolute top-0 left-0 w-full h-full rounded-lg"
              src={lesson.content_url || ''}
              frameBorder="0"
              title={lesson.title}
            ></iframe>
          </div>
        );

      case 'image_upload':
        return (
          <img src={lesson.content_url || ''} alt={lesson.title} className="w-full h-auto object-contain rounded-lg" />
        );

      case 'text_content':
        return <div dangerouslySetInnerHTML={{ __html: lesson.text_content || '' }} className="prose prose-sm max-w-none" />;

      default:
        return <p className="text-muted-foreground text-sm">Tipo de conteúdo desconhecido.</p>;
    }
  };

  if (loading) return <p>Carregando aulas...</p>;
  if (lessons.length === 0) return <p className="text-muted-foreground text-sm">Nenhuma aula criada para este módulo.</p>;

  return (
    <div className="space-y-4">
      {lessons.map(lesson => {
        const isOpen = openLessons.has(lesson.id);
        return (
          <Card key={lesson.id}>
            <CardContent className="p-4">
              <Collapsible open={isOpen} onOpenChange={() => toggleLesson(lesson.id)}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 gap-2">
                  <div className="flex-1 flex flex-col min-w-0">
                    <h3 className="font-semibold text-base sm:text-lg truncate">{lesson.title}</h3>
                    {lesson.description?.trim() && (
                      <p className="text-sm text-muted-foreground truncate">
                        {lesson.description.trim()}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2 sm:mt-0">
                    <Button variant="outline" size="sm" onClick={() => onEditLesson(lesson)} className="text-xs sm:text-sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="text-xs sm:text-sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="max-w-xs sm:max-w-md mx-2 sm:mx-4">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-sm sm:text-base">Confirmar Exclusção</AlertDialogTitle>
                          <AlertDialogDescription className="text-xs sm:text-sm">
                            Tem certeza que deseja excluir a aula <strong>"{lesson.title}"</strong>? Esta ação é irreversível.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                          <AlertDialogCancel className="text-xs sm:text-sm">Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteLesson(lesson.id, lesson.title)} className="text-xs sm:text-sm">
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-xs sm:text-sm">
                        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                </div>
                <CollapsibleContent className="mt-4">
                  {renderLessonContent(lesson)}
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};