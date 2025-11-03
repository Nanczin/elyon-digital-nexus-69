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
import { Plus, Upload, Image, Folder } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Label } from '@/components/ui/label';
import { Project } from '@/pages/ElyonBuilder'; // Importar a interface Project

const projectSchema = z.object({
  name: z.string().min(1, 'Nome do projeto é obrigatório'),
  description: z.string().optional(),
  logo: z.any().optional(), // Para o arquivo de upload
  primaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Cor primária inválida').default('#3b82f6'),
  secondaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Cor secundária inválida').default('#60a5fa'),
});

type ProjectForm = z.infer<typeof projectSchema>;

interface NewProjectDialogProps {
  onProjectCreated?: () => void;
  initialProjectData?: Project | null; // Nova prop para edição
  open?: boolean; // Controla o estado de abertura do diálogo
  onOpenChange?: (open: boolean) => void; // Callback para mudança de estado de abertura
}

export function NewProjectDialog({ onProjectCreated, initialProjectData, open, onOpenChange }: NewProjectDialogProps) {
  const [loading, setLoading] = useState(false);
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  
  const form = useForm<ProjectForm>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: '',
      description: '',
      primaryColor: '#3b82f6',
      secondaryColor: '#60a5fa',
    },
  });

  // Efeito para preencher o formulário quando initialProjectData muda (modo de edição)
  useEffect(() => {
    if (initialProjectData) {
      form.reset({
        name: initialProjectData.name,
        description: initialProjectData.description || '',
        primaryColor: initialProjectData.primary_color,
        secondaryColor: initialProjectData.secondary_color,
        // Não podemos preencher o campo de arquivo (logo) diretamente
      });
      setSelectedLogoFile(null); // Limpar arquivo selecionado ao carregar dados existentes
    } else {
      form.reset({
        name: '',
        description: '',
        primaryColor: '#3b82f6',
        secondaryColor: '#60a5fa',
      });
      setSelectedLogoFile(null); // Limpar arquivo selecionado para novo projeto
    }
  }, [initialProjectData, form]);

  const uploadFile = async (file: File, folder: string, userId: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`; // Organizar por user_id
    const filePath = `${folder}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('builder-assets') // Um bucket dedicado para assets do builder
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('builder-assets')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const onSubmit = async (data: ProjectForm) => {
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
    let logoUrl: string | null = initialProjectData?.logo_url || null; // Manter logo existente se não houver novo upload

    try {
      if (selectedLogoFile) {
        logoUrl = await uploadFile(selectedLogoFile, 'project-logos', currentUserId);
      }

      if (initialProjectData) {
        // Modo de edição
        const { error } = await supabase
          .from('projects')
          .update({
            name: data.name,
            description: data.description || null,
            logo_url: logoUrl,
            primary_color: data.primaryColor,
            secondary_color: data.secondaryColor,
            // access_url e status não são editáveis por este diálogo
          })
          .eq('id', initialProjectData.id);

        if (error) throw error;

        toast({
          title: 'Projeto atualizado!',
          description: 'As informações do projeto foram salvas com sucesso.',
        });
      } else {
        // Modo de criação
        const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-*|-*$/g, '');
        const accessUrl = `${window.location.origin}/member-area/${slug}-${Date.now().toString().slice(-5)}`;

        const { error } = await supabase
          .from('projects')
          .insert([{
            user_id: currentUserId,
            name: data.name,
            description: data.description || null,
            access_url: accessUrl,
            logo_url: logoUrl,
            primary_color: data.primaryColor,
            secondary_color: data.secondaryColor,
            status: 'active'
          }]);

        if (error) {
          throw error;
        }
        
        toast({
          title: 'Projeto criado!',
          description: 'Sua nova área de membros foi criada com sucesso.',
        });
      }
      
      form.reset();
      setSelectedLogoFile(null);
      onOpenChange?.(false); // Fechar o diálogo usando a prop
      onProjectCreated?.();
    } catch (error: any) {
      console.error('Erro ao salvar projeto:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao salvar projeto. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {/* Renderiza o botão de trigger apenas se não estiver no modo de edição (open é controlado externamente) */}
        {!initialProjectData && (
          <Button className="gradient-button">
            <Plus className="mr-2 h-4 w-4" />
            Novo Projeto
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{initialProjectData ? 'Editar Projeto' : 'Criar Novo Projeto'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Projeto *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Meu Curso de Fotografia" {...field} />
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
                    <Textarea placeholder="Uma breve descrição da sua área de membros" rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <Label htmlFor="logo-upload">Logo do Projeto (Opcional)</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSelectedLogoFile(e.target.files?.[0] || null)}
                  className="file:text-sm"
                />
                <Image className="h-4 w-4 text-muted-foreground" />
              </div>
              {selectedLogoFile && (
                <p className="text-xs text-muted-foreground mt-1">Arquivo selecionado: {selectedLogoFile.name}</p>
              )}
              {initialProjectData?.logo_url && !selectedLogoFile && (
                <p className="text-xs text-muted-foreground mt-1">Logo atual: <a href={initialProjectData.logo_url} target="_blank" rel="noopener noreferrer" className="underline">Ver</a></p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="primaryColor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cor Principal</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        <Input type="color" {...field} className="w-12 h-8 p-1 cursor-pointer" />
                        <Input type="text" {...field} placeholder="#3b82f6" className="flex-1" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="secondaryColor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cor Secundária</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        <Input type="color" {...field} className="w-12 h-8 p-1 cursor-pointer" />
                        <Input type="text" {...field} placeholder="#60a5fa" className="flex-1" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange?.(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (initialProjectData ? 'Atualizando...' : 'Criando...') : (initialProjectData ? 'Salvar Alterações' : 'Criar Projeto')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}