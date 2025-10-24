-- Adicionar campos para ATH (All-Time High) na tabela crypto_probabilities
ALTER TABLE crypto_probabilities
ADD COLUMN IF NOT EXISTS current_price NUMERIC,
ADD COLUMN IF NOT EXISTS min_365d NUMERIC,
ADD COLUMN IF NOT EXISTS max_ath NUMERIC,
ADD COLUMN IF NOT EXISTS ath_date DATE,
ADD COLUMN IF NOT EXISTS mu_cripto NUMERIC,
ADD COLUMN IF NOT EXISTS sigma_cripto NUMERIC,
ADD COLUMN IF NOT EXISTS ic_95_low NUMERIC,
ADD COLUMN IF NOT EXISTS ic_95_high NUMERIC,
ADD COLUMN IF NOT EXISTS validation_status TEXT DEFAULT 'pending';

-- Adicionar comentários para documentação
COMMENT ON COLUMN crypto_probabilities.current_price IS 'Preço atual (último fechamento em USD)';
COMMENT ON COLUMN crypto_probabilities.min_365d IS 'Preço mínimo observado nos últimos 365 dias';
COMMENT ON COLUMN crypto_probabilities.max_ath IS 'All-Time High (máximo histórico real)';
COMMENT ON COLUMN crypto_probabilities.ath_date IS 'Data do All-Time High';
COMMENT ON COLUMN crypto_probabilities.mu_cripto IS 'Média dos retornos logarítmicos (tendência)';
COMMENT ON COLUMN crypto_probabilities.sigma_cripto IS 'Desvio padrão dos retornos (volatilidade)';
COMMENT ON COLUMN crypto_probabilities.ic_95_low IS 'Intervalo de confiança 95% - limite inferior';
COMMENT ON COLUMN crypto_probabilities.ic_95_high IS 'Intervalo de confiança 95% - limite superior';
COMMENT ON COLUMN crypto_probabilities.validation_status IS 'Status da validação: approved, rejected, pending';