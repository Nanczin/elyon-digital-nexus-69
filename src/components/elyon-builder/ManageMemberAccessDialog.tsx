import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookOpen, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Product {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean | null;
}

interface ManageMemberAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  memberId: string; // user_id do membro
  memberName: string;
  onAccessUpdated?: () => void;
}

export function ManageMemberAccessDialog({
  open,
  onOpenChange,
  projectId,
  memberId,
  memberName,
  onAccessUpdated,
}: ManageMemberAccessDialogProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [projectProducts, setProjectProducts] = useState<Product[]>([]);
  const [memberProductAccess, setMemberProductAccess] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchProductsAndAccess();
    }
  }, [open, projectId, memberId]);

  const fetchProductsAndAccess = async () => {
    setLoading(true);
    try {
      // 1. Buscar todos os produtos (módulos) associados a este projeto
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, name, description, is_active')
        .eq('project_id', projectId)
        .order('name', { ascending: true });

      if (productsError) throw productsError;
      setProjectProducts(productsData || []);

      // 2. Buscar os acessos existentes do membro para este projeto
      const { data: accessData, error: accessError } = await supabase
        .from('product_access')
        .select('product_id')
        .eq('user_id', memberId)
        .in('product_id', productsData?.map(p => p.id) || []); // Apenas acessos para produtos deste projeto

      if (accessError) throw accessError;
      
      const currentAccess = new Set(accessData?.map(a => a.product_id) || []);
      setMemberProductAccess(currentAccess);

    } catch (error: any) {
      console.error('Erro ao carregar produtos e acessos:', error.message);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os módulos e acessos do membro.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAccess = (productId: string, hasAccess: boolean) => {
    setMemberProductAccess(prev => {
      const newSet = new Set(prev);
      if (hasAccess) {
        newSet.add(productId);
      } else {
        newSet.delete(productId);
      }
      return newSet;
    });
  };

  const handleSaveAccess = async () => {
    setSaving(true);
    try {
      // Remover acessos que foram desmarcados
      const productsToRemoveAccess = projectProducts.filter(product => 
        !memberProductAccess.has(product.id) && // Não está no conjunto de acessos atuais
        memberProductAccess.has(product.id) !== // E tinha acesso antes (para evitar tentar remover o que nunca teve)
        new Set((await supabase.from('product_access').select('product_id').eq('user_id', memberId).in('product_id', [product.id])).data?.map(a => a.product_id) || []).has(product.id)
      );

      if (productsToRemoveAccess.length > 0) {
        const { error: deleteError } = await supabase
          .from('product_access')
          .delete()
          .eq('user_id', memberId)
          .in('product_id', productsToRemoveAccess.map(p => p.id));
        if (deleteError) throw deleteError;
      }

      // Adicionar acessos que foram marcados
      const productsToAddAccess = projectProducts.filter(product => 
        memberProductAccess.has(product.id) && // Está no conjunto de acessos atuais
        !new Set((await supabase.from('product_access').select('product_id').eq('user_id', memberId).in('product_id', [product.id])).data?.map(a => a.product_id) || []).has(product.id)
      );

      if (productsToAddAccess.length > 0) {
        const newAccessEntries = productsToAddAccess.map(product => ({
          user_id: memberId,
          product_id: product.id,
          source: 'project_member_manual_access',
        }));
        const { error: insertError } = await supabase
          .from('product_access')
          .insert(newAccessEntries);
        if (insertError) throw insertError;
      }

      toast({
        title: 'Acesso atualizado!',
        description: `As permissões de ${memberName} foram salvas com sucesso.`,
      });
      onOpenChange(false);
      onAccessUpdated?.();
    } catch (error: any) {
      console.error('Erro ao salvar acessos:', error.message);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao salvar acessos. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSelectAll = () => {
    const allProductIds = new Set(projectProducts.map(p => p.id));
    setMemberProductAccess(allProductIds);
  };

  const handleDeselectAll = () => {
    setMemberProductAccess(new Set());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Gerenciar Acesso de {memberName}</DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="ml-3 text-muted-foreground">Carregando módulos...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between gap-2">
              <Button variant="outline" size="sm" onClick={handleSelectAll} className="flex-1">
                <CheckCircle className="mr-2 h-4 w-4" />
                Liberar Tudo
              </Button>
              <Button variant="outline" size="sm" onClick={handleDeselectAll} className="flex-1">
                <XCircle className="mr-2 h-4 w-4" />
                Bloquear Tudo
              </Button>
            </div>

            <ScrollArea className="h-64 border rounded-md p-4">
              <div className="space-y-3">
                {projectProducts.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    Nenhum módulo encontrado para este projeto.
                  </p>
                ) : (
                  projectProducts.map(product => (
                    <div key={product.id} className="flex items-center space-x-3">
                      <Checkbox
                        id={`product-${product.id}`}
                        checked={memberProductAccess.has(product.id)}
                        onCheckedChange={(checked: boolean) => handleToggleAccess(product.id, checked)}
                      />
                      <Label htmlFor={`product-${product.id}`} className="flex-1 cursor-pointer">
                        <span className="font-medium">{product.name}</span>
                        {product.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">{product.description}</p>
                        )}
                        {!product.is_active && (
                          <p className="text-xs text-red-500"> (Inativo)</p>
                        )}
                      </Label>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
            
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="button" onClick={handleSaveAccess} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar Acessos'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}