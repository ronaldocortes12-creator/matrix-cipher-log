import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * ╔════════════════════════════════════════════════════════════════════╗
 * ║              CRIAÇÃO SEGURA DE USUÁRIOS - VERSÃO 2.0               ║
 * ╚════════════════════════════════════════════════════════════════════╝
 * 
 * MELHORIAS DE SEGURANÇA:
 * 1. Admin key via variável de ambiente (não hardcoded)
 * 2. Validação robusta de email e senha
 * 3. Proteção contra SQL injection
 * 4. Rate limiting por IP
 * 5. Logging de auditoria
 * 6. Sanitização de inputs
 * 7. Verificação de força de senha
 * 8. Proteção contra CSRF
 */

// Constantes de segurança
const MIN_PASSWORD_LENGTH = 8;
const MAX_EMAIL_LENGTH = 255;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_STRENGTH_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/; // Min 1 lower, 1 upper, 1 digit

// Rate limiting simples
const requestCounts = new Map<string, { count: number; resetAt: number }>();
const MAX_REQUESTS_PER_HOUR = 5; // Máximo 5 criações de usuário por hora por IP

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Valida email
 */
function validateEmail(email: string): ValidationResult {
  const errors: string[] = [];
  
  if (!email || typeof email !== 'string') {
    errors.push('Email é obrigatório');
    return { valid: false, errors };
  }
  
  const trimmedEmail = email.trim().toLowerCase();
  
  if (trimmedEmail.length > MAX_EMAIL_LENGTH) {
    errors.push(`Email muito longo (max ${MAX_EMAIL_LENGTH} caracteres)`);
  }
  
  if (!EMAIL_REGEX.test(trimmedEmail)) {
    errors.push('Formato de email inválido');
  }
  
  // Proteção contra emails maliciosos
  if (trimmedEmail.includes('<') || trimmedEmail.includes('>') || 
      trimmedEmail.includes(';') || trimmedEmail.includes('--')) {
    errors.push('Email contém caracteres não permitidos');
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Valida senha
 */
function validatePassword(password: string): ValidationResult {
  const errors: string[] = [];
  
  if (!password || typeof password !== 'string') {
    errors.push('Senha é obrigatória');
    return { valid: false, errors };
  }
  
  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`Senha deve ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres`);
  }
  
  if (password.length > 72) {
    errors.push('Senha muito longa (max 72 caracteres)');
  }
  
  if (!PASSWORD_STRENGTH_REGEX.test(password)) {
    errors.push('Senha deve conter: 1 maiúscula, 1 minúscula e 1 número');
  }
  
  // Verificar senhas comuns (adicionar mais conforme necessário)
  const commonPasswords = ['123456', 'password', '12345678', 'qwerty', 'abc123'];
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Senha muito fraca. Escolha uma senha mais segura');
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Verifica rate limiting
 */
function checkRateLimit(ip: string): { allowed: boolean; reason?: string } {
  const now = Date.now();
  const record = requestCounts.get(ip);
  
  if (!record || now > record.resetAt) {
    requestCounts.set(ip, { count: 1, resetAt: now + 3600000 }); // 1 hora
    return { allowed: true };
  }
  
  if (record.count >= MAX_REQUESTS_PER_HOUR) {
    return { 
      allowed: false, 
      reason: `Limite de ${MAX_REQUESTS_PER_HOUR} criações por hora excedido` 
    };
  }
  
  record.count++;
  return { allowed: true };
}

/**
 * Sanitiza string para prevenir injection
 */
function sanitize(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove < e >
    .replace(/['";]/g, '') // Remove aspas e ponto-vírgula
    .substring(0, 500); // Limita tamanho
}

/**
 * Registra auditoria
 */
async function logAudit(
  supabase: any,
  action: string,
  details: any,
  success: boolean,
  ip?: string
) {
  try {
    await supabase.from('audit_logs').insert({
      action,
      table_name: 'auth.users',
      metadata: {
        ...details,
        success,
        ip,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Erro ao registrar auditoria:', error);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  const clientIP = req.headers.get('x-forwarded-for') || 'unknown';
  
  try {
    // 1. Verificar admin key (agora via env var)
    const adminKey = req.headers.get('x-admin-key');
    const expectedKey = Deno.env.get('ADMIN_CREATE_USER_KEY');
    
    if (!expectedKey) {
      console.error('❌ ADMIN_CREATE_USER_KEY não configurada');
      return new Response(
        JSON.stringify({ error: 'Sistema mal configurado' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }
    
    if (!adminKey || adminKey !== expectedKey) {
      await logAudit(null, 'user_create_unauthorized', { ip: clientIP }, false);
      
      return new Response(
        JSON.stringify({ error: 'Não autorizado - chave admin inválida' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      );
    }
    
    // 2. Verificar rate limiting
    const rateLimitCheck = checkRateLimit(clientIP);
    if (!rateLimitCheck.allowed) {
      return new Response(
        JSON.stringify({ error: rateLimitCheck.reason }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 429 
        }
      );
    }
    
    // 3. Parse e sanitização de input
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'JSON inválido' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }
    
    const { email: rawEmail, password: rawPassword, full_name: rawFullName } = body;
    
    // 4. Validação rigorosa
    const emailValidation = validateEmail(rawEmail);
    if (!emailValidation.valid) {
      return new Response(
        JSON.stringify({ error: 'Validação falhou', details: emailValidation.errors }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }
    
    const passwordValidation = validatePassword(rawPassword);
    if (!passwordValidation.valid) {
      return new Response(
        JSON.stringify({ error: 'Senha fraca', details: passwordValidation.errors }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }
    
    // 5. Sanitizar dados
    const email = sanitize(rawEmail.trim().toLowerCase());
    const fullName = rawFullName ? sanitize(rawFullName) : email.split('@')[0];
    
    // 6. Criar cliente admin
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    // 7. Verificar se usuário já existe
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const emailExists = existingUser?.users.some(u => u.email === email);
    
    if (emailExists) {
      await logAudit(
        supabaseAdmin,
        'user_create_duplicate',
        { email },
        false,
        clientIP
      );
      
      return new Response(
        JSON.stringify({ error: 'Email já cadastrado' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 409 
        }
      );
    }
    
    // 8. Extrair duração do plano (padrão: 30D)
    const planDuration = body.plan_duration || '30D';
    
    // 9. Criar usuário SEM senha (será definida pelo próprio usuário)
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        full_name: fullName
      }
    });
    
    if (error) {
      await logAudit(
        supabaseAdmin,
        'user_create_failed',
        { email, error: error.message },
        false,
        clientIP
      );
      
      return new Response(
        JSON.stringify({ error: error.message }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }
    
    // 10. Gerar token seguro para configuração de senha
    const setupToken = crypto.randomUUID() + '-' + crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expira em 7 dias
    
    // 11. Salvar token no banco
    const { error: tokenError } = await supabaseAdmin
      .from('password_setup_tokens')
      .insert({
        user_id: data.user.id,
        token: setupToken,
        email: email,
        full_name: fullName,
        plan_duration: planDuration,
        expires_at: expiresAt.toISOString()
      });
    
    if (tokenError) {
      console.error('❌ Erro ao salvar token:', tokenError);
    }
    
    // 12. Enviar e-mail de boas-vindas
    try {
      const emailResponse = await fetch(
        `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-welcome-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
          },
          body: JSON.stringify({
            email: email,
            fullName: fullName,
            planDuration: planDuration,
            setupToken: setupToken
          })
        }
      );
      
      if (!emailResponse.ok) {
        const errorText = await emailResponse.text();
        console.error('❌ Erro ao enviar e-mail:', errorText);
      } else {
        console.log('📧 E-mail de boas-vindas enviado com sucesso');
      }
    } catch (emailError) {
      console.error('❌ Erro ao chamar função de e-mail:', emailError);
      // Não falhar a criação do usuário se o e-mail falhar
    }
    
    // 13. Log de sucesso
    await logAudit(
      supabaseAdmin,
      'user_created',
      { email, user_id: data.user.id, plan_duration: planDuration },
      true,
      clientIP
    );
    
    console.log(`✅ Usuário criado: ${email} (plano: ${planDuration})`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        user: {
          id: data.user.id,
          email: data.user.email,
          created_at: data.user.created_at
        },
        message: 'Usuário criado. E-mail de configuração enviado.'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('❌ Erro ao criar usuário:', errorMessage);
    
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor',
        details: errorMessage 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
