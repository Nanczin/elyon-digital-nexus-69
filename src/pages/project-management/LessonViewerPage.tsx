import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Video, FileText, Image, Code, BookOpen, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Tables } from '@/integrations/supabase/types';

const LessonViewerPage = () => {
  const { projectId, moduleId, lessonId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [project, setProject] = useState<Tables<'projects'> | null>(null);
  const [module, setModule] = useState<Tables<'modules'> | null>(null);
  const [lesson, setLesson] = useState<Tables<'lessons'> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLessonDetails = async () => {
      if (!projectId || !moduleId || !lessonId) {
        toast({
          title: "Erro",
          description: "IDs de projeto, módulo ou aula ausentes.",
          variant: "destructive",
        });
        navigate(`/admin/projects/${projectId}/content`);
        return;
      }

      try {
        // Fetch Project Details
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('id, name, logo_url')
          .eq('id', projectId)
          .single();
        if (projectError) throw projectError;
        setProject(projectData);

        // Fetch Module Details
        const { data: moduleData, error: moduleError } = await supabase
          .from('modules')
          .select('id, title')
          .eq('id', moduleId)
          .single();
        if (moduleError) throw moduleError;
        setModule(moduleData);

        // Fetch Lesson Details
        const { data: lessonData, error: lessonError } = await supabase
          .from('lessons')
          .select('*')
          .eq('id', lessonId)
          .single();
        if (lessonError) throw lessonError;
        setLesson(lessonData);

      } catch (error: any) {
        console.error('Erro ao carregar detalhes da aula:', error);
        toast({
          title: "Erro",
          description: error.message || "Não foi possível carregar os detalhes da aula.",
          variant: "destructive",
        });
        navigate(`/admin/projects/${projectId}/content`);
      } finally {
        setLoading(false);
      }
    };

    fetchLessonDetails();
  }, [projectId, moduleId, lessonId, navigate, toast]);

  const getContentTypeIcon = (contentType: string) => {
    switch (contentType) {
      case 'video': return <Video className="h-5 w-5 text-red-500" />;
      case 'pdf': return <FileText className="h-5 w-5 text-blue-500" />;
      case 'image': return <Image className="h-5 w-5 text-green-500" />;
      case 'html': return <Code className="h-5 w-5 text-purple-500" />;
      case 'text': return <BookOpen className="h-5 w-5 text-gray-500" />;
      default: return <BookOpen className="h-5 w-5 text-gray-500" />;
    }
  };

  const renderContent = () => {
    if (!lesson) return null;

    switch (lesson.content_type) {
      case 'video':
        // Basic check for YouTube/Vimeo embeddable links
        const youtubeMatch = lesson.content_url?.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=|embed\/|v\/|)([\w-]{11})/);
        const vimeoMatch = lesson.content_url?.match(/(?:https?:\/\/)?(?:www\.)?(?:vimeo\.com)\/(?:video\/|)(\d+)/);

        if (youtubeMatch && youtubeMatch[1]) {
          return (
            <div className="relative w-full" style={{ paddingTop: '56.25%' }}> {/* 16:9 Aspect Ratio */}
              <iframe
                className="absolute top-0 left-0 w-full h-full rounded-lg"
                src={`https://www.youtube.com/embed/${youtubeMatch[1]}`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          );
        } else if (vimeoMatch && vimeoMatch[1]) {
          return (
            <div className="relative w-full" style={{ paddingTop: '56.25%' }}> {/* 16:9 Aspect Ratio */}
              <iframe
                className="absolute top-0 left-0 w-full h-full rounded-lg"
                src={`https://player.vimeo.com/video/${vimeoMatch[1]}`}
                title="Vimeo video player"
                frameBorder="0"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          );
        } else if (lesson.content_url) {
          // Fallback for other video URLs, might not embed correctly
          return (
            <video controls className="w-full h-auto rounded-lg">
              <source src={lesson.content_url} type="video/mp4" />
              Seu navegador não suporta a tag de vídeo.
            </video>
          );
        }
        return <p className="text-muted-foreground">URL de vídeo inválida ou não suportada para embed.</p>;

      case 'pdf':
        if (lesson.content_url) {
          return (
            <div className="relative w-full" style={{ paddingTop: '141.42%' }}> {/* A4 aspect ratio (sqrt(2):1) */}
              <iframe
                className="absolute top-0 left-0 w-full h-full rounded-lg"
                src={lesson.content_url}
                title="PDF Viewer"
                frameBorder="0"
              ></iframe>
            </div>
          );
        }
        return <p className="text-muted-foreground">URL do PDF ausente.</p>;

      case 'image':
        if (lesson.content_url) {
          return <img src={lesson.content_url} alt={lesson.title} className="max-w-full h-auto rounded-lg mx-auto" />;
        }
        return <p className="text-muted-foreground">URL da imagem ausente.</p>;

      case 'text':
        return <p className="text-foreground whitespace-pre-wrap">{lesson.text_content}</p>;

      case 'html':
        return <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: lesson.text_content || '' }} />;

      default:
        return <p className="text-muted-foreground">Tipo de conteúdo não suportado.</p>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!project || !module || !lesson) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <header className="border-b bg-card py-3 px-4 sm:px-6 flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/projects/${projectId}/content`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Aula não encontrada</h1>
        </header>
        <div className="container mx-auto p-6 flex-1 text-center text-muted-foreground">
          <p>Não foi possível carregar os detalhes da aula.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card py-3 px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/projects/${projectId}/content`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          {project.logo_url && (
            <img src={project.logo_url} alt="Project Logo" className="h-8 w-8 object-contain rounded-md" />
          )}
          <div className="flex flex-col">
            <h1 className="text-lg font-semibold">{project.name}</h1>
            <p className="text-sm text-muted-foreground">Módulo: {module.title}</p>
          </div>
        </div>
      </header>

      <div className="container mx-auto p-6 flex-1 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              {getContentTypeIcon(lesson.content_type)}
              {lesson.title}
            </CardTitle>
            {lesson.description && (
              <p className="text-muted-foreground text-sm mt-1">{lesson.description}</p>
            )}
            {lesson.duration_minutes && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                <Clock className="h-3 w-3" />
                <span>{lesson.duration_minutes} minutos</span>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {renderContent()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LessonViewerPage;