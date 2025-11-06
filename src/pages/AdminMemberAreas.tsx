import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, MonitorDot, Trash2, Edit, Link as LinkIcon, Image, Palette, BookOpen } from 'lucide-react'; // Adicionado BookOpen
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { generateSlug } from '@/utils/textFormatting';

type MemberArea = Tables<'member_areas'>;

const AdminMemberAreas = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [memberAreas, setMemberAreas] = useState<MemberArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingArea, setEditingArea] = useState<MemberArea | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    logo_url: '',
    primary_color: '#3b82f6',
    logoFile: null as File | null,
  });
  const { toast } = useToast();

  useEffect(() => {
    if (user && isAdmin) {
      fetchMemberAreas();
    }
  }, [user, isAdmin]);

  const fetchMemberAreas = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('member_areas')
      .select('*')
      .eq('user_id', user?.id || '');
    
    if (error) {
      toast({ title: "Erro", description: "Falha ao carregar áreas de membros.", variant: "destructive" });
      console.error(error);
    } else {
      setMemberAreas(data || []);
    }
    setLoading(false);
  };

  const handleInputChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'name' && !editingArea) { // Auto-generate slug only for new areas
      setFormData(prev => ({ ...prev, slug: generateSlug(value) }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData(prev => ({ ...prev, logoFile: e.target.files![0] }));
    }
  };

  const uploadFile = async (file: File, folder: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('member-area-content') // Use a bucket específico para conteúdo da área de membros
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('member-area-content')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.name || !formData.slug) {
      toast({ title: "Erro", description: "Nome e Slug são obrigatórios.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      let logoUrl = formData.logo_url;
      if (formData.logoFile) {
        logoUrl = await uploadFile(formData.logoFile, 'member-area-logos');
      }

      const payload = {
        user_id: user.id,
        name: formData.name,
        slug: formData.slug,
        description: formData.description,
        logo_url: logoUrl,
        primary_color: formData.primary_color,
      };

      if (editingArea) {
        const { error } = await supabase
          .from('member_areas')
          .update(payload)
          .eq('id', editingArea.id);
        if (error) throw error;
        toast({ title: "Sucesso", description: "Área de membros atualizada!" });
      } else {
        const { error } = await supabase
          .from('member_areas')
          .insert(payload);
        if (error) throw error;
        toast({ title: "Sucesso", description: "Área de membros criada!" });
      }

      setIsDialogOpen(false);
      setEditingArea(null);
      setFormData({
        name: '', slug: '', description: '', logo_url: '', primary_color: '#3b82f6', logoFile: null
      });
      fetchMemberAreas();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Falha ao salvar área de membros.", variant: "destructive" });
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (areaId: string, areaName: string) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('member_areas')
        .delete()
        .eq('id', areaId);
      if (error) throw error;
      toast({ title: "Sucesso", description: `Área de membros "${areaName}" excluída.` });
      fetchMemberAreas();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Falha ao excluir área de membros.", variant: "destructive" });
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (area: MemberArea) => {
    setEditingArea(area);
    setFormData({
      name: area.name,
      slug: area.slug,
      description: area.description || '',
      logo_url: area.logo_url || '',
      primary_color: area.primary_color || '#3b82f6',
      logoFile: null, // Clear file input when editing
    });
    setIsDialogOpen(true);
  };

  if (authLoading || loading) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  if (!user || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Minhas Áreas de Membros</h1>
          <p className="text-muted-foreground mt-2">
            Crie e gerencie suas áreas de membros personalizadas
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) { // When dialog is closed
            setEditingArea(null); // Clear editing state
            setFormData({ // Reset form data
              name: '', slug: '', description: '', logo_url: '', primary_color: '#3b82f6', logoFile: null
            });
          }
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingArea(null);
              setFormData({ name: '', slug: '', description: '', logo_url: '', primary_color: '#3b82f6', logoFile: null });
            }}>
              <Plus className="mr-2 h-4 w-4" /> Nova Área de Membros
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingArea ? 'Editar Área de Membros' : 'Criar Nova Área de Membros'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Área *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Ex: Meu Curso de Fotografia"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug (URL) *</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => handleInputChange('slug', e.target.value)}
                  placeholder="ex-meu-curso-de-fotografia"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Será usado na URL de acesso (ex: `seusite.com/membros/`**`seu-slug`**)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Uma breve descrição da sua área de membros."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="logo">Logo da Área de Membros</Label>
                <Input id="logo" type="file" accept="image/*" onChange={handleFileChange} />
                {formData.logoFile && <p className="text-sm text-muted-foreground">Arquivo selecionado: {formData.logoFile.name}</p>}
                {formData.logo_url && !formData.logoFile && (
                  <div className="mt-2 flex items-center gap-2">
                    <img src={formData.logo_url} alt="Logo atual" className="h-10 w-10 object-contain" />
                    <Button variant="ghost" size="sm" onClick={() => handleInputChange('logo_url', '')} className="text-destructive">Remover Logo</Button>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Cor Principal</Label>
                <div className="flex gap-2">
                  <Input type="color" value={formData.primary_color} onChange={(e) => handleInputChange('primary_color', e.target.value)} className="w-16 h-10 p-1 border rounded cursor-pointer" />
                  <Input type="text" value={formData.primary_color} onChange={(e) => handleInputChange('primary_color', e.target.value)} placeholder="#3b82f6" className="flex-1" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? 'Salvando...' : 'Salvar Área'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Suas Áreas de Membros ({memberAreas.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {memberAreas.length === 0 ? (
            <div className="text-center py-8">
              <MonitorDot className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma área de membros criada</h3>
              <p className="text-muted-foreground">
                Comece criando sua primeira área de membros personalizada.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {memberAreas.map(area => (
                <div key={area.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="flex items-center space-x-4">
                    {area.logo_url ? (
                      <img src={area.logo_url} alt={area.name} className="h-10 w-10 object-contain rounded-md" />
                    ) : (
                      <div className="h-10 w-10 bg-muted rounded-md flex items-center justify-center">
                        <MonitorDot className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{area.name}</p>
                      <p className="text-sm text-muted-foreground">Slug: {area.slug}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Palette className="h-3 w-3" style={{ color: area.primary_color || '#3b82f6' }} />
                        Cor Principal: {area.primary_color}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Botão para EDITAR DETALHES (Nome, Slug, etc.) */}
                    <Button variant="outline" size="sm" onClick={() => handleEdit(area)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    {/* Botão para GERENCIAR CONTEÚDO */}
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/admin/member-areas/${area.id}/content`}>
                        <BookOpen className="h-4 w-4" />
                      </Link>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir a área de membros <strong>"{area.name}"</strong>?
                            Esta ação é irreversível e todos os conteúdos e membros associados serão afetados.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(area.id, area.name)}>Excluir</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminMemberAreas;