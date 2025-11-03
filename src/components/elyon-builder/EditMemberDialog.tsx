import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, User } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const editMemberSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  role: z.enum(['member', 'admin']),
});

type EditMemberForm = z.infer<typeof editMemberSchema>;

interface EditMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  memberId: string; // Este é o ID da entrada em 'project_members'
  initialMemberData: {
    userId: string; // Este é o user_id do Supabase Auth (e profiles.user_id)
    name: string; // Nome do perfil
    email: string; // Email do perfil
    role: 'member' | 'admin'; // Função no projeto
  };
  onMemberUpdated?: () => void;
}

export function EditMemberDialog({
  open,
  onOpenChange,
  projectId,
  memberId, // ID da entrada em project_members
  initialMemberData,
  onMemberUpdated,
}: EditMemberDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<EditMemberForm>({
    resolver: zodResolver(editMemberSchema),
    defaultValues: {
      name: initialMemberData.name,
      role: initialMemberData.role,
    },
  });

  // Preenche o formulário quando o diálogo abre ou os dados iniciais mudam
  useEffect(() => {
    if (open && initialMemberData) {
      form.reset({
        name: initialMemberData.name,
        role: initialMemberData.role,
      });
    }
  }, [open, initialMemberData, form]);

  const onSubmit = async (data: EditMemberForm) => {
    setLoading(true);
    try {
      // 1. Atualizar o nome na tabela 'profiles'
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ name: data.name })
        .eq('user_id', initialMemberData.userId); // Usa o user_id para encontrar o perfil

      if (profileError) throw profileError;

      // 2. Atualizar a função na tabela 'project_members'
      const { error: memberError } = await supabase
        .from('project_members')
        .update({ role: data.role })
        .eq('id', memberId); // Usa o ID da entrada em project_members

      if (memberError) throw memberError;

      toast({
        title: 'Membro atualizado!',
        description: `As informações de ${data.name} foram salvas com sucesso.`,
      });

      onOpenChange(false); // Fecha o diálogo
      onMemberUpdated?.(); // Chama o callback para atualizar a lista de membros
    } catch (error: any) {
      console.error('Erro ao atualizar membro:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao atualizar membro. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Configurações de Membro</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome completo do membro" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormItem>
              <FormLabel>Email</FormLabel>
              <Input value={initialMemberData.email} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">O email não pode ser alterado diretamente aqui.</p>
            </FormItem>

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Função no Projeto *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a função" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="member">Membro</SelectItem>
                      <SelectItem value="admin">Administrador do Projeto</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}