import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, useParams, Link } from 'react-router-dom'; // Import useParams
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UserPlus, Users, Lock, Unlock, Copy, ExternalLink, Trash2, Edit } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

// Componente para adicionar/editar membro
const MemberFormDialog = ({ member, onSave, modules, memberAreaId, onClose }: { member?: any, onSave: () => void, modules: any[], memberAreaId: string, onClose: () => void }) => {
  const [name, setName] = useState(member?.name || '');
  const [email, setEmail] = useState(member?.email || '');
  const [password, setPassword] = useState('');
  const [generatePassword, setGeneratePassword] = useState(false);
  const [isActive, setIsActive] = useState(member?.status === 'active');
  const [selectedModules, setSelectedModules] = useState<string[]>(member?.access_modules?.map((ma: any) => ma.module_id) || []);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user: adminUser } = useAuth(); // Obter refreshUserSession

  useEffect(() => {
    if (member) {
      setName(member.name);
      setEmail(member.email);
      setIsActive(member.status === 'active');
      // Fetch member_access for this member
      const fetchMemberAccess = async () => {
        const { data, error } = await supabase
          .from('member_access')
          .select('module_id')
          .eq('user_id', member.user_id)
          .eq('member_area_id', memberAreaId); // Filter by memberAreaId
        if (error) {
          console.error('Error fetching member access:', error);
        } else {
          setSelectedModules(data?.map(ma => ma.module_id) || []);
        }
      };
      fetchMemberAccess();
    } else {
      setName('');
      setEmail('');
      setPassword('');
      setGeneratePassword(false);
      setIsActive(true);
      setSelectedModules([]);
    }
  }, [member, memberAreaId]);

  const handleGeneratePassword = () => {
    const newPassword = Math.random().toString(36).slice(-8); // Simple random password
    setPassword(newPassword);
    setGeneratePassword(true);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      if (member) {
        // Update existing member
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ name, status: isActive ? 'active' : 'inactive' })
          .eq('user_id', member.user_id);
        if (profileError) throw profileError;

        // Update auth.users.user_metadata
        const { error: authUpdateError } = await supabase.auth.admin.updateUserById(
          member.user_id,
          {
            user_metadata: { 
              name, 
              first_name: name.split(' ')[0], 
              last_name: name.split(' ').slice(1).join(' ') || '',
              member_area_id: memberAreaId, // Garantir que member_area_id esteja no metadata
              status: isActive ? 'active' : 'inactive' // Passar status para o user_metadata
            }
          }
        );
        if (authUpdateError) console.error('Error updating auth.users user_metadata:', authUpdateError);


        // Update member_access
        // First, delete all existing access for this user in this member area
        const { error: deleteAccessError } = await supabase
          .from('member_access')
          .delete()
          .eq('user_id', member.user_id)
          .eq('member_area_id', memberAreaId); // Filter by memberAreaId
        if (deleteAccessError) throw deleteAccessError;

        // Then, insert new access records for this member area
        const accessInserts = selectedModules.map(moduleId => ({
          user_id: member.user_id,
          module_id: moduleId,
          is_active: true,
          member_area_id: memberAreaId, // Ensure member_area_id is set
        }));
        if (accessInserts.length > 0) {
          const { error: insertAccessError } = await supabase
            .from('member_access')
            .insert(accessInserts);
          if (insertAccessError) throw insertAccessError;
        }

        toast({ title: "Sucesso", description: "Membro atualizado com sucesso!" });

      } else {
        // Create new member using Edge Function
        if (!email || (!password && !generatePassword) || !name) {
          toast({ title: "Erro", description: "Preencha todos os campos obrigatórios.", variant: "destructive" });
          setLoading(false);
          return;
        }

        const finalPassword = generatePassword ? password : password;
        if (!finalPassword) {
          toast({ title: "Erro", description: "A senha é obrigatória.", variant: "destructive" });
          setLoading(false);
          return;
        }

        // Chamar a Edge Function para criar o usuário
        const { data, error: edgeFunctionError } = await supabase.functions.invoke('create-member-user', {
          body: {
            name,
            email,
            password: finalPassword,
            memberAreaId,
            selectedModules,
            isActive,
          },
          method: 'POST',
        });

        if (edgeFunctionError) {
          console.error('Error invoking create-member-user Edge Function:', edgeFunctionError);
          toast({ title: "Erro", description: edgeFunctionError.message || 'Erro ao invocar função de criação de membro.', variant: "destructive" });
          setLoading(false);
          return;
        }

        if (!data?.success) {
          console.error('Edge Function returned error:', data?.error);
          toast({ title: "Erro", description: data?.error || 'Falha na Edge Function ao criar membro.', variant: "destructive" });
          setLoading(false);
          return;
        }

        toast({ title: "Sucesso", description: "Novo membro adicionado com sucesso!" });
      }
      
      // await refreshUserSession(); // REMOVIDO: refreshUserSession não está disponível em useAuth
      onSave();
      onClose();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Falha ao salvar membro.", variant: "destructive" });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DialogContent className="max-w-xs sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle className="text-lg sm:text-xl">{member ? 'Editar Membro' : 'Adicionar Novo Membro'}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={!!member} />
        </div>
        {!member && (
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input id="password" type="text" value={password} onChange={(e) => setPassword(e.target.value)} required={!generatePassword} disabled={generatePassword} className="flex-1" />
              <Button type="button" variant="outline" onClick={handleGeneratePassword}>Gerar</Button>
            </div>
            {generatePassword && <p className="text-sm text-muted-foreground">Senha gerada: {password}</p>}
          </div>
        )}
        <div className="flex items-center justify-between">
          <Label htmlFor="isActive">Ativo</Label>
          <Switch id="isActive" checked={isActive} onCheckedChange={setIsActive} />
        </div>

        <h3 className="font-semibold mt-6 text-base sm:text-lg">Acesso aos Módulos</h3>
        <div className="space-y-2 max-h-48 overflow-y-auto border p-2 rounded-md">
          {modules.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum módulo disponível.</p>
          ) : (
            modules.map(module => (
              <div key={module.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`module-${module.id}`}
                  checked={selectedModules.includes(module.id)}
                  onCheckedChange={(checked) => {
                    setSelectedModules(prev =>
                      checked ? [...prev, module.id] : prev.filter(id => id !== module.id)
                    );
                  }}
                />
                <Label htmlFor={`module-${module.id}`} className="text-sm">{module.title}</Label>
              </div>
            ))
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-2 mt-2">
          <Button type="button" variant="outline" onClick={() => setSelectedModules(modules.map(m => m.id))} className="flex-1">Liberar Tudo</Button>
          <Button type="button" variant="outline" onClick={() => setSelectedModules([])} className="flex-1">Bloquear Tudo</Button>
        </div>
      </div>
      <Button className="w-full" onClick={handleSave} disabled={loading}>
        {loading ? 'Salvando...' : 'Salvar Membro'}
      </Button>
    </DialogContent>
  );
};

const AdminMembers = ({ memberAreaId: propMemberAreaId }: { memberAreaId?: string }) => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { memberAreaId: urlMemberAreaId } = useParams<{ memberAreaId: string }>();
  const currentMemberAreaId = propMemberAreaId || urlMemberAreaId;

  const [members, setMembers] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [editingMember, setEditingMember] = useState<any | null>(null);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (user && isAdmin && currentMemberAreaId) {
      fetchMembers();
      fetchModules();
    }
  }, [user, isAdmin, currentMemberAreaId]);

  const fetchMembers = async () => {
    setLoadingMembers(true);
    const { data, error } = await supabase
      .from('profiles')
      .select(`*`) // Simplified select to avoid nested RLS issues for now
      .eq('member_area_id', currentMemberAreaId) // Filter by memberAreaId
      .order('created_at', { ascending: false });
    
    if (error) {
      toast({ title: "Erro", description: "Falha ao carregar membros.", variant: "destructive" });
      console.error(error);
    } else {
      setMembers(data || []);
    }
    setLoadingMembers(false);
  };

  const fetchModules = async () => {
    const { data, error } = await supabase
      .from('modules')
      .select('id, title')
      .eq('status', 'published') // Only published modules for access management
      .eq('member_area_id', currentMemberAreaId); // Filter by memberAreaId
    
    if (error) {
      toast({ title: "Erro", description: "Falha ao carregar módulos para permissões.", variant: "destructive" });
      console.error(error);
    } else {
      setModules(data || []);
    }
  };

  const handleDeleteMember = async (memberId: string, memberName: string) => {
    try {
      // Chamar a Edge Function para excluir o usuário
      const { data, error: edgeFunctionError } = await supabase.functions.invoke('delete-member', {
        body: { userId: memberId },
        method: 'DELETE',
      });

      if (edgeFunctionError) {
        console.error('Error invoking delete-member Edge Function:', edgeFunctionError);
        throw new Error(edgeFunctionError.message || 'Erro ao invocar função de exclusão de membro.');
      }

      if (!data?.success) {
        console.error('Edge Function returned error:', data?.error);
        throw new Error(data?.error || 'Falha na Edge Function ao excluir membro.');
      }

      toast({ title: "Sucesso", description: `Membro ${memberName} excluído.` });
      fetchMembers(); // Recarregar a lista de membros
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Falha ao excluir membro.", variant: "destructive" });
      console.error(error);
    }
  };

  const handleEditMember = (member: any) => {
    setEditingMember(member);
    setIsFormDialogOpen(true);
  };

  const handleNewMemberClick = () => {
    setEditingMember(null);
    setIsFormDialogOpen(true);
  };

  const handleFormDialogClose = () => {
    setIsFormDialogOpen(false);
    setEditingMember(null);
    fetchMembers(); // Refresh list after save
  };

  const copyLoginUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: "Copiado!", description: "URL de login copiada para a área de transferência." });
  };

  if (authLoading || loadingMembers) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  if (!user || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (!currentMemberAreaId) {
    return <p>Nenhuma área de membros selecionada.</p>;
  }

  const platformLoginUrl = `${window.location.origin}/membros/${currentMemberAreaId}/login`; // Dynamic login URL

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <Card className="mb-6">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
          <CardTitle className="text-lg sm:text-xl">URL de Acesso à Área de Membros</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row items-center gap-3">
          <Input value={platformLoginUrl} readOnly className="flex-1 text-sm" />
          <Button onClick={() => copyLoginUrl(platformLoginUrl)} variant="outline" size="sm">
            <Copy className="mr-2 h-4 w-4" /> Copiar Link
          </Button>
          <Button onClick={() => window.open(platformLoginUrl, '_blank')} variant="secondary" size="sm">
            <ExternalLink className="mr-2 h-4 w-4" /> Abrir Área
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
          <CardTitle className="text-lg sm:text-xl">Membros ({members.length})</CardTitle>
          <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={handleNewMemberClick}>
                <UserPlus className="mr-2 h-4 w-4" /> Novo Membro
              </Button>
            </DialogTrigger>
            <MemberFormDialog member={editingMember} onSave={handleFormDialogClose} modules={modules} memberAreaId={currentMemberAreaId} onClose={() => setIsFormDialogOpen(false)} />
          </Dialog>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum membro cadastrado</h3>
              <p className="text-muted-foreground">
                Adicione o primeiro membro para começar
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {members.map(member => (
                <div key={member.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="flex items-center space-x-4 mb-2 sm:mb-0">
                    <Avatar>
                      <AvatarImage src={member.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${member.name}`} />
                      <AvatarFallback>{member.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm sm:text-base">{member.name}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">{member.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={member.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                          {member.status === 'active' ? 'Ativo' : 'Inativo'}
                        </Badge>
                        <Badge variant="outline" className="text-xs">{member.role}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEditMember(member)}>
                      <Edit className="h-4 w-4" />
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
                            Tem certeza que deseja excluir o membro <strong>{member.name}</strong>? Esta ação é irreversível.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteMember(member.user_id, member.name)}>Excluir</AlertDialogAction>
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

export default AdminMembers;