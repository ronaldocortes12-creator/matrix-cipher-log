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

    // 1. Atualizar preços históricos e market cap de cada cripto (365 dias)
    console.log('📊 Buscando preços históricos e market cap...');
    
    let successCount = 0;
    let failCount = 0;
    
    for (const crypto of CRYPTOS) {
      try {
        console.log(`  🔄 ${crypto.symbol}...`);
        
        // Tentar buscar da CoinGecko com retry
        let attempts = 0;
        let success = false;
        const maxAttempts = 3;
        
        while (attempts < maxAttempts && !success) {
          try {
            const response = await fetch(
              `https://api.coingecko.com/api/v3/coins/${crypto.coinId}/market_chart?vs_currency=usd&days=365&interval=daily`
            );
            
            if (response.status === 429) {
              console.log(`  ⏳ Rate limit ${crypto.symbol}, aguardando...`);
              await new Promise(resolve => setTimeout(resolve, (attempts + 1) * 5000));
              attempts++;
              continue;
            }
            
            if (!response.ok) {
              console.error(`  ❌ Erro ${response.status}: ${crypto.symbol}`);
              attempts++;
              await new Promise(resolve => setTimeout(resolve, 2000));
              continue;
            }

            const data = await response.json();
            const prices = data.prices || [];
            const marketCaps = data.market_caps || [];

            if (prices.length === 0 || marketCaps.length === 0) {
              console.error(`  ❌ Sem dados: ${crypto.symbol}`);
              attempts++;
              continue;
            }

            console.log(`  ✓ ${crypto.symbol}: ${prices.length} dias`);

            // Preparar batch de preços (últimos 30 dias apenas para economizar CPU)
            const pricesBatch = [];
            const recentPrices = prices.slice(-90); // Últimos 90 dias
            
            for (const [timestamp, price] of recentPrices) {
              const date = new Date(timestamp).toISOString().split('T')[0];
              pricesBatch.push({
                symbol: crypto.symbol,
                coin_id: crypto.coinId,
                date: date,
                closing_price: price,
              });
            }

            // Inserir batch de preços
            if (pricesBatch.length > 0) {
              const { error: priceError } = await supabase
                .from('crypto_historical_prices')
                .upsert(pricesBatch, { onConflict: 'symbol,date' });

              if (priceError) {
                console.error(`  ⚠️ Erro batch preços ${crypto.symbol}:`, priceError.message);
              }
            }

            // Preparar batch de market cap (últimos 30 dias)
            const mcapBatch = [];
            const recentMcaps = marketCaps.slice(-90); // Últimos 90 dias
            
            for (let i = 0; i < recentMcaps.length; i++) {
              const [timestamp, marketCap] = recentMcaps[i];
              const date = new Date(timestamp).toISOString().split('T')[0];
              
              let mcapChange = null;
              if (i > 0) {
                const previousMcap = recentMcaps[i - 1][1];
                mcapChange = marketCap - previousMcap;
              }

              mcapBatch.push({
                symbol: crypto.symbol,
                coin_id: crypto.coinId,
                date: date,
                market_cap: marketCap,
                market_cap_change: mcapChange,
              });
            }

            // Inserir batch de market cap
            if (mcapBatch.length > 0) {
              const { error: mcapError } = await supabase
                .from('crypto_market_cap')
                .upsert(mcapBatch, { onConflict: 'symbol,date' });

              if (mcapError) {
                console.error(`  ⚠️ Erro batch mcap ${crypto.symbol}:`, mcapError.message);
              }
            }

            success = true;
            successCount++;
            console.log(`  ✅ ${crypto.symbol} OK`);
            
            // Rate limiting: aguardar 2s entre requisições bem-sucedidas
            await new Promise(resolve => setTimeout(resolve, 2000));
            
          } catch (fetchError) {
            console.error(`  ❌ Tentativa ${attempts + 1} falhou: ${crypto.symbol}`);
            attempts++;
            if (attempts < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
        }
        
        if (!success) {
          failCount++;
          console.error(`  ❌ FALHA TOTAL: ${crypto.symbol}`);
        }
        
      } catch (error) {
        failCount++;
        console.error(`  ❌ Erro ${crypto.symbol}:`, error);
      }
    }

    console.log(`\n📊 Resumo: ${successCount} sucesso, ${failCount} falhas`);

    // 2. Remover preços e market cap com mais de 365 dias
    console.log('🗑️ Removendo dados antigos (> 365 dias)...');
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

    const { error: deleteOldMcapError } = await supabase
      .from('crypto_market_cap')
      .delete()
      .lt('date', date365DaysAgo.toISOString().split('T')[0]);

    if (deleteOldMcapError) {
      console.error('Erro ao remover market cap antigo:', deleteOldMcapError);
    } else {
      console.log('  ✓ Market cap antigo removido');
    }

    // 3. Atualizar Market Cap total dos últimos 7 dias
    console.log('💰 Buscando histórico de Market Cap total...');
    const mcapResponse = await fetch(
      'https://api.coingecko.com/api/v3/global/market_cap_chart?days=7'
    );

    if (mcapResponse.ok) {
      const mcapData = await mcapResponse.json();
      const marketCapHistory = mcapData.market_cap_chart?.usd || [];

      console.log(`  ✓ Market Cap Total: ${marketCapHistory.length} dias de histórico`);

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
          console.error(`Erro ao inserir market cap total ${date}:`, error);
        }
      }
    } else {
      console.error('❌ Erro ao buscar market cap total:', mcapResponse.status);
    }

    // 4. Remover market cap total com mais de 7 dias
    console.log('🗑️ Removendo market cap total antigo (> 7 dias)...');
    const date7DaysAgo = new Date();
    date7DaysAgo.setDate(date7DaysAgo.getDate() - 7);
    
    const { error: deleteOldMcapTotalError } = await supabase
      .from('market_cap_history')
      .delete()
      .lt('date', date7DaysAgo.toISOString().split('T')[0]);

    if (deleteOldMcapTotalError) {
      console.error('Erro ao remover market cap total antigo:', deleteOldMcapTotalError);
    } else {
      console.log('  ✓ Market cap total antigo removido');
    }

    console.log('✅ Processo completo!');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Dados atualizados com sucesso',
        cryptos_updated: successCount,
        cryptos_failed: failCount,
        total: CRYPTOS.length,
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
