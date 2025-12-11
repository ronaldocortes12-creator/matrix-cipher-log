import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-ticto-signature',
};

/**
 * ╔════════════════════════════════════════════════════════════════════╗
 * ║                   TICTO WEBHOOK HANDLER v2.0                       ║
 * ╚════════════════════════════════════════════════════════════════════╝
 * 
 * MELHORIAS IMPLEMENTADAS:
 * ✅ Verificação de idempotência (evita processar mesma transação 2x)
 * ✅ Retry automático para envio de email (3 tentativas com backoff)
 * ✅ Logs de auditoria detalhados com todas as etapas
 * ✅ Tratamento robusto de erros em cada fase
 * 
 * Fluxo:
 * 1. Valida o webhook e extrai dados
 * 2. Verifica se transação já foi processada (idempotência)
 * 3. Cria/recupera usuário no Supabase Auth
 * 4. Envia email de boas-vindas (com retry)
 * 5. Cria assinatura de 30 dias
 * 6. Registra auditoria completa
 */

interface TictoWebhookPayload {
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
  order?: {
    id?: string;
    hash?: string;
  };
  transaction?: {
    hash?: string;
    id?: string;
  };
  email?: string;
  name?: string;
  buyer_email?: string;
  buyer_name?: string;
}

// Helper: aguardar ms
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: enviar email com retry
async function sendEmailWithRetry(
  supabaseUrl: string,
  anonKey: string,
  emailData: { email: string; fullName: string; planDuration: string; userId: string },
  requestId: string,
  maxRetries = 3
): Promise<{ success: boolean; result?: unknown; error?: string; attempts: number }> {
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`📧 [${requestId}] Tentativa ${attempt}/${maxRetries} de envio de email...`);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
      
      const response = await fetch(
        `${supabaseUrl}/functions/v1/send-welcome-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${anonKey}`
          },
          body: JSON.stringify(emailData),
          signal: controller.signal
        }
      );
      
      clearTimeout(timeoutId);
      
      const result = await response.json();
      
      if (response.ok) {
        console.log(`✅ [${requestId}] Email enviado com sucesso na tentativa ${attempt}`);
        return { success: true, result, attempts: attempt };
      }
      
      console.warn(`⚠️ [${requestId}] Tentativa ${attempt} falhou:`, result);
      
      if (attempt < maxRetries) {
        const waitTime = attempt * 2000; // 2s, 4s, 6s
        console.log(`⏳ [${requestId}] Aguardando ${waitTime}ms antes de retry...`);
        await sleep(waitTime);
      }
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error(`❌ [${requestId}] Tentativa ${attempt} erro:`, errorMsg);
      
      if (attempt < maxRetries) {
        const waitTime = attempt * 2000;
        console.log(`⏳ [${requestId}] Aguardando ${waitTime}ms antes de retry...`);
        await sleep(waitTime);
      }
    }
  }
  
  return { success: false, error: 'Todas as tentativas falharam', attempts: maxRetries };
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID().substring(0, 8);
  const startTime = Date.now();
  
  console.log(`\n🔔 [${requestId}] ══════════════════════════════════════════════`);
  console.log(`🔔 [${requestId}] TICTO WEBHOOK v2.0 - ${new Date().toISOString()}`);
  console.log(`🔔 [${requestId}] ══════════════════════════════════════════════`);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Variáveis para auditoria
  let auditData: Record<string, unknown> = {
    request_id: requestId,
    started_at: new Date().toISOString(),
    steps_completed: [] as string[]
  };

  try {
    // ═══════════════════════════════════════════════════════════════
    // FASE 1: PARSE DO PAYLOAD
    // ═══════════════════════════════════════════════════════════════
    const rawBody = await req.text();
    console.log(`📥 [${requestId}] Payload recebido (${rawBody.length} bytes)`);

    let payload: TictoWebhookPayload;
    try {
      payload = JSON.parse(rawBody);
      auditData.steps_completed = [...(auditData.steps_completed as string[]), 'payload_parsed'];
    } catch {
      console.error(`❌ [${requestId}] JSON inválido`);
      return new Response(
        JSON.stringify({ error: 'JSON inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 [${requestId}] Payload:`, JSON.stringify(payload, null, 2));

    // ═══════════════════════════════════════════════════════════════
    // FASE 2: EXTRAIR DADOS DO CLIENTE
    // ═══════════════════════════════════════════════════════════════
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

    // Extrair identificador único da transação para idempotência
    const transactionHash = 
      payload.transaction?.hash || 
      payload.transaction?.id ||
      payload.order?.hash || 
      payload.order?.id ||
      payload.transaction_id ||
      null;

    console.log(`👤 [${requestId}] Email: ${email}`);
    console.log(`👤 [${requestId}] Nome: ${fullName}`);
    console.log(`🔑 [${requestId}] Transaction Hash: ${transactionHash || 'N/A'}`);

    auditData.email = email;
    auditData.full_name = fullName;
    auditData.transaction_hash = transactionHash;

    if (!email || !email.includes('@')) {
      console.error(`❌ [${requestId}] Email inválido ou ausente`);
      return new Response(
        JSON.stringify({ error: 'Email do cliente não encontrado no webhook' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ═══════════════════════════════════════════════════════════════
    // FASE 3: VERIFICAR STATUS DA TRANSAÇÃO
    // ═══════════════════════════════════════════════════════════════
    const status = payload.status?.toLowerCase();
    auditData.transaction_status = status;

    if (status && !['approved', 'paid', 'completed', 'aprovado', 'pago', 'authorized', 'autorizado'].includes(status)) {
      console.log(`⏸️ [${requestId}] Status não aprovado: ${status} - ignorando`);
      return new Response(
        JSON.stringify({ success: true, message: 'Webhook recebido mas status não requer ação' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    auditData.steps_completed = [...(auditData.steps_completed as string[]), 'status_validated'];

    // ═══════════════════════════════════════════════════════════════
    // FASE 4: CRIAR CLIENTE SUPABASE
    // ═══════════════════════════════════════════════════════════════
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // ═══════════════════════════════════════════════════════════════
    // FASE 5: VERIFICAÇÃO DE IDEMPOTÊNCIA
    // ═══════════════════════════════════════════════════════════════
    if (transactionHash) {
      console.log(`🔍 [${requestId}] Verificando idempotência...`);
      
      const { data: existingAudit } = await supabaseAdmin
        .from('audit_logs')
        .select('id, created_at, metadata')
        .eq('action', 'ticto_purchase_processed')
        .filter('metadata->transaction_hash', 'eq', transactionHash)
        .not('metadata->email_sent', 'is', null)
        .maybeSingle();

      if (existingAudit) {
        console.log(`⚠️ [${requestId}] TRANSAÇÃO JÁ PROCESSADA!`);
        console.log(`⚠️ [${requestId}] Audit ID: ${existingAudit.id}`);
        console.log(`⚠️ [${requestId}] Processada em: ${existingAudit.created_at}`);
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Transação já foi processada anteriormente',
            original_audit_id: existingAudit.id,
            processed_at: existingAudit.created_at
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log(`✅ [${requestId}] Transação nova - prosseguindo...`);
      auditData.steps_completed = [...(auditData.steps_completed as string[]), 'idempotency_check_passed'];
    } else {
      console.log(`⚠️ [${requestId}] Sem hash de transação - pulando verificação de idempotência`);
    }

    // ═══════════════════════════════════════════════════════════════
    // FASE 6: CRIAR/RECUPERAR USUÁRIO
    // ═══════════════════════════════════════════════════════════════
    console.log(`🔍 [${requestId}] Verificando se usuário já existe...`);
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users.find(u => u.email === email);

    let userId: string;
    let isNewUser = false;

    if (existingUser) {
      console.log(`👤 [${requestId}] Usuário existente: ${existingUser.id}`);
      userId = existingUser.id;
      auditData.user_existed = true;
    } else {
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
        auditData.error = `user_creation_failed: ${createError.message}`;
        
        // Salvar auditoria de erro
        await supabaseAdmin.from('audit_logs').insert({
          action: 'ticto_purchase_failed',
          table_name: 'ticto_webhook',
          metadata: auditData
        });
        
        return new Response(
          JSON.stringify({ error: `Erro ao criar usuário: ${createError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      userId = newUser.user.id;
      isNewUser = true;
      console.log(`✅ [${requestId}] Usuário criado: ${userId}`);
    }

    auditData.user_id = userId;
    auditData.is_new_user = isNewUser;
    auditData.steps_completed = [...(auditData.steps_completed as string[]), 'user_ready'];

    // ═══════════════════════════════════════════════════════════════
    // FASE 7: ENVIAR EMAIL COM RETRY
    // ═══════════════════════════════════════════════════════════════
    console.log(`📧 [${requestId}] Iniciando envio de email com retry...`);
    
    const emailResult = await sendEmailWithRetry(
      supabaseUrl,
      supabaseAnonKey,
      { email, fullName, planDuration: '30D', userId },
      requestId
    );

    auditData.email_sent = emailResult.success;
    auditData.email_attempts = emailResult.attempts;
    auditData.email_result = emailResult.result || emailResult.error;

    if (!emailResult.success) {
      console.error(`❌ [${requestId}] FALHA CRÍTICA: Email não enviado após ${emailResult.attempts} tentativas`);
      
      // Registrar erro mas continuar com a assinatura
      await supabaseAdmin.from('error_logs').insert({
        function_name: 'ticto-webhook',
        error_type: 'email_send_failed',
        error_message: `Email não enviado após ${emailResult.attempts} tentativas`,
        metadata: {
          request_id: requestId,
          email,
          user_id: userId,
          attempts: emailResult.attempts
        }
      });
    } else {
      auditData.steps_completed = [...(auditData.steps_completed as string[]), 'email_sent'];
    }

    // ═══════════════════════════════════════════════════════════════
    // FASE 8: CRIAR ASSINATURA
    // ═══════════════════════════════════════════════════════════════
    console.log(`📅 [${requestId}] Criando assinatura de 30 dias...`);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Cancelar assinaturas anteriores
    const { data: cancelledSubs } = await supabaseAdmin
      .from('subscriptions')
      .update({ status: 'cancelled' })
      .eq('user_id', userId)
      .eq('status', 'active')
      .select('id');

    if (cancelledSubs && cancelledSubs.length > 0) {
      console.log(`📋 [${requestId}] ${cancelledSubs.length} assinatura(s) anterior(es) cancelada(s)`);
      auditData.cancelled_subscriptions = cancelledSubs.map(s => s.id);
    }

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
      auditData.subscription_error = subError.message;
    } else {
      console.log(`✅ [${requestId}] Assinatura criada: ${subscription.id}`);
      auditData.subscription_id = subscription.id;
      auditData.expires_at = expiresAt.toISOString();
      auditData.steps_completed = [...(auditData.steps_completed as string[]), 'subscription_created'];
    }

    // ═══════════════════════════════════════════════════════════════
    // FASE 9: REGISTRAR AUDITORIA COMPLETA
    // ═══════════════════════════════════════════════════════════════
    auditData.completed_at = new Date().toISOString();
    auditData.duration_ms = Date.now() - startTime;
    auditData.success = true;

    await supabaseAdmin.from('audit_logs').insert({
      user_id: userId,
      action: 'ticto_purchase_processed',
      table_name: 'ticto_webhook',
      metadata: auditData
    });

    // ═══════════════════════════════════════════════════════════════
    // FASE 10: RESPOSTA DE SUCESSO
    // ═══════════════════════════════════════════════════════════════
    console.log(`\n🎉 [${requestId}] ══════════════════════════════════════════════`);
    console.log(`🎉 [${requestId}] PROCESSAMENTO CONCLUÍDO COM SUCESSO!`);
    console.log(`🎉 [${requestId}] ──────────────────────────────────────────────`);
    console.log(`🎉 [${requestId}] Email: ${email}`);
    console.log(`🎉 [${requestId}] User ID: ${userId}`);
    console.log(`🎉 [${requestId}] Novo usuário: ${isNewUser ? 'Sim' : 'Não'}`);
    console.log(`🎉 [${requestId}] Email enviado: ${emailResult.success ? 'Sim' : 'NÃO!'}`);
    console.log(`🎉 [${requestId}] Tentativas de email: ${emailResult.attempts}`);
    console.log(`🎉 [${requestId}] Assinatura até: ${expiresAt.toISOString()}`);
    console.log(`🎉 [${requestId}] Tempo total: ${Date.now() - startTime}ms`);
    console.log(`🎉 [${requestId}] ══════════════════════════════════════════════\n`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Compra processada com sucesso',
        user_id: userId,
        is_new_user: isNewUser,
        email_sent: emailResult.success,
        email_attempts: emailResult.attempts,
        subscription_expires_at: expiresAt.toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    
    console.error(`\n❌ [${requestId}] ══════════════════════════════════════════════`);
    console.error(`❌ [${requestId}] ERRO CRÍTICO NO PROCESSAMENTO`);
    console.error(`❌ [${requestId}] Erro: ${errorMsg}`);
    console.error(`❌ [${requestId}] Stack:`, error instanceof Error ? error.stack : 'N/A');
    console.error(`❌ [${requestId}] ══════════════════════════════════════════════\n`);

    // Tentar salvar log de erro
    try {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      
      await supabaseAdmin.from('error_logs').insert({
        function_name: 'ticto-webhook',
        error_type: 'critical_error',
        error_message: errorMsg,
        stack_trace: error instanceof Error ? error.stack : null,
        metadata: {
          request_id: requestId,
          audit_data: auditData,
          duration_ms: Date.now() - startTime
        }
      });
    } catch (logError) {
      console.error(`❌ [${requestId}] Falha ao salvar log de erro:`, logError);
    }

    return new Response(
      JSON.stringify({ error: errorMsg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
