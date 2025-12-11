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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, password }: SetPasswordRequest = await req.json();

    // Validações básicas
    if (!token || !password) {
      return new Response(
        JSON.stringify({ error: 'Token e senha são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar força da senha
    if (password.length < MIN_PASSWORD_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Senha deve ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!PASSWORD_STRENGTH_REGEX.test(password)) {
      return new Response(
        JSON.stringify({ error: 'Senha deve conter: 1 maiúscula, 1 minúscula e 1 número' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Criar cliente admin
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

    // Buscar token
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('password_setup_tokens')
      .select('*')
      .eq('token', token)
      .single();

    if (tokenError || !tokenData) {
      console.error('❌ Token não encontrado:', tokenError);
      return new Response(
        JSON.stringify({ error: 'Token inválido ou não encontrado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se token já foi usado
    if (tokenData.used_at) {
      return new Response(
        JSON.stringify({ error: 'Este link já foi utilizado. Faça login com sua senha.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se token expirou
    if (new Date(tokenData.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'Este link expirou. Solicite um novo acesso.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔐 Configurando senha para usuário: ${tokenData.user_id}`);

    // Atualizar senha do usuário
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      tokenData.user_id,
      { password: password }
    );

    if (updateError) {
      console.error('❌ Erro ao atualizar senha:', updateError);
      return new Response(
        JSON.stringify({ error: 'Erro ao configurar senha. Tente novamente.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Marcar token como usado
    await supabaseAdmin
      .from('password_setup_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id', tokenData.id);

    // Log de auditoria
    await supabaseAdmin.from('audit_logs').insert({
      user_id: tokenData.user_id,
      action: 'password_configured',
      table_name: 'auth.users',
      metadata: {
        email: tokenData.email,
        plan_duration: tokenData.plan_duration,
        timestamp: new Date().toISOString()
      }
    });

    console.log(`✅ Senha configurada com sucesso para: ${tokenData.email}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        email: tokenData.email,
        message: 'Senha configurada com sucesso!' 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro na função set-user-password:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
