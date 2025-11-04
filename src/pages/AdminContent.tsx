import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, useParams } from 'react-router-dom'; // Import useParams
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, BookOpen, Video, MonitorDot, Edit, Trash2, FileText, Image as ImageIcon, ChevronDown, ChevronUp } from 'lucide-react'; // Adicionado ChevronDown, ChevronUp
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'; // Importar Collapsible


type MemberArea = Tables<'member_areas'>;
type Module = Tables<'modules'>;
type Lesson = Tables<'lessons'>;

// Função auxiliar para upload de arquivos
const uploadFile = async (file: File, subfolder: string) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${crypto.randomUUID()}.${fileExt}`;
  const filePath = `lesson-content/${subfolder}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('member-area-content') // Usando o bucket existente
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from('member-area-content')
    .getPublicUrl(filePath);

  return data.publicUrl;
};

// Componente para o formulário de Módulo
const ModuleFormDialog = ({ 
  module: editingModule, 
  onSave, 
  memberAreas, 
  selectedMemberAreaId,
  onClose 
}: { 
  module?: Module, 
  onSave: () => void, 
  memberAreas: MemberArea[], 
  selectedMemberAreaId: string | null,
  onClose: () => void
}) => {
  const [title, setTitle] = useState(editingModule?.title || '');
  const [description, setDescription] = useState(editingModule?.description || '');
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerUrl, setBannerUrl] = useState(editingModule?.banner_url || '');
  const [status, setStatus] = useState(editingModule?.status === 'published');
  const [currentMemberAreaId, setCurrentMemberAreaId] = useState(editingModule?.member_area_id || selectedMemberAreaId || '');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (editingModule) {
      setTitle(editingModule.title);
      setDescription(editingModule.description || '');
      setBannerUrl(editingModule.banner_url || '');
      setStatus(editingModule.status === 'published');
      setCurrentMemberAreaId(editingModule.member_area_id || '');
    } else {
      setTitle('');
      setDescription('');
      setBannerFile(null);
      setBannerUrl('');
      setStatus(false);
      setCurrentMemberAreaId(selectedMemberAreaId || '');
    }
  }, [editingModule, selectedMemberAreaId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setBannerFile(e.target.files[0]);
    }
  };

  const handleSave = async () => {
    if (!user?.id || !currentMemberAreaId) {
      toast({ title: "Erro", description: "Selecione uma área de membros e faça login.", variant: "destructive" });
      return;
    }
    if (!title) {
      toast({ title: "Erro", description: "O título do módulo é obrigatório.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      let finalBannerUrl = bannerUrl;
      if (bannerFile) {
        finalBannerUrl = await uploadFile(bannerFile, 'module-banners');
      }

      const payload = {
        user_id: user.id,
        member_area_id: currentMemberAreaId,
        title,
        description,
        banner_url: finalBannerUrl,
        status: status ? 'published' : 'draft',
        order_index: editingModule?.order_index || 0, // Preserve order or set default
      };

      if (editingModule) {
        const { error } = await supabase
          .from('modules')
          .update(payload)
          .eq('id', editingModule.id);
        if (error) throw error;
        toast({ title: "Sucesso", description: "Módulo atualizado!" });
      } else {
        const { error } = await supabase
          .from('modules')
          .insert(payload);
        if (error) throw error;
        toast({ title: "Sucesso", description: "Módulo criado!" });
      }
      onSave();
      onClose();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Falha ao salvar módulo.", variant: "destructive" });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{editingModule ? 'Editar Módulo' : 'Criar Novo Módulo'}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="moduleMemberArea">Área de Membros</Label>
          <Select 
            value={currentMemberAreaId} 
            onValueChange={setCurrentMemberAreaId}
            disabled={!!editingModule} // Cannot change member area for existing modules
          >
            <SelectTrigger id="moduleMemberArea">
              <SelectValue placeholder="Selecione uma área de membros" />
            </SelectTrigger>
            <SelectContent>
              {memberAreas.map(area => (
                <SelectItem key={area.id} value={area.id}>
                  {area.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="moduleTitle">Título *</Label>
          <Input id="moduleTitle" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título do Módulo" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="moduleDescription">Descrição</Label>
          <Textarea id="moduleDescription" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição do Módulo" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="moduleBanner">Banner</Label>
          <Input id="moduleBanner" type="file" accept="image/*" onChange={handleFileChange} />
          {bannerFile && <p className="text-sm text-muted-foreground">Arquivo selecionado: {bannerFile.name}</p>}
          {bannerUrl && !bannerFile && (
            <div className="mt-2">
              <img src={bannerUrl} alt="Banner atual" className="h-16 w-auto object-contain" />
              <Button variant="ghost" size="sm" onClick={() => setBannerUrl('')} className="text-destructive">Remover Banner</Button>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="moduleStatus">Publicado</Label>
          <Switch id="moduleStatus" checked={status} onCheckedChange={setStatus} />
        </div>
        <Button className="w-full" onClick={handleSave} disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar Módulo'}
        </Button>
      </div>
    </DialogContent>
  );
};

// Componente para o formulário de Aula
const LessonFormDialog = ({ 
  lesson: editingLesson, 
  onSave, 
  modules, 
  selectedModuleId,
  onClose
}: { 
  lesson?: Lesson, 
  onSave: () => void, 
  modules: Module[], 
  selectedModuleId: string | null,
  onClose: () => void
}) => {
  const [moduleId, setModuleId] = useState(editingLesson?.module_id || selectedModuleId || '');
  const [title, setTitle] = useState(editingLesson?.title || '');
  const [description, setDescription] = useState(editingLesson?.description || '');
  const [durationMinutes, setDurationMinutes] = useState(editingLesson?.duration_minutes || 0);
  const [contentType, setContentType] = useState(editingLesson?.content_type || 'video_link');
  const [contentUrl, setContentUrl] = useState(editingLesson?.content_url || '');
  const [textContent, setTextContent] = useState(editingLesson?.text_content || '');
  const [status, setStatus] = useState(editingLesson?.status === 'published');
  const [videoFile, setVideoFile] = useState<File | null>(null); // Novo estado para upload de vídeo
  const [pdfFile, setPdfFile] = useState<File | null>(null);     // Novo estado para upload de PDF
  const [imageFile, setImageFile] = useState<File | null>(null); // Novo estado para upload de imagem
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (editingLesson) {
      setModuleId(editingLesson.module_id);
      setTitle(editingLesson.title);
      setDescription(editingLesson.description || '');
      setDurationMinutes(editingLesson.duration_minutes || 0);
      setContentType(editingLesson.content_type);
      setContentUrl(editingLesson.content_url || '');
      setTextContent(editingLesson.text_content || '');
      setStatus(editingLesson.status === 'published');
      setVideoFile(null); // Limpar arquivos ao editar
      setPdfFile(null);
      setImageFile(null);
    } else {
      setModuleId(selectedModuleId || '');
      setTitle('');
      setDescription('');
      setDurationMinutes(0);
      setContentType('video_link');
      setContentUrl('');
      setTextContent('');
      setStatus(false);
      setVideoFile(null);
      setPdfFile(null);
      setImageFile(null);
    }
  }, [editingLesson, selectedModuleId]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, fileType: 'video' | 'pdf' | 'image') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (fileType === 'video') setVideoFile(file);
      else if (fileType === 'pdf') setPdfFile(file);
      else if (fileType === 'image') setImageFile(file);
      setContentUrl(''); // Limpar URL existente ao selecionar novo arquivo
    }
  };

  const handleSave = async () => {
    if (!user?.id || !moduleId || !title || !contentType) {
      toast({ title: "Erro", description: "Preencha todos os campos obrigatórios.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      let finalContentUrl = contentUrl;
      let finalTextContent = textContent;

      if (contentType === 'video_upload' && videoFile) {
        finalContentUrl = await uploadFile(videoFile, 'lesson-videos');
        finalTextContent = ''; // Limpar texto se for upload de vídeo
      } else if (contentType === 'pdf_upload' && pdfFile) {
        finalContentUrl = await uploadFile(pdfFile, 'lesson-pdfs');
        finalTextContent = ''; // Limpar texto se for upload de PDF
      } else if (contentType === 'image_upload' && imageFile) {
        finalContentUrl = await uploadFile(imageFile, 'lesson-images');
        finalTextContent = ''; // Limpar texto se for upload de imagem
      } else if (contentType === 'text_content') {
        finalContentUrl = ''; // Limpar URL se for texto
      } else if (contentType === 'video_link' && !contentUrl) {
        toast({ title: "Erro", description: "A URL do vídeo é obrigatória.", variant: "destructive" });
        setLoading(false);
        return;
      }

      const payload = {
        module_id: moduleId,
        title,
        description,
        duration_minutes: durationMinutes,
        content_type: contentType,
        content_url: finalContentUrl,
        text_content: finalTextContent,
        status: status ? 'published' : 'draft',
        order_index: editingLesson?.order_index || 0, // Preserve order or set default
      };

      if (editingLesson) {
        const { error } = await supabase
          .from('lessons')
          .update(payload)
          .eq('id', editingLesson.id);
        if (error) throw error;
        toast({ title: "Sucesso", description: "Aula atualizada!" });
      } else {
        const { error } = await supabase
          .from('lessons')
          .insert(payload);
        if (error) throw error;
        toast({ title: "Sucesso", description: "Aula criada!" });
      }
      onSave();
      onClose();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Falha ao salvar aula.", variant: "destructive" });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{editingLesson ? 'Editar Aula' : 'Criar Nova Aula'}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="lessonModule">Módulo *</Label>
          <Select 
            value={moduleId} 
            onValueChange={setModuleId}
            disabled={!!editingLesson} // Cannot change module for existing lessons
          >
            <SelectTrigger id="lessonModule">
              <SelectValue placeholder="Selecione o módulo" />
            </SelectTrigger>
            <SelectContent>
              {modules.map(mod => (
                <SelectItem key={mod.id} value={mod.id}>
                  {mod.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="lessonTitle">Título *</Label>
          <Input id="lessonTitle" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título da Aula" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lessonDescription">Descrição</Label>
          <Textarea id="lessonDescription" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição da Aula" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lessonDuration">Duração (minutos)</Label>
          <Input id="lessonDuration" type="number" value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value))} placeholder="Ex: 15" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contentType">Tipo de Conteúdo *</Label>
          <Select value={contentType} onValueChange={setContentType}>
            <SelectTrigger id="contentType">
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="video_link">Vídeo (Link)</SelectItem>
              <SelectItem value="video_upload">Vídeo (Upload)</SelectItem>
              <SelectItem value="pdf_upload">PDF (Upload)</SelectItem>
              <SelectItem value="image_upload">Imagem (Upload)</SelectItem>
              <SelectItem value="text_content">Texto HTML</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {contentType === 'video_link' && (
          <div className="space-y-2">
            <Label htmlFor="contentUrl">URL do Vídeo *</Label>
            <Input id="contentUrl" type="url" value={contentUrl} onChange={(e) => setContentUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." required />
          </div>
        )}
        {contentType === 'video_upload' && (
          <div className="space-y-2">
            <Label htmlFor="videoFile">Upload de Vídeo *</Label>
            <Input id="videoFile" type="file" accept="video/*" onChange={(e) => handleFileUpload(e, 'video')} required={!editingLesson?.content_url} />
            {videoFile && <p className="text-sm text-muted-foreground">Arquivo selecionado: {videoFile.name}</p>}
            {editingLesson?.content_url && !videoFile && <p className="text-sm text-muted-foreground">Vídeo atual: <a href={editingLesson.content_url} target="_blank" rel="noopener noreferrer" className="underline">Ver</a></p>}
          </div>
        )}
        {contentType === 'pdf_upload' && (
          <div className="space-y-2">
            <Label htmlFor="pdfFile">Upload de PDF *</Label>
            <Input id="pdfFile" type="file" accept="application/pdf" onChange={(e) => handleFileUpload(e, 'pdf')} required={!editingLesson?.content_url} />
            {pdfFile && <p className="text-sm text-muted-foreground">Arquivo selecionado: {pdfFile.name}</p>}
            {editingLesson?.content_url && !pdfFile && <p className="text-sm text-muted-foreground">PDF atual: <a href={editingLesson.content_url} target="_blank" rel="noopener noreferrer" className="underline">Ver</a></p>}
          </div>
        )}
        {contentType === 'image_upload' && (
          <div className="space-y-2">
            <Label htmlFor="imageFile">Upload de Imagem *</Label>
            <Input id="imageFile" type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'image')} required={!editingLesson?.content_url} />
            {imageFile && <p className="text-sm text-muted-foreground">Arquivo selecionado: {imageFile.name}</p>}
            {editingLesson?.content_url && !imageFile && <p className="text-sm text-muted-foreground">Imagem atual: <a href={editingLesson.content_url} target="_blank" rel="noopener noreferrer" className="underline">Ver</a></p>}
          </div>
        )}
        {contentType === 'text_content' && (
          <div className="space-y-2">
            <Label htmlFor="textContent">Conteúdo em Texto (HTML)</Label>
            <Textarea id="textContent" value={textContent} onChange={(e) => setTextContent(e.target.value)} placeholder="<p>Seu conteúdo aqui...</p>" rows={5} />
          </div>
        )}
        <div className="flex items-center justify-between">
          <Label htmlFor="lessonStatus">Publicado</Label>
          <Switch id="lessonStatus" checked={status} onCheckedChange={setStatus} />
        </div>
        <Button className="w-full" onClick={handleSave} disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar Aula'}
        </Button>
      </div>
    </DialogContent>
  );
};

// Componente para listar Módulos
const ModulesList = ({ memberAreaId, onEditModule, onModuleDeleted }: { memberAreaId: string | null, onEditModule: (module: Module) => void, onModuleDeleted: () => void }) => {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchModules = useCallback(async () => {
    if (!user?.id || !memberAreaId) {
      setModules([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('modules')
      .select('*')
      .eq('user_id', user.id)
      .eq('member_area_id', memberAreaId)
      .order('order_index', { ascending: true });
    
    if (error) {
      toast({ title: "Erro", description: "Falha ao carregar módulos.", variant: "destructive" });
      console.error(error);
    } else {
      setModules(data || []);
    }
    setLoading(false);
  }, [user?.id, memberAreaId, toast]);

  useEffect(() => {
    fetchModules();
  }, [fetchModules]);

  const handleDeleteModule = async (moduleId: string, moduleTitle: string) => {
    try {
      const { error } = await supabase
        .from('modules')
        .delete()
        .eq('id', moduleId);
      
      if (error) throw error;
      toast({ title: "Sucesso", description: `Módulo "${moduleTitle}" excluído.` });
      onModuleDeleted(); // Notify parent to refresh
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Falha ao excluir módulo.", variant: "destructive" });
      console.error(error);
    }
  };

  if (loading) return <p>Carregando módulos...</p>;
  if (modules.length === 0) return <p className="text-muted-foreground">Nenhum módulo criado ainda para esta área de membros.</p>;

  return (
    <div className="space-y-4">
      {modules.map(module => (
        <Card key={module.id}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">{module.title}</h3>
              <p className="text-sm text-muted-foreground">{module.description?.substring(0, 100)}...</p>
              <Badge variant={module.status === 'published' ? 'default' : 'secondary'} className="mt-1">
                {module.status === 'published' ? 'Publicado' : 'Rascunho'}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => onEditModule(module)}>
                <Edit className="h-4 w-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja excluir o módulo <strong>"{module.title}"</strong>? Todas as aulas e acessos associados também serão excluídos. Esta ação é irreversível.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDeleteModule(module.id, module.title)}>Excluir</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// Componente para listar Aulas
const LessonsList = ({ moduleId, onEditLesson, onLessonDeleted }: { moduleId: string | null, onEditLesson: (lesson: Lesson) => void, onLessonDeleted: () => void }) => {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();
  const [openLessons, setOpenLessons] = useState<Set<string>>(new Set()); // Estado para controlar aulas abertas/fechadas

  const fetchLessons = useCallback(async (id: string) => {
    if (!user?.id || !id) {
      setLessons([]);
      setLoading(false);
      return;
    }
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
      onLessonDeleted(); // Notify parent to refresh
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
        // Embed YouTube/Vimeo links
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
          <div className="relative w-full" style={{ paddingTop: '100%' }}> {/* 1:1 aspect ratio for PDF */}
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
  if (lessons.length === 0) return <p className="text-muted-foreground">Nenhuma aula criada para este módulo.</p>;

  return (
    <div className="space-y-4">
      {lessons.map(lesson => {
        const isOpen = openLessons.has(lesson.id);
        return (
          <Card key={lesson.id}>
            <CardContent className="p-4">
              <Collapsible open={isOpen} onOpenChange={() => toggleLesson(lesson.id)}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">{lesson.title}</h3>
                    <p className="text-sm text-muted-foreground">{lesson.description?.substring(0, 100)}...</p>
                    <Badge variant={lesson.status === 'published' ? 'default' : 'secondary'} className="mt-1">
                      {lesson.status === 'published' ? 'Publicado' : 'Rascunho'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => onEditLesson(lesson)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir a aula <strong>"{lesson.title}"</strong>? Esta ação é irreversível.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteLesson(lesson.id, lesson.title)}>Excluir</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm">
                        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                </div>
                <CollapsibleContent className="space-y-4 mt-4">
                  {lesson.content_url && (
                    <div className="border rounded-lg overflow-hidden">
                      {renderLessonContent(lesson)}
                    </div>
                  )}
                  {lesson.text_content && lesson.content_type === 'text_content' && (
                    <div className="border rounded-lg p-4">
                      {renderLessonContent(lesson)}
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

const AdminContent = ({ memberAreaId: propMemberAreaId }: { memberAreaId?: string }) => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { memberAreaId: urlMemberAreaId } = useParams<{ memberAreaId: string }>();
  const currentMemberAreaId = propMemberAreaId || urlMemberAreaId;

  const [memberAreas, setMemberAreas] = useState<MemberArea[]>([]);
  const [modules, setModules] = useState<Module[]>([]); // For the lesson module selector
  const [currentModuleId, setCurrentModuleId] = useState<string | null>(null); // For the lesson list filter
  
  const [isModuleFormOpen, setIsModuleFormOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | undefined>(undefined);

  const [isLessonFormOpen, setIsLessonFormOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | undefined>(undefined);

  useEffect(() => {
    if (user && isAdmin && currentMemberAreaId) {
      fetchMemberAreas();
    }
  }, [user, isAdmin, currentMemberAreaId]);

  const fetchMemberAreas = async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from('member_areas')
      .select('id, name, slug')
      .eq('user_id', user.id)
      .order('name', { ascending: true });
    
    if (error) {
      toast({ title: "Erro", description: "Falha ao carregar áreas de membros.", variant: "destructive" });
      console.error(error);
    } else {
      setMemberAreas(data || []);
    }
  };

  const fetchModulesForSelector = useCallback(async () => {
    if (!user?.id || !currentMemberAreaId) {
      setModules([]);
      setCurrentModuleId(null);
      return;
    }
    const { data, error } = await supabase
      .from('modules')
      .select('id, title')
      .eq('user_id', user.id)
      .eq('member_area_id', currentMemberAreaId)
      .order('title', { ascending: true });
    
    if (error) {
      toast({ title: "Erro", description: "Falha ao carregar módulos para seleção.", variant: "destructive" });
      console.error(error);
    } else {
      setModules(data || []);
      if (data && data.length > 0 && !currentModuleId) {
        setCurrentModuleId(data[0].id); // Select the first module by default
      } else if (data && data.length > 0 && currentModuleId && !data.some(m => m.id === currentModuleId)) {
        // If previously selected module is no longer in the list (e.g., deleted or moved)
        setCurrentModuleId(data[0].id);
      } else if (data && data.length === 0) {
        setCurrentModuleId(null);
      }
    }
  }, [user?.id, currentMemberAreaId, currentModuleId, toast]);

  useEffect(() => {
    fetchModulesForSelector();
  }, [fetchModulesForSelector]);

  const handleModuleSaved = () => {
    fetchModulesForSelector(); // Refresh modules list for selector
  };

  const handleLessonSaved = () => {
    if (currentModuleId) {
      // Re-fetch lessons for the current module
      // This is handled by the LessonsList component's useEffect
    }
  };

  const handleEditModule = (module: Module) => {
    setEditingModule(module);
    setIsModuleFormOpen(true);
  };

  const handleEditLesson = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setIsLessonFormOpen(true);
  };

  if (authLoading) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  if (!user || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (!currentMemberAreaId) {
    return <p>Nenhuma área de membros selecionada.</p>;
  }

  return (
    <div className="p-6">
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
              <Dialog open={isModuleFormOpen} onOpenChange={setIsModuleFormOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={() => setEditingModule(undefined)}>
                    <Plus className="mr-2 h-4 w-4" /> Novo Módulo
                  </Button>
                </DialogTrigger>
                <ModuleFormDialog 
                  module={editingModule} 
                  onSave={handleModuleSaved} 
                  memberAreas={memberAreas} 
                  selectedMemberAreaId={currentMemberAreaId}
                  onClose={() => setIsModuleFormOpen(false)}
                />
              </Dialog>
            </CardHeader>
            <CardContent>
              <ModulesList 
                memberAreaId={currentMemberAreaId} 
                onEditModule={handleEditModule} 
                onModuleDeleted={handleModuleSaved} 
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lessons" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Aulas</CardTitle>
              <div className="flex items-center gap-2">
                <Select value={currentModuleId || "none"} onValueChange={value => setCurrentModuleId(value === "none" ? null : value)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Selecionar Módulo" />
                  </SelectTrigger>
                  <SelectContent>
                    {modules.length === 0 ? (
                      <SelectItem value="none" disabled>Nenhum módulo disponível</SelectItem>
                    ) : (
                      modules.map(module => (
                        <SelectItem key={module.id} value={module.id}>
                          {module.title}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <Dialog open={isLessonFormOpen} onOpenChange={setIsLessonFormOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" disabled={!currentModuleId} onClick={() => setEditingLesson(undefined)}>
                      <Plus className="mr-2 h-4 w-4" /> Nova Aula
                    </Button>
                  </DialogTrigger>
                  <LessonFormDialog 
                    lesson={editingLesson}
                    onSave={handleLessonSaved} 
                    modules={modules} 
                    selectedModuleId={currentModuleId}
                    onClose={() => setIsLessonFormOpen(false)}
                  />
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {currentModuleId ? (
                <LessonsList 
                  moduleId={currentModuleId} 
                  onEditLesson={handleEditLesson} 
                  onLessonDeleted={handleLessonSaved} 
                />
              ) : (
                <p className="text-muted-foreground">Selecione um módulo para ver as aulas.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminContent;