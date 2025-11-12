import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { useAuth } from '@/hooks/useAuth';
import { Link as LinkIcon, Upload, XCircle } from 'lucide-react';

type Module = Tables<'modules'>;
type Lesson = Tables<'lessons'>;

const uploadFile = async (file: File, subfolder: string) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${crypto.randomUUID()}.${fileExt}`;
  const filePath = `lesson-content/${subfolder}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('member-area-content')
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from('member-area-content')
    .getPublicUrl(filePath);

  return data.publicUrl;
};

interface LessonFormDialogProps {
  lesson?: Lesson;
  onSave: () => void;
  modules: Module[];
  selectedModuleId: string | null;
  onClose: () => void;
}

export const LessonFormDialog: React.FC<LessonFormDialogProps> = ({
  lesson: editingLesson,
  onSave,
  modules,
  selectedModuleId,
  onClose,
}) => {
  const [title, setTitle] = useState(editingLesson?.title || '');
  const [description, setDescription] = useState(editingLesson?.description || '');
  const [durationMinutes, setDurationMinutes] = useState(editingLesson?.duration_minutes || 0);
  const [contentType, setContentType] = useState(editingLesson?.content_type || 'text_content');
  const [contentUrl, setContentUrl] = useState(editingLesson?.content_url || '');
  const [textContent, setTextContent] = useState(editingLesson?.text_content || '');
  const [contentFile, setContentFile] = useState<File | null>(null);
  const [status, setStatus] = useState(editingLesson?.status === 'published');
  const [currentModuleId, setCurrentModuleId] = useState(editingLesson?.module_id || selectedModuleId || '');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (editingLesson) {
      setTitle(editingLesson.title);
      setDescription(editingLesson.description || '');
      setDurationMinutes(editingLesson.duration_minutes || 0);
      setContentType(editingLesson.content_type);
      setContentUrl(editingLesson.content_url || '');
      setTextContent(editingLesson.text_content || '');
      setContentFile(null); // Reset file input on edit
      setStatus(editingLesson.status === 'published');
      setCurrentModuleId(editingLesson.module_id || '');
    } else {
      setTitle('');
      setDescription('');
      setDurationMinutes(0);
      setContentType('text_content');
      setContentUrl('');
      setTextContent('');
      setContentFile(null);
      setStatus(false);
      setCurrentModuleId(selectedModuleId || '');
    }
  }, [editingLesson, selectedModuleId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setContentFile(e.target.files[0]);
      setContentUrl(''); // Clear URL if a file is selected
    }
  };

  const handleSave = async () => {
    if (!user?.id || !currentModuleId) {
      toast({ title: "Erro", description: "Selecione um módulo e faça login.", variant: "destructive" });
      return;
    }
    if (!title) {
      toast({ title: "Erro", description: "O título da aula é obrigatório.", variant: "destructive" });
      return;
    }
    if (contentType === 'text_content' && !textContent.trim()) {
      toast({ title: "Erro", description: "O conteúdo de texto é obrigatório.", variant: "destructive" });
      return;
    }
    if ((contentType === 'video_link' || contentType === 'pdf_upload' || contentType === 'image_upload') && !contentUrl.trim() && !contentFile) {
      toast({ title: "Erro", description: "O link ou arquivo de conteúdo é obrigatório.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      let finalContentUrl = contentUrl;
      if (contentFile) {
        const folder = contentType === 'video_upload' ? 'videos' :
                       contentType === 'pdf_upload' ? 'pdfs' :
                       contentType === 'image_upload' ? 'images' : 'misc';
        finalContentUrl = await uploadFile(contentFile, folder);
      }

      const payload: TablesInsert<'lessons'> = {
        module_id: currentModuleId,
        title,
        description,
        duration_minutes: durationMinutes,
        content_type: contentType,
        content_url: finalContentUrl,
        text_content: textContent,
        status: status ? 'published' : 'draft',
        order_index: editingLesson?.order_index || 0,
      };

      if (editingLesson) {
        const { error } = await supabase
          .from('lessons')
          .update(payload as TablesUpdate<'lessons'>)
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
    <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="text-lg sm:text-xl">{editingLesson ? 'Editar Aula' : 'Criar Nova Aula'}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="lessonModule">Módulo</Label>
          <Select
            value={currentModuleId}
            onValueChange={setCurrentModuleId}
            disabled={!!editingLesson}
          >
            <SelectTrigger id="lessonModule">
              <SelectValue placeholder="Selecione um módulo" />
            </SelectTrigger>
            <SelectContent>
              {modules.map(module => (
                <SelectItem key={module.id} value={module.id}>
                  {module.title}
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
          <Label htmlFor="durationMinutes">Duração (minutos)</Label>
          <Input id="durationMinutes" type="number" value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value))} placeholder="0" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contentType">Tipo de Conteúdo</Label>
          <Select value={contentType} onValueChange={setContentType}>
            <SelectTrigger id="contentType">
              <SelectValue placeholder="Selecione o tipo de conteúdo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text_content">Conteúdo de Texto</SelectItem>
              <SelectItem value="video_link">Link de Vídeo (YouTube/Vimeo)</SelectItem>
              <SelectItem value="video_upload">Upload de Vídeo</SelectItem>
              <SelectItem value="pdf_upload">Upload de PDF</SelectItem>
              <SelectItem value="image_upload">Upload de Imagem</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {contentType === 'text_content' && (
          <div className="space-y-2">
            <Label htmlFor="textContent">Conteúdo de Texto *</Label>
            <Textarea id="textContent" value={textContent} onChange={(e) => setTextContent(e.target.value)} placeholder="Digite o conteúdo da aula aqui..." rows={8} required />
          </div>
        )}

        {(contentType === 'video_link' || contentType === 'pdf_upload' || contentType === 'image_upload') && (
          <div className="space-y-2">
            <Label htmlFor="contentUrl">Link do Conteúdo *</Label>
            <Input id="contentUrl" type="url" value={contentUrl} onChange={(e) => setContentUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." required={!contentFile} />
            <p className="text-xs text-muted-foreground">
              {contentType === 'video_link' && 'Links do YouTube ou Vimeo são suportados.'}
              {contentType === 'pdf_upload' && 'Link direto para o arquivo PDF.'}
              {contentType === 'image_upload' && 'Link direto para a imagem.'}
            </p>
          </div>
        )}

        {(contentType === 'video_upload' || contentType === 'pdf_upload' || contentType === 'image_upload') && (
          <div className="space-y-2">
            <Label htmlFor="contentFile">Upload de Arquivo</Label>
            <Input id="contentFile" type="file" accept={
              contentType === 'video_upload' ? 'video/*' :
              contentType === 'pdf_upload' ? 'application/pdf' :
              contentType === 'image_upload' ? 'image/*' : '*/*'
            } onChange={handleFileChange} required={!contentUrl && !editingLesson?.content_url && !contentFile} />
            {contentFile && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <Upload className="h-4 w-4" />
                <span>Novo arquivo selecionado: {contentFile.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setContentFile(null)}
                  className="h-6 px-2 text-destructive hover:text-destructive"
                >
                  <XCircle className="h-3 w-3 mr-1" /> Remover
                </Button>
              </div>
            )}
            {editingLesson?.content_url && !contentFile && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <LinkIcon className="h-4 w-4" />
                <span>Arquivo atual: <a href={editingLesson.content_url} target="_blank" rel="noopener noreferrer" className="underline">Ver</a></span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setContentUrl('')} // Clear existing URL
                  className="h-6 px-2 text-destructive hover:text-destructive"
                >
                  <XCircle className="h-3 w-3 mr-1" /> Remover
                </Button>
              </div>
            )}
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