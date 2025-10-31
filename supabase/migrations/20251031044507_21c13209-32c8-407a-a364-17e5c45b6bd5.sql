-- Atualizar trigger sync_lesson_completion para também ativar próximo dia
CREATE OR REPLACE FUNCTION public.sync_lesson_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_next_lesson_number INTEGER;
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
    
    -- Ativar o próximo dia automaticamente
    v_next_lesson_number := NEW.lesson_number + 1;
    
    IF v_next_lesson_number <= 20 THEN
      UPDATE lessons
      SET status = 'active'
      WHERE user_id = NEW.user_id
        AND lesson_number = v_next_lesson_number
        AND status != 'completed'; -- Não sobrescrever se já estiver completo
    END IF;
    
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
        'next_activated', v_next_lesson_number,
        'synced_at', NOW()
      )
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Criar trigger reverso: lesson_progress -> lessons
CREATE OR REPLACE FUNCTION public.sync_from_lesson_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_lesson_id UUID;
  v_next_lesson_number INTEGER;
BEGIN
  -- Quando lesson_progress é marcado como completed=true
  IF NEW.completed = true AND (OLD.completed IS NULL OR OLD.completed = false) THEN
    
    -- Buscar o ID da lesson correspondente
    SELECT id INTO v_lesson_id
    FROM lessons
    WHERE user_id = NEW.user_id
      AND lesson_number = NEW.lesson_day
    LIMIT 1;
    
    IF v_lesson_id IS NOT NULL THEN
      -- Marcar a lesson como completed
      UPDATE lessons
      SET status = 'completed'
      WHERE id = v_lesson_id
        AND status != 'completed';
      
      -- Ativar a próxima lesson
      v_next_lesson_number := NEW.lesson_day + 1;
      
      IF v_next_lesson_number <= 20 THEN
        UPDATE lessons
        SET status = 'active'
        WHERE user_id = NEW.user_id
          AND lesson_number = v_next_lesson_number
          AND status = 'pending';
      END IF;
      
      -- Log de auditoria
      INSERT INTO audit_logs (action, table_name, user_id, new_data)
      VALUES (
        'sync_from_lesson_progress',
        'lessons',
        NEW.user_id,
        jsonb_build_object(
          'lesson_day', NEW.lesson_day,
          'lesson_id', v_lesson_id,
          'next_activated', v_next_lesson_number,
          'synced_at', NOW()
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Criar trigger em lesson_progress
DROP TRIGGER IF EXISTS trigger_sync_from_lesson_progress ON lesson_progress;
CREATE TRIGGER trigger_sync_from_lesson_progress
  AFTER INSERT OR UPDATE ON lesson_progress
  FOR EACH ROW
  EXECUTE FUNCTION sync_from_lesson_progress();