import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Lista completa de criptos monitoradas
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
  { symbol: 'POL', coinId: 'polygon-ecosystem-token' },
  { symbol: 'UNI', coinId: 'uniswap' },
  { symbol: 'LTC', coinId: 'litecoin' },
  { symbol: 'ICP', coinId: 'internet-computer' },
  { symbol: 'NEAR', coinId: 'near' },
  { symbol: 'FET', coinId: 'fetch-ai' },
  { symbol: 'SUI', coinId: 'sui' },
  { symbol: 'WLD', coinId: 'worldcoin-wld' },
  { symbol: 'XLM', coinId: 'stellar' },
  { symbol: 'WIF', coinId: 'dogwifcoin' },
  { symbol: 'ALGO', coinId: 'algorand' },
];

const TARGET_DAYS = 365;
const RATE_LIMIT_DELAY = 60000; // 60 segundos
const REQUEST_DELAY = 2000; // 2 segundos entre requisições

interface CryptoStatus {
  symbol: string;
  coinId: string;
  currentDays: number;
  oldestDate: string | null;
  newestDate: string | null;
  status: 'complete' | 'incomplete' | 'empty';
  missingDays: number;
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchCryptoData(coinId: string, days: number, retries = 3): Promise<any> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}&interval=daily`
      );

      if (response.status === 429) {
        console.log(`⏳ Rate limit atingido. Aguardando ${RATE_LIMIT_DELAY / 1000}s...`);
        await sleep(RATE_LIMIT_DELAY);
        continue;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Tentativa ${attempt + 1}/${retries} falhou:`, error);
      if (attempt < retries - 1) {
        await sleep(REQUEST_DELAY * (attempt + 1));
      }
    }
  }
  throw new Error(`Falhou após ${retries} tentativas`);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    console.log('🚀 SISTEMA AUTÔNOMO DE ATUALIZAÇÃO E INTEGRIDADE');
    console.log('================================================\n');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // ETAPA 1: VERIFICAR INTEGRIDADE ATUAL
    console.log('📊 ETAPA 1: Verificando integridade dos dados...\n');

    const cryptoStatuses: CryptoStatus[] = [];

    for (const crypto of CRYPTOS) {
      const { data, error } = await supabase
        .from('crypto_historical_prices')
        .select('date')
        .eq('symbol', crypto.symbol)
        .order('date', { ascending: true });

      const currentDays = data?.length || 0;
      const oldestDate = data && data.length > 0 ? data[0].date : null;
      const newestDate = data && data.length > 0 ? data[data.length - 1].date : null;

      const status: CryptoStatus = {
        symbol: crypto.symbol,
        coinId: crypto.coinId,
        currentDays,
        oldestDate,
        newestDate,
        status: currentDays === 0 ? 'empty' : currentDays >= TARGET_DAYS ? 'complete' : 'incomplete',
        missingDays: Math.max(0, TARGET_DAYS - currentDays),
      };

      cryptoStatuses.push(status);

      console.log(`${crypto.symbol}: ${currentDays}/${TARGET_DAYS} dias - ${status.status.toUpperCase()}`);
    }

    const completeCount = cryptoStatuses.filter(s => s.status === 'complete').length;
    const incompleteCount = CRYPTOS.length - completeCount;
    const completionPercentage = (completeCount / CRYPTOS.length) * 100;

    console.log(`\n✓ Completas: ${completeCount}/${CRYPTOS.length}`);
    console.log(`⚠ Incompletas: ${incompleteCount}/${CRYPTOS.length}`);
    console.log(`📈 Completude: ${completionPercentage.toFixed(1)}%\n`);

    // ETAPA 2: PREENCHER DADOS FALTANTES
    console.log('📥 ETAPA 2: Preenchendo dados faltantes...\n');

    let successCount = 0;
    let failCount = 0;

    for (const status of cryptoStatuses) {
      if (status.status === 'complete') {
        console.log(`✓ ${status.symbol}: Já completo, pulando...`);
        continue;
      }

      try {
        console.log(`\n🔄 ${status.symbol}: Coletando ${status.missingDays} dias faltantes...`);

        // Buscar 365 dias completos
        const data = await fetchCryptoData(status.coinId, TARGET_DAYS);
        const prices = data.prices || [];
        const marketCaps = data.market_caps || [];

        if (prices.length === 0) {
          console.error(`❌ ${status.symbol}: Sem dados retornados`);
          failCount++;
          continue;
        }

        console.log(`  ✓ Recebidos ${prices.length} registros`);

        // Inserir preços
        const pricesBatch = prices.map(([timestamp, price]: [number, number]) => ({
          symbol: status.symbol,
          coin_id: status.coinId,
          date: new Date(timestamp).toISOString().split('T')[0],
          closing_price: price,
        }));

        const { error: pricesError } = await supabase
          .from('crypto_historical_prices')
          .upsert(pricesBatch, { onConflict: 'symbol,date' });

        if (pricesError) {
          console.error(`  ⚠️ Erro ao inserir preços:`, pricesError.message);
        } else {
          console.log(`  ✓ ${pricesBatch.length} preços inseridos`);
        }

        // Inserir market caps
        const mcapBatch = marketCaps.map(([timestamp, marketCap]: [number, number], index: number) => {
          let mcapChange = null;
          if (index > 0) {
            const previousMcap = marketCaps[index - 1][1];
            mcapChange = marketCap - previousMcap;
          }

          return {
            symbol: status.symbol,
            coin_id: status.coinId,
            date: new Date(timestamp).toISOString().split('T')[0],
            market_cap: marketCap,
            market_cap_change: mcapChange,
          };
        });

        const { error: mcapError } = await supabase
          .from('crypto_market_cap')
          .upsert(mcapBatch, { onConflict: 'symbol,date' });

        if (mcapError) {
          console.error(`  ⚠️ Erro ao inserir market caps:`, mcapError.message);
        } else {
          console.log(`  ✓ ${mcapBatch.length} market caps inseridos`);
        }

        // Atualizar status
        await supabase
          .from('crypto_data_collection_status')
          .upsert({
            symbol: status.symbol,
            coin_id: status.coinId,
            current_days: pricesBatch.length,
            oldest_date: pricesBatch[0].date,
            newest_date: pricesBatch[pricesBatch.length - 1].date,
            last_successful_update: new Date().toISOString(),
            status: pricesBatch.length >= TARGET_DAYS ? 'complete' : 'incomplete',
          }, { onConflict: 'symbol' });

        successCount++;
        console.log(`  ✅ ${status.symbol} atualizado com sucesso`);

        // Delay entre requisições
        await sleep(REQUEST_DELAY);

      } catch (error) {
        console.error(`❌ ${status.symbol}: Erro -`, error);
        failCount++;
      }
    }

    // ETAPA 3: ATUALIZAR MARKET CAP GLOBAL ATUAL
    console.log('\n\n💰 ETAPA 3: Atualizando Market Cap Global Atual...\n');

    try {
      // Buscar dados globais atuais do mercado
      const globalResponse = await fetch('https://api.coingecko.com/api/v3/global');
      
      if (globalResponse.ok) {
        const globalData = await globalResponse.json();
        const marketCapData = globalData.data;
        
        const totalMarketCapUSD = marketCapData.total_market_cap.usd;
        const marketCapChangePercent = marketCapData.market_cap_change_percentage_24h_usd;
        
        console.log(`✓ Market Cap Global Atual: $${(totalMarketCapUSD / 1e12).toFixed(2)}T`);
        console.log(`✓ Mudança 24h: ${marketCapChangePercent.toFixed(2)}%`);
        
        // Salvar no banco (data de hoje)
        const today = new Date().toISOString().split('T')[0];
        const { error: globalError } = await supabase
          .from('global_crypto_market_cap')
          .upsert({
            date: today,
            total_market_cap: totalMarketCapUSD,
            daily_change_pct: marketCapChangePercent,
          }, { onConflict: 'date' });
        
        if (globalError) {
          console.error('⚠️ Erro ao atualizar Global Market Cap:', globalError.message);
        } else {
          console.log('✅ Global Market Cap atualizado com sucesso');
        }
      } else {
        console.error('❌ Erro ao buscar dados globais:', globalResponse.status);
      }
    } catch (error) {
      console.error('❌ Erro ao buscar Global Market Cap:', error);
    }

    // ETAPA 4: LIMPEZA DE DADOS ANTIGOS
    console.log('\n\n🗑️ ETAPA 4: Removendo dados com mais de 365 dias...\n');

    const date365DaysAgo = new Date();
    date365DaysAgo.setDate(date365DaysAgo.getDate() - 365);
    const cutoffDate = date365DaysAgo.toISOString().split('T')[0];

    await supabase.from('crypto_historical_prices').delete().lt('date', cutoffDate);
    await supabase.from('crypto_market_cap').delete().lt('date', cutoffDate);
    await supabase.from('global_crypto_market_cap').delete().lt('date', cutoffDate);

    console.log(`✓ Dados anteriores a ${cutoffDate} removidos`);

    // ETAPA 5: GERAR RELATÓRIO DE INTEGRIDADE
    console.log('\n\n📋 ETAPA 5: Gerando relatório de integridade...\n');

    const finalStatuses: CryptoStatus[] = [];
    for (const crypto of CRYPTOS) {
      const { data } = await supabase
        .from('crypto_historical_prices')
        .select('date')
        .eq('symbol', crypto.symbol)
        .order('date', { ascending: true });

      const currentDays = data?.length || 0;
      finalStatuses.push({
        symbol: crypto.symbol,
        coinId: crypto.coinId,
        currentDays,
        oldestDate: data && data.length > 0 ? data[0].date : null,
        newestDate: data && data.length > 0 ? data[data.length - 1].date : null,
        status: currentDays >= TARGET_DAYS ? 'complete' : currentDays > 0 ? 'incomplete' : 'empty',
        missingDays: Math.max(0, TARGET_DAYS - currentDays),
      });
    }

    const finalCompleteCount = finalStatuses.filter(s => s.status === 'complete').length;
    const finalCompletionPercentage = (finalCompleteCount / CRYPTOS.length) * 100;

    const reportDetails = {
      cryptos: finalStatuses.map(s => ({
        symbol: s.symbol,
        days: s.currentDays,
        status: s.status,
        oldest_date: s.oldestDate,
        newest_date: s.newestDate,
        missing_days: s.missingDays,
      })),
      summary: {
        total: CRYPTOS.length,
        complete: finalCompleteCount,
        incomplete: CRYPTOS.length - finalCompleteCount,
        completion_percentage: finalCompletionPercentage,
      },
    };

    await supabase
      .from('data_integrity_reports')
      .upsert({
        report_date: new Date().toISOString().split('T')[0],
        total_cryptos: CRYPTOS.length,
        cryptos_complete: finalCompleteCount,
        cryptos_incomplete: CRYPTOS.length - finalCompleteCount,
        completion_percentage: finalCompletionPercentage,
        details: reportDetails,
        execution_time_ms: Date.now() - startTime,
        status: finalCompleteCount === CRYPTOS.length ? 'all_complete' : 'in_progress',
      }, { onConflict: 'report_date' });

    console.log('✅ Relatório de integridade salvo');

    // ETAPA 6: EXECUTAR CÁLCULO DE PROBABILIDADES SE HOUVER DADOS SUFICIENTES
    if (finalCompleteCount >= 6) {
      console.log('\n\n🧮 ETAPA 6: Disparando cálculo de probabilidades...\n');
      
      try {
        const calcResponse = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/calculate-crypto-probabilities`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (calcResponse.ok) {
          console.log('✅ Cálculo de probabilidades iniciado com sucesso');
        } else {
          console.log('⚠️ Cálculo de probabilidades retornou:', calcResponse.status);
        }
      } catch (error) {
        console.error('❌ Erro ao disparar cálculo:', error);
      }
    }

    // RELATÓRIO FINAL
    const executionTime = Date.now() - startTime;
    
    console.log('\n\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║       📊 RELATÓRIO FINAL DE EXECUÇÃO                     ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log(`\n⏱️  Tempo de execução: ${(executionTime / 1000).toFixed(2)}s`);
    console.log(`✅ Criptos atualizadas: ${successCount}`);
    console.log(`❌ Falhas: ${failCount}`);
    console.log(`📈 Completude: ${finalCompletionPercentage.toFixed(1)}% (${finalCompleteCount}/${CRYPTOS.length})`);
    console.log(`\n${finalCompleteCount === CRYPTOS.length ? '🎉 TODAS AS CRIPTOS COMPLETAS!' : '⚠️  Continuar coleta no próximo ciclo'}`);
    console.log('═══════════════════════════════════════════════════════════\n');

    return new Response(
      JSON.stringify({
        success: true,
        execution_time_ms: executionTime,
        cryptos_updated: successCount,
        cryptos_failed: failCount,
        completion: {
          total: CRYPTOS.length,
          complete: finalCompleteCount,
          incomplete: CRYPTOS.length - finalCompleteCount,
          percentage: finalCompletionPercentage,
        },
        status: finalCompleteCount === CRYPTOS.length ? 'all_complete' : 'in_progress',
        details: reportDetails,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ ERRO GERAL:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
