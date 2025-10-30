-- =====================================================
-- ARQUITETURA ROBUSTA PARA SISTEMA CRIPTO - CORRIGIDO
-- =====================================================

-- 1. CRIAR ENUM PARA ROLES (SEGURANÇA)
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- 2. CRIAR ENUM PARA STATUS DE CONTA
CREATE TYPE public.account_status AS ENUM ('active', 'inactive', 'suspended', 'pending_verification');

-- 3. CRIAR ENUM PARA TIPO DE INTERAÇÃO
CREATE TYPE public.interaction_type AS ENUM ('view', 'click', 'input', 'submit', 'navigation', 'error', 'success');

-- 4. CRIAR ENUM PARA TIPO DE MÓDULO JEFF WU
CREATE TYPE public.module_type AS ENUM ('lesson', 'chat', 'market', 'dashboard', 'crypto_analysis', 'portfolio');

-- =====================================================
-- MELHORAR TABELA DE PROFILES (USUÁRIOS)
-- =====================================================
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS account_status public.account_status DEFAULT 'active'::public.account_status,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Adicionar comentários para documentação
COMMENT ON COLUMN public.profiles.user_id IS 'UUID único e imutável do usuário - chave primária de identificação';
COMMENT ON COLUMN public.profiles.username IS 'Nome de usuário único - identificador secundário amigável';
COMMENT ON COLUMN public.profiles.account_status IS 'Status atual da conta do usuário';
COMMENT ON COLUMN public.profiles.deleted_at IS 'Soft delete - quando não nulo, usuário foi removido';

-- =====================================================
-- TABELA DE ROLES (SEPARADA - SEGURANÇA CRÍTICA)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'user'::public.app_role,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);
CREATE INDEX IF NOT EXISTS idx_user_roles_expires_at ON public.user_roles(expires_at) WHERE expires_at IS NOT NULL;

COMMENT ON TABLE public.user_roles IS 'Tabela separada para roles - previne escalação de privilégios';

-- =====================================================
-- FUNÇÃO SECURITY DEFINER PARA CHECAR ROLES (CORRIGIDO)
-- =====================================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND (expires_at IS NULL OR expires_at > now())
  )
$$;

COMMENT ON FUNCTION public.has_role IS 'Função segura para verificar roles sem recursão RLS';

-- =====================================================
-- FUNÇÃO PARA CHECAR SE USUÁRIO É ADMIN
-- =====================================================
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin'::public.app_role)
$$;

-- =====================================================
-- TABELA DE AUDITORIA (LOGS IMUTÁVEIS)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Índices para queries de auditoria
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record_id ON public.audit_logs(record_id) WHERE record_id IS NOT NULL;

COMMENT ON TABLE public.audit_logs IS 'Logs de auditoria imutáveis - todas operações críticas';

-- =====================================================
-- TABELA DE MÓDULOS JEFF WU
-- =====================================================
CREATE TABLE IF NOT EXISTS public.jeff_wu_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_type public.module_type NOT NULL,
  module_name TEXT NOT NULL,
  module_data JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'active',
  order_index INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, module_type, module_name)
);

ALTER TABLE public.jeff_wu_modules ENABLE ROW LEVEL SECURITY;

-- Índices
CREATE INDEX IF NOT EXISTS idx_jeff_wu_modules_user_id ON public.jeff_wu_modules(user_id);
CREATE INDEX IF NOT EXISTS idx_jeff_wu_modules_type ON public.jeff_wu_modules(module_type);
CREATE INDEX IF NOT EXISTS idx_jeff_wu_modules_status ON public.jeff_wu_modules(status);
CREATE INDEX IF NOT EXISTS idx_jeff_wu_modules_deleted_at ON public.jeff_wu_modules(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_jeff_wu_modules_user_type ON public.jeff_wu_modules(user_id, module_type);

COMMENT ON TABLE public.jeff_wu_modules IS 'Módulos separados do sistema Jeff Wu - um registro por módulo por usuário';

-- =====================================================
-- TABELA DE BLOCOS DE INTERAÇÕES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.interaction_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id UUID REFERENCES public.jeff_wu_modules(id) ON DELETE CASCADE,
  block_type TEXT NOT NULL,
  block_category TEXT,
  block_tags TEXT[],
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.interaction_blocks ENABLE ROW LEVEL SECURITY;

-- Índices
CREATE INDEX IF NOT EXISTS idx_interaction_blocks_user_id ON public.interaction_blocks(user_id);
CREATE INDEX IF NOT EXISTS idx_interaction_blocks_module_id ON public.interaction_blocks(module_id);
CREATE INDEX IF NOT EXISTS idx_interaction_blocks_started_at ON public.interaction_blocks(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_interaction_blocks_block_type ON public.interaction_blocks(block_type);
CREATE INDEX IF NOT EXISTS idx_interaction_blocks_deleted_at ON public.interaction_blocks(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_interaction_blocks_user_module ON public.interaction_blocks(user_id, module_id);

COMMENT ON TABLE public.interaction_blocks IS 'Blocos que agrupam interações relacionadas em sessões';

-- =====================================================
-- TABELA DE INTERAÇÕES INDIVIDUAIS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  block_id UUID REFERENCES public.interaction_blocks(id) ON DELETE CASCADE,
  module_id UUID REFERENCES public.jeff_wu_modules(id) ON DELETE SET NULL,
  interaction_type public.interaction_type NOT NULL,
  action_name TEXT NOT NULL,
  action_data JSONB DEFAULT '{}'::jsonb,
  result_data JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  deleted_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.user_interactions ENABLE ROW LEVEL SECURITY;

-- Índices
CREATE INDEX IF NOT EXISTS idx_user_interactions_user_id ON public.user_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_block_id ON public.user_interactions(block_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_module_id ON public.user_interactions(module_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_timestamp ON public.user_interactions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_user_interactions_type ON public.user_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_user_interactions_deleted_at ON public.user_interactions(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_user_interactions_user_timestamp ON public.user_interactions(user_id, timestamp DESC);

COMMENT ON TABLE public.user_interactions IS 'Todas as interações do usuário - histórico completo e imutável';

-- =====================================================
-- TABELA DE SESSÕES DE USUÁRIO
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  ip_address INET,
  user_agent TEXT,
  device_info JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Índices
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON public.user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active ON public.user_sessions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_activity ON public.user_sessions(last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_active ON public.user_sessions(user_id, is_active);

COMMENT ON TABLE public.user_sessions IS 'Sessões de usuário para rastreamento consistente de identidade';

-- =====================================================
-- ADICIONAR ÍNDICES EM TABELAS EXISTENTES
-- =====================================================

-- Profiles
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username) WHERE username IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON public.profiles(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_account_status ON public.profiles(account_status);

-- Lessons
CREATE INDEX IF NOT EXISTS idx_lessons_user_id_lesson_number ON public.lessons(user_id, lesson_number);
CREATE INDEX IF NOT EXISTS idx_lessons_status ON public.lessons(status);
CREATE INDEX IF NOT EXISTS idx_lessons_created_at ON public.lessons(created_at DESC);

-- Lesson Progress
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user_lesson ON public.lesson_progress(user_id, lesson_day);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_completed ON public.lesson_progress(completed) WHERE completed = true;

-- Chat Messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_lesson ON public.chat_messages(user_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at DESC);

-- User Preferences
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON public.user_preferences(user_id);

-- =====================================================
-- POLÍTICAS RLS PARA NOVAS TABELAS
-- =====================================================

-- User Roles: Apenas admins e o próprio usuário veem
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Only admins can insert roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can update roles"
  ON public.user_roles FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can delete roles"
  ON public.user_roles FOR DELETE
  USING (public.is_admin(auth.uid()));

-- Audit Logs: Apenas admins veem
CREATE POLICY "Only admins can view audit logs"
  ON public.audit_logs FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Jeff Wu Modules: Usuário vê apenas seus módulos
CREATE POLICY "Users can view their own modules"
  ON public.jeff_wu_modules FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Users can insert their own modules"
  ON public.jeff_wu_modules FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own modules"
  ON public.jeff_wu_modules FOR UPDATE
  USING (auth.uid() = user_id);

-- Interaction Blocks: Usuário vê apenas seus blocos
CREATE POLICY "Users can view their own interaction blocks"
  ON public.interaction_blocks FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Users can insert their own interaction blocks"
  ON public.interaction_blocks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own interaction blocks"
  ON public.interaction_blocks FOR UPDATE
  USING (auth.uid() = user_id);

-- User Interactions: Usuário vê apenas suas interações
CREATE POLICY "Users can view their own interactions"
  ON public.user_interactions FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Users can insert their own interactions"
  ON public.user_interactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- User Sessions: Usuário vê apenas suas sessões
CREATE POLICY "Users can view their own sessions"
  ON public.user_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions"
  ON public.user_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
  ON public.user_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- =====================================================
-- TRIGGERS PARA UPDATED_AT
-- =====================================================

CREATE TRIGGER update_jeff_wu_modules_updated_at
  BEFORE UPDATE ON public.jeff_wu_modules
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- FUNÇÃO PARA CALCULAR DURAÇÃO DO BLOCO
-- =====================================================
CREATE OR REPLACE FUNCTION public.calculate_block_duration()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.ended_at IS NOT NULL AND NEW.started_at IS NOT NULL THEN
    NEW.duration_seconds := EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at))::INTEGER;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER calculate_interaction_block_duration
  BEFORE UPDATE ON public.interaction_blocks
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_block_duration();

-- =====================================================
-- FUNÇÃO MELHORADA PARA CRIAR NOVO USUÁRIO
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Criar profile
  INSERT INTO public.profiles (user_id, full_name, account_status, email_verified)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuário'),
    'active'::public.account_status,
    false
  );
  
  -- Atribuir role padrão de user
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user'::public.app_role);
  
  -- Criar preferências padrão
  INSERT INTO public.user_preferences (user_id, has_seen_welcome)
  VALUES (NEW.id, false)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Criar primeira lição
  INSERT INTO public.lessons (user_id, lesson_number, title, status)
  VALUES (NEW.id, 1, 'Dia 1 - O Básico das Criptos', 'active');
  
  -- Registrar auditoria
  INSERT INTO public.audit_logs (user_id, action, table_name, new_data)
  VALUES (
    NEW.id,
    'user_created',
    'profiles',
    jsonb_build_object(
      'user_id', NEW.id,
      'email', NEW.email,
      'created_at', now()
    )
  );
  
  RETURN NEW;
END;
$$;

-- =====================================================
-- FUNÇÕES AUXILIARES DE GERENCIAMENTO
-- =====================================================

-- Função para soft delete
CREATE OR REPLACE FUNCTION public.soft_delete_user(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = target_user_id AND deleted_at IS NULL
  ) THEN
    RETURN false;
  END IF;
  
  UPDATE public.profiles SET deleted_at = now(), account_status = 'inactive'::public.account_status WHERE user_id = target_user_id;
  UPDATE public.jeff_wu_modules SET deleted_at = now() WHERE user_id = target_user_id;
  UPDATE public.interaction_blocks SET deleted_at = now() WHERE user_id = target_user_id;
  UPDATE public.user_interactions SET deleted_at = now() WHERE user_id = target_user_id;
  
  INSERT INTO public.audit_logs (user_id, action, table_name, metadata)
  VALUES (target_user_id, 'user_soft_deleted', 'profiles', jsonb_build_object('deleted_at', now()));
  
  RETURN true;
END;
$$;

-- Função para criar sessão
CREATE OR REPLACE FUNCTION public.create_user_session(
  p_user_id UUID,
  p_session_token TEXT,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_device_info JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id UUID;
BEGIN
  UPDATE public.user_sessions SET is_active = false, ended_at = now()
  WHERE user_id = p_user_id AND is_active = true AND last_activity_at < now() - INTERVAL '24 hours';
  
  INSERT INTO public.user_sessions (user_id, session_token, ip_address, user_agent, device_info)
  VALUES (p_user_id, p_session_token, p_ip_address, p_user_agent, p_device_info)
  RETURNING id INTO v_session_id;
  
  UPDATE public.profiles SET last_login_at = now() WHERE user_id = p_user_id;
  
  RETURN v_session_id;
END;
$$;

-- Função para atualizar atividade da sessão
CREATE OR REPLACE FUNCTION public.update_session_activity(p_session_token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_sessions SET last_activity_at = now()
  WHERE session_token = p_session_token AND is_active = true;
  RETURN FOUND;
END;
$$;

-- Health check
CREATE OR REPLACE FUNCTION public.backend_health_check()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_total_users INTEGER;
  v_active_users INTEGER;
  v_total_modules INTEGER;
  v_total_interactions INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_users FROM public.profiles WHERE deleted_at IS NULL;
  SELECT COUNT(*) INTO v_active_users FROM public.profiles WHERE deleted_at IS NULL AND account_status = 'active'::public.account_status;
  SELECT COUNT(*) INTO v_total_modules FROM public.jeff_wu_modules WHERE deleted_at IS NULL;
  SELECT COUNT(*) INTO v_total_interactions FROM public.user_interactions WHERE deleted_at IS NULL;
  
  v_result := jsonb_build_object(
    'status', 'healthy',
    'timestamp', now(),
    'database', 'connected',
    'statistics', jsonb_build_object(
      'total_users', v_total_users,
      'active_users', v_active_users,
      'total_modules', v_total_modules,
      'total_interactions', v_total_interactions
    )
  );
  
  RETURN v_result;
END;
$$;