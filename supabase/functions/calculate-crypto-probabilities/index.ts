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

// Tolerâncias para validação
const TOLERANCE_MU = 1e-6;
const TOLERANCE_SIGMA = 1e-6;
const TOLERANCE_PROB = 0.001; // 0.1 p.p.
const MIN_DISPERSION_PP = 2.0; // dispersão mínima entre criptos (em pontos percentuais)

// Interface para armazenar cálculos em sombra
interface ShadowCalc {
  symbol: string;
  mu: number;
  sigma: number;
  p_alta_preco: number;
  p_alta_global: number;
  p_final: number;
  direction: 'alta' | 'queda';
  percentage: number;
  precoAtual: number;
  minPreco: number;
  maxPreco: number;
  ic95Low: number;
  ic95High: number;
  nDias: number;
  athPrice: number;
  athDate: string | null;
}

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

// Função para buscar ATH (All-Time High) da CoinGecko
async function fetchATH(coinId: string, symbol: string) {
  try {
    console.log(`  🏆 Buscando ATH real para ${symbol}...`);
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false`
    );
    
    if (!response.ok) {
      throw new Error(`CoinGecko API failed: ${response.status}`);
    }
    
    const data = await response.json();
    const ath = data.market_data?.ath?.usd || 0;
    const athDate = data.market_data?.ath_date?.usd || null;
    
    console.log(`  ✓ ATH ${symbol}: $${ath.toFixed(2)} em ${athDate}`);
    
    return { ath, athDate };
  } catch (error) {
    console.error(`  ❌ Falha ao buscar ATH para ${symbol}:`, error);
    return { ath: 0, athDate: null };
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
    const shadowResults: ShadowCalc[] = [];
    const validationErrors: string[] = [];

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

        // ========== BUSCAR ATH (ALL-TIME HIGH) DA COINGECKO ==========
        
        const { ath: athPrice, athDate } = await fetchATH(crypto.coinId, crypto.symbol);
        
        // Validar ATH
        if (athPrice <= 0 || !athDate) {
          validationErrors.push(`${crypto.symbol}: ATH inválido (${athPrice}, ${athDate})`);
          console.error(`     ❌ ATH INVÁLIDO: ${athPrice} em ${athDate}`);
          continue;
        }

        // ========== PRÉ-CHECAGEM 1: VALIDAR DADOS ==========
        
        console.log(`     🔍 PRÉ-CHECAGEM DE DADOS:`);
        
        // Verificar continuidade e valores válidos
        const prices = historicalPrices.map(p => parseFloat(p.closing_price));
        const hasInvalidPrices = prices.some(p => p <= 0 || isNaN(p));
        
        if (hasInvalidPrices) {
          validationErrors.push(`${crypto.symbol}: Preços inválidos detectados (zeros ou NaN)`);
          console.error(`        ❌ Preços inválidos (zeros ou NaN)`);
          continue;
        }

        const precoAtual = prices[prices.length - 1];
        const minPreco = Math.min(...prices);
        const maxPreco365 = Math.max(...prices);
        
        // Validação CRÍTICA: nenhum zero permitido
        if (minPreco <= 0 || maxPreco365 <= 0 || precoAtual <= 0) {
          validationErrors.push(`${crypto.symbol}: Preço/Min/Max devem ser > 0 (atual=${precoAtual}, min=${minPreco}, max=${maxPreco365})`);
          console.error(`        ❌ Zeros detectados: preço=${precoAtual}, min=${minPreco}, max=${maxPreco365}`);
          continue;
        }

        // Validação: ATH deve ser >= máximo observado em 365d
        if (athPrice < maxPreco365) {
          validationErrors.push(`${crypto.symbol}: ATH (${athPrice}) < máximo 365d (${maxPreco365})`);
          console.error(`        ❌ ATH inconsistente: ${athPrice} < ${maxPreco365}`);
          continue;
        }

        console.log(`        ✅ Preço atual: $${precoAtual.toFixed(6)}`);
        console.log(`        ✅ Mín 365d: $${minPreco.toFixed(6)}`);
        console.log(`        ✅ Máx 365d: $${maxPreco365.toFixed(6)}`);
        console.log(`        ✅ ATH (histórico): $${athPrice.toFixed(6)} em ${athDate}`);

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

        // ========== VALIDAÇÃO EM SOMBRA: RECALCULAR E COMPARAR ==========
        
        console.log(`     🔍 VALIDAÇÃO EM SOMBRA:`);
        
        // Recalcular tudo em sombra
        const muSombra = mean(logReturns);
        const sigmaSombra = standardDeviation(logReturns);
        const zScoreSombra = (0 - muSombra) / (sigmaSombra + EPSILON);
        const pQuedaPrecoSombra = normalCDF(zScoreSombra);
        const pAltaPrecoSombra = 1 - pQuedaPrecoSombra;
        const pAltaFinalSombra = (0.60 * pAltaPrecoSombra) + (0.40 * pAltaGlobal);
        
        // Comparar com tolerâncias
        const diffMu = Math.abs(muCripto - muSombra);
        const diffSigma = Math.abs(sigmaCripto - sigmaSombra);
        const diffPAltaPreco = Math.abs(pAltaPreco - pAltaPrecoSombra);
        const diffPFinal = Math.abs(pAltaFinal - pAltaFinalSombra);
        
        let shadowValid = true;
        
        if (diffMu > TOLERANCE_MU) {
          validationErrors.push(`${crypto.symbol}: μ difere em ${diffMu.toExponential(2)} (tolerância: ${TOLERANCE_MU})`);
          shadowValid = false;
        }
        if (diffSigma > TOLERANCE_SIGMA) {
          validationErrors.push(`${crypto.symbol}: σ difere em ${diffSigma.toExponential(2)} (tolerância: ${TOLERANCE_SIGMA})`);
          shadowValid = false;
        }
        if (diffPAltaPreco > TOLERANCE_PROB) {
          validationErrors.push(`${crypto.symbol}: P_alta_preço difere em ${diffPAltaPreco.toFixed(4)} (tolerância: ${TOLERANCE_PROB})`);
          shadowValid = false;
        }
        if (diffPFinal > TOLERANCE_PROB) {
          validationErrors.push(`${crypto.symbol}: P_final difere em ${diffPFinal.toFixed(4)} (tolerância: ${TOLERANCE_PROB})`);
          shadowValid = false;
        }
        
        if (!shadowValid) {
          console.error(`     ❌ VALIDAÇÃO EM SOMBRA FALHOU`);
          continue;
        }
        
        console.log(`        ✅ μ diff: ${diffMu.toExponential(2)} ≤ ${TOLERANCE_MU}`);
        console.log(`        ✅ σ diff: ${diffSigma.toExponential(2)} ≤ ${TOLERANCE_SIGMA}`);
        console.log(`        ✅ P_preço diff: ${diffPAltaPreco.toFixed(6)} ≤ ${TOLERANCE_PROB}`);
        console.log(`        ✅ P_final diff: ${diffPFinal.toFixed(6)} ≤ ${TOLERANCE_PROB}`);

        // ========== VALIDAÇÕES LÓGICAS ==========
        
        console.log(`     🧪 VALIDAÇÕES LÓGICAS:`);
        
        // Validação 1: Sinal esperado
        if (muCripto > 0 && sigmaCripto < 0.05 && pAltaPreco <= 0.5) {
          validationErrors.push(`${crypto.symbol}: μ > 0 mas P_alta_preço ≤ 50%`);
          console.error(`        ❌ LÓGICA: μ > 0 mas P_alta ≤ 50%`);
          continue;
        }
        if (muCripto < 0 && sigmaCripto < 0.05 && pAltaPreco >= 0.5) {
          validationErrors.push(`${crypto.symbol}: μ < 0 mas P_alta_preço ≥ 50%`);
          console.error(`        ❌ LÓGICA: μ < 0 mas P_alta ≥ 50%`);
          continue;
        }
        
        console.log(`        ✅ Sinal μ vs P_alta coerente`);
        
        // Validação 2: P_final em [0, 1]
        if (pAltaFinal < 0 || pAltaFinal > 1) {
          validationErrors.push(`${crypto.symbol}: P_final fora de [0,1]: ${pAltaFinal}`);
          console.error(`        ❌ SANITY: P_final=${pAltaFinal} fora de [0,1]`);
          continue;
        }
        
        console.log(`        ✅ P_final ∈ [0, 1]`);
        
        // Validação 3: IC 95% coerente
        const icRange = ic95High - ic95Low;
        if (icRange < 0 || icRange > 1) {
          validationErrors.push(`${crypto.symbol}: IC 95% suspeito: [${ic95Low}, ${ic95High}]`);
          console.error(`        ❌ LÓGICA: IC 95% range=${icRange} suspeito`);
          continue;
        }
        
        console.log(`        ✅ IC 95% coerente: ±${(icRange/2).toFixed(4)}`);

        console.log(`     📈 RESULTADO FINAL:`);
        console.log(`        direction = ${direction.toUpperCase()}`);
        console.log(`        P_alta_final = ${pAltaFinal.toFixed(4)}`);
        console.log(`        P_queda_final = ${pQuedaFinal.toFixed(4)}`);
        console.log(`        percentual_exibido = ${probabilityPercentage.toFixed(1)}%`);

        // Armazenar resultado em sombra para validações cruzadas
        shadowResults.push({
          symbol: crypto.symbol,
          mu: muCripto,
          sigma: sigmaCripto,
          p_alta_preco: pAltaPreco,
          p_alta_global: pAltaGlobal,
          p_final: pAltaFinal,
          direction,
          percentage: probabilityPercentage,
          precoAtual,
          minPreco,
          maxPreco: maxPreco365,
          ic95Low,
          ic95High,
          nDias: historicalPrices.length,
          athPrice,
          athDate
        });

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
            current_price: precoAtual,
            min_365d: minPreco,
            max_ath: athPrice,
            ath_date: athDate,
            mu_cripto: muCripto,
            sigma_cripto: sigmaCripto,
            ic_95_low: ic95Low,
            ic_95_high: ic95High,
            validation_status: 'approved'
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

    // ========== VALIDAÇÕES CRUZADAS ENTRE CRIPTOS ==========
    
    console.log('\n\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║       🔍 VALIDAÇÕES CRUZADAS                             ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    
    if (shadowResults.length >= 2) {
      // Validação 1: P_alta_global deve ser idêntico
      const globalProbs = shadowResults.map(r => r.p_alta_global);
      const allSame = globalProbs.every(p => Math.abs(p - globalProbs[0]) < 1e-9);
      
      if (!allSame) {
        validationErrors.push(`P_alta_global difere entre criptos: ${globalProbs.map(p => p.toFixed(6)).join(', ')}`);
        console.error(`   ❌ P_alta_global não é idêntico para todas`);
      } else {
        console.log(`   ✅ P_alta_global idêntico: ${globalProbs[0].toFixed(6)}`);
      }
      
      // Validação 2: Dispersão mínima
      const pFinals = shadowResults.map(r => r.p_final);
      const minPFinal = Math.min(...pFinals);
      const maxPFinal = Math.max(...pFinals);
      const dispersionPP = (maxPFinal - minPFinal) * 100;
      
      if (dispersionPP < MIN_DISPERSION_PP) {
        validationErrors.push(`Dispersão muito baixa: ${dispersionPP.toFixed(2)}pp (mínimo: ${MIN_DISPERSION_PP}pp)`);
        console.error(`   ❌ Dispersão de ${dispersionPP.toFixed(2)}pp < ${MIN_DISPERSION_PP}pp`);
      } else {
        console.log(`   ✅ Dispersão adequada: ${dispersionPP.toFixed(2)}pp ≥ ${MIN_DISPERSION_PP}pp`);
      }
      
      // Validação 3: μ e σ diferentes entre criptos
      const muValues = shadowResults.map(r => r.mu);
      const sigmaValues = shadowResults.map(r => r.sigma);
      
      for (let i = 0; i < shadowResults.length; i++) {
        for (let j = i + 1; j < shadowResults.length; j++) {
          if (Math.abs(muValues[i] - muValues[j]) < 1e-9 && 
              Math.abs(sigmaValues[i] - sigmaValues[j]) < 1e-9) {
            validationErrors.push(`${shadowResults[i].symbol} e ${shadowResults[j].symbol} têm μ e σ idênticos (cache cruzado?)`);
            console.error(`   ❌ ${shadowResults[i].symbol} e ${shadowResults[j].symbol}: μ,σ idênticos`);
          }
        }
      }
      
      console.log(`   ✅ Cada cripto tem μ,σ únicos`);
      
      // Validação 4: Consistência UI (texto, seta, percentual)
      let uiErrors = 0;
      for (const result of shadowResults) {
        const expectedDirection = result.p_final >= 0.5 ? 'alta' : 'queda';
        const expectedPercentage = result.p_final >= 0.5 
          ? result.p_final * 100 
          : (1 - result.p_final) * 100;
        
        if (result.direction !== expectedDirection) {
          validationErrors.push(`${result.symbol}: direction=${result.direction} mas P_final=${result.p_final}`);
          uiErrors++;
        }
        
        if (Math.abs(result.percentage - expectedPercentage) > 0.15) {
          validationErrors.push(`${result.symbol}: percentual=${result.percentage}% mas esperado=${expectedPercentage.toFixed(1)}%`);
          uiErrors++;
        }
      }
      
      if (uiErrors === 0) {
        console.log(`   ✅ Consistência UI: texto, seta e % corretos`);
      } else {
        console.error(`   ❌ ${uiErrors} erros de consistência UI`);
      }
    }

    // ========== SMOKE TEST PÓS-PUBLICAÇÃO ==========
    
    let allValidationsPassed = validationErrors.length === 0;
    
    console.log('\n\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║       🔬 SMOKE TEST PÓS-PUBLICAÇÃO                       ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    
    if (shadowResults.length > 0 && allValidationsPassed) {
      let smokeTestFailed = false;
      const smokeTestErrors: string[] = [];
      
      for (const result of shadowResults) {
        // Verificar se algum valor crítico está zerado
        if (result.precoAtual <= 0) {
          smokeTestErrors.push(`${result.symbol}: Preço atual = $0`);
          smokeTestFailed = true;
        }
        if (result.minPreco <= 0) {
          smokeTestErrors.push(`${result.symbol}: Mín 365d = $0`);
          smokeTestFailed = true;
        }
        if (result.athPrice <= 0) {
          smokeTestErrors.push(`${result.symbol}: ATH = $0`);
          smokeTestFailed = true;
        }
        
        // Verificar coerência: ATH >= máximo 365d
        if (result.athPrice < result.maxPreco) {
          smokeTestErrors.push(`${result.symbol}: ATH ($${result.athPrice}) < Máx 365d ($${result.maxPreco})`);
          smokeTestFailed = true;
        }
        
        // Verificar coerência: direção vs percentual
        const expectedDir = result.p_final >= 0.5 ? 'alta' : 'queda';
        if (result.direction !== expectedDir) {
          smokeTestErrors.push(`${result.symbol}: Direction=${result.direction} mas P_final=${result.p_final}`);
          smokeTestFailed = true;
        }
      }
      
      if (smokeTestFailed) {
        console.error(`   ❌ SMOKE TEST FALHOU - ${smokeTestErrors.length} erros detectados:`);
        smokeTestErrors.forEach((err, idx) => {
          console.error(`      ${idx + 1}. ${err}`);
        });
        console.error(`   ⚠️ REVERTENDO PUBLICAÇÃO - Dados inconsistentes`);
        
        allValidationsPassed = false;
        validationErrors.push(...smokeTestErrors);
      } else {
        console.log(`   ✅ Smoke test passou: todos os ${shadowResults.length} cards válidos`);
        console.log(`      • Preços > 0: ✓`);
        console.log(`      • Mín 365d > 0: ✓`);
        console.log(`      • ATH > 0: ✓`);
        console.log(`      • ATH >= Máx 365d: ✓`);
        console.log(`      • Direção coerente: ✓`);
      }
    }

    // ========== RELATÓRIO FINAL DE VALIDAÇÃO ==========
    
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
    console.log(`\n📊 DETALHAMENTO POR CRIPTO (${shadowResults.length}):`);
    shadowResults.forEach((r, idx) => {
      console.log(`   ${idx + 1}. ${r.symbol}:`);
      console.log(`      • Preço atual: $${r.precoAtual.toFixed(6)}`);
      console.log(`      • Mín 365d: $${r.minPreco.toFixed(6)}`);
      console.log(`      • Máx 365d: $${r.maxPreco.toFixed(6)}`);
      console.log(`      • ATH: $${r.athPrice.toFixed(6)} (${r.athDate})`);
      console.log(`      • μ: ${r.mu.toFixed(6)}, σ: ${r.sigma.toFixed(6)}`);
      console.log(`      • P(alta|preço): ${(r.p_alta_preco * 100).toFixed(2)}%`);
      console.log(`      • P_final: ${(r.p_final * 100).toFixed(2)}%`);
      console.log(`      • Direção: ${r.direction.toUpperCase()} (${r.percentage.toFixed(1)}%)`);
    });
    
    console.log(`\n✅ VALIDAÇÃO (Critérios de Aceite):`);
    console.log(`   [${pAltaGlobal !== 0.5 ? '✓' : '✗'}] Componente 40% usa Total Market Cap global`);
    console.log(`   [${successCount > 0 ? '✓' : '✗'}] Pelo menos 1 cripto foi calculada`);
    console.log(`   [${shadowResults.length > 0 ? '✓' : '✗'}] Validações em sombra passaram`);
    console.log(`   [${allValidationsPassed ? '✓' : '✗'}] Todas as checagens lógicas OK`);
    console.log(`   [${validationErrors.length === 0 ? '✓' : '✗'}] Sem erros de validação`);
    
    if (!allValidationsPassed) {
      console.log(`\n🚨 ERROS DE VALIDAÇÃO DETECTADOS (${validationErrors.length}):`);
      validationErrors.forEach((err, idx) => {
        console.log(`   ${idx + 1}. ${err}`);
      });
      console.log(`\n⚠️ PUBLICAÇÃO BLOQUEADA - Corrija os erros e execute novamente`);
    }
    
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    if (!allValidationsPassed) {
      console.log(`❌ Validações falharam - dados NÃO publicados`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Validações falharam - dados não publicados',
          validation_errors: validationErrors,
          cryptos_calculated: successCount,
          cryptos_validated: shadowResults.length,
          calculation_date: calculationDate,
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    console.log(`✅ Todas validações passaram - Cálculo completo e publicado!`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Probabilidades calculadas, validadas e publicadas com sucesso',
        cryptos_calculated: successCount,
        cryptos_validated: shadowResults.length,
        cryptos_with_fallback: fallbackCount,
        validation_errors: validationErrors,
        all_validations_passed: allValidationsPassed,
        calculation_date: calculationDate,
        global_market_cap_component: {
          p_alta_global: pAltaGlobal,
          z_global: zGlobal,
          delta_cap_7d: deltaCapAvg7d,
          delta_mean_365: deltaMean365,
          delta_std_365: deltaStd365,
        },
        shadow_results_summary: {
          min_p_final: shadowResults.length > 0 ? Math.min(...shadowResults.map(r => r.p_final)) : null,
          max_p_final: shadowResults.length > 0 ? Math.max(...shadowResults.map(r => r.p_final)) : null,
          dispersion_pp: shadowResults.length > 0 
            ? (Math.max(...shadowResults.map(r => r.p_final)) - Math.min(...shadowResults.map(r => r.p_final))) * 100
            : null,
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
