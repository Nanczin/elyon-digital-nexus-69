import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { MessageCircle, Trash2, Eye, User, Calendar, BookOpen, MessageSquarePlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


// Componente para exibir detalhes do comentário (se necessário, pode ser adaptado)
const CommentDetailsDialog = ({ comment, onClose, memberAreaId }: { comment: any, onClose: () => void, memberAreaId: string }) => {
  const { toast } = useToast();
  const { user: adminUser } = useAuth();

  const handleDeleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('lesson_comments')
        .delete()
        .eq('id', commentId);
      
      if (error) throw error;
      toast({ title: "Sucesso", description: "Comentário excluído." });
      onClose(); // Close dialog and trigger refresh in parent
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Falha ao excluir comentário.", variant: "destructive" });
      console.error(error);
    }
  };

  return (
    <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" /> Detalhes do Comentário
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3 mb-4">
              <Avatar className="h-10 w-10">
                <AvatarImage src={comment.profiles?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${comment.profiles?.name}`} />
                <AvatarFallback>{comment.profiles?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-base">{comment.profiles?.name || 'Membro'}</p>
                <p className="text-sm text-muted-foreground">
                  Em {new Date(comment.created_at).toLocaleDateString()}
                  {comment.lessons?.title && ` na aula "${comment.lessons.title}"`}
                  {comment.lessons?.modules?.title && ` do módulo "${comment.lessons.modules.title}"`}
                </p>
              </div>
            </div>
            <p className="text-base">{comment.content}</p>
          </CardContent>
        </Card>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full">
              <Trash2 className="h-4 w-4 mr-2" /> Excluir Comentário
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este comentário? Esta ação é irreversível.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => handleDeleteComment(comment.id)}>Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      <Button onClick={onClose} className="w-full mt-4">Fechar</Button>
    </DialogContent>
  );
};

const AdminCommunity = ({ memberAreaId: propMemberAreaId }: { memberAreaId?: string }) => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { memberAreaId: urlMemberAreaId } = useParams<{ memberAreaId: string }>();
  const currentMemberAreaId = propMemberAreaId || urlMemberAreaId;

  const [comments, setComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [selectedComment, setSelectedComment] = useState<any | null>(null);
  const [isCommentDetailsDialogOpen, setIsCommentDetailsDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (user && isAdmin && currentMemberAreaId) {
      fetchComments();
    }
  }, [user, isAdmin, currentMemberAreaId]);

  const fetchComments = async () => {
    setLoadingComments(true);
    // Buscar todos os comentários de aulas para a área de membros
    const { data, error } = await supabase
      .from('lesson_comments')
      .select(`
        *,
        profiles(name, avatar_url),
        lessons(title, modules(title))
      `)
      .filter('lessons.modules.member_area_id', 'eq', currentMemberAreaId) // Filtrar por member_area_id do módulo
      .order('created_at', { ascending: false });
    
    if (error) {
      toast({ title: "Erro", description: "Falha ao carregar comentários da comunidade.", variant: "destructive" });
      console.error(error);
    } else {
      setComments(data || []);
    }
    setLoadingComments(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('lesson_comments')
        .delete()
        .eq('id', commentId);
      
      if (error) throw error;
      toast({ title: "Sucesso", description: `Comentário excluído.` });
      fetchComments(); // Refresh comments
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Falha ao excluir comentário.", variant: "destructive" });
      console.error(error);
    }
  };

  const handleViewComment = (comment: any) => {
    setSelectedComment(comment);
    setIsCommentDetailsDialogOpen(true);
  };

  const handleCommentDetailsDialogClose = () => {
    setIsCommentDetailsDialogOpen(false);
    setSelectedComment(null);
    fetchComments(); // Refresh comments in case comments were deleted
  };

  if (authLoading || loadingComments) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  if (!user || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (!currentMemberAreaId) {
    return <p>Nenhuma área de membros selecionada.</p>;
  }

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Comentários da Comunidade ({comments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {comments.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum comentário na comunidade</h3>
              <p className="text-muted-foreground">
                Comentários feitos nas aulas aparecerão aqui
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map(comment => (
                <div key={comment.id} className="p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={comment.profiles?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${comment.profiles?.name}`} />
                        <AvatarFallback>{comment.profiles?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}</AvatarFallback>
                      </Avatar>
                      <h3 className="font-semibold text-lg">{comment.profiles?.name || 'Membro'}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleViewComment(comment)}>
                        <Eye className="h-4 w-4" />
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
                              Tem certeza que deseja excluir este comentário? Esta ação é irreversível.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteComment(comment.id)}>Excluir</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{comment.content}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ptBR })}</span>
                    </div>
                    {comment.lessons?.title && (
                      <div className="flex items-center gap-1">
                        <BookOpen className="h-3 w-3" />
                        <span>Aula: {comment.lessons.title}</span>
                      </div>
                    )}
                    {comment.lessons?.modules?.title && (
                      <div className="flex items-center gap-1">
                        <MessageSquarePlus className="h-3 w-3" />
                        <span>Módulo: {comment.lessons.modules.title}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedComment && (
        <Dialog open={isCommentDetailsDialogOpen} onOpenChange={setIsCommentDetailsDialogOpen}>
          <CommentDetailsDialog comment={selectedComment} onClose={handleCommentDetailsDialogClose} memberAreaId={currentMemberAreaId} />
        </Dialog>
      )}
    </div>
  );
};

export default AdminCommunity;