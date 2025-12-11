import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-ticto-signature',
};

/**
 * ╔════════════════════════════════════════════════════════════════════╗
 * ║                   TICTO WEBHOOK HANDLER                            ║
 * ╚════════════════════════════════════════════════════════════════════╝
 * 
 * Recebe webhooks do Ticto quando uma compra é aprovada:
 * 1. Valida o webhook (assinatura opcional)
 * 2. Cria o usuário no Supabase Auth (sem senha)
 * 3. Chama send-welcome-email que cria o token e envia o email
 * 
 * O usuário então configura sua própria senha via link no email.
 */

interface TictoWebhookPayload {
  // Campos comuns do Ticto - ajustar conforme documentação real
  event?: string;
  transaction_id?: string;
  status?: string;
  customer?: {
    email?: string;
    name?: string;
    phone?: string;
  };
  product?: {
    id?: string | number;
    name?: string;
  };
  // Campos alternativos que o Ticto pode usar
  email?: string;
  name?: string;
  buyer_email?: string;
  buyer_name?: string;
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID().substring(0, 8);
  console.log(`\n🔔 [${requestId}] ========== TICTO WEBHOOK START ==========`);
  console.log(`🔔 [${requestId}] Method: ${req.method}`);
  console.log(`🔔 [${requestId}] Timestamp: ${new Date().toISOString()}`);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Parse do payload
    const rawBody = await req.text();
    console.log(`📥 [${requestId}] Raw body length: ${rawBody.length}`);
    console.log(`📥 [${requestId}] Raw body preview: ${rawBody.substring(0, 500)}`);

    let payload: TictoWebhookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      console.error(`❌ [${requestId}] JSON inválido`);
      return new Response(
        JSON.stringify({ error: 'JSON inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 [${requestId}] Payload parsed:`, JSON.stringify(payload, null, 2));

    // 2. Extrair email e nome (tentar múltiplos campos)
    const email = (
      payload.customer?.email || 
      payload.email || 
      payload.buyer_email || 
      ''
    ).trim().toLowerCase();

    const fullName = (
      payload.customer?.name || 
      payload.name || 
      payload.buyer_name || 
      ''
    ).trim() || email.split('@')[0];

    console.log(`👤 [${requestId}] Email extraído: ${email}`);
    console.log(`👤 [${requestId}] Nome extraído: ${fullName}`);

    if (!email || !email.includes('@')) {
      console.error(`❌ [${requestId}] Email inválido ou ausente`);
      return new Response(
        JSON.stringify({ error: 'Email do cliente não encontrado no webhook' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Verificar status da transação (se aplicável)
    const status = payload.status?.toLowerCase();
    if (status && !['approved', 'paid', 'completed', 'aprovado', 'pago', 'authorized', 'autorizado'].includes(status)) {
      console.log(`⏸️ [${requestId}] Status não é aprovado: ${status} - ignorando`);
      return new Response(
        JSON.stringify({ success: true, message: 'Webhook recebido mas status não requer ação' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Criar cliente Supabase Admin
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 5. Verificar se usuário já existe
    console.log(`🔍 [${requestId}] Verificando se usuário já existe...`);
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users.find(u => u.email === email);

    let userId: string;

    if (existingUser) {
      console.log(`⚠️ [${requestId}] Usuário já existe: ${existingUser.id}`);
      userId = existingUser.id;
      
      // Verificar se já tem token não usado
      const { data: existingToken } = await supabaseAdmin
        .from('password_setup_tokens')
        .select('id, used_at')
        .eq('email', email)
        .is('used_at', null)
        .single();

      if (existingToken) {
        console.log(`📧 [${requestId}] Usuário já tem token ativo - reenviando email...`);
      }
    } else {
      // 6. Criar novo usuário (SEM senha - usuário configurará via email)
      console.log(`🆕 [${requestId}] Criando novo usuário...`);
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          source: 'ticto'
        }
      });

      if (createError) {
        console.error(`❌ [${requestId}] Erro ao criar usuário:`, createError);
        return new Response(
          JSON.stringify({ error: `Erro ao criar usuário: ${createError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      userId = newUser.user.id;
      console.log(`✅ [${requestId}] Usuário criado: ${userId}`);
    }

    // 7. Chamar send-welcome-email (que cria o token e envia o email)
    console.log(`📧 [${requestId}] Chamando send-welcome-email...`);
    
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
          planDuration: '30D',
          userId: userId
        })
      }
    );

    const emailResult = await emailResponse.json();
    
    if (!emailResponse.ok) {
      console.error(`❌ [${requestId}] Erro ao enviar email:`, emailResult);
      return new Response(
        JSON.stringify({ error: 'Usuário criado mas email falhou', details: emailResult }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ [${requestId}] Email enviado:`, emailResult);

    // 8. Criar assinatura de 30 dias
    console.log(`📅 [${requestId}] Criando assinatura de 30 dias...`);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Primeiro, cancelar assinaturas anteriores (se houver)
    await supabaseAdmin
      .from('subscriptions')
      .update({ status: 'cancelled' })
      .eq('user_id', userId)
      .eq('status', 'active');

    // Criar nova assinatura
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .insert({
        user_id: userId,
        status: 'active',
        plan_type: '30D',
        starts_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single();

    if (subError) {
      console.error(`❌ [${requestId}] Erro ao criar assinatura:`, subError);
      // Não retornar erro aqui - usuário já foi criado e email enviado
    } else {
      console.log(`✅ [${requestId}] Assinatura criada: ${subscription.id}, expira em: ${expiresAt.toISOString()}`);
    }

    // 9. Registrar auditoria
    await supabaseAdmin.from('audit_logs').insert({
      user_id: userId,
      action: 'ticto_purchase_processed',
      table_name: 'ticto_webhook',
      metadata: {
        request_id: requestId,
        transaction_id: payload.transaction_id,
        product_id: payload.product?.id,
        email: email,
        email_sent: true,
        subscription_id: subscription?.id,
        expires_at: expiresAt.toISOString(),
        timestamp: new Date().toISOString()
      }
    });

    console.log(`\n🎉 [${requestId}] ========== SUCESSO ==========`);
    console.log(`🎉 [${requestId}] Usuário: ${email} (${userId})`);
    console.log(`🎉 [${requestId}] Email de boas-vindas enviado!`);
    console.log(`🎉 [${requestId}] Assinatura ativa até: ${expiresAt.toISOString()}`);
    console.log(`🎉 [${requestId}] =============================\n`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Compra processada com sucesso',
        user_id: userId,
        email_sent: true
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error(`\n❌ [${requestId}] ========== ERRO ==========`);
    console.error(`❌ [${requestId}] Erro:`, error);
    console.error(`❌ [${requestId}] ===========================\n`);

    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro interno' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
