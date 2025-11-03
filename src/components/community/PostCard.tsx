import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR, enUS, es } from "date-fns/locale";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { CommentSection } from "./CommentSection";
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

type Post = {
  id: string;
  user_id: string;
  content: string;
  image_url?: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  author_name: string;
  author_avatar?: string;
  user_has_liked: boolean;
};

export const PostCard = ({ 
  post, 
  currentUserId,
  onUpdate 
}: { 
  post: Post;
  currentUserId: string | null;
  onUpdate: () => void;
}) => {
  const { language, t } = useLanguage();
  const { toast } = useToast();
  const [showComments, setShowComments] = useState(false);
  const [isLiking, setIsLiking] = useState(false);

  const localeMap = { pt: ptBR, en: enUS, es: es };
  const locale = localeMap[language as keyof typeof localeMap] || ptBR;

  const handleLike = async () => {
    if (!currentUserId || isLiking) return;
    
    setIsLiking(true);

    try {
      if (post.user_has_liked) {
        // Remover like
        await supabase
          .from('community_likes')
          .delete()
          .eq('user_id', currentUserId)
          .eq('post_id', post.id);
      } else {
        // Adicionar like
        await supabase
          .from('community_likes')
          .insert({
            user_id: currentUserId,
            post_id: post.id
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
        .from('community_posts')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', post.id);

      if (error) throw error;

      toast({
        title: t('community.deleteSuccess'),
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
    <Card className="p-4 bg-card/50 backdrop-blur-sm border-primary/20">
      {/* Header do post */}
      <div className="flex items-start gap-3 mb-3">
        <Avatar>
          <AvatarImage src={post.author_avatar} />
          <AvatarFallback className="bg-primary/10 text-primary">
            {post.author_name?.[0]?.toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="font-semibold text-foreground">{post.author_name}</p>
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(post.created_at), { 
              addSuffix: true,
              locale 
            })}
          </p>
        </div>
        {currentUserId === post.user_id && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('community.deleteConfirm')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('community.deleteConfirmDesc')}
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

      {/* Conteúdo */}
      <p className="mb-4 whitespace-pre-wrap text-foreground">{post.content}</p>
      
      {/* Imagem se houver */}
      {post.image_url && (
        <img 
          src={post.image_url} 
          alt="Post" 
          className="mb-4 rounded-lg max-h-96 w-full object-cover"
        />
      )}

      {/* Ações */}
      <div className="flex items-center gap-4 pt-3 border-t border-border">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={handleLike}
          disabled={isLiking || !currentUserId}
          className={post.user_has_liked ? "text-red-500 hover:text-red-600" : "text-muted-foreground hover:text-foreground"}
        >
          <Heart className={`h-4 w-4 mr-1 ${post.user_has_liked ? "fill-current" : ""}`} />
          {post.likes_count}
        </Button>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => setShowComments(!showComments)}
          className="text-muted-foreground hover:text-foreground"
        >
          <MessageCircle className="h-4 w-4 mr-1" />
          {post.comments_count}
        </Button>
      </div>

      {/* Seção de comentários */}
      {showComments && (
        <CommentSection 
          postId={post.id}
          currentUserId={currentUserId}
          onUpdate={onUpdate}
        />
      )}
    </Card>
  );
};
