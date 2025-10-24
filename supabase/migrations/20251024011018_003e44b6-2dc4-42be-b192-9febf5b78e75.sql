-- Criar tabela para armazenar market cap individual por cripto
CREATE TABLE IF NOT EXISTS public.crypto_market_cap (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  coin_id TEXT NOT NULL,
  date DATE NOT NULL,
  market_cap NUMERIC NOT NULL,
  market_cap_change NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(symbol, date)
);

-- Enable RLS
ALTER TABLE public.crypto_market_cap ENABLE ROW LEVEL SECURITY;

-- Policy para visualização pública
CREATE POLICY "Anyone can view crypto market cap"
  ON public.crypto_market_cap
  FOR SELECT
  USING (true);

-- Índice para consultas rápidas
CREATE INDEX idx_crypto_market_cap_symbol_date ON public.crypto_market_cap(symbol, date DESC);

-- Criar tabela para armazenar probabilidades calculadas
CREATE TABLE IF NOT EXISTS public.crypto_probabilities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  coin_id TEXT NOT NULL,
  calculation_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  direction TEXT NOT NULL CHECK (direction IN ('alta', 'queda')),
  probability_percentage NUMERIC(5,1) NOT NULL,
  price_component NUMERIC(5,4) NOT NULL,
  market_cap_component NUMERIC(5,4) NOT NULL,
  final_probability NUMERIC(5,4) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(symbol, calculation_date)
);

-- Enable RLS
ALTER TABLE public.crypto_probabilities ENABLE ROW LEVEL SECURITY;

-- Policy para visualização pública
CREATE POLICY "Anyone can view crypto probabilities"
  ON public.crypto_probabilities
  FOR SELECT
  USING (true);

-- Índice para consultas rápidas
CREATE INDEX idx_crypto_probabilities_symbol ON public.crypto_probabilities(symbol, calculation_date DESC);