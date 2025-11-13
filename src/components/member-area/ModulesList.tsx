import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Edit, Trash2, MonitorDot, Package, Link as LinkIcon } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';
import { useAuth } from '@/hooks/useAuth';

type Module = Tables<'modules'> & { products?: Pick<Tables<'products'>, 'name'> | null };
type Product = Tables<'products'>;

interface ModulesListProps {
  memberAreaId: string | null;
  onEditModule: (module: Module) => void;
  onModuleDeleted: () => void;
  products: Product[];
}

export const ModulesList: React.FC<ModulesListProps> = ({ memberAreaId, onEditModule, onModuleDeleted, products }) => {
  const { user } = useAuth();
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchModules = useCallback(async (id: string) => {
    console.log('MODULES_LIST_DEBUG: fetchModules started for memberAreaId:', id);
    if (!user?.id || !id) {
      setModules([]);
      setLoading(false);
      console.log('MODULES_LIST_DEBUG: fetchModules skipped, missing user ID or memberAreaId.');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('modules')
        .select(`
          *,
          products(name)
        `)
        .eq('user_id', user.id)
        .eq('member_area_id', id)
        .order('order_index', { ascending: true });
      
      if (error) throw error;
      setModules(data as Module[] || []);
      console.log('MODULES_LIST_DEBUG: fetchModules completed successfully.');
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Falha ao carregar módulos.", variant: "destructive" });
      console.error('MODULES_LIST_DEBUG: Erro ao carregar módulos:', error);
    } finally {
      setLoading(false);
      console.log('MODULES_LIST_DEBUG: fetchModules setLoading(false) called.');
    }
  }, [user?.id, toast]);

  useEffect(() => {
    if (memberAreaId) {
      fetchModules(memberAreaId);
    }
  }, [memberAreaId, fetchModules]);

  const handleDeleteModule = async (moduleId: string, moduleTitle: string) => {
    try {
      const { error } = await supabase
        .from('modules')
        .delete()
        .eq('id', moduleId);
      
      if (error) throw error;
      toast({ title: "Sucesso", description: `Módulo "${moduleTitle}" excluído.` });
      onModuleDeleted();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Falha ao excluir módulo.", variant: "destructive" });
      console.error(error);
    }
  };

  // Drag and drop refs and handlers
  const dragItemIndex = useRef<number | null>(null);
  const dragOverIndex = useRef<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    dragItemIndex.current = index;
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', String(index)); } catch (err) { /* noop for some browsers */ }
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    dragOverIndex.current = index;
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const from = dragItemIndex.current;
    const to = dragOverIndex.current;
    if (from === null || to === null || from === to) return;

    const newOrder = Array.from(modules);
    const [moved] = newOrder.splice(from, 1);
    newOrder.splice(to, 0, moved);

    // Optimistic UI
    setModules(newOrder);

    // Persist order_index sequentially
    try {
      const updates = newOrder.map((mod, idx) => supabase.from('modules').update({ order_index: idx }).eq('id', mod.id));
      const results = await Promise.all(updates);
      const anyError = results.find(r => (r as any).error);
      if (anyError) throw (anyError as any).error;
      toast({ title: 'Ordem atualizada', description: 'A ordem dos módulos foi salva.' });
    } catch (error: any) {
      console.error('MODULES_LIST_DEBUG: Erro ao salvar nova ordem:', error);
      toast({ title: 'Erro', description: 'Não foi possível salvar a nova ordem dos módulos.', variant: 'destructive' });
      // revert
      if (memberAreaId) fetchModules(memberAreaId);
    } finally {
      dragItemIndex.current = null;
      dragOverIndex.current = null;
    }
  };

  if (loading) {
    return <p className="text-muted-foreground text-sm">Carregando módulos...</p>;
  }

  if (modules.length === 0) {
    return (
      <div className="text-center py-8">
        <MonitorDot className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-3 sm:mb-4" />
        <h3 className="text-base sm:text-lg font-semibold mb-2">Nenhum módulo criado</h3>
        <p className="text-muted-foreground text-sm sm:text-base">
          Comece criando o primeiro módulo para sua área de membros.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {modules.map((module, idx) => (
        <Card
          key={module.id}
          draggable
          onDragStart={(e) => handleDragStart(e, idx)}
          onDragOver={(e) => handleDragOver(e, idx)}
          onDrop={handleDrop}
          onDragEnd={() => { dragItemIndex.current = null; dragOverIndex.current = null; }}
          className="cursor-grab"
        >
          <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base sm:text-lg truncate">{module.title}</h3>
              {module.description?.trim() && (
                <p className="text-sm text-muted-foreground truncate">
                  {module.description.trim()}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
                {module.status === 'published' ? (
                  <span className="text-green-600 flex items-center gap-1">
                    <MonitorDot className="h-3 w-3" /> Publicado
                  </span>
                ) : (
                  <span className="text-yellow-600 flex items-center gap-1">
                    <MonitorDot className="h-3 w-3" /> Rascunho
                  </span>
                )}
                {module.products?.name && (
                  <span className="flex items-center gap-1">
                    <Package className="h-3 w-3" /> Produto: {module.products.name}
                  </span>
                )}
                {module.checkout_link && (
                  <span className="flex items-center gap-1">
                    <LinkIcon className="h-3 w-3" /> Checkout Direto
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2 sm:mt-0">
              <Button variant="outline" size="sm" onClick={() => onEditModule(module)} className="text-xs sm:text-sm">
                <Edit className="h-4 w-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="text-xs sm:text-sm">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="max-w-xs sm:max-w-md mx-2 sm:mx-4">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-sm sm:text-base">Confirmar Exclusão</AlertDialogTitle>
                    <AlertDialogDescription className="text-xs sm:text-sm">
                      Tem certeza que deseja excluir o módulo <strong>"{module.title}"</strong>? Esta ação é irreversível.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                    <AlertDialogCancel className="text-xs sm:text-sm">Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDeleteModule(module.id, module.title)} className="text-xs sm:text-sm">
                      Excluir
                    </AlertDialogAction>
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