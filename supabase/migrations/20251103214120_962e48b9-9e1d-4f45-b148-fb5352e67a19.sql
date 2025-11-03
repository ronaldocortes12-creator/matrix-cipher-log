-- ============================================
-- CAMADA 1: SEGURANÇA CRÍTICA
-- ============================================

-- 1.1 Mover extension vector para schema próprio (se existir)
CREATE SCHEMA IF NOT EXISTS extensions;

-- 1.2 Criar tabela de rate limiting para edge functions
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(ip_address, endpoint, window_start)
);

CREATE INDEX idx_rate_limits_window ON public.api_rate_limits(ip_address, endpoint, window_start DESC);

-- Cleanup automático de rate limits antigos (> 1 hora)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.api_rate_limits 
  WHERE window_start < NOW() - INTERVAL '1 hour';
END;
$$;

-- ============================================
-- CAMADA 2: PERFORMANCE - ÍNDICES ESTRATÉGICOS
-- ============================================

-- Chat: buscar mensagens por usuário + lição
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_lesson 
ON public.chat_messages(user_id, lesson_id, created_at DESC);

-- Lessons: buscar por usuário + status
CREATE INDEX IF NOT EXISTS idx_lessons_user_status 
ON public.lessons(user_id, status);

-- Lesson Progress: buscar por usuário
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user 
ON public.lesson_progress(user_id, lesson_day);

-- Crypto: buscar probabilidades recentes por símbolo
CREATE INDEX IF NOT EXISTS idx_crypto_prob_date_symbol 
ON public.crypto_probabilities(symbol, calculation_date DESC);

-- Crypto: buscar por data (para cleanup e queries temporais)
CREATE INDEX IF NOT EXISTS idx_crypto_prob_date 
ON public.crypto_probabilities(calculation_date DESC);

-- Community: feed ordenado (posts não deletados)
CREATE INDEX IF NOT EXISTS idx_community_posts_active 
ON public.community_posts(created_at DESC) 
WHERE deleted_at IS NULL;

-- Community: posts por usuário
CREATE INDEX IF NOT EXISTS idx_community_posts_user 
ON public.community_posts(user_id, created_at DESC) 
WHERE deleted_at IS NULL;

-- Community: likes por usuário (para verificar se já deu like)
CREATE INDEX IF NOT EXISTS idx_community_likes_user_post 
ON public.community_likes(user_id, post_id);

-- Community: comentários por post (não deletados)
CREATE INDEX IF NOT EXISTS idx_community_comments_post 
ON public.community_comments(post_id, created_at DESC) 
WHERE deleted_at IS NULL;

-- Audit logs: buscar por usuário e ação
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action 
ON public.audit_logs(user_id, action, created_at DESC);

-- Sessions: buscar sessões ativas
CREATE INDEX IF NOT EXISTS idx_user_sessions_active 
ON public.user_sessions(user_id, is_active, last_activity_at DESC);

-- ============================================
-- CAMADA 4: MONITORING - TABELA DE ERROS
-- ============================================

CREATE TABLE IF NOT EXISTS public.error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  function_name TEXT NOT NULL,
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  request_id TEXT,
  user_id UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_error_logs_occurred ON public.error_logs(occurred_at DESC);
CREATE INDEX idx_error_logs_function ON public.error_logs(function_name, occurred_at DESC);
CREATE INDEX idx_error_logs_unresolved ON public.error_logs(resolved, occurred_at DESC) WHERE resolved = FALSE;

-- RLS para error_logs (apenas admins podem ver)
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all error logs"
ON public.error_logs
FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "System can insert error logs"
ON public.error_logs
FOR INSERT
WITH CHECK (true);

-- ============================================
-- CAMADA 2: PERFORMANCE - MATERIALIZED VIEW
-- ============================================

-- Materialized view para community feed (melhor performance)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.community_feed_optimized AS
SELECT 
  p.id,
  p.user_id,
  p.content,
  p.image_url,
  p.likes_count,
  p.comments_count,
  p.created_at,
  p.updated_at,
  prof.username as author_username,
  prof.full_name as author_name,
  prof.avatar_url as author_avatar,
  prof.account_status as author_status
FROM public.community_posts p
LEFT JOIN public.profiles prof ON p.user_id = prof.user_id
WHERE p.deleted_at IS NULL
ORDER BY p.created_at DESC;

CREATE UNIQUE INDEX idx_community_feed_optimized_id ON public.community_feed_optimized(id);
CREATE INDEX idx_community_feed_optimized_date ON public.community_feed_optimized(created_at DESC);

-- Função para refresh da materialized view
CREATE OR REPLACE FUNCTION refresh_community_feed()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.community_feed_optimized;
END;
$$;

-- ============================================
-- CAMADA 2: MANUTENÇÃO AUTOMÁTICA
-- ============================================

-- Função de manutenção semanal
CREATE OR REPLACE FUNCTION weekly_maintenance()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Vacuum e analyze nas tabelas mais usadas
  EXECUTE 'VACUUM ANALYZE public.chat_messages';
  EXECUTE 'VACUUM ANALYZE public.crypto_probabilities';
  EXECUTE 'VACUUM ANALYZE public.community_posts';
  EXECUTE 'VACUUM ANALYZE public.community_comments';
  EXECUTE 'VACUUM ANALYZE public.audit_logs';
  
  -- Cleanup de dados antigos
  PERFORM cleanup_old_crypto_data();
  PERFORM cleanup_old_rate_limits();
  
  -- Refresh da materialized view
  PERFORM refresh_community_feed();
  
  -- Log da manutenção
  INSERT INTO public.audit_logs (action, table_name, metadata)
  VALUES (
    'weekly_maintenance_completed',
    'system',
    jsonb_build_object(
      'executed_at', NOW(),
      'tasks', ARRAY['vacuum', 'cleanup', 'refresh_views']
    )
  );
END;
$$;

-- ============================================
-- CAMADA 6: DISASTER RECOVERY - BACKUP LOG
-- ============================================

CREATE TABLE IF NOT EXISTS public.backup_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_type TEXT NOT NULL,
  tables_backed_up TEXT[] NOT NULL,
  backup_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'completed',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_backup_logs_timestamp ON public.backup_logs(backup_timestamp DESC);

-- Função para registrar backup diário
CREATE OR REPLACE FUNCTION daily_backup_log()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.backup_logs (backup_type, tables_backed_up, metadata)
  VALUES (
    'auto',
    ARRAY[
      'chat_messages',
      'lessons',
      'lesson_progress',
      'profiles',
      'crypto_probabilities',
      'community_posts',
      'community_comments'
    ],
    jsonb_build_object(
      'backup_time', NOW(),
      'pitr_enabled', true,
      'retention_days', 7
    )
  );
END;
$$;

-- ============================================
-- CAMADA 5: ISOLAMENTO - FORTALECER RLS
-- ============================================

-- Trigger para validar ownership de chat messages
CREATE OR REPLACE FUNCTION validate_chat_message_ownership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.lessons
    WHERE id = NEW.lesson_id
    AND user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Lesson does not belong to user';
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_chat_ownership ON public.chat_messages;
CREATE TRIGGER validate_chat_ownership
  BEFORE INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION validate_chat_message_ownership();

-- ============================================
-- CAMADA 4: MONITORING - SYSTEM HEALTH TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.system_health_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL,
  metrics JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_health_snapshots_time ON public.system_health_snapshots(snapshot_time DESC);

-- Cleanup de health snapshots antigos (> 30 dias)
CREATE OR REPLACE FUNCTION cleanup_old_health_snapshots()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.system_health_snapshots 
  WHERE snapshot_time < NOW() - INTERVAL '30 days';
END;
$$;