import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Send } from "lucide-react";
import { CommentItem } from "./CommentItem";
import { Skeleton } from "@/components/ui/skeleton";

type Comment = {
  id: string;
  user_id: string;
  content: string;
  likes_count: number;
  created_at: string;
  author_name: string;
  author_avatar?: string;
  user_has_liked: boolean;
};

export const CommentSection = ({ 
  postId, 
  currentUserId,
  onUpdate 
}: { 
  postId: string;
  currentUserId: string | null;
  onUpdate: () => void;
}) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadComments();
  }, [postId]);

  const loadComments = async () => {
    try {
      // Buscar comentários com join em profiles
      const { data: commentsData, error } = await supabase
        .from('community_comments')
        .select(`
          id,
          user_id,
          content,
          likes_count,
          created_at,
          profiles!inner(full_name, avatar_url)
        `)
        .eq('post_id', postId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Buscar likes do usuário atual
      let userLikes: string[] = [];
      if (currentUserId) {
        const { data: likesData } = await supabase
          .from('community_likes')
          .select('comment_id')
          .eq('user_id', currentUserId)
          .not('comment_id', 'is', null);
        
        userLikes = likesData?.map(l => l.comment_id).filter(Boolean) || [];
      }

      // Formatar comentários
      const formattedComments = (commentsData || []).map(comment => ({
        id: comment.id,
        user_id: comment.user_id,
        content: comment.content,
        likes_count: comment.likes_count,
        created_at: comment.created_at,
        author_name: (comment.profiles as any)?.full_name || 'Usuário',
        author_avatar: (comment.profiles as any)?.avatar_url,
        user_has_liked: userLikes.includes(comment.id)
      }));

      setComments(formattedComments);
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUserId) {
      toast({
        title: t('common.error'),
        description: t('community.authRequired'),
        variant: "destructive"
      });
      return;
    }

    if (newComment.trim().length === 0) return;

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('community_comments')
        .insert({
          post_id: postId,
          user_id: currentUserId,
          content: newComment.trim()
        });

      if (error) throw error;

      setNewComment("");
      await loadComments();
      onUpdate(); // Atualiza o contador de comentários no post
    } catch (error: any) {
      toast({
        title: t('community.commentError'),
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-border space-y-3">
      {/* Lista de comentários */}
      {isLoading ? (
        <>
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-2">
          {t('community.noComments')}
        </p>
      ) : (
        comments.map(comment => (
          <CommentItem
            key={comment.id}
            comment={comment}
            currentUserId={currentUserId}
            onUpdate={() => {
              loadComments();
              onUpdate();
            }}
          />
        ))
      )}

      {/* Formulário de novo comentário */}
      {currentUserId && (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={t('community.commentPlaceholder')}
            className="flex-1 min-h-[60px] bg-background/50 border-primary/10 text-foreground placeholder:text-muted-foreground"
            maxLength={2000}
          />
          <Button 
            type="submit" 
            disabled={isSubmitting || newComment.trim().length === 0}
            size="icon"
            className="self-end"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      )}
    </div>
  );
};
