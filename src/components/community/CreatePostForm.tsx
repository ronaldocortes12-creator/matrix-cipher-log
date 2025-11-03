import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Send, Image as ImageIcon, X } from "lucide-react";
import { Input } from "@/components/ui/input";

export const CreatePostForm = ({ onPostCreated }: { onPostCreated: () => void }) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: t('common.error'),
          description: "Imagem muito grande. Máximo 5MB.",
          variant: "destructive"
        });
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setImageFile(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
  };

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

    try {
      let imageUrl = null;

      // Upload da imagem se houver
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('community-images')
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('community-images')
          .getPublicUrl(fileName);

        imageUrl = publicUrl;
      }

      const { error } = await supabase
        .from('community_posts')
        .insert({
          user_id: user.id,
          content: content.trim(),
          image_url: imageUrl
        });

      if (error) throw error;

      toast({
        title: t('community.postSuccess'),
      });
      setContent("");
      removeImage();
      onPostCreated();
    } catch (error: any) {
      toast({
        title: t('community.postError'),
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="p-4 bg-card/50 backdrop-blur-sm border-primary/20">
      <form onSubmit={handleSubmit} className="space-y-3">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t('community.postPlaceholder')}
          className="min-h-[100px] bg-background/50 border-primary/10 text-foreground placeholder:text-muted-foreground"
          maxLength={5000}
        />
        
        {imagePreview && (
          <div className="relative">
            <img 
              src={imagePreview} 
              alt="Preview" 
              className="max-h-60 w-full rounded-lg object-cover"
            />
            <Button
              type="button"
              size="icon"
              variant="destructive"
              className="absolute top-2 right-2"
              onClick={removeImage}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Input
              id="image-upload"
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('image-upload')?.click()}
              disabled={!!imageFile}
            >
              <ImageIcon className="h-4 w-4 mr-2" />
              Imagem
            </Button>
            <span className="text-xs text-muted-foreground">
              {content.length}/5000
            </span>
          </div>
          
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
