-- Criar tabela para armazenar o histórico do Crypto Total Market Cap global
CREATE TABLE IF NOT EXISTS public.global_crypto_market_cap (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  total_market_cap NUMERIC NOT NULL,
  daily_change_pct NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índice para consultas rápidas por data
CREATE INDEX IF NOT EXISTS idx_global_crypto_market_cap_date 
ON public.global_crypto_market_cap(date DESC);

-- Habilitar RLS (mas permitir acesso público para leitura)
ALTER TABLE public.global_crypto_market_cap ENABLE ROW LEVEL SECURITY;

-- Policy para leitura pública
CREATE POLICY "Global market cap is viewable by everyone" 
ON public.global_crypto_market_cap 
FOR SELECT 
USING (true);

-- Comentários
COMMENT ON TABLE public.global_crypto_market_cap IS 'Histórico do Crypto Total Market Cap (global) do CoinGecko';
COMMENT ON COLUMN public.global_crypto_market_cap.total_market_cap IS 'Capitalização total do mercado cripto em USD';
COMMENT ON COLUMN public.global_crypto_market_cap.daily_change_pct IS 'Variação percentual em relação ao dia anterior';