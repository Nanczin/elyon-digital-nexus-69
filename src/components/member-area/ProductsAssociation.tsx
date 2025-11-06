import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Package, Save } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';

type Product = Tables<'products'>;
type MemberArea = Tables<'member_areas'>;

interface ProductsAssociationProps {
  memberAreaId: string;
}

const ProductsAssociation: React.FC<ProductsAssociationProps> = ({ memberAreaId }) => {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [memberArea, setMemberArea] = useState<MemberArea | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, [memberAreaId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Buscar área de membros
      const { data: areaData, error: areaError } = await supabase
        .from('member_areas')
        .select('*')
        .eq('id', memberAreaId)
        .single();

      if (areaError) throw areaError;
      setMemberArea(areaData);
      setSelectedProducts(areaData.associated_products || []);

      // Buscar todos os produtos do usuário
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', areaData.user_id)
        .order('name');

      if (productsError) throw productsError;
      setProducts(productsData || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleProduct = (productId: string) => {
    setSelectedProducts(prev => 
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('member_areas')
        .update({ associated_products: selectedProducts })
        .eq('id', memberAreaId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Produtos associados atualizados com sucesso!"
      });
    } catch (error) {
      console.error('Erro ao salvar produtos:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as alterações",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Produtos Associados
        </CardTitle>
        <CardDescription>
          Selecione quais produtos darão acesso a esta área de membros quando forem comprados
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {products.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Você ainda não criou nenhum produto. Crie produtos primeiro para associá-los a esta área.
          </p>
        ) : (
          <>
            <div className="space-y-3">
              {products.map(product => (
                <div
                  key={product.id}
                  className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <Checkbox
                    id={product.id}
                    checked={selectedProducts.includes(product.id)}
                    onCheckedChange={() => toggleProduct(product.id)}
                  />
                  <label
                    htmlFor={product.id}
                    className="flex-1 cursor-pointer"
                  >
                    <div className="font-medium">{product.name}</div>
                    <div className="text-sm text-muted-foreground">
                      R$ {(product.price / 100).toFixed(2)}
                    </div>
                  </label>
                </div>
              ))}
            </div>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full"
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Salvando...' : 'Salvar Associações'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ProductsAssociation;
