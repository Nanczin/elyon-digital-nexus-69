import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Upload, Video, FileText, Image, Code, Clock } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Label } from '@/components/ui/label';
import { Tables } from '@/integrations/supabase/types';
import { FormDescription } from '@/components/ui/form'; // Importação adicionada

const lessonSchema = z.object({
  title: z.string().min(1, 'Título da aula é obrigatório'),
  description: z.string().optional(),
  duration_minutes: z.number().int().min(0).optional(),
  content_type: z.enum(['video', 'pdf', 'image', 'text', 'html']).default('text'),
  content_url: z.string().url('URL de conteúdo inválida').optional().or(z.literal('')),
  text_content: z.string().optional(),
  status: z.enum(['draft', 'published']).default('draft'),
  order_index: z.number().int().min(0).default(0),
});

type LessonForm = z.infer<typeof lessonSchema>;

interface NewLessonDialogProps {
  moduleId: string;
  onLessonSaved?: () => void;
  initialLessonData?: Tables<'lessons'> | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function NewLessonDialog({ moduleId, onLessonSaved, initialLessonData, open, onOpenChange }: NewLessonDialogProps) {
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  
  const form = useForm<LessonForm>({
    resolver: zodResolver(lessonSchema),
    defaultValues: {
      title: '',
      description: '',
      duration_minutes: 0,
      content_type: 'text',
      content_url: '',
      text_content: '',
      status: 'draft',
      order_index: 0,
    },
  });

  useEffect(() => {
    if (initialLessonData) {
      form.reset({
        title: initialLessonData.title,
        description: initialLessonData.description || '',
        duration_minutes: initialLessonData.duration_minutes || 0,
        content_type: initialLessonData.content_type as 'video' | 'pdf' | 'image' | 'text' | 'html',
        content_url: initialLessonData.content_url || '',
        text_content: initialLessonData.text_content || '',
        status: initialLessonData.status as 'draft' | 'published',
        order_index: initialLessonData.order_index || 0,
      });
      setSelectedFile(null);
    } else {
      form.reset({
        title: '',
        description: '',
        duration_minutes: 0,
        content_type: 'text',
        content_url: '',
        text_content: '',
        status: 'draft',
        order_index: 0,
      });
      setSelectedFile(null);
    }
  }, [initialLessonData, form]);

  const uploadFile = async (file: File, folder: string, userId: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('builder-assets')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('builder-assets')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const onSubmit = async (data: LessonForm) => {
    if (!user?.id) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado.",
        variant: "destructive",
      });
      return;
    }

    const currentUserId = user.id as string;
    setLoading(true);
    let contentUrl: string | null = initialLessonData?.content_url || null;

    try {
      if (selectedFile) {
        contentUrl = await uploadFile(selectedFile, 'lesson-content', currentUserId);
      } else if (data.content_type !== 'text' && data.content_url) {
        contentUrl = data.content_url;
      } else {
        contentUrl = null;
      }

      const lessonPayload = {
        module_id: moduleId,
        title: data.title,
        description: data.description || null,
        duration_minutes: data.duration_minutes || null,
        content_type: data.content_type,
        content_url: contentUrl,
        text_content: data.content_type === 'text' || data.content_type === 'html' ? data.text_content || null : null,
        status: data.status,
        order_index: data.order_index,
      };

      if (initialLessonData) {
        const { error } = await supabase
          .from('lessons')
          .update(lessonPayload)
          .eq('id', initialLessonData.id);

        if (error) throw error;

        toast({
          title: 'Aula atualizada!',
          description: 'As informações da aula foram salvas com sucesso.',
        });
      } else {
        const { error } = await supabase
          .from('lessons')
          .insert([lessonPayload]);

        if (error) {
          throw error;
        }
        
        toast({
          title: 'Aula criada!',
          description: 'Sua nova aula foi criada com sucesso.',
        });
      }
      
      form.reset();
      setSelectedFile(null);
      onOpenChange?.(false);
      onLessonSaved?.();
    } catch (error: any) {
      console.error('Erro ao salvar aula:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao salvar aula. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const renderContentTypeField = (contentType: string) => {
    switch (contentType) {
      case 'video':
        return (
          <FormField
            control={form.control}
            name="content_url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>URL do Vídeo (YouTube, Vimeo, etc.)</FormLabel>
                <FormControl>
                  <Input placeholder="https://www.youtube.com/watch?v=..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      case 'pdf':
      case 'image':
        return (
          <div>
            <Label htmlFor="content-file-upload">Upload de Arquivo ({contentType.toUpperCase()})</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                id="content-file-upload"
                type="file"
                accept={contentType === 'pdf' ? '.pdf' : 'image/*'}
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="file:text-sm"
              />
              {contentType === 'pdf' ? <FileText className="h-4 w-4 text-muted-foreground" /> : <Image className="h-4 w-4 text-muted-foreground" />}
            </div>
            {selectedFile && (
              <p className="text-xs text-muted-foreground mt-1">Arquivo selecionado: {selectedFile.name}</p>
            )}
            {initialLessonData?.content_url && !selectedFile && (
              <p className="text-xs text-muted-foreground mt-1">Arquivo atual: <a href={initialLessonData.content_url} target="_blank" rel="noopener noreferrer" className="underline">Ver</a></p>
            )}
          </div>
        );
      case 'text':
      case 'html':
        return (
          <FormField
            control={form.control}
            name="text_content"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Conteúdo ({contentType.toUpperCase()})</FormLabel>
                <FormControl>
                  <Textarea placeholder="Digite o conteúdo da aula aqui..." rows={8} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {!initialLessonData && (
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Nova Aula
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{initialLessonData ? 'Editar Aula' : 'Criar Nova Aula'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título da Aula *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Entendendo os Fundamentos" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Uma breve descrição do que será ensinado nesta aula" rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="duration_minutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duração (minutos)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="order_index"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ordem de Exibição</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="content_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Conteúdo *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo de conteúdo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="video">Vídeo</SelectItem>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="image">Imagem</SelectItem>
                      <SelectItem value="text">Texto</SelectItem>
                      <SelectItem value="html">HTML</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {renderContentTypeField(form.watch('content_type'))}

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Status</FormLabel>
                    <FormDescription>
                      Aula {field.value === 'published' ? 'publicada' : 'em rascunho'}.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value === 'published'}
                      onCheckedChange={checked => field.onChange(checked ? 'published' : 'draft')}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange?.(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (initialLessonData ? 'Atualizando...' : 'Criando...') : (initialLessonData ? 'Salvar Alterações' : 'Criar Aula')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}