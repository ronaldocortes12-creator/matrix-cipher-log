import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
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

    const checks = {
      database: false,
      crypto_data: false,
      community: false,
      chat: false,
    };

    const metrics: any = {};

    // Database check
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);
      checks.database = !error;
      
      if (!error && data) {
        // Contar usuários ativos
        const { count: userCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .is('deleted_at', null);
        metrics.active_users = userCount || 0;
      }
    } catch (e) {
      console.error('Database check failed:', e);
    }

    // Crypto data check (últimas 24h)
    try {
      const { data, error } = await supabase
        .from('crypto_probabilities')
        .select('calculation_date, symbol')
        .gte('calculation_date', new Date(Date.now() - 24*60*60*1000).toISOString())
        .limit(1);
      
      checks.crypto_data = !error && data && data.length > 0;
      
      if (checks.crypto_data) {
        const { count } = await supabase
          .from('crypto_probabilities')
          .select('*', { count: 'exact', head: true })
          .gte('calculation_date', new Date(Date.now() - 24*60*60*1000).toISOString());
        metrics.crypto_data_count = count || 0;
      }
    } catch (e) {
      console.error('Crypto data check failed:', e);
    }

    // Community check
    try {
      const { data, error } = await supabase
        .from('community_posts')
        .select('id')
        .is('deleted_at', null)
        .limit(1);
      checks.community = !error;
      
      if (!error) {
        const { count } = await supabase
          .from('community_posts')
          .select('*', { count: 'exact', head: true })
          .is('deleted_at', null);
        metrics.community_posts = count || 0;
      }
    } catch (e) {
      console.error('Community check failed:', e);
    }

    // Chat check
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('id')
        .limit(1);
      checks.chat = !error;
      
      if (!error) {
        const { count } = await supabase
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', new Date(Date.now() - 24*60*60*1000).toISOString());
        metrics.chat_messages_24h = count || 0;
      }
    } catch (e) {
      console.error('Chat check failed:', e);
    }

    const executionTime = Date.now() - startTime;
    const allHealthy = Object.values(checks).every(v => v);
    const status = allHealthy ? 'healthy' : 'degraded';

    const result = {
      status,
      timestamp: new Date().toISOString(),
      response_time_ms: executionTime,
      checks,
      metrics
    };

    // Salvar snapshot
    await supabase.from('system_health_snapshots').insert({
      status,
      metrics: result
    });

    return new Response(JSON.stringify(result), {
      status: allHealthy ? 200 : 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error('Health check error:', error);
    
    return new Response(JSON.stringify({
      status: 'critical',
      timestamp: new Date().toISOString(),
      response_time_ms: executionTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
