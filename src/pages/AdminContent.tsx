import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, BookOpen, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// Componente para listar Módulos
const ModulesList = () => {
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('modules')
      .select('*')
      .order('order_index', { ascending: true });
    
    if (error) {
      toast({ title: "Erro", description: "Falha ao carregar módulos.", variant: "destructive" });
      console.error(error);
    } else {
      setModules(data || []);
    }
    setLoading(false);
  };

  if (loading) return <p>Carregando módulos...</p>;
  if (modules.length === 0) return <p>Nenhum módulo criado ainda.</p>;

  return (
    <div className="space-y-4">
      {modules.map(module => (
        <Card key={module.id}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">{module.title}</h3>
              <p className="text-sm text-muted-foreground">{module.description?.substring(0, 100)}...</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">Editar</Button>
              <Button variant="destructive" size="sm">Excluir</Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// Componente para listar Aulas
const LessonsList = ({ moduleId }: { moduleId: string }) => {
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (moduleId) {
      fetchLessons(moduleId);
    }
  }, [moduleId]);

  const fetchLessons = async (id: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('module_id', id)
      .order('order_index', { ascending: true });
    
    if (error) {
      toast({ title: "Erro", description: "Falha ao carregar aulas.", variant: "destructive" });
      console.error(error);
    } else {
      setLessons(data || []);
    }
    setLoading(false);
  };

  if (loading) return <p>Carregando aulas...</p>;
  if (lessons.length === 0) return <p>Nenhuma aula criada para este módulo.</p>;

  return (
    <div className="space-y-4">
      {lessons.map(lesson => (
        <Card key={lesson.id}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">{lesson.title}</h3>
              <p className="text-sm text-muted-foreground">{lesson.description?.substring(0, 100)}...</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">Editar</Button>
              <Button variant="destructive" size="sm">Excluir</Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

const AdminContent = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [currentModuleId, setCurrentModuleId] = useState<string | null>(null);
  const [modules, setModules] = useState<any[]>([]); // Para o seletor de módulos

  useEffect(() => {
    if (user && isAdmin) {
      fetchModulesForSelector();
    }
  }, [user, isAdmin]);

  const fetchModulesForSelector = async () => {
    const { data, error } = await supabase
      .from('modules')
      .select('id, title')
      .order('title', { ascending: true });
    
    if (error) {
      toast({ title: "Erro", description: "Falha ao carregar módulos para seleção.", variant: "destructive" });
      console.error(error);
    } else {
      setModules(data || []);
      if (data && data.length > 0) {
        setCurrentModuleId(data[0].id); // Seleciona o primeiro módulo por padrão
      }
    }
  };

  if (authLoading) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  if (!user || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Gestão de Conteúdo</h1>
        <p className="text-muted-foreground mt-2">
          Crie e organize seus módulos e aulas
        </p>
      </div>

      <Tabs defaultValue="modules">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="modules">
            <BookOpen className="mr-2 h-4 w-4" /> Módulos
          </TabsTrigger>
          <TabsTrigger value="lessons">
            <Video className="mr-2 h-4 w-4" /> Aulas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="modules" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Módulos</CardTitle>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" /> Novo Módulo
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Criar Novo Módulo</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="moduleTitle">Título</Label>
                      <Input id="moduleTitle" placeholder="Título do Módulo" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="moduleDescription">Descrição</Label>
                      <Textarea id="moduleDescription" placeholder="Descrição do Módulo" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="moduleBanner">Banner</Label>
                      <Input id="moduleBanner" type="file" />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="moduleStatus">Publicado</Label>
                      <Switch id="moduleStatus" />
                    </div>
                    <Button className="w-full">Salvar Módulo</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <ModulesList />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lessons" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Aulas</CardTitle>
              <div className="flex items-center gap-2">
                <Select value={currentModuleId || ''} onValueChange={setCurrentModuleId}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Selecionar Módulo" />
                  </SelectTrigger>
                  <SelectContent>
                    {modules.map(module => (
                      <SelectItem key={module.id} value={module.id}>
                        {module.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" disabled={!currentModuleId}>
                      <Plus className="mr-2 h-4 w-4" /> Nova Aula
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Criar Nova Aula</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="lessonTitle">Título</Label>
                        <Input id="lessonTitle" placeholder="Título da Aula" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lessonDescription">Descrição</Label>
                        <Textarea id="lessonDescription" placeholder="Descrição da Aula" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lessonDuration">Duração (minutos)</Label>
                        <Input id="lessonDuration" type="number" placeholder="Ex: 15" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contentType">Tipo de Conteúdo</Label>
                        <Select>
                          <SelectTrigger id="contentType">
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="video_upload">Vídeo (Upload)</SelectItem>
                            <SelectItem value="video_link">Vídeo (Link)</SelectItem>
                            <SelectItem value="pdf_upload">PDF</SelectItem>
                            <SelectItem value="image_upload">Imagem</SelectItem>
                            <SelectItem value="html_text">Texto HTML</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {/* Campos condicionais para conteúdo */}
                      <Button className="w-full">Salvar Aula</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {currentModuleId ? <LessonsList moduleId={currentModuleId} /> : <p>Selecione um módulo para ver as aulas.</p>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminContent;