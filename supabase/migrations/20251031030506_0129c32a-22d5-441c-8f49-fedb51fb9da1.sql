-- Adicionar RLS policies para api_rate_limits (somente sistema)
CREATE POLICY "Sistema pode gerenciar rate limits" 
ON public.api_rate_limits 
FOR ALL 
USING (false) 
WITH CHECK (false);

-- Habilitar proteção contra senhas vazadas
-- Nota: Isso precisa ser feito via painel do Supabase em Auth -> Password Protection