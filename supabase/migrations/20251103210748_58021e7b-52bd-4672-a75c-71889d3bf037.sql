-- Criar bucket para imagens da comunidade
INSERT INTO storage.buckets (id, name, public)
VALUES ('community-images', 'community-images', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage para imagens da comunidade
CREATE POLICY "Anyone can view community images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'community-images');

CREATE POLICY "Authenticated users can upload community images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'community-images' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can update their own community images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'community-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own community images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'community-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Criar view para perfis públicos (resolve o problema de RLS)
CREATE OR REPLACE VIEW public_profiles AS
SELECT 
  user_id,
  full_name,
  avatar_url,
  username
FROM profiles
WHERE deleted_at IS NULL;

-- Permitir acesso público à view
GRANT SELECT ON public_profiles TO authenticated, anon;