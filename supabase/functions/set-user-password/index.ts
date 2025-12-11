import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MIN_PASSWORD_LENGTH = 8;
const PASSWORD_STRENGTH_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;

interface SetPasswordRequest {
  token: string;
  password: string;
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID().substring(0, 8);
  console.log(`\n🚀 [${requestId}] ========== SET-USER-PASSWORD START ==========`);
  console.log(`🚀 [${requestId}] Method: ${req.method}`);
  console.log(`🚀 [${requestId}] Timestamp: ${new Date().toISOString()}`);

  if (req.method === 'OPTIONS') {
    console.log(`✅ [${requestId}] CORS preflight - respondendo OK`);
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { token, password }: SetPasswordRequest = body;

    console.log(`📥 [${requestId}] Requisição recebida`);
    console.log(`📥 [${requestId}] Token: ${token ? token.substring(0, 8) + '...' : 'AUSENTE'}`);
    console.log(`📥 [${requestId}] Senha fornecida: ${password ? 'SIM (' + password.length + ' chars)' : 'NÃO'}`);

    // Validações básicas
    if (!token || !password) {
      console.error(`❌ [${requestId}] Validação falhou: token ou senha ausente`);
      return new Response(
        JSON.stringify({ success: false, error: 'Token e senha são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar força da senha
    if (password.length < MIN_PASSWORD_LENGTH) {
      console.error(`❌ [${requestId}] Senha muito curta: ${password.length} chars (mín: ${MIN_PASSWORD_LENGTH})`);
      return new Response(
        JSON.stringify({ success: false, error: `Senha deve ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!PASSWORD_STRENGTH_REGEX.test(password)) {
      console.error(`❌ [${requestId}] Senha não atende requisitos de força`);
      return new Response(
        JSON.stringify({ success: false, error: 'Senha deve conter: 1 maiúscula, 1 minúscula e 1 número' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ [${requestId}] Validações de entrada OK`);

    // Verificar variáveis de ambiente
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.error(`❌ [${requestId}] Variáveis de ambiente ausentes!`);
      console.error(`❌ [${requestId}] SUPABASE_URL: ${supabaseUrl ? 'OK' : 'AUSENTE'}`);
      console.error(`❌ [${requestId}] SUPABASE_SERVICE_ROLE_KEY: ${serviceRoleKey ? 'OK' : 'AUSENTE'}`);
      return new Response(
        JSON.stringify({ success: false, error: 'Erro de configuração do servidor' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Criar cliente admin
    console.log(`🔧 [${requestId}] Criando cliente Supabase Admin...`);
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Buscar token
    console.log(`🔍 [${requestId}] Buscando token no banco de dados...`);
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('password_setup_tokens')
      .select('*')
      .eq('token', token)
      .single();

    if (tokenError) {
      console.error(`❌ [${requestId}] Erro ao buscar token:`, tokenError);
      return new Response(
        JSON.stringify({ success: false, error: 'Token inválido ou não encontrado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!tokenData) {
      console.error(`❌ [${requestId}] Token não encontrado no banco`);
      return new Response(
        JSON.stringify({ success: false, error: 'Token não encontrado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 [${requestId}] Token encontrado:`);
    console.log(`📋 [${requestId}]   - Email: ${tokenData.email}`);
    console.log(`📋 [${requestId}]   - User ID: ${tokenData.user_id}`);
    console.log(`📋 [${requestId}]   - Expira em: ${tokenData.expires_at}`);
    console.log(`📋 [${requestId}]   - Usado em: ${tokenData.used_at || 'NÃO USADO'}`);

    // Verificar se token já foi usado
    if (tokenData.used_at) {
      console.warn(`⚠️ [${requestId}] Token já foi utilizado em: ${tokenData.used_at}`);
      return new Response(
        JSON.stringify({ success: false, error: 'Este link já foi utilizado. Faça login com sua senha.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se token expirou
    const expiresAt = new Date(tokenData.expires_at);
    const now = new Date();
    if (expiresAt < now) {
      console.warn(`⚠️ [${requestId}] Token expirado: ${expiresAt.toISOString()} < ${now.toISOString()}`);
      return new Response(
        JSON.stringify({ success: false, error: 'Este link expirou. Solicite um novo acesso.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ [${requestId}] Token válido! Atualizando senha...`);
    console.log(`🔐 [${requestId}] Configurando senha para: ${tokenData.user_id}`);

    // Atualizar senha do usuário
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      tokenData.user_id,
      { password: password }
    );

    if (updateError) {
      console.error(`❌ [${requestId}] Erro ao atualizar senha:`, updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao configurar senha. Tente novamente.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ [${requestId}] Senha atualizada com sucesso!`);

    // Marcar token como usado
    console.log(`📝 [${requestId}] Marcando token como usado...`);
    const { error: markUsedError } = await supabaseAdmin
      .from('password_setup_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id', tokenData.id);

    if (markUsedError) {
      console.warn(`⚠️ [${requestId}] Erro ao marcar token como usado:`, markUsedError);
      // Não falha a operação, apenas loga o aviso
    }

    // Log de auditoria
    console.log(`📝 [${requestId}] Registrando auditoria...`);
    await supabaseAdmin.from('audit_logs').insert({
      user_id: tokenData.user_id,
      action: 'password_configured',
      table_name: 'auth.users',
      metadata: {
        email: tokenData.email,
        plan_duration: tokenData.plan_duration,
        request_id: requestId,
        timestamp: new Date().toISOString()
      }
    });

    console.log(`\n🎉 [${requestId}] ========== SUCESSO ==========`);
    console.log(`🎉 [${requestId}] Senha configurada para: ${tokenData.email}`);
    console.log(`🎉 [${requestId}] ==============================\n`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        email: tokenData.email,
        message: 'Senha configurada com sucesso!' 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error(`\n❌ [${requestId}] ========== ERRO CRÍTICO ==========`);
    console.error(`❌ [${requestId}] Tipo:`, error instanceof Error ? error.name : typeof error);
    console.error(`❌ [${requestId}] Mensagem:`, error instanceof Error ? error.message : String(error));
    console.error(`❌ [${requestId}] Stack:`, error instanceof Error ? error.stack : 'N/A');
    console.error(`❌ [${requestId}] ====================================\n`);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido no servidor'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
