import React, { useState } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; // Import Select components
import { UserPlus, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { generateRandomString } from '@/utils/authUtils';

const newMemberSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres'),
  role: z.enum(['member', 'admin']).default('member'), // Adicionado campo de função
});

type NewMemberForm = z.infer<typeof newMemberSchema>;

interface NewMemberDialogProps {
  projectId: string;
  onMemberAdded?: () => void;
}

export function NewMemberDialog({ projectId, onMemberAdded }: NewMemberDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<NewMemberForm>({
    resolver: zodResolver(newMemberSchema),
    defaultValues: {
      name: '',
      email: '',
      password: generateRandomString(12),
      role: 'member', // Função padrão
    },
  });

  const handleGeneratePassword = () => {
    form.setValue('password', generateRandomString(12));
  };

  const onSubmit = async (data: NewMemberForm) => {
    setLoading(true);
    try {
      // Chamar a Edge Function para criar o membro
      const { data: edgeFunctionResult, error: edgeFunctionError } = await supabase.functions.invoke(
        'create-project-member',
        {
          body: {
            email: data.email,
            password: data.password,
            name: data.name,
            role: data.role,
            projectId: projectId,
          },
          method: 'POST',
        }
      );

      if (edgeFunctionError) {
        console.error('Erro ao invocar Edge Function create-project-member:', edgeFunctionError);
        throw new Error(edgeFunctionError.message);
      }

      if (!edgeFunctionResult?.success) {
        console.error('Edge Function create-project-member retornou erro:', edgeFunctionResult?.error);
        throw new Error(edgeFunctionResult?.error || 'Erro desconhecido ao criar membro.');
      }

      toast({
        title: 'Membro adicionado!',
        description: `${data.name} foi adicionado ao projeto com sucesso com a função de ${data.role}.`,
      });
      
      form.reset({
        name: '',
        email: '',
        password: generateRandomString(12),
        role: 'member', // Resetar para a função padrão
      });
      setOpen(false);
      onMemberAdded?.();
    } catch (error: any) {
      console.error('Erro ao adicionar membro:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao adicionar membro. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Adicionar Membro
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adicionar Novo Membro</DialogTitle>
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
            
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email *</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="email@exemplo.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Senha Inicial *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Senha inicial"
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={handleGeneratePassword} 
                    className="mt-2"
                  >
                    <RefreshCw className="mr-2 h-3 w-3" />
                    Gerar Senha Forte
                  </Button>
                  <FormMessage />
                </FormItem>
              )}
            />

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
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Adicionando...' : 'Adicionar Membro'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}