import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TabBar } from "@/components/TabBar";
import { MatrixRain } from "@/components/MatrixRain";
import { UserHeader } from "@/components/UserHeader";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { PostCard } from "@/components/community/PostCard";
import { CreatePostForm } from "@/components/community/CreatePostForm";
import { Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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

const Community = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    initializeCommunity();
  }, []);

  const initializeCommunity = async () => {
    await getCurrentUser();
    await loadPosts();
    subscribeToNewPosts();
  };

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const loadPosts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Buscar posts usando a view otimizada
      const { data: postsData, error: postsError } = await supabase
        .from('community_feed')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (postsError) throw postsError;

      // Buscar likes do usuário atual
      let userLikes: string[] = [];
      if (user) {
        const { data: likesData } = await supabase
          .from('community_likes')
          .select('post_id')
          .eq('user_id', user.id)
          .not('post_id', 'is', null);
        
        userLikes = likesData?.map(l => l.post_id).filter(Boolean) || [];
      }

      // Combinar dados
      const postsWithLikes = (postsData || []).map(post => ({
        ...post,
        user_has_liked: userLikes.includes(post.id)
      }));

      setPosts(postsWithLikes);
    } catch (error: any) {
      toast({
        title: t('community.errorTitle'),
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const subscribeToNewPosts = () => {
    const channel = supabase
      .channel('community_posts_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'community_posts'
      }, () => {
        loadPosts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <MatrixRain />
      <UserHeader />
      
      <div className="relative z-10 container max-w-2xl mx-auto px-4 pt-20 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Users className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">{t('community.title')}</h1>
        </div>

        {/* Formulário de criar post */}
        <CreatePostForm onPostCreated={loadPosts} />

        {/* Feed de posts */}
        <div className="space-y-4 mt-6">
          {isLoading ? (
            <>
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </>
          ) : posts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {t('community.noPosts')}
            </div>
          ) : (
            posts.map(post => (
              <PostCard 
                key={post.id}
                post={post}
                currentUserId={currentUserId}
                onUpdate={loadPosts}
              />
            ))
          )}
        </div>
      </div>

      <TabBar />
    </div>
  );
};

export default Community;
