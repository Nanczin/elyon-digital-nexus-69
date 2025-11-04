import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
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
const MemberFormDialog = ({ member, onSave, modules }: { member?: any, onSave: () => void, modules: any[] }) => {
  const [name, setName] = useState(member?.name || '');
  const [email, setEmail] = useState(member?.email || '');
  const [password, setPassword] = useState('');
  const [generatePassword, setGeneratePassword] = useState(false);
  const [isActive, setIsActive] = useState(member?.status === 'active');
  const [selectedModules, setSelectedModules] = useState<string[]>(member?.access_modules?.map((ma: any) => ma.module_id) || []);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user: adminUser } = useAuth();

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
          .eq('user_id', member.user_id);
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
  }, [member]);

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

        // Update member_access
        // First, delete all existing access for this user
        const { error: deleteAccessError } = await supabase
          .from('member_access')
          .delete()
          .eq('user_id', member.user_id);
        if (deleteAccessError) throw deleteAccessError;

        // Then, insert new access records
        const accessInserts = selectedModules.map(moduleId => ({
          user_id: member.user_id,
          module_id: moduleId,
          is_active: true,
        }));
        if (accessInserts.length > 0) {
          const { error: insertAccessError } = await supabase
            .from('member_access')
            .insert(accessInserts);
          if (insertAccessError) throw insertAccessError;
        }

        toast({ title: "Sucesso", description: "Membro atualizado com sucesso!" });

      } else {
        // Create new member
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

        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email,
          password: finalPassword,
          email_confirm: true, // Auto-confirm email
          user_metadata: { name }
        });

        if (authError) throw authError;
        const newUserId = authData.user?.id;

        // Create profile entry (handle_new_user trigger should do this, but ensure status)
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ status: isActive ? 'active' : 'inactive' })
          .eq('user_id', newUserId);
        if (profileError) console.error('Error updating profile status:', profileError);

        // Grant access to all published modules by default for new members
        const { data: publishedModules, error: modulesError } = await supabase
          .from('modules')
          .select('id')
          .eq('status', 'published');
        if (modulesError) throw modulesError;

        const defaultAccessInserts = publishedModules?.map(module => ({
          user_id: newUserId,
          module_id: module.id,
          is_active: true,
        })) || [];

        if (defaultAccessInserts.length > 0) {
          const { error: accessError } = await supabase
            .from('member_access')
            .insert(defaultAccessInserts);
          if (accessError) throw accessError;
        }

        toast({ title: "Sucesso", description: "Novo membro adicionado com sucesso!" });
      }
      onSave();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Falha ao salvar membro.", variant: "destructive" });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>{member ? 'Editar Membro' : 'Adicionar Novo Membro'}</DialogTitle>
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
            <div className="flex gap-2">
              <Input id="password" type="text" value={password} onChange={(e) => setPassword(e.target.value)} required={!generatePassword} disabled={generatePassword} />
              <Button type="button" variant="outline" onClick={handleGeneratePassword}>Gerar</Button>
            </div>
            {generatePassword && <p className="text-sm text-muted-foreground">Senha gerada: {password}</p>}
          </div>
        )}
        <div className="flex items-center justify-between">
          <Label htmlFor="isActive">Ativo</Label>
          <Switch id="isActive" checked={isActive} onCheckedChange={setIsActive} />
        </div>

        <h3 className="font-semibold mt-6">Acesso aos Módulos</h3>
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
                <Label htmlFor={`module-${module.id}`}>{module.title}</Label>
              </div>
            ))
          )}
        </div>
        <div className="flex gap-2 mt-2">
          <Button type="button" variant="outline" onClick={() => setSelectedModules(modules.map(m => m.id))}>Liberar Tudo</Button>
          <Button type="button" variant="outline" onClick={() => setSelectedModules([])}>Bloquear Tudo</Button>
        </div>
      </div>
      <Button className="w-full" onClick={handleSave} disabled={loading}>
        {loading ? 'Salvando...' : 'Salvar Membro'}
      </Button>
    </DialogContent>
  );
};

const AdminMembers = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [editingMember, setEditingMember] = useState<any | null>(null);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (user && isAdmin) {
      fetchMembers();
      fetchModules();
    }
  }, [user, isAdmin]);

  const fetchMembers = async () => {
    setLoadingMembers(true);
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        *,
        member_access(module_id)
      `)
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
      .eq('status', 'published'); // Only published modules for access management
    
    if (error) {
      toast({ title: "Erro", description: "Falha ao carregar módulos para permissões.", variant: "destructive" });
      console.error(error);
    } else {
      setModules(data || []);
    }
  };

  const handleDeleteMember = async (memberId: string, memberName: string) => {
    try {
      // Delete from auth.users, which will cascade delete from profiles
      const { error } = await supabase.auth.admin.deleteUser(memberId);
      if (error) throw error;
      toast({ title: "Sucesso", description: `Membro ${memberName} excluído.` });
      fetchMembers();
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

  const platformLoginUrl = `${window.location.origin}/auth/login`; // Default login URL

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Gestão de Membros</h1>
        <p className="text-muted-foreground mt-2">
          Adicione, gerencie e defina permissões para os membros da sua área
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>URL de Acesso à Área de Membros</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row items-center gap-3">
          <Input value={platformLoginUrl} readOnly className="flex-1" />
          <Button onClick={() => copyLoginUrl(platformLoginUrl)} variant="outline">
            <Copy className="mr-2 h-4 w-4" /> Copiar Link
          </Button>
          <Button onClick={() => window.open(platformLoginUrl, '_blank')} variant="secondary">
            <ExternalLink className="mr-2 h-4 w-4" /> Abrir Área
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Membros ({members.length})</CardTitle>
          <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={handleNewMemberClick}>
                <UserPlus className="mr-2 h-4 w-4" /> Novo Membro
              </Button>
            </DialogTrigger>
            <MemberFormDialog member={editingMember} onSave={handleFormDialogClose} modules={modules} />
          </Dialog>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum membro cadastrado</h3>
              <p className="text-muted-foreground">
                Adicione seu primeiro membro para começar
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {members.map(member => (
                <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <Avatar>
                      <AvatarImage src={member.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${member.name}`} />
                      <AvatarFallback>{member.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{member.name}</p>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
                          {member.status === 'active' ? 'Ativo' : 'Inativo'}
                        </Badge>
                        <Badge variant="outline">{member.role}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
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
                          <AlertDialogAction onClick={() => handleDeleteMember(member.id, member.name)}>Excluir</AlertDialogAction>
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