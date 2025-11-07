import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, useParams, Link } from 'react-router-dom'; // Import useParams
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
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
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'> & { member_access?: { module_id: string }[] | null };
type Module = Tables<'modules'>;

// Componente para adicionar/editar membro
const MemberFormDialog = ({ member, onSave, modules, memberAreaId, onClose }: { member?: Profile, onSave: () => void, modules: Module[], memberAreaId: string, onClose: () => void }) => {
  const [name, setName] = useState(member?.name || '');
  const [email, setEmail] = useState(member?.email || '');
  const [password, setPassword] = useState('');
  const [generatePassword, setGeneratePassword] = useState(false);
  const [isActive, setIsActive] = useState(member?.status === 'active');
  // Ajustado para ler de member.member_access
  const [selectedModules, setSelectedModules] = useState<string[]>(member?.member_access?.map((ma: any) => ma.module_id) || []);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user: adminUser } = useAuth(); // Obter refreshUserSession

  useEffect(() => {
    if (member) {
      setName(member.name || '');
      setEmail(member.email || '');
      setIsActive(member.status === 'active');
      // Ajustado para ler de member.member_access
      setSelectedModules(member?.member_access?.map((ma: any) => ma.module_id) || []);
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
        // Update existing member using Edge Function
        const { data, error: edgeFunctionError } = await supabase.functions.invoke('update-member-profile', {
          body: {
            userId: member.user_id,
            name,
            status: isActive ? 'active' : 'inactive',
            memberAreaId,
            selectedModules,
          },
          method: 'POST',
        });

        if (edgeFunctionError) {
          console.error('Error invoking update-member-profile Edge Function:', edgeFunctionError);
          throw new Error(edgeFunctionError.message || 'Erro ao invocar função de atualização de membro.');
        }

        if (!data?.success) {
          console.error('Edge Function returned error:', data?.error);
          throw new Error(data?.error || 'Falha na Edge Function ao atualizar membro.');
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
          // Check for specific status code from Edge Function
          if (edgeFunctionError.status === 409) { // 409 Conflict for email_exists
            toast({ title: "Erro", description: "Este e-mail já está cadastrado.", variant: "destructive" });
          } else if (edgeFunctionError.status === 400) { // 400 Bad Request for password length
            toast({ title: "Erro", description: "A senha deve ter pelo menos 6 caracteres.", variant: "destructive" });
          } else {
            toast({ title: "Erro", description: edgeFunctionError.message || 'Erro ao invocar função de criação de membro.', variant: "destructive" });
          }
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
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle className="text-lg sm:text-xl">{member ? 'Editar Membro' : 'Adicionar Novo Membro'}</DialogTitle>
        <DialogDescription>
          {member ? 'Atualize as informações e os acessos deste membro.' : 'Crie uma nova conta de membro e defina seus acessos aos módulos.'}
        </DialogDescription>
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
              <Button type="button" variant="outline" onClick={handleGeneratePassword} className="w-full sm:w-auto">Gerar</Button>
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
          <Button type="button" variant="outline" onClick={() => setSelectedModules(modules.map(m => m.id))} className="w-full sm:w-auto text-sm">Liberar Tudo</Button>
          <Button type="button" variant="outline" onClick={() => setSelectedModules([])} className="w-full sm:w-auto text-sm">Bloquear Tudo</Button>
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

  const [members, setMembers] = useState<Profile[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [editingMember, setEditingMember] = useState<Profile | null>(null);
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
    // Modificado para incluir os acessos aos módulos
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        *,
        member_access(module_id)
      `) 
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

  const handleEditMember = (member: Profile) => {
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
    <div className="p-4 sm:p-6">
      <Card className="mb-6">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <CardTitle className="text-lg sm:text-xl">URL de Acesso à Área de Membros</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row items-center gap-3">
          <Input value={platformLoginUrl} readOnly className="flex-1 text-sm" />
          <Button onClick={() => copyLoginUrl(platformLoginUrl)} variant="outline" className="w-full sm:w-auto text-sm">
            <Copy className="mr-2 h-4 w-4" /> Copiar Link
          </Button>
          <Button onClick={() => window.open(platformLoginUrl, '_blank')} variant="secondary" className="w-full sm:w-auto text-sm">
            <ExternalLink className="mr-2 h-4 w-4" /> Abrir Área
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <CardTitle className="text-lg sm:text-xl">Membros ({members.length})</CardTitle>
          <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={handleNewMemberClick} className="w-full sm:w-auto text-sm">
                <UserPlus className="mr-2 h-4 w-4" /> Novo Membro
              </Button>
            </DialogTrigger>
            <MemberFormDialog member={editingMember} onSave={handleFormDialogClose} modules={modules} memberAreaId={currentMemberAreaId} onClose={() => setIsFormDialogOpen(false)} />
          </Dialog>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <div className="text-center py-8">
              <Users className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-semibold mb-2">Nenhum membro cadastrado</h3>
              <p className="text-muted-foreground text-sm sm:text-base">
                Adicione o primeiro membro para começar
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {members.map(member => (
                <div key={member.user_id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border rounded-lg hover:bg-accent/50 transition-colors gap-3 sm:gap-0">
                  <div className="flex items-center space-x-3 sm:space-x-4">
                    <Avatar className="h-10 w-10">
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
                  <div className="flex items-center gap-2 mt-2 sm:mt-0">
                    <Button variant="outline" size="sm" onClick={() => handleEditMember(member)} className="text-xs sm:text-sm">
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
                            Tem certeza que deseja excluir o membro <strong>{member.name}</strong>? Esta ação é irreversível.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                          <AlertDialogCancel className="text-xs sm:text-sm">Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteMember(member.user_id, member.name || 'Membro')} className="text-xs sm:text-sm">
                            Excluir
                          </AlertDialogAction>
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