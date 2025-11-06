"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageCircle, Send, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMemberAreaAuth } from '@/hooks/useMemberAreaAuth';
import { memberAreaSupabase } from '@/integrations/supabase/memberAreaClient';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface Comment {
  id: string;
  lesson_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles: {
    name: string | null;
    avatar_url: string | null;
  } | null;
}

interface LessonCommentsProps {
  lessonId: string;
  memberAreaId: string; // Passed for context, though not directly used in DB queries here
}

const LessonComments: React.FC<LessonCommentsProps> = ({ lessonId }) => {
  const { user } = useMemberAreaAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchComments();
    
    // Realtime listener for new comments
    const channel = memberAreaSupabase
      .channel(`lesson_comments:${lessonId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen for all changes (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'lesson_comments',
          filter: `lesson_id=eq.${lessonId}`,
        },
        (payload) => {
          console.log('Realtime change received:', payload);
          fetchComments(); // Re-fetch comments on any change
        }
      )
      .subscribe();

    return () => {
      memberAreaSupabase.removeChannel(channel);
    };
  }, [lessonId]);

  const fetchComments = async () => {
    setLoading(true);
    const { data, error } = await memberAreaSupabase
      .from('lesson_comments')
      .select(`
        id,
        lesson_id,
        user_id,
        content,
        created_at,
        profiles (name, avatar_url)
      `)
      .eq('lesson_id', lessonId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching comments:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os comentários.',
        variant: 'destructive',
      });
    } else {
      setComments(data || []);
    }
    setLoading(false);
  };

  const handleSubmitComment = async () => {
    if (!user || !newComment.trim()) {
      toast({
        title: 'Erro',
        description: 'Você precisa estar logado e digitar um comentário.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await memberAreaSupabase
        .from('lesson_comments')
        .insert({
          lesson_id: lessonId,
          user_id: user.id,
          content: newComment.trim(),
        });

      if (error) throw error;

      setNewComment('');
      toast({
        title: 'Sucesso',
        description: 'Comentário adicionado!',
      });
      // Realtime listener will trigger fetchComments
    } catch (error: any) {
      console.error('Error submitting comment:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível adicionar o comentário.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user) {
      toast({
        title: 'Erro',
        description: 'Você precisa estar logado para excluir comentários.',
        variant: 'destructive',
      });
      return;
    }

    const commentToDelete = comments.find(c => c.id === commentId);
    if (!commentToDelete) {
      console.error('LESSON_COMMENTS_DEBUG: Comment not found for deletion:', commentId);
      return;
    }

    console.log('LESSON_COMMENTS_DEBUG: Attempting to delete comment. User ID:', user.id, 'Comment User ID:', commentToDelete.user_id);

    try {
      const { error } = await memberAreaSupabase
        .from('lesson_comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user.id); // Ensure only the owner can delete

      if (error) {
        console.error('LESSON_COMMENTS_DEBUG: Error deleting comment:', error);
        throw error;
      }

      toast({
        title: 'Sucesso',
        description: 'Comentário excluído!',
      });
      // Realtime listener will trigger fetchComments
    } catch (error: any) {
      console.error('LESSON_COMMENTS_DEBUG: Error deleting comment in catch block:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível excluir o comentário.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="shadow-lg rounded-xl" style={{ backgroundColor: 'hsl(var(--member-area-card-background))' }}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2" style={{ color: 'hsl(var(--member-area-text-dark))' }}>
          <MessageCircle className="h-6 w-6" /> Comentários ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input para novo comentário */}
        {user && (
          <div className="flex flex-col space-y-3">
            <Textarea
              placeholder="Deixe seu comentário sobre a aula..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={3}
              disabled={submitting}
              style={{ backgroundColor: 'hsl(var(--member-area-background))', color: 'hsl(var(--member-area-text-dark))', borderColor: 'hsl(var(--member-area-text-muted))' }}
            />
            <Button
              onClick={handleSubmitComment}
              disabled={submitting || !newComment.trim()}
              className="self-end"
              style={{ backgroundColor: 'hsl(var(--member-area-primary))', color: '#FFFFFF' }}
            >
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              {submitting ? 'Enviando...' : 'Enviar Comentário'}
            </Button>
          </div>
        )}

        {/* Lista de comentários */}
        {loading ? (
          <div className="text-center py-4" style={{ color: 'hsl(var(--member-area-text-muted))' }}>
            Carregando comentários...
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-4" style={{ color: 'hsl(var(--member-area-text-muted))' }}>
            Nenhum comentário ainda. Seja o primeiro a comentar!
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="flex items-start space-x-3 p-3 rounded-lg" style={{ backgroundColor: 'hsl(var(--member-area-background))', border: '1px solid hsl(var(--member-area-text-muted))' }}>
                <Avatar className="h-9 w-9">
                  <AvatarImage src={comment.profiles?.avatar_url || undefined} alt={comment.profiles?.name || 'User'} />
                  <AvatarFallback className="bg-gray-200 text-gray-700">
                    {comment.profiles?.name?.charAt(0).toUpperCase() || comment.user_id.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm" style={{ color: 'hsl(var(--member-area-text-dark))' }}>
                      {comment.profiles?.name || 'Membro'}
                    </p>
                    <span className="text-xs" style={{ color: 'hsl(var(--member-area-text-muted))' }}>
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ptBR })}
                    </span>
                  </div>
                  <p className="text-sm mt-1" style={{ color: 'hsl(var(--member-area-text-dark))' }}>
                    {comment.content}
                  </p>
                  {user?.id === comment.user_id && (
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
                            Tem certeza que deseja excluir este comentário? Esta ação é irreversível.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteComment(comment.id)}>Excluir</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LessonComments;