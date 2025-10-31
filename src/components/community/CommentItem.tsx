import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR, enUS, es } from "date-fns/locale";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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

export const CommentItem = ({ 
  comment, 
  currentUserId,
  onUpdate 
}: { 
  comment: Comment;
  currentUserId: string | null;
  onUpdate: () => void;
}) => {
  const { language, t } = useLanguage();
  const { toast } = useToast();
  const [isLiking, setIsLiking] = useState(false);

  const localeMap = { pt: ptBR, en: enUS, es: es };
  const locale = localeMap[language as keyof typeof localeMap] || ptBR;

  const handleLike = async () => {
    if (!currentUserId || isLiking) return;
    
    setIsLiking(true);

    try {
      if (comment.user_has_liked) {
        await supabase
          .from('community_likes')
          .delete()
          .eq('user_id', currentUserId)
          .eq('comment_id', comment.id);
      } else {
        await supabase
          .from('community_likes')
          .insert({
            user_id: currentUserId,
            comment_id: comment.id
          });
      }
      onUpdate();
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLiking(false);
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('community_comments')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', comment.id);

      if (error) throw error;

      toast({
        title: t('community.commentDeleteSuccess'),
      });
      onUpdate();
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="flex gap-2 py-2">
      <Avatar className="h-8 w-8">
        <AvatarImage src={comment.author_avatar} />
        <AvatarFallback className="bg-primary/10 text-primary text-xs">
          {comment.author_name?.[0]?.toUpperCase() || '?'}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 bg-muted/30 rounded-lg p-3">
        <div className="flex items-start justify-between mb-1">
          <div>
            <p className="text-sm font-semibold text-foreground">{comment.author_name}</p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.created_at), { 
                addSuffix: true,
                locale 
              })}
            </p>
          </div>
          {currentUserId === comment.user_id && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('community.deleteCommentConfirm')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('community.deleteCommentConfirmDesc')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    {t('common.delete')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
        <p className="text-sm text-foreground mb-2">{comment.content}</p>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={handleLike}
          disabled={isLiking || !currentUserId}
          className={`h-6 px-2 ${comment.user_has_liked ? "text-red-500 hover:text-red-600" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Heart className={`h-3 w-3 mr-1 ${comment.user_has_liked ? "fill-current" : ""}`} />
          <span className="text-xs">{comment.likes_count}</span>
        </Button>
      </div>
    </div>
  );
};
