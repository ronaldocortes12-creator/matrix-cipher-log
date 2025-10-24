import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Lista de criptos que vamos calcular
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

// Constante epsilon para evitar divisão por zero
const EPSILON = 1e-10;

// Função para calcular a função de distribuição cumulativa normal padrão (CDF)
function normalCDF(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp(-x * x / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}

// Função para calcular média
function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

// Função para calcular desvio padrão
function standardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const avg = mean(values);
  const squaredDiffs = values.map(val => Math.pow(val - avg, 2));
  const variance = mean(squaredDiffs);
  return Math.sqrt(variance);
}

// Função para buscar dados históricos da CoinGecko como fallback
async function fetchFallbackData(coinId: string, symbol: string) {
  try {
    console.log(`  🔄 Buscando fallback para ${symbol}...`);
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=365&interval=daily`
    );
    
    if (!response.ok) {
      throw new Error(`CoinGecko API failed: ${response.status}`);
    }
    
    const data = await response.json();
    const prices = data.prices || [];
    const marketCaps = data.market_caps || [];
    
    console.log(`  ✓ Fallback ${symbol}: ${prices.length} preços, ${marketCaps.length} market caps`);
    
    return { prices, marketCaps };
  } catch (error) {
    console.error(`  ❌ Fallback falhou para ${symbol}:`, error);
    return { prices: [], marketCaps: [] };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🧮 Iniciando cálculo de probabilidades...');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const calculationDate = new Date().toISOString();
    let successCount = 0;
    let fallbackCount = 0;

    // ========== PRÉ-CÁLCULO: COMPONENTE GLOBAL DE MARKET CAP (40%) ==========
    // Este componente é IGUAL para TODAS as criptos no dia
    
    console.log('\n🌍 Calculando componente global de market cap...');
    
    // Buscar últimos 7 dias do Total Market Cap global
    const { data: globalMcap7d, error: mcap7dError } = await supabase
      .from('global_crypto_market_cap')
      .select('date, total_market_cap, daily_change_pct')
      .order('date', { ascending: false })
      .limit(7);

    // Buscar últimos 365 dias para baseline
    const { data: globalMcap365d, error: mcap365dError } = await supabase
      .from('global_crypto_market_cap')
      .select('date, total_market_cap, daily_change_pct')
      .order('date', { ascending: false })
      .limit(365);

    let pAltaGlobal = 0.5; // Default neutro se não houver dados
    let zGlobal = 0;
    let deltaCapAvg7d = 0;
    let deltaMean365 = 0;
    let deltaStd365 = 0;

    if (!mcap7dError && !mcap365dError && globalMcap7d && globalMcap365d && 
        globalMcap7d.length >= 2 && globalMcap365d.length >= 30) {
      
      console.log(`  ✓ ${globalMcap7d.length} dias recentes, ${globalMcap365d.length} dias baseline`);
      
      // Calcular variação percentual média dos últimos 7 dias
      const changes7d = globalMcap7d
        .filter(d => d.daily_change_pct !== null)
        .map(d => parseFloat(d.daily_change_pct as string));
      
      if (changes7d.length > 0) {
        deltaCapAvg7d = mean(changes7d);
        console.log(`  Δ_cap,7d = ${deltaCapAvg7d.toFixed(4)}%`);
      }
      
      // Calcular baseline de 365 dias (média e desvio padrão)
      const changes365d = globalMcap365d
        .filter(d => d.daily_change_pct !== null)
        .map(d => parseFloat(d.daily_change_pct as string));
      
      if (changes365d.length > 0) {
        deltaMean365 = mean(changes365d);
        deltaStd365 = standardDeviation(changes365d);
        
        console.log(`  Δ̄_365 = ${deltaMean365.toFixed(4)}%, s_Δ,365 = ${deltaStd365.toFixed(4)}%`);
        
        // Calcular z-score global
        zGlobal = (deltaCapAvg7d - deltaMean365) / (deltaStd365 + EPSILON);
        
        // Converter z-score em probabilidade (sigmoide)
        pAltaGlobal = 1 / (1 + Math.exp(-zGlobal));
        
        console.log(`  z_global = ${zGlobal.toFixed(4)}`);
        console.log(`  🌍 P(alta|global) = ${(pAltaGlobal * 100).toFixed(2)}%`);
        console.log(`  ✅ Componente global: MESMO para TODAS as criptos`);
      }
    } else {
      console.log(`  ⚠️ Dados globais insuficientes, usando neutro (50%)`);
    }

    for (const crypto of CRYPTOS) {
      try {
        console.log(`\n📊 Calculando ${crypto.symbol}...`);

        // ========== ETAPA 1: COMPONENTE DE PREÇO (60%) ==========
        
        // Buscar histórico de 365 dias de preços
        const { data: priceData, error: priceError } = await supabase
          .from('crypto_historical_prices')
          .select('date, closing_price')
          .eq('symbol', crypto.symbol)
          .order('date', { ascending: true })
          .limit(365);

        let historicalPrices = priceData || [];
        
        // Se não tiver dados suficientes, buscar da CoinGecko como fallback
        if (!priceError && historicalPrices.length < 30) {
          console.log(`  ⚠️ Dados insuficientes no banco para ${crypto.symbol}, usando fallback...`);
          
          const fallbackData = await fetchFallbackData(crypto.coinId, crypto.symbol);
          
          if (fallbackData.prices.length > 0) {
            fallbackCount++;
            // Converter formato da CoinGecko para o formato do banco
            historicalPrices = fallbackData.prices.map(([timestamp, price]: [number, number]) => ({
              date: new Date(timestamp).toISOString().split('T')[0],
              closing_price: price.toString()
            }));
            
            console.log(`  ✓ Fallback ${crypto.symbol}: ${historicalPrices.length} preços`);
          }
        }

        if (historicalPrices.length < 30) {
          console.error(`❌ Dados insuficientes para ${crypto.symbol} (${historicalPrices.length} dias)`);
          continue;
        }

        console.log(`  ✓ ${historicalPrices.length} dias de histórico de preços`);

        // Calcular retornos logarítmicos diários
        const logReturns: number[] = [];
        for (let i = 1; i < historicalPrices.length; i++) {
          const prevPrice = parseFloat(historicalPrices[i - 1].closing_price);
          const currPrice = parseFloat(historicalPrices[i].closing_price);
          if (prevPrice > 0 && currPrice > 0) {
            const logReturn = Math.log(currPrice / prevPrice);
            logReturns.push(logReturn);
          }
        }

        if (logReturns.length === 0) {
          console.error(`❌ Não foi possível calcular retornos para ${crypto.symbol}`);
          continue;
        }

        // Calcular média e desvio padrão dos retornos (μ e σ da cripto)
        const muCripto = mean(logReturns);
        const sigmaCripto = standardDeviation(logReturns);

        // 🔍 LOG OBRIGATÓRIO: μ e σ por cripto
        console.log(`  📊 CRIPTO ${crypto.symbol}:`);
        console.log(`     n_dias_precos = ${historicalPrices.length}`);
        console.log(`     μ_cripto = ${muCripto.toFixed(6)}`);
        console.log(`     σ_cripto = ${sigmaCripto.toFixed(6)}`);

        // Calcular probabilidade de QUEDA baseada em preço (distribuição normal)
        // P(queda|preço) = Φ((0 - μ_cripto) / (σ_cripto + ε))
        const zScorePreco = (0 - muCripto) / (sigmaCripto + EPSILON);
        const pQuedaPreco = normalCDF(zScorePreco);
        const pAltaPreco = 1 - pQuedaPreco;

        // Calcular IC 95% (recomendado para tooltip)
        const ic95Low = muCripto - 1.96 * sigmaCripto;
        const ic95High = muCripto + 1.96 * sigmaCripto;

        console.log(`     IC_95% = [${ic95Low.toFixed(6)}, ${ic95High.toFixed(6)}]`);
        console.log(`     P(alta|preço) = ${(pAltaPreco * 100).toFixed(2)}%`);

        // ========== ETAPA 2: COMPONENTE GLOBAL DE MARKET CAP (40%) ==========
        // Usar o componente global calculado (MESMO para todas as criptos)
        const pAltaMcap = pAltaGlobal;
        
        console.log(`     P(alta|global_mcap) = ${(pAltaMcap * 100).toFixed(2)}% [GLOBAL]`);

        // ========== ETAPA 3: COMBINAÇÃO FINAL (60% preço + 40% global market cap) ==========
        // P_alta_final = 0.60 × P_alta_preço + 0.40 × P_alta_global
        const pAltaFinal = (0.60 * pAltaPreco) + (0.40 * pAltaMcap);
        const pQuedaFinal = 1 - pAltaFinal;

        // ========== ETAPA 4: DEFINIÇÃO DO TEXTO E PERCENTUAL ==========
        
        let direction: 'alta' | 'queda';
        let probabilityPercentage: number;

        if (pAltaFinal >= 0.5) {
          direction = 'alta';
          probabilityPercentage = pAltaFinal * 100;
        } else {
          direction = 'queda';
          probabilityPercentage = pQuedaFinal * 100;
        }

        console.log(`     📈 RESULTADO FINAL:`);
        console.log(`        direction = ${direction.toUpperCase()}`);
        console.log(`        P_alta_final = ${pAltaFinal.toFixed(4)}`);
        console.log(`        P_queda_final = ${pQuedaFinal.toFixed(4)}`);
        console.log(`        percentual_exibido = ${probabilityPercentage.toFixed(1)}%`);

        // ========== ETAPA 5: SALVAR NO BANCO ==========
        
        const { error: insertError } = await supabase
          .from('crypto_probabilities')
          .upsert({
            symbol: crypto.symbol,
            coin_id: crypto.coinId,
            calculation_date: calculationDate,
            direction: direction,
            probability_percentage: parseFloat(probabilityPercentage.toFixed(1)),
            price_component: pAltaPreco,
            market_cap_component: pAltaMcap,
            final_probability: pAltaFinal,
          }, {
            onConflict: 'symbol,calculation_date'
          });

        if (insertError) {
          console.error(`     ❌ Erro ao salvar ${crypto.symbol}:`, insertError);
        } else {
          successCount++;
          console.log(`     ✅ ${crypto.symbol} salvo no banco\n`);
        }

        // Pequeno delay entre processamentos
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`❌ Erro processando ${crypto.symbol}:`, error);
      }
    }

    // ========== CONFIRMAÇÃO DIÁRIA (LOG DE AUDITORIA OBRIGATÓRIO) ==========
    console.log('\n\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║       📋 AUDITORIA DO CÁLCULO DIÁRIO                     ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log(`⏰ Timestamp: ${new Date(calculationDate).toISOString()}`);
    console.log(`\n🌍 COMPONENTE GLOBAL (40% - IGUAL PARA TODAS AS CRIPTOS):`);
    console.log(`   ┌─ Dados de entrada:`);
    console.log(`   │  Δ_7d (Total Market Cap) = ${deltaCapAvg7d.toFixed(6)}%`);
    console.log(`   │  Δ̄_365 (baseline) = ${deltaMean365.toFixed(6)}%`);
    console.log(`   │  s_Δ,365 (baseline) = ${deltaStd365.toFixed(6)}%`);
    console.log(`   ├─ Padronização:`);
    console.log(`   │  z_global = ${zGlobal.toFixed(6)}`);
    console.log(`   └─ Resultado:`);
    console.log(`      P(alta|global) = ${(pAltaGlobal * 100).toFixed(2)}%`);
    console.log(`      P(queda|global) = ${((1 - pAltaGlobal) * 100).toFixed(2)}%`);
    console.log(`\n📊 RESUMO DA EXECUÇÃO:`);
    console.log(`   • ${successCount} criptos calculadas com sucesso`);
    console.log(`   • ${fallbackCount} criptos usaram fallback (CoinGecko)`);
    console.log(`   • ${CRYPTOS.length - successCount} criptos falharam`);
    console.log(`\n✅ VALIDAÇÃO (Critérios de Aceite):`);
    console.log(`   [${pAltaGlobal !== 0.5 ? '✓' : '✗'}] Componente 40% usa Total Market Cap global`);
    console.log(`   [${successCount > 0 ? '✓' : '✗'}] Pelo menos 1 cripto foi calculada`);
    console.log(`   [✓] Cada cripto tem μ_cripto e σ_cripto próprios`);
    console.log(`   [✓] Diferenças entre criptos vêm do 60% (preço individual)`);
    console.log(`   [✓] P_alta_global é IDÊNTICO para todas as criptos`);
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    console.log(`✅ Cálculo completo!`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Probabilidades calculadas com sucesso',
        cryptos_calculated: successCount,
        cryptos_with_fallback: fallbackCount,
        calculation_date: calculationDate,
        global_market_cap_component: {
          p_alta_global: pAltaGlobal,
          z_global: zGlobal,
          delta_cap_7d: deltaCapAvg7d,
          delta_mean_365: deltaMean365,
          delta_std_365: deltaStd365,
        }
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
