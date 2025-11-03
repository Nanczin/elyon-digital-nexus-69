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
import { Switch } from '@/components/ui/switch';
import { Plus, Upload, Image, BookOpen } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Label } from '@/components/ui/label';
import { Tables } from '@/integrations/supabase/types';

const moduleSchema = z.object({
  title: z.string().min(1, 'Título do módulo é obrigatório'),
  description: z.string().optional(),
  banner: z.any().optional(), // Para o arquivo de upload
  status: z.enum(['draft', 'published']).default('draft'),
  order_index: z.number().int().min(0).default(0),
});

type ModuleForm = z.infer<typeof moduleSchema>;

interface NewModuleDialogProps {
  projectId: string;
  onModuleSaved?: () => void;
  initialModuleData?: Tables<'modules'> | null; // Dados para edição
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function NewModuleDialog({ projectId, onModuleSaved, initialModuleData, open, onOpenChange }: NewModuleDialogProps) {
  const [loading, setLoading] = useState(false);
  const [selectedBannerFile, setSelectedBannerFile] = useState<File | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  
  const form = useForm<ModuleForm>({
    resolver: zodResolver(moduleSchema),
    defaultValues: {
      title: '',
      description: '',
      status: 'draft',
      order_index: 0,
    },
  });

  useEffect(() => {
    if (initialModuleData) {
      form.reset({
        title: initialModuleData.title,
        description: initialModuleData.description || '',
        status: initialModuleData.status as 'draft' | 'published',
        order_index: initialModuleData.order_index || 0,
      });
      setSelectedBannerFile(null);
    } else {
      form.reset({
        title: '',
        description: '',
        status: 'draft',
        order_index: 0,
      });
      setSelectedBannerFile(null);
    }
  }, [initialModuleData, form]);

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

  const onSubmit = async (data: ModuleForm) => {
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
    let bannerUrl: string | null = initialModuleData?.banner_url || null;

    try {
      if (selectedBannerFile) {
        bannerUrl = await uploadFile(selectedBannerFile, 'module-banners', currentUserId);
      }

      const modulePayload = {
        project_id: projectId,
        title: data.title,
        description: data.description || null,
        banner_url: bannerUrl,
        status: data.status,
        order_index: data.order_index,
      };

      if (initialModuleData) {
        // Modo de edição
        const { error } = await supabase
          .from('modules')
          .update(modulePayload)
          .eq('id', initialModuleData.id);

        if (error) throw error;

        toast({
          title: 'Módulo atualizado!',
          description: 'As informações do módulo foram salvas com sucesso.',
        });
      } else {
        // Modo de criação
        const { error } = await supabase
          .from('modules')
          .insert([modulePayload]);

        if (error) {
          throw error;
        }
        
        toast({
          title: 'Módulo criado!',
          description: 'Seu novo módulo foi criado com sucesso.',
        });
      }
      
      form.reset();
      setSelectedBannerFile(null);
      onOpenChange?.(false);
      onModuleSaved?.();
    } catch (error: any) {
      console.error('Erro ao salvar módulo:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao salvar módulo. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {!initialModuleData && (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo Módulo
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{initialModuleData ? 'Editar Módulo' : 'Criar Novo Módulo'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título do Módulo *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Introdução ao Marketing Digital" {...field} />
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
                    <Textarea placeholder="Uma breve descrição do que será abordado neste módulo" rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <Label htmlFor="banner-upload">Banner do Módulo (Opcional)</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  id="banner-upload"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSelectedBannerFile(e.target.files?.[0] || null)}
                  className="file:text-sm"
                />
                <Image className="h-4 w-4 text-muted-foreground" />
              </div>
              {selectedBannerFile && (
                <p className="text-xs text-muted-foreground mt-1">Arquivo selecionado: {selectedBannerFile.name}</p>
              )}
              {initialModuleData?.banner_url && !selectedBannerFile && (
                <p className="text-xs text-muted-foreground mt-1">Banner atual: <a href={initialModuleData.banner_url} target="_blank" rel="noopener noreferrer" className="underline">Ver</a></p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
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
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Status</FormLabel>
                      <FormDescription>
                        Módulo {field.value === 'published' ? 'publicado' : 'em rascunho'}.
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
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange?.(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (initialModuleData ? 'Atualizando...' : 'Criando...') : (initialModuleData ? 'Salvar Alterações' : 'Criar Módulo')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}