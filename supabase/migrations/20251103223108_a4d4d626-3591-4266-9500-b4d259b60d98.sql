-- FASE 1: CRIAR VIEWS ADMINISTRATIVAS ORGANIZADAS

-- 1.1 - View: Perfil Completo do Usuário
CREATE OR REPLACE VIEW admin_user_overview AS
SELECT 
  p.user_id,
  p.full_name,
  p.username,
  p.email_verified,
  p.account_status,
  p.crypto_experience,
  p.created_at as user_since,
  p.last_login_at,
  
  -- Dados de preferências
  up.language,
  up.has_seen_welcome,
  
  -- Contadores gerais
  (SELECT COUNT(*) FROM lessons WHERE user_id = p.user_id) as total_lessons,
  (SELECT COUNT(*) FROM lessons WHERE user_id = p.user_id AND status = 'completed') as lessons_completed,
  (SELECT COUNT(*) FROM chat_messages WHERE user_id = p.user_id) as total_messages,
  (SELECT COUNT(*) FROM community_posts WHERE user_id = p.user_id AND deleted_at IS NULL) as posts_created,
  (SELECT COUNT(*) FROM community_comments WHERE user_id = p.user_id AND deleted_at IS NULL) as comments_made
  
FROM profiles p
LEFT JOIN user_preferences up ON p.user_id = up.user_id
WHERE p.deleted_at IS NULL
ORDER BY p.created_at DESC;

-- 1.2 - View: Histórico de Mensagens por Usuário
CREATE OR REPLACE VIEW admin_messages_by_user AS
SELECT 
  cm.user_id,
  p.full_name as user_name,
  cm.lesson_id,
  l.lesson_number,
  l.title as lesson_title,
  cm.id as message_id,
  cm.role as message_role,
  cm.content as message_content,
  cm.created_at as sent_at,
  
  -- Flag de mensagem órfã
  CASE 
    WHEN cm.lesson_id IS NULL THEN true 
    ELSE false 
  END as is_orphan_message
  
FROM chat_messages cm
LEFT JOIN profiles p ON cm.user_id = p.user_id
LEFT JOIN lessons l ON cm.lesson_id = l.id
ORDER BY cm.user_id, cm.created_at DESC;

-- 1.3 - View: Progresso Detalhado de Lessons
CREATE OR REPLACE VIEW admin_user_lesson_progress AS
SELECT 
  l.user_id,
  p.full_name as user_name,
  l.lesson_number,
  l.title,
  l.status as lesson_status,
  l.created_at as lesson_created,
  l.updated_at as lesson_updated,
  
  -- Dados de progresso
  lp.completed as progress_completed,
  lp.completed_at as progress_completed_at,
  
  -- Mensagens nessa lesson
  (SELECT COUNT(*) FROM chat_messages cm WHERE cm.lesson_id = l.id) as messages_in_lesson,
  (SELECT MIN(created_at) FROM chat_messages cm WHERE cm.lesson_id = l.id) as first_message_at,
  (SELECT MAX(created_at) FROM chat_messages cm WHERE cm.lesson_id = l.id) as last_message_at
  
FROM lessons l
LEFT JOIN profiles p ON l.user_id = p.user_id
LEFT JOIN lesson_progress lp ON l.user_id = lp.user_id AND l.lesson_number = lp.lesson_day
WHERE p.deleted_at IS NULL
ORDER BY l.user_id, l.lesson_number;

-- 1.4 - View: Atividade Comunitária por Usuário
CREATE OR REPLACE VIEW admin_user_community_activity AS
SELECT 
  p.user_id,
  p.full_name as user_name,
  
  -- Posts
  (SELECT COUNT(*) FROM community_posts cp WHERE cp.user_id = p.user_id AND cp.deleted_at IS NULL) as total_posts,
  (SELECT SUM(likes_count) FROM community_posts cp WHERE cp.user_id = p.user_id AND cp.deleted_at IS NULL) as total_post_likes_received,
  (SELECT MAX(created_at) FROM community_posts cp WHERE cp.user_id = p.user_id) as last_post_at,
  
  -- Comments
  (SELECT COUNT(*) FROM community_comments cc WHERE cc.user_id = p.user_id AND cc.deleted_at IS NULL) as total_comments,
  (SELECT SUM(likes_count) FROM community_comments cc WHERE cc.user_id = p.user_id AND cc.deleted_at IS NULL) as total_comment_likes_received,
  (SELECT MAX(created_at) FROM community_comments cc WHERE cc.user_id = p.user_id) as last_comment_at,
  
  -- Likes dados
  (SELECT COUNT(*) FROM community_likes cl WHERE cl.user_id = p.user_id) as total_likes_given,
  
  -- Engajamento total
  (
    COALESCE((SELECT SUM(likes_count) FROM community_posts cp WHERE cp.user_id = p.user_id), 0) +
    COALESCE((SELECT SUM(likes_count) FROM community_comments cc WHERE cc.user_id = p.user_id), 0)
  ) as total_engagement_score
  
FROM profiles p
WHERE p.deleted_at IS NULL
ORDER BY total_engagement_score DESC;

-- FASE 2: CORRIGIR MENSAGENS ÓRFÃS
-- Associar mensagens órfãs à primeira lesson do usuário
UPDATE chat_messages cm
SET lesson_id = (
  SELECT id FROM lessons l 
  WHERE l.user_id = cm.user_id 
  AND l.lesson_number = 1 
  LIMIT 1
)
WHERE cm.lesson_id IS NULL
AND cm.user_id IN (SELECT user_id FROM profiles WHERE deleted_at IS NULL);

-- FASE 3: ADICIONAR CONSTRAINT PARA PREVENIR FUTURAS MENSAGENS ÓRFÃS
ALTER TABLE chat_messages 
ALTER COLUMN lesson_id SET NOT NULL;

-- FASE 4: CRIAR ÍNDICES ADICIONAIS PARA VIEWS
-- Índice para consultas de mensagens por usuário e lesson
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_lesson_created 
ON chat_messages(user_id, lesson_id, created_at DESC);

-- Índice para consultas de lessons por usuário e status
CREATE INDEX IF NOT EXISTS idx_lessons_user_status 
ON lessons(user_id, status);

-- Índice para consultas de progresso por usuário
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user_completed 
ON lesson_progress(user_id, completed);

-- Registrar no audit log
INSERT INTO audit_logs (action, table_name, metadata)
VALUES (
  'database_organization_complete',
  'system',
  jsonb_build_object(
    'views_created', ARRAY[
      'admin_user_overview',
      'admin_messages_by_user', 
      'admin_user_lesson_progress',
      'admin_user_community_activity'
    ],
    'orphan_messages_fixed', true,
    'constraint_added', 'chat_messages.lesson_id NOT NULL',
    'indexes_created', 3,
    'executed_at', NOW()
  )
);