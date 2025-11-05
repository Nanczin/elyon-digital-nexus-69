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


// Componente para exibir detalhes do post e comentários
const PostDetailsDialog = ({ post, onClose, memberAreaId }: { post: any, onClose: () => void, memberAreaId: string }) => {
  const [communityComments, setCommunityComments] = useState<any[]>([]);
  const [lessonComments, setLessonComments] = useState<any[]>([]); // Novo estado para comentários da aula
  const [loadingCommunityComments, setLoadingCommunityComments] = useState(true);
  const [loadingLessonComments, setLoadingLessonComments] = useState(true); // Novo estado de loading
  const { toast } = useToast();
  const { user: adminUser } = useAuth();

  useEffect(() => {
    if (post?.id) {
      fetchCommunityComments(post.id);
    }
    if (post?.lesson_id) { // Buscar comentários da aula se o post estiver vinculado a uma aula
      fetchLessonComments(post.lesson_id);
    }
  }, [post?.id, post?.lesson_id]);

  const fetchCommunityComments = async (postId: string) => {
    setLoadingCommunityComments(true);
    const { data, error } = await supabase
      .from('community_comments')
      .select(`
        *,
        profiles(name, avatar_url)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    
    if (error) {
      toast({ title: "Erro", description: "Falha ao carregar comentários da comunidade.", variant: "destructive" });
      console.error(error);
    } else {
      setCommunityComments(data || []);
    }
    setLoadingCommunityComments(false);
  };

  const fetchLessonComments = async (lessonId: string) => {
    setLoadingLessonComments(true);
    const { data, error } = await supabase
      .from('lesson_comments')
      .select(`
        *,
        profiles(name, avatar_url)
      `)
      .eq('lesson_id', lessonId)
      .order('created_at', { ascending: true });
    
    if (error) {
      toast({ title: "Erro", description: "Falha ao carregar comentários da aula.", variant: "destructive" });
      console.error(error);
    } else {
      setLessonComments(data || []);
    }
    setLoadingLessonComments(false);
  };

  const handleDeleteCommunityComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('community_comments')
        .delete()
        .eq('id', commentId);
      
      if (error) throw error;
      toast({ title: "Sucesso", description: "Comentário da comunidade excluído." });
      fetchCommunityComments(post.id); // Refresh comments
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Falha ao excluir comentário da comunidade.", variant: "destructive" });
      console.error(error);
    }
  };

  const handleDeleteLessonComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('lesson_comments')
        .delete()
        .eq('id', commentId);
      
      if (error) throw error;
      toast({ title: "Sucesso", description: "Comentário da aula excluído." });
      fetchLessonComments(post.lesson_id); // Refresh comments
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Falha ao excluir comentário da aula.", variant: "destructive" });
      console.error(error);
    }
  };

  return (
    <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" /> {post.title}
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-2">
              Por <span className="font-medium">{post.profiles?.name || 'Desconhecido'}</span> em {new Date(post.created_at).toLocaleDateString()}
              {post.modules?.title && ` no módulo "${post.modules.title}"`}
            </p>
            <div dangerouslySetInnerHTML={{ __html: post.content }} className="prose prose-sm max-w-none" />
          </CardContent>
        </Card>

        {/* Seção de Comentários da Comunidade */}
        <h3 className="font-semibold text-lg">Comentários da Comunidade ({communityComments.length})</h3>
        {loadingCommunityComments ? (
          <p>Carregando comentários da comunidade...</p>
        ) : communityComments.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nenhum comentário da comunidade ainda.</p>
        ) : (
          <div className="space-y-3">
            {communityComments.map(comment => (
              <div key={comment.id} className="flex items-start gap-3 p-3 border rounded-lg">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={comment.profiles?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${comment.profiles?.name}`} />
                  <AvatarFallback>{comment.profiles?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{comment.profiles?.name || 'Membro'}</p>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ptBR })}
                    </span>
                  </div>
                  <p className="text-sm mt-1">{comment.content}</p>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-destructive h-6 px-2 mt-2">
                        <Trash2 className="h-3 w-3 mr-1" /> Excluir
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir este comentário da comunidade? Esta ação é irreversível.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteCommunityComment(comment.id)}>Excluir</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Nova Seção de Comentários da Aula */}
        {post.lesson_id && (
          <>
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <MessageSquarePlus className="h-5 w-5" /> Comentários da Aula ({lessonComments.length})
            </h3>
            {loadingLessonComments ? (
              <p>Carregando comentários da aula...</p>
            ) : lessonComments.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum comentário na aula ainda.</p>
            ) : (
              <div className="space-y-3">
                {lessonComments.map(comment => (
                  <div key={comment.id} className="flex items-start gap-3 p-3 border rounded-lg bg-blue-50/20"> {/* Estilo diferente para diferenciar */}
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={comment.profiles?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${comment.profiles?.name}`} />
                      <AvatarFallback>{comment.profiles?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">{comment.profiles?.name || 'Membro da Aula'}</p>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ptBR })}
                        </span>
                      </div>
                      <p className="text-sm mt-1">{comment.content}</p>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-destructive h-6 px-2 mt-2">
                            <Trash2 className="h-3 w-3 mr-1" /> Excluir
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir este comentário da aula? Esta ação é irreversível.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteLessonComment(comment.id)}>Excluir</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      <Button onClick={onClose} className="w-full mt-4">Fechar</Button>
    </DialogContent>
  );
};

const AdminCommunity = ({ memberAreaId: propMemberAreaId }: { memberAreaId?: string }) => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { memberAreaId: urlMemberAreaId } = useParams<{ memberAreaId: string }>();
  const currentMemberAreaId = propMemberAreaId || urlMemberAreaId;

  const [posts, setPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  const [isPostDetailsDialogOpen, setIsPostDetailsDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (user && isAdmin && currentMemberAreaId) {
      fetchPosts();
    }
  }, [user, isAdmin, currentMemberAreaId]);

  const fetchPosts = async () => {
    setLoadingPosts(true);
    const { data, error } = await supabase
      .from('community_posts')
      .select(`
        *,
        profiles(name, avatar_url),
        modules(title)
      `)
      .eq('member_area_id', currentMemberAreaId)
      .order('created_at', { ascending: false });
    
    if (error) {
      toast({ title: "Erro", description: "Falha ao carregar posts da comunidade.", variant: "destructive" });
      console.error(error);
    } else {
      setPosts(data || []);
    }
    setLoadingPosts(false);
  };

  const handleDeletePost = async (postId: string, postTitle: string) => {
    try {
      const { error } = await supabase
        .from('community_posts')
        .delete()
        .eq('id', postId);
      
      if (error) throw error;
      toast({ title: "Sucesso", description: `Post "${postTitle}" excluído.` });
      fetchPosts(); // Refresh posts
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Falha ao excluir post.", variant: "destructive" });
      console.error(error);
    }
  };

  const handleViewPost = (post: any) => {
    setSelectedPost(post);
    setIsPostDetailsDialogOpen(true);
  };

  const handlePostDetailsDialogClose = () => {
    setIsPostDetailsDialogOpen(false);
    setSelectedPost(null);
    fetchPosts(); // Refresh posts in case comments were deleted
  };

  if (authLoading || loadingPosts) {
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
          <CardTitle>Posts da Comunidade ({posts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {posts.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum post na comunidade</h3>
              <p className="text-muted-foreground">
                Posts de membros e automáticos aparecerão aqui
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map(post => (
                <div key={post.id} className="p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-lg">{post.title}</h3>
                    <div className="flex items-center gap-2">
                      {post.is_automatic && (
                        <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">Automático</span>
                      )}
                      <Button variant="outline" size="sm" onClick={() => handleViewPost(post)}>
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
                              Tem certeza que deseja excluir o post <strong>"{post.title}"</strong>? Todos os comentários associados também serão excluídos. Esta ação é irreversível.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeletePost(post.id, post.title)}>Excluir</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{post.content.replace(/<[^>]*>?/gm, '')}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>{post.profiles?.name || 'Desconhecido'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ptBR })}</span>
                    </div>
                    {post.modules?.title && (
                      <div className="flex items-center gap-1">
                        <BookOpen className="h-3 w-3" />
                        <span>{post.modules.title}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedPost && (
        <Dialog open={isPostDetailsDialogOpen} onOpenChange={setIsPostDetailsDialogOpen}>
          <PostDetailsDialog post={selectedPost} onClose={handlePostDetailsDialogClose} memberAreaId={currentMemberAreaId} />
        </Dialog>
      )}
    </div>
  );
};

export default AdminCommunity;