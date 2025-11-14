import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MemberSettingsPanel } from '@/components/admin/MemberSettingsPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface MemberArea {
  id: string;
  name: string;
  description: string;
  user_id: string;
  created_at: string;
  associated_products?: string[];
}

export function AdminMemberAreaDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [memberArea, setMemberArea] = useState<MemberArea | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    if (id) {
      loadMemberArea();
    }
  }, [id]);

  const loadMemberArea = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('member_areas')
        .select('*')
        .eq('id', id)
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      setMemberArea(data);
    } catch (error) {
      console.error('Erro ao carregar área de membros:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar a área de membros',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p>Carregando...</p>
      </div>
    );
  }

  if (!memberArea) {
    return (
      <div className="flex items-center justify-center p-8">
        <p>Área de membros não encontrada</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">{memberArea.name}</h1>
        <p className="text-gray-600">{memberArea.description}</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">Geral</TabsTrigger>
          <TabsTrigger value="settings">Configurações de Membros</TabsTrigger>
          <TabsTrigger value="products">Produtos</TabsTrigger>
          <TabsTrigger value="members">Membros</TabsTrigger>
        </TabsList>

        {/* Aba: Geral */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Informações Gerais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Nome</Label>
                <p className="font-medium">{memberArea.name}</p>
              </div>
              <div>
                <Label>Descrição</Label>
                <p className="text-sm">{memberArea.description}</p>
              </div>
              <div>
                <Label>ID da Área</Label>
                <code className="text-xs bg-gray-100 p-2 rounded">{memberArea.id}</code>
              </div>
              <div>
                <Label>Produtos Associados</Label>
                <p className="text-sm">
                  {memberArea.associated_products?.length || 0} produtos
                </p>
              </div>
              <div>
                <Label>Data de Criação</Label>
                <p className="text-sm">
                  {new Date(memberArea.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba: Configurações de Membros */}
        <TabsContent value="settings" className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-md mb-4">
            <p className="text-sm">
              📌 Configure como os membros serão criados automaticamente após a compra.
              Escolha o modo de senha, defina templates de email customizado e gerencie
              as credenciais dos seus clientes.
            </p>
          </div>
          {memberArea && <MemberSettingsPanel memberAreaId={memberArea.id} />}
        </TabsContent>

        {/* Aba: Produtos */}
        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Produtos Associados</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Membros que comprarem qualquer desses produtos receberão acesso automático
                quando o pagamento for aprovado.
              </p>
              <div className="mt-4">
                {memberArea.associated_products && memberArea.associated_products.length > 0 ? (
                  <ul className="space-y-2">
                    {memberArea.associated_products.map((productId) => (
                      <li key={productId} className="text-sm bg-gray-50 p-2 rounded">
                        {productId}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">Nenhum produto associado</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba: Membros */}
        <TabsContent value="members" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Membros da Área</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Lista de membros que têm acesso a esta área e seus produtos.
              </p>
              <div className="mt-4">
                <p className="text-sm text-gray-500">
                  Implemente visualização de membros com listagem, filtros e ações em breve.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AdminMemberAreaDetailsPage;
