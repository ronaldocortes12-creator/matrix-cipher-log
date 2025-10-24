-- Tabela para armazenar relatórios diários de integridade
CREATE TABLE IF NOT EXISTS public.data_integrity_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_date DATE NOT NULL UNIQUE,
  total_cryptos INTEGER NOT NULL,
  cryptos_complete INTEGER NOT NULL,
  cryptos_incomplete INTEGER NOT NULL,
  completion_percentage NUMERIC NOT NULL,
  details JSONB NOT NULL,
  execution_time_ms INTEGER,
  status TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índice para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_data_integrity_reports_date 
ON public.data_integrity_reports(report_date DESC);

-- Habilitar RLS
ALTER TABLE public.data_integrity_reports ENABLE ROW LEVEL SECURITY;

-- Policy para leitura pública
CREATE POLICY "Integrity reports are viewable by everyone" 
ON public.data_integrity_reports 
FOR SELECT 
USING (true);

-- Tabela para rastrear progresso de coleta de dados
CREATE TABLE IF NOT EXISTS public.crypto_data_collection_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL UNIQUE,
  coin_id TEXT NOT NULL,
  target_days INTEGER NOT NULL DEFAULT 365,
  current_days INTEGER NOT NULL DEFAULT 0,
  oldest_date DATE,
  newest_date DATE,
  last_update_attempt TIMESTAMP WITH TIME ZONE,
  last_successful_update TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'incomplete',
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índice
CREATE INDEX IF NOT EXISTS idx_crypto_data_collection_status_symbol 
ON public.crypto_data_collection_status(symbol);

-- Habilitar RLS
ALTER TABLE public.crypto_data_collection_status ENABLE ROW LEVEL SECURITY;

-- Policy para leitura pública
CREATE POLICY "Collection status is viewable by everyone" 
ON public.crypto_data_collection_status 
FOR SELECT 
USING (true);

-- Comentários
COMMENT ON TABLE public.data_integrity_reports IS 'Relatórios diários automáticos de integridade dos dados';
COMMENT ON TABLE public.crypto_data_collection_status IS 'Status de coleta de dados históricos por cripto';