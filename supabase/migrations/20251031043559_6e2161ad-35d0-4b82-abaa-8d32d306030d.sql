-- Criar função de sincronização automática entre lessons e lesson_progress
CREATE OR REPLACE FUNCTION sync_lesson_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Quando uma lesson é marcada como 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Inserir ou atualizar em lesson_progress
    INSERT INTO lesson_progress (user_id, lesson_day, completed, completed_at)
    VALUES (NEW.user_id, NEW.lesson_number, true, NOW())
    ON CONFLICT (user_id, lesson_day) 
    DO UPDATE SET 
      completed = true,
      completed_at = COALESCE(lesson_progress.completed_at, NOW());
    
    -- Log de auditoria
    INSERT INTO audit_logs (action, table_name, user_id, record_id, new_data)
    VALUES (
      'auto_sync_lesson_completion',
      'lesson_progress',
      NEW.user_id,
      NEW.id,
      jsonb_build_object(
        'lesson_number', NEW.lesson_number,
        'status', NEW.status,
        'synced_at', NOW()
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Aplicar trigger na tabela lessons
DROP TRIGGER IF EXISTS trigger_sync_lesson_completion ON lessons;
CREATE TRIGGER trigger_sync_lesson_completion
  AFTER UPDATE ON lessons
  FOR EACH ROW
  EXECUTE FUNCTION sync_lesson_completion();

-- Adicionar constraint para garantir integridade (se não existir)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_user_lesson'
  ) THEN
    ALTER TABLE lesson_progress 
      ADD CONSTRAINT unique_user_lesson 
      UNIQUE (user_id, lesson_day);
  END IF;
END $$;

-- Script de correção de dados existentes (one-time fix)
INSERT INTO lesson_progress (user_id, lesson_day, completed, completed_at, created_at)
SELECT 
  l.user_id,
  l.lesson_number as lesson_day,
  true as completed,
  l.updated_at as completed_at,
  l.created_at
FROM lessons l
WHERE l.status = 'completed'
  AND NOT EXISTS (
    SELECT 1 FROM lesson_progress lp
    WHERE lp.user_id = l.user_id
      AND lp.lesson_day = l.lesson_number
      AND lp.completed = true
  )
ON CONFLICT (user_id, lesson_day) 
DO UPDATE SET 
  completed = true,
  completed_at = EXCLUDED.completed_at;

-- Log de auditoria da correção
INSERT INTO audit_logs (action, table_name, metadata)
VALUES (
  'bulk_sync_lesson_progress',
  'lesson_progress',
  jsonb_build_object(
    'executed_at', NOW(),
    'reason', 'Historical data correction - sync lessons with lesson_progress',
    'source', 'migration_script'
  )
);