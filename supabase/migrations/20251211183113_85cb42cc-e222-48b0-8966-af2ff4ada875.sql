-- Tabela para tokens de configuração de senha
CREATE TABLE public.password_setup_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  token TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  full_name TEXT,
  plan_duration TEXT DEFAULT '30D',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_password_tokens_token ON public.password_setup_tokens(token);
CREATE INDEX idx_password_tokens_expires ON public.password_setup_tokens(expires_at);
CREATE INDEX idx_password_tokens_user ON public.password_setup_tokens(user_id);

-- RLS
ALTER TABLE public.password_setup_tokens ENABLE ROW LEVEL SECURITY;

-- Política: Permitir leitura pública pelo token (necessário para o link funcionar)
CREATE POLICY "Tokens podem ser lidos publicamente" 
ON public.password_setup_tokens FOR SELECT 
USING (true);

-- Política: Sistema pode inserir tokens
CREATE POLICY "Sistema pode inserir tokens" 
ON public.password_setup_tokens FOR INSERT 
WITH CHECK (true);

-- Política: Sistema pode atualizar tokens (marcar como usado)
CREATE POLICY "Sistema pode atualizar tokens" 
ON public.password_setup_tokens FOR UPDATE 
USING (true);