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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShoppingCart } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';

const saleSchema = z.object({
  customer_name: z.string().min(1, 'Nome do cliente é obrigatório'),
  customer_email: z.string().email('Email inválido'),
  product: z.string().min(1, 'Produto é obrigatório'),
  amount: z.string().min(1, 'Valor é obrigatório'),
  payment_method: z.string().min(1, 'Método de pagamento é obrigatório'),
});

type SaleForm = z.infer<typeof saleSchema>;

interface NewSaleDialogProps {
  onSaleCreated?: () => void;
}

export function NewSaleDialog({ onSaleCreated }: NewSaleDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<SaleForm>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      customer_name: '',
      customer_email: '',
      product: '',
      amount: '',
      payment_method: '',
    },
  });

  const onSubmit = async (data: SaleForm) => {
    try {
      // Aqui você pode implementar a lógica para salvar a venda
      console.log('Nova venda:', data);
      
      toast({
        title: 'Venda registrada!',
        description: 'A venda foi registrada com sucesso.',
      });
      
      form.reset();
      setOpen(false);
      onSaleCreated?.();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao registrar a venda. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <ShoppingCart className="mr-2 h-4 w-4" />
          Nova Venda
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Registrar Nova Venda</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="customer_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Cliente</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome completo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="customer_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email do Cliente</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="email@exemplo.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="product"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Produto</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome do produto" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor (R$)</FormLabel>
                  <FormControl>
                    <Input placeholder="0,00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="payment_method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Método de Pagamento</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o método" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                      <SelectItem value="debit_card">Cartão de Débito</SelectItem>
                      <SelectItem value="boleto">Boleto</SelectItem>
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
              <Button type="submit">
                Registrar Venda
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}