-- Adicionar colunas ATL no cache de ATH
ALTER TABLE public.crypto_ath_cache 
ADD COLUMN IF NOT EXISTS atl_price numeric,
ADD COLUMN IF NOT EXISTS atl_date date;

-- Adicionar colunas ATL nas probabilidades
ALTER TABLE public.crypto_probabilities 
ADD COLUMN IF NOT EXISTS min_atl numeric,
ADD COLUMN IF NOT EXISTS atl_date date;