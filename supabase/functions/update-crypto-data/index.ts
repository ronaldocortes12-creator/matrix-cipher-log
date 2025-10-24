import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Lista de criptos que vamos monitorar
const CRYPTOS = [
  { symbol: 'BTC', coinId: 'bitcoin' },
  { symbol: 'ETH', coinId: 'ethereum' },
  { symbol: 'BNB', coinId: 'binancecoin' },
  { symbol: 'SOL', coinId: 'solana' },
  { symbol: 'XRP', coinId: 'ripple' },
  { symbol: 'ADA', coinId: 'cardano' },
  { symbol: 'DOGE', coinId: 'dogecoin' },
  { symbol: 'TRX', coinId: 'tron' },
  { symbol: 'AVAX', coinId: 'avalanche-2' },
  { symbol: 'SHIB', coinId: 'shiba-inu' },
  { symbol: 'TON', coinId: 'the-open-network' },
  { symbol: 'LINK', coinId: 'chainlink' },
  { symbol: 'DOT', coinId: 'polkadot' },
  { symbol: 'MATIC', coinId: 'matic-network' },
  { symbol: 'UNI', coinId: 'uniswap' },
  { symbol: 'LTC', coinId: 'litecoin' },
  { symbol: 'ICP', coinId: 'internet-computer' },
  { symbol: 'NEAR', coinId: 'near' },
  { symbol: 'FET', coinId: 'fetch-ai' },
  { symbol: 'SUI', coinId: 'sui' },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Iniciando atualização de dados cripto...');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Atualizar preços históricos de cada cripto (365 dias)
    console.log('📊 Buscando preços históricos...');
    for (const crypto of CRYPTOS) {
      try {
        const response = await fetch(
          `https://api.coingecko.com/api/v3/coins/${crypto.coinId}/market_chart?vs_currency=usd&days=365&interval=daily`
        );
        
        if (!response.ok) {
          console.error(`❌ Erro ao buscar ${crypto.symbol}: ${response.status}`);
          continue;
        }

        const data = await response.json();
        const prices = data.prices || [];

        console.log(`  ✓ ${crypto.symbol}: ${prices.length} dias de histórico`);

        // Inserir/atualizar preços
        for (const [timestamp, price] of prices) {
          const date = new Date(timestamp).toISOString().split('T')[0];
          
          const { error } = await supabase
            .from('crypto_historical_prices')
            .upsert({
              symbol: crypto.symbol,
              coin_id: crypto.coinId,
              date: date,
              closing_price: price,
            }, {
              onConflict: 'symbol,date'
            });

          if (error) {
            console.error(`Erro ao inserir ${crypto.symbol} ${date}:`, error);
          }
        }

        // Rate limiting: aguardar 1s entre requisições para não sobrecarregar API
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Erro processando ${crypto.symbol}:`, error);
      }
    }

    // 2. Remover preços com mais de 365 dias
    console.log('🗑️ Removendo preços antigos (> 365 dias)...');
    const date365DaysAgo = new Date();
    date365DaysAgo.setDate(date365DaysAgo.getDate() - 365);
    
    const { error: deleteOldPricesError } = await supabase
      .from('crypto_historical_prices')
      .delete()
      .lt('date', date365DaysAgo.toISOString().split('T')[0]);

    if (deleteOldPricesError) {
      console.error('Erro ao remover preços antigos:', deleteOldPricesError);
    } else {
      console.log('  ✓ Preços antigos removidos');
    }

    // 3. Atualizar Market Cap total dos últimos 7 dias
    console.log('💰 Buscando histórico de Market Cap...');
    const mcapResponse = await fetch(
      'https://api.coingecko.com/api/v3/global/market_cap_chart?days=7'
    );

    if (mcapResponse.ok) {
      const mcapData = await mcapResponse.json();
      const marketCapHistory = mcapData.market_cap_chart?.usd || [];

      console.log(`  ✓ Market Cap: ${marketCapHistory.length} dias de histórico`);

      // Inserir/atualizar market cap
      for (let i = 0; i < marketCapHistory.length; i++) {
        const [timestamp, totalMcap] = marketCapHistory[i];
        const date = new Date(timestamp).toISOString().split('T')[0];
        
        // Calcular variação em relação ao dia anterior
        let mcapChange = null;
        if (i > 0) {
          const previousMcap = marketCapHistory[i - 1][1];
          mcapChange = totalMcap - previousMcap;
        }

        const { error } = await supabase
          .from('market_cap_history')
          .upsert({
            date: date,
            total_market_cap: totalMcap,
            market_cap_change: mcapChange,
          }, {
            onConflict: 'date'
          });

        if (error) {
          console.error(`Erro ao inserir market cap ${date}:`, error);
        }
      }
    } else {
      console.error('❌ Erro ao buscar market cap:', mcapResponse.status);
    }

    // 4. Remover market cap com mais de 7 dias
    console.log('🗑️ Removendo market cap antigo (> 7 dias)...');
    const date7DaysAgo = new Date();
    date7DaysAgo.setDate(date7DaysAgo.getDate() - 7);
    
    const { error: deleteOldMcapError } = await supabase
      .from('market_cap_history')
      .delete()
      .lt('date', date7DaysAgo.toISOString().split('T')[0]);

    if (deleteOldMcapError) {
      console.error('Erro ao remover market cap antigo:', deleteOldMcapError);
    } else {
      console.log('  ✓ Market cap antigo removido');
    }

    console.log('✅ Atualização completa!');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Dados atualizados com sucesso',
        cryptos_updated: CRYPTOS.length,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Erro geral:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
