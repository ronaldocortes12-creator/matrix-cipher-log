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

        if (priceError || !priceData || priceData.length < 30) {
          console.error(`❌ Dados insuficientes para ${crypto.symbol}`);
          continue;
        }

        console.log(`  ✓ ${priceData.length} dias de histórico de preços`);

        // Calcular retornos logarítmicos diários
        const logReturns: number[] = [];
        for (let i = 1; i < priceData.length; i++) {
          const prevPrice = parseFloat(priceData[i - 1].closing_price);
          const currPrice = parseFloat(priceData[i].closing_price);
          if (prevPrice > 0 && currPrice > 0) {
            const logReturn = Math.log(currPrice / prevPrice);
            logReturns.push(logReturn);
          }
        }

        if (logReturns.length === 0) {
          console.error(`❌ Não foi possível calcular retornos para ${crypto.symbol}`);
          continue;
        }

        // Calcular média e desvio padrão dos retornos
        const mu = mean(logReturns);
        const sigma = standardDeviation(logReturns);

        console.log(`  μ = ${mu.toFixed(6)}, σ = ${sigma.toFixed(6)}`);

        // Calcular probabilidade de queda baseada em preço (distribuição normal)
        const zScore = (0 - mu) / (sigma + EPSILON);
        const pQuedaPreco = normalCDF(zScore);
        const pAltaPreco = 1 - pQuedaPreco;

        console.log(`  P(alta|preço) = ${(pAltaPreco * 100).toFixed(2)}%`);

        // ========== ETAPA 2: COMPONENTE DE MARKET CAP (40%) ==========
        
        // Buscar últimos 7 dias de market cap
        const { data: mcapData, error: mcapError } = await supabase
          .from('crypto_market_cap')
          .select('date, market_cap')
          .eq('symbol', crypto.symbol)
          .order('date', { ascending: false })
          .limit(7);

        let pAltaMcap = 0.5; // Default neutro se não houver dados suficientes

        if (!mcapError && mcapData && mcapData.length >= 2) {
          console.log(`  ✓ ${mcapData.length} dias de market cap`);

          // Calcular variações percentuais diárias
          const mcapChanges: number[] = [];
          for (let i = 0; i < mcapData.length - 1; i++) {
            const current = parseFloat(mcapData[i].market_cap);
            const previous = parseFloat(mcapData[i + 1].market_cap);
            if (previous > 0) {
              const percentChange = (current - previous) / previous;
              mcapChanges.push(percentChange);
            }
          }

          if (mcapChanges.length > 0) {
            // Calcular média e desvio padrão das variações
            const deltaMean = mean(mcapChanges);
            const deltaStd = standardDeviation(mcapChanges);

            // Calcular z-score da variação mais recente
            const recentChange = mcapChanges[0];
            const zCap = deltaStd > EPSILON ? (recentChange - deltaMean) / deltaStd : 0;

            // Converter z-score em probabilidade usando função sigmoide
            pAltaMcap = 1 / (1 + Math.exp(-zCap));

            console.log(`  P(alta|mcap) = ${(pAltaMcap * 100).toFixed(2)}%`);
          }
        } else {
          console.log(`  ⚠️ Dados de market cap insuficientes, usando neutro (50%)`);
        }

        // ========== ETAPA 3: COMBINAÇÃO FINAL (60% preço + 40% market cap) ==========
        
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

        console.log(`  📈 Resultado: ${direction.toUpperCase()} ${probabilityPercentage.toFixed(1)}%`);

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
          console.error(`❌ Erro ao salvar ${crypto.symbol}:`, insertError);
        } else {
          console.log(`  ✅ ${crypto.symbol} salvo com sucesso`);
        }

        // Pequeno delay entre processamentos
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`❌ Erro processando ${crypto.symbol}:`, error);
      }
    }

    console.log('\n✅ Cálculo de probabilidades completo!');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Probabilidades calculadas com sucesso',
        cryptos_calculated: CRYPTOS.length,
        calculation_date: calculationDate,
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
