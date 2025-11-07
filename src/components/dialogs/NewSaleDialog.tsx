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
        <Button className="text-sm sm:text-base"> {/* Ajustado text size */}
          <span>
            <ShoppingCart className="mr-2 h-4 w-4" />
            Nova Venda
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] mx-2 sm:mx-auto"> {/* Ajustado max-w- e adicionado mx-2 sm:mx-auto */}
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Registrar Nova Venda</DialogTitle> {/* Ajustado text size */}
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="customer_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Nome do Cliente</FormLabel> {/* Ajustado text size */}
                  <FormControl>
                    <Input placeholder="Nome completo" {...field} className="text-sm" /> {/* Ajustado text size */}
                  </FormControl>
                  <FormMessage className="text-xs" /> {/* Ajustado text size */}
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="customer_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Email do Cliente</FormLabel> {/* Ajustado text size */}
                  <FormControl>
                    <Input type="email" placeholder="email@exemplo.com" {...field} className="text-sm" /> {/* Ajustado text size */}
                  </FormControl>
                  <FormMessage className="text-xs" /> {/* Ajustado text size */}
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="product"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Produto</FormLabel> {/* Ajustado text size */}
                  <FormControl>
                    <Input placeholder="Nome do produto" {...field} className="text-sm" /> {/* Ajustado text size */}
                  </FormControl>
                  <FormMessage className="text-xs" /> {/* Ajustado text size */}
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Valor (R$)</FormLabel> {/* Ajustado text size */}
                  <FormControl>
                    <Input placeholder="0,00" {...field} className="text-sm" /> {/* Ajustado text size */}
                  </FormControl>
                  <FormMessage className="text-xs" /> {/* Ajustado text size */}
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="payment_method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Método de Pagamento</FormLabel> {/* Ajustado text size */}
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="text-sm"> {/* Ajustado text size */}
                        <SelectValue placeholder="Selecione o método" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pix" className="text-sm">PIX</SelectItem> {/* Ajustado text size */}
                      <SelectItem value="credit_card" className="text-sm">Cartão de Crédito</SelectItem> {/* Ajustado text size */}
                      <SelectItem value="debit_card" className="text-sm">Cartão de Débito</SelectItem> {/* Ajustado text size */}
                      <SelectItem value="boleto" className="text-sm">Boleto</SelectItem> {/* Ajustado text size */}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-xs" /> {/* Ajustado text size */}
                </FormItem>
              )}
            />
            
            <div className="flex flex-col-reverse sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2"> {/* Ajustado flex e space-y */}
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="w-full sm:w-auto text-sm"> {/* Ajustado w, text size */}
                Cancelar
              </Button>
              <Button type="submit" className="w-full sm:w-auto text-sm"> {/* Ajustado w, text size */}
                Registrar Venda
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}