-- Tabela para armazenar preços históricos de cada cripto (365 dias)
CREATE TABLE public.crypto_historical_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  coin_id TEXT NOT NULL,
  date DATE NOT NULL,
  closing_price DECIMAL(20, 8) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(symbol, date)
);

-- Índices para performance
CREATE INDEX idx_crypto_prices_symbol_date ON public.crypto_historical_prices(symbol, date DESC);
CREATE INDEX idx_crypto_prices_coin_id ON public.crypto_historical_prices(coin_id);

-- Tabela para armazenar histórico de Market Cap total (7 dias)
CREATE TABLE public.market_cap_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  total_market_cap DECIMAL(20, 2) NOT NULL,
  market_cap_change DECIMAL(20, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índice para performance
CREATE INDEX idx_market_cap_date ON public.market_cap_history(date DESC);

-- Enable RLS (dados públicos para leitura)
ALTER TABLE public.crypto_historical_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_cap_history ENABLE ROW LEVEL SECURITY;

-- Policies para leitura pública (qualquer um pode ver os dados)
CREATE POLICY "Anyone can view crypto prices"
  ON public.crypto_historical_prices
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view market cap history"
  ON public.market_cap_history
  FOR SELECT
  USING (true);

-- Apenas sistema pode inserir/atualizar (será feito via Edge Function com service role)
-- Não criamos policies para INSERT/UPDATE pois será feito com service_role_key