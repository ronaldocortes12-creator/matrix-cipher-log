-- ============================================
-- CORREÇÃO DE SEGURANÇA
-- ============================================

-- 1. Habilitar RLS nas novas tabelas criadas
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_health_snapshots ENABLE ROW LEVEL SECURITY;

-- Políticas para backup_logs (apenas sistema e admins podem ver)
CREATE POLICY "Admins can view backup logs"
ON public.backup_logs
FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "System can insert backup logs"
ON public.backup_logs
FOR INSERT
WITH CHECK (true);

-- Políticas para system_health_snapshots (público para leitura, sistema para escrita)
CREATE POLICY "Anyone can view health snapshots"
ON public.system_health_snapshots
FOR SELECT
USING (true);

CREATE POLICY "System can insert health snapshots"
ON public.system_health_snapshots
FOR INSERT
WITH CHECK (true);

-- 2. Adicionar RLS na materialized view community_feed_optimized
-- (Materialized views não suportam RLS diretamente, então não vamos expô-la via API)
-- Remover da exposição da API se necessário via grant

-- 3. Mover extension vector para schema extensions (se existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
    ALTER EXTENSION vector SET SCHEMA extensions;
  END IF;
END $$;