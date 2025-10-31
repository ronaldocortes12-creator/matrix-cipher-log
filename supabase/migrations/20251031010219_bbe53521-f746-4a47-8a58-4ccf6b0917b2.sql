-- Adicionar coluna para cachear ATH no banco e evitar chamadas repetidas à API
ALTER TABLE crypto_probabilities 
ADD COLUMN IF NOT EXISTS ath_cached_at timestamp with time zone;

-- Criar índice para buscar ATH cacheado
CREATE INDEX IF NOT EXISTS idx_crypto_prob_ath_cache 
ON crypto_probabilities(symbol, ath_cached_at DESC) 
WHERE ath_date IS NOT NULL;

-- Criar tabela de cache de ATH separada para não depender de chamadas da API
CREATE TABLE IF NOT EXISTS crypto_ath_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol text NOT NULL,
  coin_id text NOT NULL,
  ath_price numeric NOT NULL,
  ath_date date NOT NULL,
  last_updated timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(symbol)
);

-- Enable RLS
ALTER TABLE crypto_ath_cache ENABLE ROW LEVEL SECURITY;

-- Permitir leitura pública
CREATE POLICY "Anyone can view ATH cache" 
ON crypto_ath_cache 
FOR SELECT 
USING (true);

COMMENT ON TABLE crypto_ath_cache IS 'Cache de All-Time High para evitar chamadas excessivas à API CoinGecko';
COMMENT ON COLUMN crypto_ath_cache.ath_price IS 'Preço máximo histórico da criptomoeda';
COMMENT ON COLUMN crypto_ath_cache.ath_date IS 'Data em que o ATH foi atingido';
COMMENT ON COLUMN crypto_ath_cache.last_updated IS 'Última atualização do cache (atualizar semanalmente)';
