-- ================================================
-- TABELA: community_posts
-- ================================================
CREATE TABLE public.community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  likes_count INTEGER DEFAULT 0 NOT NULL,
  comments_count INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  deleted_at TIMESTAMPTZ,
  
  CONSTRAINT content_length_check CHECK (char_length(content) > 0 AND char_length(content) <= 5000)
);

-- Índices para performance
CREATE INDEX idx_community_posts_user_id ON public.community_posts(user_id);
CREATE INDEX idx_community_posts_created_at ON public.community_posts(created_at DESC);
CREATE INDEX idx_community_posts_deleted_at ON public.community_posts(deleted_at) WHERE deleted_at IS NULL;

-- RLS Policies
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view non-deleted posts"
  ON public.community_posts
  FOR SELECT
  USING (deleted_at IS NULL);

CREATE POLICY "Authenticated users can create posts"
  ON public.community_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts"
  ON public.community_posts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ================================================
-- TABELA: community_comments
-- ================================================
CREATE TABLE public.community_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  likes_count INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  deleted_at TIMESTAMPTZ,
  
  CONSTRAINT comment_content_length_check CHECK (char_length(content) > 0 AND char_length(content) <= 2000)
);

-- Índices
CREATE INDEX idx_community_comments_post_id ON public.community_comments(post_id);
CREATE INDEX idx_community_comments_user_id ON public.community_comments(user_id);
CREATE INDEX idx_community_comments_created_at ON public.community_comments(created_at);

-- RLS Policies
ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view non-deleted comments"
  ON public.community_comments
  FOR SELECT
  USING (deleted_at IS NULL);

CREATE POLICY "Authenticated users can create comments"
  ON public.community_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
  ON public.community_comments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ================================================
-- TABELA: community_likes
-- ================================================
CREATE TABLE public.community_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  post_id UUID REFERENCES public.community_posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES public.community_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  
  CONSTRAINT like_target_check CHECK (
    (post_id IS NOT NULL AND comment_id IS NULL) OR
    (post_id IS NULL AND comment_id IS NOT NULL)
  )
);

-- Unique constraints
CREATE UNIQUE INDEX idx_community_likes_user_post ON public.community_likes(user_id, post_id) WHERE post_id IS NOT NULL;
CREATE UNIQUE INDEX idx_community_likes_user_comment ON public.community_likes(user_id, comment_id) WHERE comment_id IS NOT NULL;

-- Índices adicionais
CREATE INDEX idx_community_likes_user_id ON public.community_likes(user_id);
CREATE INDEX idx_community_likes_post_id ON public.community_likes(post_id) WHERE post_id IS NOT NULL;
CREATE INDEX idx_community_likes_comment_id ON public.community_likes(comment_id) WHERE comment_id IS NOT NULL;

-- RLS Policies
ALTER TABLE public.community_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view likes"
  ON public.community_likes
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create likes"
  ON public.community_likes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own likes"
  ON public.community_likes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ================================================
-- TRIGGERS: Contadores Automáticos
-- ================================================

-- Trigger para atualizar comments_count em posts
CREATE OR REPLACE FUNCTION update_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.deleted_at IS NULL THEN
    UPDATE public.community_posts
    SET comments_count = comments_count + 1
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    UPDATE public.community_posts
    SET comments_count = GREATEST(comments_count - 1, 0)
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' AND OLD.deleted_at IS NULL THEN
    UPDATE public.community_posts
    SET comments_count = GREATEST(comments_count - 1, 0)
    WHERE id = OLD.post_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_post_comments_count
AFTER INSERT OR UPDATE OR DELETE ON public.community_comments
FOR EACH ROW EXECUTE FUNCTION update_post_comments_count();

-- Trigger para atualizar likes_count em posts
CREATE OR REPLACE FUNCTION update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.post_id IS NOT NULL THEN
    UPDATE public.community_posts
    SET likes_count = likes_count + 1
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' AND OLD.post_id IS NOT NULL THEN
    UPDATE public.community_posts
    SET likes_count = GREATEST(likes_count - 1, 0)
    WHERE id = OLD.post_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_post_likes_count
AFTER INSERT OR DELETE ON public.community_likes
FOR EACH ROW EXECUTE FUNCTION update_post_likes_count();

-- Trigger para atualizar likes_count em comentários
CREATE OR REPLACE FUNCTION update_comment_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.comment_id IS NOT NULL THEN
    UPDATE public.community_comments
    SET likes_count = likes_count + 1
    WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' AND OLD.comment_id IS NOT NULL THEN
    UPDATE public.community_comments
    SET likes_count = GREATEST(likes_count - 1, 0)
    WHERE id = OLD.comment_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_comment_likes_count
AFTER INSERT OR DELETE ON public.community_likes
FOR EACH ROW EXECUTE FUNCTION update_comment_likes_count();

-- Trigger para updated_at em posts
CREATE TRIGGER trigger_community_posts_updated_at
BEFORE UPDATE ON public.community_posts
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger para updated_at em comments
CREATE TRIGGER trigger_community_comments_updated_at
BEFORE UPDATE ON public.community_comments
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ================================================
-- VIEW: community_feed (otimizada para feed)
-- ================================================
CREATE OR REPLACE VIEW community_feed AS
SELECT 
  p.id,
  p.user_id,
  p.content,
  p.image_url,
  p.likes_count,
  p.comments_count,
  p.created_at,
  p.updated_at,
  prof.full_name AS author_name,
  prof.avatar_url AS author_avatar,
  prof.username AS author_username
FROM public.community_posts p
LEFT JOIN public.profiles prof ON p.user_id = prof.user_id
WHERE p.deleted_at IS NULL
ORDER BY p.created_at DESC;