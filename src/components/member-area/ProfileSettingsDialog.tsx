"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Lock, Camera, Eye, EyeOff, Save, UploadCloud, Loader2, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMemberAreaAuth } from '@/hooks/useMemberAreaAuth';
import { supabase } from '@/integrations/supabase/client'; // Use main supabase client for profile updates
import { useGlobalPlatformSettings } from '@/hooks/useGlobalPlatformSettings';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

interface ProfileSettingsDialogProps {
  children: React.ReactNode;
  memberAreaId: string;
}

// Zod schema for profile updates
const profileSchema = z.object({
  name: z.string().min(1, 'O nome é obrigatório.'),
  avatarFile: z.any().optional(), // For file input
});

// Zod schema for password updates
const passwordSchema = z.object({
  newPassword: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.'),
  confirmPassword: z.string().min(6, 'A confirmação de senha é obrigatória.'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'As senhas não coincidem.',
  path: ['confirmPassword'],
});

const ProfileSettingsDialog: React.FC<ProfileSettingsDialogProps> = ({ children, memberAreaId }) => {
  const { user, refreshUserSession } = useMemberAreaAuth();
  const { settings } = useGlobalPlatformSettings();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const primaryColor = settings?.colors?.button_background || 'hsl(var(--member-area-primary))';
  const textColor = settings?.colors?.text_primary || 'hsl(var(--member-area-text-dark))';
  const secondaryTextColor = settings?.colors?.text_secondary || 'hsl(var(--member-area-text-muted))';
  const cardBackground = settings?.colors?.card_login || 'hsl(var(--member-area-card-background))';

  // Profile Form
  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.user_metadata?.name || '',
    },
  });

  // Password Form
  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    if (user) {
      profileForm.reset({ name: user.user_metadata?.name || '' });
      setAvatarPreview(user.user_metadata?.avatar_url || null);
    }
  }, [user, isOpen]);

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      profileForm.setValue('avatarFile', file);
      setAvatarPreview(URL.createObjectURL(file));
    } else {
      profileForm.setValue('avatarFile', undefined);
      setAvatarPreview(user?.user_metadata?.avatar_url || null);
    }
  };

  const handleProfileSubmit = async (values: z.infer<typeof profileSchema>) => {
    if (!user) return;
    setIsSavingProfile(true);

    try {
      let newAvatarUrl = user.user_metadata?.avatar_url || null;
      const avatarFile = values.avatarFile;

      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        // Store in a user-specific subfolder within 'avatars'
        const filePath = `avatars/${user.id}/${crypto.randomUUID()}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('member-area-content')
          .upload(filePath, avatarFile, {
            cacheControl: '3600',
            upsert: true,
          });

        if (uploadError) throw uploadError;
        
        const { data: publicUrlData } = supabase.storage
          .from('member-area-content')
          .getPublicUrl(filePath);
        
        newAvatarUrl = publicUrlData.publicUrl;
      } else if (avatarPreview === null && user.user_metadata?.avatar_url) {
        // User explicitly removed avatar, also delete from storage if it exists
        const oldAvatarPath = user.user_metadata.avatar_url.split('member-area-content/')[1];
        if (oldAvatarPath) {
          const { error: deleteStorageError } = await supabase.storage
            .from('member-area-content')
            .remove([oldAvatarPath]);
          if (deleteStorageError) console.error('Error deleting old avatar from storage:', deleteStorageError);
        }
        newAvatarUrl = null;
      }

      console.log('PROFILE_SETTINGS_DEBUG: Attempting to update profile with:', {
        name: values.name,
        avatar_url: newAvatarUrl,
        userId: user.id
      });

      // Update auth.users metadata
      const { data: authUpdateData, error: authUpdateError } = await supabase.auth.updateUser({
        data: {
          name: values.name,
          avatar_url: newAvatarUrl,
        },
      });

      if (authUpdateError) throw authUpdateError;

      // Update public.profiles table
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({
          name: values.name,
          avatar_url: newAvatarUrl,
        })
        .eq('user_id', user.id);

      if (profileUpdateError) throw profileUpdateError;

      toast({ title: 'Sucesso', description: 'Perfil atualizado com sucesso!' });
      setAvatarPreview(newAvatarUrl); // Update local preview immediately
      await refreshUserSession(); // Refresh user data in context
      setIsOpen(false);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({ title: 'Erro', description: error.message || 'Falha ao atualizar perfil.', variant: 'destructive' });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (values: z.infer<typeof passwordSchema>) => {
    if (!user) return;
    setIsSavingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: values.newPassword,
      });

      if (error) throw error;

      toast({ title: 'Sucesso', description: 'Senha atualizada com sucesso!' });
      passwordForm.reset();
      setIsOpen(false);
    } catch (error: any) {
      console.error('Error updating password:', error);
      toast({ title: 'Erro', description: error.message || 'Falha ao atualizar senha.', variant: 'destructive' });
    } finally {
      setIsSavingPassword(false);
    }
  };

  const removeAvatar = () => {
    setAvatarPreview(null);
    profileForm.setValue('avatarFile', undefined); // Clear file input
  };

  const userInitial = user?.user_metadata?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || '';

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]" style={{ backgroundColor: cardBackground, color: textColor }}>
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold" style={{ color: textColor }}>
            Configurações de Perfil
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-2" style={{ backgroundColor: secondaryTextColor + '10' }}>
            <TabsTrigger value="profile" style={{ color: textColor }}>
              <User className="mr-2 h-4 w-4" /> Perfil
            </TabsTrigger>
            <TabsTrigger value="security" style={{ color: textColor }}>
              <Lock className="mr-2 h-4 w-4" /> Segurança
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-6 space-y-6">
            <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-6">
                <div className="flex flex-col items-center space-y-4">
                  <Avatar className="h-24 w-24 border-2" style={{ borderColor: primaryColor }}>
                    <AvatarImage src={avatarPreview || undefined} alt={user?.user_metadata?.name || 'User Avatar'} />
                    <AvatarFallback className="bg-gray-200 text-gray-700 text-4xl font-semibold">
                      {userInitial}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="avatarFile" className="cursor-pointer">
                      <Button asChild variant="outline" size="sm">
                        <span><Camera className="mr-2 h-4 w-4" /> Alterar Foto</span>
                      </Button>
                    </Label>
                    <Input 
                      id="avatarFile" 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleAvatarFileChange} 
                    />
                    {avatarPreview && (
                      <Button variant="destructive" size="sm" onClick={removeAvatar}>
                        <XCircle className="mr-2 h-4 w-4" /> Remover
                      </Button>
                    )}
                  </div>
                </div>

                <FormField
                  control={profileForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <Label htmlFor="name" style={{ color: textColor }}>Nome</Label>
                      <FormControl>
                        <Input 
                          id="name" 
                          placeholder="Seu nome completo" 
                          {...field} 
                          style={{ backgroundColor: cardBackground, color: textColor, borderColor: secondaryTextColor + '40' }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isSavingProfile}
                  style={{ backgroundColor: primaryColor, color: '#FFFFFF' }}
                >
                  {isSavingProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {isSavingProfile ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="security" className="mt-6 space-y-6">
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-6">
                <FormField
                  control={passwordForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <Label htmlFor="newPassword" style={{ color: textColor }}>Nova Senha</Label>
                      <div className="relative">
                        <FormControl>
                          <Input
                            id="newPassword"
                            type={showNewPassword ? 'text' : 'password'}
                            placeholder="Mínimo 6 caracteres"
                            {...field}
                            style={{ backgroundColor: cardBackground, color: textColor, borderColor: secondaryTextColor + '40' }}
                          />
                        </FormControl>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          {showNewPassword ? (
                            <EyeOff className="h-4 w-4" style={{ color: secondaryTextColor }} />
                          ) : (
                            <Eye className="h-4 w-4" style={{ color: secondaryTextColor }} />
                          )}
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={passwordForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <Label htmlFor="confirmPassword" style={{ color: textColor }}>Confirmar Nova Senha</Label>
                      <div className="relative">
                        <FormControl>
                          <Input
                            id="confirmPassword"
                            type={showConfirmPassword ? 'text' : 'password'}
                            placeholder="Confirme sua nova senha"
                            {...field}
                            style={{ backgroundColor: cardBackground, color: textColor, borderColor: secondaryTextColor + '40' }}
                          />
                        </FormControl>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" style={{ color: secondaryTextColor }} />
                          ) : (
                            <Eye className="h-4 w-4" style={{ color: secondaryTextColor }} />
                          )}
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isSavingPassword}
                  style={{ backgroundColor: primaryColor, color: '#FFFFFF' }}
                >
                  {isSavingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {isSavingPassword ? 'Salvando...' : 'Alterar Senha'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </DialogContent>
    </Dialog>
  );
};

export default ProfileSettingsDialog;