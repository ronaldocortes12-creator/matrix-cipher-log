import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Send } from "lucide-react";

export const CreatePostForm = ({ onPostCreated }: { onPostCreated: () => void }) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (content.trim().length === 0) {
      toast({
        title: t('community.emptyPostError'),
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({
        title: t('common.error'),
        description: t('community.authRequired'),
        variant: "destructive"
      });
      setIsSubmitting(false);
      return;
    }

    const { error } = await supabase
      .from('community_posts')
      .insert({
        user_id: user.id,
        content: content.trim()
      });

    if (error) {
      toast({
        title: t('community.postError'),
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: t('community.postSuccess'),
      });
      setContent("");
      onPostCreated();
    }

    setIsSubmitting(false);
  };

  return (
    <Card className="p-4 bg-card/50 backdrop-blur-sm border-primary/20">
      <form onSubmit={handleSubmit}>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t('community.postPlaceholder')}
          className="min-h-[100px] mb-3 bg-background/50 border-primary/10 text-foreground placeholder:text-muted-foreground"
          maxLength={5000}
        />
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">
            {content.length}/5000
          </span>
          <Button 
            type="submit" 
            disabled={isSubmitting || content.trim().length === 0}
            className="gap-2"
          >
            <Send className="h-4 w-4" />
            {t('community.publish')}
          </Button>
        </div>
      </form>
    </Card>
  );
};
