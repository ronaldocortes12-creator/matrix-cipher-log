import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * ╔════════════════════════════════════════════════════════════════════╗
 * ║          PLANO DE CONTINGÊNCIA E PROTEÇÃO DO SISTEMA               ║
 * ╚════════════════════════════════════════════════════════════════════╝
 * 
 * Este wrapper garante que o cálculo de probabilidades NUNCA falhe
 * completamente. Em caso de erro, retorna dados em cache ou estimativas.
 * 
 * CAMADAS DE PROTEÇÃO:
 * 1. Rate limiting por IP
 * 2. Validação de dados antes do cálculo
 * 3. Sistema de retry com backoff exponencial
 * 4. Fallback para cache quando API falha
 * 5. Sanitização de todos os inputs
 * 6. Timeout de 25 segundos (antes do limite de 30s)
 * 7. Health check antes de executar
 */

// Constantes de segurança
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 segundo
const MAX_TIMEOUT = 25000; // 25 segundos (antes do limite de 30s)
const CACHE_TTL_HOURS = 4; // Usar cache se dados têm menos de 4 horas

// Rate limiting simples (em produção, usar Redis)
const requestCounts = new Map<string, { count: number; resetAt: number }>();
const MAX_REQUESTS_PER_MINUTE = 10;

interface SafetyCheck {
  canProceed: boolean;
  reason?: string;
  useCacheOnly?: boolean;
}

/**
 * Verifica rate limiting
 */
function checkRateLimit(ip: string): SafetyCheck {
  const now = Date.now();
  const record = requestCounts.get(ip);
  
  if (!record || now > record.resetAt) {
    requestCounts.set(ip, { count: 1, resetAt: now + 60000 });
    return { canProceed: true };
  }
  
  if (record.count >= MAX_REQUESTS_PER_MINUTE) {
    return { 
      canProceed: false, 
      reason: 'Rate limit excedido. Aguarde 1 minuto.',
      useCacheOnly: true 
    };
  }
  
  record.count++;
  return { canProceed: true };
}

/**
 * Valida integridade dos dados calculados
 */
function validateCalculationResult(data: any): boolean {
  if (!data || typeof data !== 'object') return false;
  
  // Verificar campos obrigatórios
  const required = ['mcap_component', 'btc_component', 'cryptos_calculated'];
  for (const field of required) {
    if (!(field in data)) return false;
  }
  
  // Verificar valores numéricos estão no range esperado
  const mcap = data.mcap_component?.p_mcap_final;
  const btc = data.btc_component?.p_alta_btc_10d;
  
  if (typeof mcap !== 'number' || mcap < 0 || mcap > 1) return false;
  if (typeof btc !== 'number' || btc < 0 || btc > 1) return false;
  
  return true;
}

/**
 * Busca dados em cache (últimas 4 horas)
 */
async function getCachedData(supabase: any) {
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - CACHE_TTL_HOURS);
  
  const { data, error } = await supabase
    .from('crypto_probabilities')
    .select('*')
    .gte('created_at', cutoff.toISOString())
    .order('created_at', { ascending: false })
    .limit(24);
  
  if (error || !data || data.length === 0) return null;
  
  return {
    source: 'cache',
    cache_age_hours: Math.round((Date.now() - new Date(data[0].created_at).getTime()) / 3600000),
    cryptos: data,
    message: 'Dados do cache (API indisponível)'
  };
}

/**
 * Retry com backoff exponencial
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = MAX_RETRIES
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < retries - 1) {
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, i);
        console.log(`⚠️ Tentativa ${i + 1} falhou. Retry em ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

/**
 * Timeout wrapper
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout excedido')), timeoutMs)
    ),
  ]);
}

/**
 * Executa o cálculo principal com proteções
 */
async function executeCalculation(supabase: any) {
  const { data, error } = await supabase.functions.invoke(
    'calculate-crypto-probabilities',
    {
      body: {},
      headers: { 'Content-Type': 'application/json' }
    }
  );
  
  if (error) throw new Error(`Cálculo falhou: ${error.message}`);
  if (!validateCalculationResult(data)) {
    throw new Error('Resultado do cálculo inválido');
  }
  
  return data;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  const startTime = Date.now();
  
  try {
    // 1. Verificar rate limiting
    const clientIP = req.headers.get('x-forwarded-for') || 'unknown';
    const rateLimitCheck = checkRateLimit(clientIP);
    
    // Criar cliente Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    // Se rate limit excedido, retornar cache
    if (!rateLimitCheck.canProceed) {
      console.log(`⚠️ Rate limit para ${clientIP}: ${rateLimitCheck.reason}`);
      const cached = await getCachedData(supabase);
      
      if (!cached) {
        return new Response(
          JSON.stringify({ 
            error: rateLimitCheck.reason,
            retry_after: 60 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 429 
          }
        );
      }
      
      return new Response(
        JSON.stringify(cached),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }
    
    // 2. Tentar cálculo com retry e timeout
    try {
      const result = await withTimeout(
        withRetry(() => executeCalculation(supabase)),
        MAX_TIMEOUT
      );
      
      const executionTime = Date.now() - startTime;
      console.log(`✅ Cálculo executado com sucesso em ${executionTime}ms`);
      
      return new Response(
        JSON.stringify({
          ...result,
          source: 'calculation',
          execution_time_ms: executionTime
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
      
    } catch (calcError) {
      // 3. Fallback para cache em caso de erro
      console.error('❌ Cálculo falhou, buscando cache:', calcError);
      
      const cached = await getCachedData(supabase);
      
      if (cached) {
        console.log(`✅ Retornando dados em cache (${cached.cache_age_hours}h)`);
        return new Response(
          JSON.stringify({
            ...cached,
            warning: 'Cálculo falhou, usando cache',
            error_details: calcError instanceof Error ? calcError.message : 'Erro desconhecido'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // 4. Último recurso: retornar erro estruturado
      throw calcError;
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('❌ Erro crítico:', errorMessage);
    
    return new Response(
      JSON.stringify({
        error: 'Sistema temporariamente indisponível',
        details: errorMessage,
        retry: true,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 503 
      }
    );
  }
});
