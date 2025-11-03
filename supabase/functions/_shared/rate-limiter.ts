import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

export async function checkRateLimit(
  supabase: any,
  identifier: string,
  endpoint: string,
  maxRequests: number = 60,
  windowMinutes: number = 1
): Promise<RateLimitResult> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowMinutes * 60 * 1000);
  
  try {
    // Buscar requests recentes
    const { data: limits, error } = await supabase
      .from('api_rate_limits')
      .select('request_count, window_start')
      .eq('ip_address', identifier)
      .eq('endpoint', endpoint)
      .gte('window_start', windowStart.toISOString())
      .maybeSingle();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Rate limit check error:', error);
      // Em caso de erro, permitir a request mas logar
      return { allowed: true, remaining: maxRequests, resetAt: new Date(now.getTime() + windowMinutes * 60 * 1000) };
    }
    
    if (!limits) {
      // Primeira request nesta janela
      await supabase.from('api_rate_limits').insert({
        ip_address: identifier,
        endpoint,
        request_count: 1,
        window_start: now.toISOString()
      });
      
      return { 
        allowed: true, 
        remaining: maxRequests - 1,
        resetAt: new Date(now.getTime() + windowMinutes * 60 * 1000)
      };
    }
    
    if (limits.request_count >= maxRequests) {
      const resetAt = new Date(new Date(limits.window_start).getTime() + windowMinutes * 60 * 1000);
      return { allowed: false, remaining: 0, resetAt };
    }
    
    // Incrementar contador
    await supabase
      .from('api_rate_limits')
      .update({ request_count: limits.request_count + 1 })
      .eq('ip_address', identifier)
      .eq('endpoint', endpoint)
      .eq('window_start', limits.window_start);
    
    return { 
      allowed: true, 
      remaining: maxRequests - limits.request_count - 1,
      resetAt: new Date(new Date(limits.window_start).getTime() + windowMinutes * 60 * 1000)
    };
  } catch (error) {
    console.error('Rate limit error:', error);
    // Em caso de erro crítico, permitir mas logar
    return { allowed: true, remaining: maxRequests, resetAt: new Date(now.getTime() + windowMinutes * 60 * 1000) };
  }
}

export async function logError(
  supabase: any,
  functionName: string,
  error: any,
  requestId?: string,
  userId?: string
) {
  try {
    await supabase.from('error_logs').insert({
      function_name: functionName,
      error_type: error.name || 'UnknownError',
      error_message: error.message || String(error),
      stack_trace: error.stack,
      request_id: requestId,
      user_id: userId,
      metadata: {
        timestamp: new Date().toISOString(),
        error_details: error
      }
    });
  } catch (logError) {
    console.error('Failed to log error:', logError);
  }
}
