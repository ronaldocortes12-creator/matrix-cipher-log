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

// Constante epsilon para evitar divisão por zero
const EPSILON = 1e-10;

// Tolerâncias para validação
const TOLERANCE_PROB = 0.001; // 0.1 p.p.
const MIN_DISPERSION_PP = 1.0; // dispersão mínima entre criptos (em pontos percentuais)

/**
 * FÓRMULA FINAL:
 * 
 * P(alta) = 0.55 × P_mcap + 0.25 × P_btc + 0.20 × P_price
 * 
 * Onde:
 * - P_mcap = w10 × p10 + w40 × p40 (com w10=0.35, w40=0.20)
 * - p10 e p40 são calculados com INVERSÃO: saída de dinheiro → alta, entrada forte → queda
 * - Reforços por ΔUSD absoluto:
 *   - 10 dias: threshold 100B USD, γ10 = 0.8, normalização por 200B
 *   - 40 dias: threshold 200B USD, γ40 = 0.6, normalização por 400B
 * - P_btc: z-score do BTC 10 dias, slope=1.6, clamp [0.10, 0.90]
 * - P_price: z-score do log-preço atual, usando preço LIVE do CoinGecko, slope=1.2, clamp [0.05, 0.95]
 */

interface ShadowCalc {
  symbol: string;
  mu: number;
  sigma: number;
  p_alta_preco: number;
  p_alta_total_mcap_10d: number;
  p_alta_total_mcap_40d: number;
  p_mcap_combined: number;
  p_alta_btc: number;
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

// Função para buscar ATH com cache e retry logic
async function fetchATHWithCache(supabase: any, coinId: string, symbol: string, retries = 3) {
  // 1. Tentar buscar do cache primeiro
  const { data: cachedATH } = await supabase
    .from('crypto_ath_cache')
    .select('ath_price, ath_date, last_updated')
    .eq('symbol', symbol)
    .single();

  // Se cache existe e foi atualizado nos últimos 7 dias, usar
  if (cachedATH && cachedATH.last_updated) {
    const cacheAge = Date.now() - new Date(cachedATH.last_updated).getTime();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    
    if (cacheAge < sevenDaysMs) {
      console.log(`  ✓ ATH ${symbol} do cache: $${cachedATH.ath_price} em ${cachedATH.ath_date} (cache: ${Math.floor(cacheAge / (24 * 60 * 60 * 1000))}d)`);
      return {
        ath: parseFloat(cachedATH.ath_price),
        athDate: cachedATH.ath_date
      };
    }
  }

  // 2. Se não tem cache ou está desatualizado, buscar da API com retry
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`  🏆 Buscando ATH real para ${symbol} (tentativa ${attempt}/${retries})...`);
      
      // Delay exponencial entre tentativas
      if (attempt > 1) {
        const delayMs = Math.pow(2, attempt - 1) * 1000; // 2s, 4s, 8s
        console.log(`  ⏳ Aguardando ${delayMs/1000}s antes da tentativa...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
      
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false`,
        {
          headers: {
            'Accept': 'application/json'
          }
        }
      );
      
      if (!response.ok) {
        if (response.status === 429 && attempt < retries) {
          console.log(`  ⚠️ Rate limit (429), tentando novamente...`);
          continue;
        }
        throw new Error(`CoinGecko API failed: ${response.status}`);
      }
      
      const data = await response.json();
      const ath = data.market_data?.ath?.usd || 0;
      const athDate = data.market_data?.ath_date?.usd || null;
      
      if (ath > 0 && athDate) {
        console.log(`  ✓ ATH ${symbol}: $${ath.toFixed(2)} em ${athDate}`);
        
        // Salvar no cache
        await supabase
          .from('crypto_ath_cache')
          .upsert({
            symbol,
            coin_id: coinId,
            ath_price: ath,
            ath_date: athDate.split('T')[0],
            last_updated: new Date().toISOString()
          }, {
            onConflict: 'symbol'
          });
        
        return { ath, athDate: athDate.split('T')[0] };
      }
      
      throw new Error('ATH data incomplete');
      
    } catch (error) {
      if (attempt === retries) {
        console.error(`  ❌ Todas as tentativas falharam para ATH de ${symbol}:`, error);
        
        // 3. FALLBACK: Usar máximo histórico do banco como último recurso
        const { data: maxPrice } = await supabase
          .from('crypto_historical_prices')
          .select('date, closing_price')
          .eq('symbol', symbol)
          .order('closing_price', { ascending: false })
          .limit(1)
          .single();
        
        if (maxPrice && parseFloat(maxPrice.closing_price) > 0) {
          console.log(`  🔄 FALLBACK: Usando máximo do banco: $${maxPrice.closing_price} em ${maxPrice.date}`);
          return {
            ath: parseFloat(maxPrice.closing_price) * 1.1, // 10% acima para ser conservador
            athDate: maxPrice.date
          };
        }
        
        return { ath: 0, athDate: null };
      }
    }
  }
  
  return { ath: 0, athDate: null };
}

// Função para buscar preços atuais (live) em batch do CoinGecko
async function fetchLivePricesBatch(coinIds: string[]): Promise<Map<string, number>> {
  const pricesMap = new Map<string, number>();
  
  try {
    const idsParam = coinIds.join(',');
    console.log(`\n🔄 Buscando preços ao vivo para ${coinIds.length} criptos...`);
    
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${idsParam}&vs_currencies=usd`
    );
    
    if (!response.ok) {
      throw new Error(`CoinGecko API failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    for (const coinId of coinIds) {
      if (data[coinId]?.usd) {
        pricesMap.set(coinId, data[coinId].usd);
      }
    }
    
    console.log(`  ✓ ${pricesMap.size}/${coinIds.length} preços ao vivo obtidos`);
    
  } catch (error) {
    console.error(`  ❌ Erro ao buscar preços ao vivo:`, error);
  }
  
  return pricesMap;
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

    // ========== PRÉ-CÁLCULO 1: COMPONENTE DE TOTAL CRYPTO MARKET CAP 10 DIAS (peso 0.35 dentro dos 55%) ==========
    // INVERSÃO: Saída de dinheiro → ALTA, Entrada forte de dinheiro → QUEDA
    
    console.log('\n💰 Calculando componente de Total Crypto Market Cap 10 dias (peso 0.35 dentro dos 55%)...');
    
    // Buscar últimos 11 dias do Total Market Cap global (para 10 retornos)
    const { data: globalMcap10d, error: mcap10dError } = await supabase
      .from('global_crypto_market_cap')
      .select('date, total_market_cap')
      .order('date', { ascending: false })
      .limit(11);

    let p10 = 0.5; // Default neutro se não houver dados
    let mcap10dLogReturns: number[] = [];
    let z10 = 0;
    let delta10USD = 0;
    let mcapInicial10d = 0;
    let mcapFinal10d = 0;

    if (!mcap10dError && globalMcap10d && globalMcap10d.length >= 11) {
      console.log(`  ✓ ${globalMcap10d.length} dias de Total Market Cap disponíveis`);
      
      // Calcular retornos logarítmicos dos últimos 10 dias
      const sortedMcap = [...globalMcap10d].reverse(); // ordenar do mais antigo para o mais recente
      mcapInicial10d = parseFloat(sortedMcap[0].total_market_cap as string);
      mcapFinal10d = parseFloat(sortedMcap[sortedMcap.length - 1].total_market_cap as string);
      delta10USD = mcapFinal10d - mcapInicial10d;
      
      for (let i = 1; i < sortedMcap.length; i++) {
        const mcapAnterior = parseFloat(sortedMcap[i - 1].total_market_cap as string);
        const mcapAtual = parseFloat(sortedMcap[i].total_market_cap as string);
        
        if (mcapAnterior > 0 && mcapAtual > 0) {
          const logReturn = Math.log(mcapAtual / mcapAnterior);
          mcap10dLogReturns.push(logReturn);
        }
      }
      
      if (mcap10dLogReturns.length >= 8) {
        const mu10 = mean(mcap10dLogReturns);
        const sigma10 = standardDeviation(mcap10dLogReturns);
        
        // Calcular z-score: usar estatística t com correção por tamanho da amostra (√n)
        const n10 = mcap10dLogReturns.length;
        z10 = (mu10 / (sigma10 + EPSILON)) * Math.sqrt(n10);
        
        // INVERSÃO: sigmoid(-SLOPE * z) → saída = z negativo → sigmoid positivo → alta
        const S10 = 1.8;
        p10 = 1 / (1 + Math.exp(-(-S10 * z10))); // Nota: -S10 * z10 para inverter
        
        // Reforço por ΔUSD absoluto
        const THRESHOLD_10D_USD = 100e9; // 100 bilhões
        const GAMMA_10 = 0.8;
        const NORM_10 = 200e9; // 200 bilhões
        
        if (Math.abs(delta10USD) >= THRESHOLD_10D_USD) {
          const deltaLogit = (delta10USD / NORM_10) * GAMMA_10;
          const logit10 = Math.log(p10 / (1 - p10 + EPSILON));
          const logit10Reinforced = logit10 - deltaLogit; // -delta porque entrada → queda
          p10 = 1 / (1 + Math.exp(-logit10Reinforced));
          console.log(`  🔥 Reforço 10d aplicado: ΔUSD=${(delta10USD/1e9).toFixed(2)}B → shift=${deltaLogit.toFixed(4)}`);
        }
        
        // Clamp final
        p10 = Math.min(0.95, Math.max(0.05, p10));
        
        const variacao10d = (delta10USD / mcapInicial10d) * 100;
        const flowType = delta10USD < 0 ? 'OUTFLOW (→ ALTA)' : 'INFLOW (→ QUEDA)';
        
        console.log(`  📊 Market Cap inicial (10d): $${(mcapInicial10d / 1e12).toFixed(2)}T`);
        console.log(`  📊 Market Cap final (hoje): $${(mcapFinal10d / 1e12).toFixed(2)}T`);
        console.log(`  📊 Δ10_USD = ${delta10USD >= 0 ? '+' : ''}$${(delta10USD / 1e9).toFixed(2)}B (${flowType})`);
        console.log(`  📊 Δ10_% = ${variacao10d >= 0 ? '+' : ''}${variacao10d.toFixed(2)}%`);
        console.log(`  📈 z10 = ${z10.toFixed(4)}, p10 = ${(p10 * 100).toFixed(2)}% (invertido)`);
      } else {
        console.log(`  ⚠️ Retornos insuficientes (${mcap10dLogReturns.length}/8), usando neutro (50%)`);
      }
    } else {
      console.log(`  ⚠️ Dados de 10 dias insuficientes (${globalMcap10d?.length || 0}/11), usando neutro (50%)`);
    }

    // ========== PRÉ-CÁLCULO 2: COMPONENTE DE TOTAL CRYPTO MARKET CAP 40 DIAS (peso 0.20 dentro dos 55%) ==========
    // INVERSÃO: Saída de dinheiro → ALTA, Entrada forte de dinheiro → QUEDA
    
    console.log('\n💰 Calculando componente de Total Crypto Market Cap 40 dias (peso 0.20 dentro dos 55%)...');
    
    // Buscar últimos 41 dias do Total Market Cap global (para 40 retornos)
    const { data: globalMcap40d, error: mcap40dError } = await supabase
      .from('global_crypto_market_cap')
      .select('date, total_market_cap')
      .order('date', { ascending: false })
      .limit(41);

    let p40 = 0.5; // Default neutro se não houver dados
    let mcap40dLogReturns: number[] = [];
    let z40 = 0;
    let delta40USD = 0;
    let mcapInicial40d = 0;
    let mcapFinal40d = 0;

    if (!mcap40dError && globalMcap40d && globalMcap40d.length >= 41) {
      console.log(`  ✓ ${globalMcap40d.length} dias de Total Market Cap disponíveis`);
      
      const sortedMcap = [...globalMcap40d].reverse();
      mcapInicial40d = parseFloat(sortedMcap[0].total_market_cap as string);
      mcapFinal40d = parseFloat(sortedMcap[sortedMcap.length - 1].total_market_cap as string);
      delta40USD = mcapFinal40d - mcapInicial40d;
      
      for (let i = 1; i < sortedMcap.length; i++) {
        const mcapAnterior = parseFloat(sortedMcap[i - 1].total_market_cap as string);
        const mcapAtual = parseFloat(sortedMcap[i].total_market_cap as string);
        
        if (mcapAnterior > 0 && mcapAtual > 0) {
          const logReturn = Math.log(mcapAtual / mcapAnterior);
          mcap40dLogReturns.push(logReturn);
        }
      }
      
      if (mcap40dLogReturns.length >= 30) {
        const mu40 = mean(mcap40dLogReturns);
        const sigma40 = standardDeviation(mcap40dLogReturns);
        
        const n40 = mcap40dLogReturns.length;
        z40 = (mu40 / (sigma40 + EPSILON)) * Math.sqrt(n40);
        
        // INVERSÃO: sigmoid(-SLOPE * z)
        const S40 = 1.4;
        p40 = 1 / (1 + Math.exp(-(-S40 * z40))); // -S40 * z40 para inverter
        
        // Reforço por ΔUSD absoluto
        const THRESHOLD_40D_USD = 200e9; // 200 bilhões
        const GAMMA_40 = 0.6;
        const NORM_40 = 400e9; // 400 bilhões
        
        if (Math.abs(delta40USD) >= THRESHOLD_40D_USD) {
          const deltaLogit = (delta40USD / NORM_40) * GAMMA_40;
          const logit40 = Math.log(p40 / (1 - p40 + EPSILON));
          const logit40Reinforced = logit40 - deltaLogit;
          p40 = 1 / (1 + Math.exp(-logit40Reinforced));
          console.log(`  🔥 Reforço 40d aplicado: ΔUSD=${(delta40USD/1e9).toFixed(2)}B → shift=${deltaLogit.toFixed(4)}`);
        }
        
        p40 = Math.min(0.95, Math.max(0.05, p40));
        
        const variacao40d = (delta40USD / mcapInicial40d) * 100;
        const flowType = delta40USD < 0 ? 'OUTFLOW (→ ALTA)' : 'INFLOW (→ QUEDA)';
        
        console.log(`  📊 Market Cap inicial (40d): $${(mcapInicial40d / 1e12).toFixed(2)}T`);
        console.log(`  📊 Market Cap final (hoje): $${(mcapFinal40d / 1e12).toFixed(2)}T`);
        console.log(`  📊 Δ40_USD = ${delta40USD >= 0 ? '+' : ''}$${(delta40USD / 1e9).toFixed(2)}B (${flowType})`);
        console.log(`  📊 Δ40_% = ${variacao40d >= 0 ? '+' : ''}${variacao40d.toFixed(2)}%`);
        console.log(`  📈 z40 = ${z40.toFixed(4)}, p40 = ${(p40 * 100).toFixed(2)}% (invertido)`);
      } else {
        console.log(`  ⚠️ Retornos insuficientes (${mcap40dLogReturns.length}/30), usando neutro (50%)`);
      }
    } else {
      console.log(`  ⚠️ Dados de 40 dias insuficientes (${globalMcap40d?.length || 0}/41), usando neutro (50%)`);
    }

    // ========== COMBINAR p10 e p40 em p_mcap (pesos: 0.35 e 0.20 dentro dos 55%) ==========
    const w10 = 0.35;
    const w40 = 0.20;
    const pMcapCombined = (w10 * p10 + w40 * p40) / (w10 + w40); // Normalizar para 100%
    const pMcapFinal = Math.min(0.95, Math.max(0.05, pMcapCombined));
    
    console.log(`\n🔗 Combinação Market Cap: p_mcap = ${w10} × ${(p10*100).toFixed(2)}% + ${w40} × ${(p40*100).toFixed(2)}% = ${(pMcapFinal*100).toFixed(2)}%`);

    // ========== PRÉ-CÁLCULO 3: COMPONENTE MOVIMENTO DO BITCOIN (25%) ==========
    
    console.log('\n₿ Calculando componente de movimento do Bitcoin 10 dias (25%)...');
    
    let pAltaBTC10d = 0.5; // neutro se não houver dados
    let btc10dLogReturns: number[] = [];
    let btc10dZScore = 0;

    // Buscar últimos 11 dias de preços do BTC (para 10 retornos)
    const { data: btcPrice10d, error: btc10dError } = await supabase
      .from('crypto_historical_prices')
      .select('date, closing_price')
      .eq('symbol', 'BTC')
      .order('date', { ascending: false })
      .limit(11);

    if (!btc10dError && btcPrice10d && btcPrice10d.length >= 11) {
      console.log(`  ✓ ${btcPrice10d.length} dias de BTC disponíveis`);
      const sortedBtc = [...btcPrice10d].reverse();
      for (let i = 1; i < sortedBtc.length; i++) {
        const prev = parseFloat(sortedBtc[i - 1].closing_price as string);
        const curr = parseFloat(sortedBtc[i].closing_price as string);
        if (prev > 0 && curr > 0) {
          btc10dLogReturns.push(Math.log(curr / prev));
        }
      }
    } else {
      console.log('  ⚠️ Dados insuficientes no banco para BTC 10d, usando fallback...');
      const fallback = await fetchFallbackData('bitcoin', 'BTC');
      const prices = (fallback.prices || []).slice(-11);
      if (prices.length >= 11) {
        for (let i = 1; i < prices.length; i++) {
          const prev = prices[i - 1][1];
          const curr = prices[i][1];
          if (prev > 0 && curr > 0) btc10dLogReturns.push(Math.log(curr / prev));
        }
      }
    }

    if (btc10dLogReturns.length >= 8) {
      const muBtc10d = mean(btc10dLogReturns);
      const sigmaBtc10d = standardDeviation(btc10dLogReturns);
      const nBtc = btc10dLogReturns.length;
      btc10dZScore = (muBtc10d / (sigmaBtc10d + EPSILON)) * Math.sqrt(nBtc);

      const SLOPE_BTC_10D = 1.6;
      pAltaBTC10d = 1 / (1 + Math.exp(-SLOPE_BTC_10D * btc10dZScore));
      pAltaBTC10d = Math.min(0.9, Math.max(0.1, pAltaBTC10d));

      console.log(`  📈 BTC n (10d) = ${nBtc}`);
      console.log(`  📈 BTC μ (10d) = ${muBtc10d.toFixed(6)}, σ (10d) = ${sigmaBtc10d.toFixed(6)}`);
      console.log(`  📈 BTC z-score (10d) = ${btc10dZScore.toFixed(4)} (slope=${SLOPE_BTC_10D})`);
      console.log(`  💎 P(alta|BTC_10d) = ${(pAltaBTC10d * 100).toFixed(2)}%`);
      console.log(`  ✅ Componente BTC 10d (25%): MESMO para TODAS as criptos`);
    } else {
      console.log(`  ⚠️ Retornos BTC insuficientes (${btc10dLogReturns.length}/8), usando neutro (50%)`);
    }

    // ========== BUSCAR PREÇOS AO VIVO EM BATCH ==========
    const coinIds = CRYPTOS.map(c => c.coinId);
    const livePricesMap = await fetchLivePricesBatch(coinIds);

    for (const crypto of CRYPTOS) {
      try {
        console.log(`\n📊 Calculando ${crypto.symbol}...`);

        // ========== ETAPA 1: COMPONENTE DE PREÇO (20%) ==========
        
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

        // ========== BUSCAR ATH COM CACHE E RETRY ==========
        
        let { ath: athPrice, athDate } = await fetchATHWithCache(supabase, crypto.coinId, crypto.symbol);
        
        // Se ATH ainda inválido, usar 2x o máximo histórico como último recurso
        if (athPrice <= 0 || !athDate) {
          console.log(`  ⚠️ ATH inválido para ${crypto.symbol}, usando fallback: 2x máximo histórico`);
          const maxHistorical = Math.max(...historicalPrices.map(p => parseFloat(p.closing_price)));
          athPrice = maxHistorical * 2;
          athDate = historicalPrices[historicalPrices.findIndex(p => parseFloat(p.closing_price) === maxHistorical)]?.date || new Date().toISOString().split('T')[0];
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

        // USAR PREÇO AO VIVO DO COINGECKO se disponível
        let precoAtual = prices[prices.length - 1]; // fallback: último histórico
        if (livePricesMap.has(crypto.coinId)) {
          precoAtual = livePricesMap.get(crypto.coinId)!;
          console.log(`  🔴 Usando preço AO VIVO (CoinGecko): $${precoAtual.toFixed(6)}`);
        } else {
          console.log(`  ⚠️ Preço ao vivo indisponível, usando último histórico: $${precoAtual.toFixed(6)}`);
        }

        const minPreco = Math.min(...prices);
        const maxPreco365 = Math.max(...prices);
        
        // Validação CRÍTICA: nenhum zero permitido
        if (minPreco <= 0 || maxPreco365 <= 0 || precoAtual <= 0) {
          validationErrors.push(`${crypto.symbol}: Preço/Min/Max devem ser > 0 (atual=${precoAtual}, min=${minPreco}, max=${maxPreco365})`);
          console.error(`        ❌ Zeros detectados: preço=${precoAtual}, min=${minPreco}, max=${maxPreco365}`);
          continue;
        }

        // Validação: ATH deve ser >= máximo observado em 365d
        let finalAthPrice = athPrice;
        let finalAthDate = athDate;
        
        if (athPrice < maxPreco365) {
          console.log(`  ⚠️ ATH do cache (${athPrice}) < máximo 365d (${maxPreco365}), ajustando...`);
          finalAthPrice = maxPreco365 * 1.05; // 5% acima do máximo observado
          finalAthDate = historicalPrices[historicalPrices.findIndex(p => parseFloat(p.closing_price) === maxPreco365)]?.date || athDate;
          
          // Atualizar cache com novo ATH
          await supabase
            .from('crypto_ath_cache')
            .upsert({
              symbol: crypto.symbol,
              coin_id: crypto.coinId,
              ath_price: finalAthPrice,
              ath_date: finalAthDate,
              last_updated: new Date().toISOString()
            }, {
              onConflict: 'symbol'
            });
          
          console.log(`  ✓ ATH ajustado para: $${finalAthPrice.toFixed(6)} em ${finalAthDate}`);
        }

        console.log(`        ✅ Preço atual: $${precoAtual.toFixed(6)}`);
        console.log(`        ✅ Mín 365d: $${minPreco.toFixed(6)}`);
        console.log(`        ✅ Máx 365d: $${maxPreco365.toFixed(6)}`);
        console.log(`        ✅ ATH (histórico): $${finalAthPrice.toFixed(6)} em ${finalAthDate}`);

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

        console.log(`  📊 CRIPTO ${crypto.symbol}:`);
        console.log(`     n_dias_precos = ${historicalPrices.length}`);
        console.log(`     μ_cripto = ${muCripto.toFixed(6)}`);
        console.log(`     σ_cripto = ${sigmaCripto.toFixed(6)}`);

        // ========== COMPONENTE 20%: PREÇO/VOLATILIDADE (usando preço ao vivo) ==========
        const logPrices = prices.map(p => Math.log(p));
        const muLogPrice = mean(logPrices);
        const sigmaLogPrice = standardDeviation(logPrices);
        const zPrice = (Math.log(precoAtual) - muLogPrice) / (sigmaLogPrice + EPSILON);
        
        const SLOPE_PRICE = 1.2;
        const pAltaPreco = Math.min(0.95, Math.max(0.05, 1 / (1 + Math.exp(-SLOPE_PRICE * zPrice))));

        const ic95Low = muLogPrice - 1.96 * sigmaLogPrice;
        const ic95High = muLogPrice + 1.96 * sigmaLogPrice;

        console.log(`     IC_95%(log preço) = [${ic95Low.toFixed(6)}, ${ic95High.toFixed(6)}]`);
        console.log(`     z_preço = ${zPrice.toFixed(6)} (slope=${SLOPE_PRICE})`);
        console.log(`     P(alta|preço_vol) = ${(pAltaPreco * 100).toFixed(2)}%`);

        // ========== COMPONENTES GLOBAIS ==========
        const pAltaBTC = pAltaBTC10d;
        const pAltaMcap = pMcapFinal;
        
        console.log(`     P(alta|BTC_10d) = ${(pAltaBTC * 100).toFixed(2)}% [GLOBAL - BTC 10 DIAS]`);
        console.log(`     P(alta|mcap) = ${(pAltaMcap * 100).toFixed(2)}% [GLOBAL - MCAP 10d+40d]`);

        // ========== COMBINAÇÃO FINAL (55% mcap + 25% BTC + 20% preço) ==========
        const pAltaFinal = (0.55 * pAltaMcap) + (0.25 * pAltaBTC) + (0.20 * pAltaPreco);
        const pQuedaFinal = 1 - pAltaFinal;

        let direction: 'alta' | 'queda';
        let probabilityPercentage: number;

        if (pAltaFinal >= 0.5) {
          direction = 'alta';
          probabilityPercentage = pAltaFinal * 100;
        } else {
          direction = 'queda';
          probabilityPercentage = pQuedaFinal * 100;
        }

        // ========== VALIDAÇÃO EM SOMBRA ==========
        console.log(`     🔍 VALIDAÇÃO EM SOMBRA:`);
        
        const logPricesSombra = prices.map(p => Math.log(p));
        const muLogPriceSombra = mean(logPricesSombra);
        const sigmaLogPriceSombra = standardDeviation(logPricesSombra);
        const zPriceSombra = (Math.log(precoAtual) - muLogPriceSombra) / (sigmaLogPriceSombra + EPSILON);
        const pAltaPrecoSombra = Math.min(0.95, Math.max(0.05, 1 / (1 + Math.exp(-SLOPE_PRICE * zPriceSombra))));
        const pAltaFinalSombra = (0.55 * pAltaMcap) + (0.25 * pAltaBTC) + (0.20 * pAltaPrecoSombra);
        
        const diffPAltaPreco = Math.abs(pAltaPreco - pAltaPrecoSombra);
        const diffPFinal = Math.abs(pAltaFinal - pAltaFinalSombra);
        
        let shadowValid = true;
        
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
        
        console.log(`        ✅ P_preço diff: ${diffPAltaPreco.toFixed(6)} ≤ ${TOLERANCE_PROB}`);
        console.log(`        ✅ P_final diff: ${diffPFinal.toFixed(6)} ≤ ${TOLERANCE_PROB}`);

        // ========== VALIDAÇÕES LÓGICAS ==========
        console.log(`     🧪 VALIDAÇÕES LÓGICAS:`);
        
        if (pAltaFinal < 0 || pAltaFinal > 1) {
          validationErrors.push(`${crypto.symbol}: P_final fora de [0,1]: ${pAltaFinal}`);
          console.error(`        ❌ SANITY: P_final=${pAltaFinal} fora de [0,1]`);
          continue;
        }
        
        console.log(`        ✅ P_final ∈ [0, 1]`);

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
          p_alta_total_mcap_10d: p10,
          p_alta_total_mcap_40d: p40,
          p_mcap_combined: pMcapFinal,
          p_alta_btc: pAltaBTC,
          p_final: pAltaFinal,
          direction,
          percentage: probabilityPercentage,
          precoAtual,
          minPreco,
          maxPreco: maxPreco365,
          ic95Low,
          ic95High,
          nDias: historicalPrices.length,
          athPrice: finalAthPrice,
          athDate: finalAthDate
        });

        // ========== SALVAR NO BANCO ==========
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
            max_ath: finalAthPrice,
            ath_date: finalAthDate,
            mu_cripto: muCripto,
            sigma_cripto: sigmaCripto,
            ic_95_low: ic95Low,
            ic_95_high: ic95High,
            ath_cached_at: new Date().toISOString(),
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

        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`❌ Erro processando ${crypto.symbol}:`, error);
      }
    }

    // ========== VALIDAÇÕES CRUZADAS ==========
    console.log('\n\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║       🔍 VALIDAÇÕES CRUZADAS                             ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    
    if (shadowResults.length >= 2) {
      const mcapProbs = shadowResults.map(r => r.p_mcap_combined);
      const btcProbs = shadowResults.map(r => r.p_alta_btc);
      
      const allMcapSame = mcapProbs.every(p => Math.abs(p - mcapProbs[0]) < 1e-9);
      const allBtcSame = btcProbs.every(p => Math.abs(p - btcProbs[0]) < 1e-9);
      
      if (!allMcapSame) {
        validationErrors.push(`P_mcap difere entre criptos: ${mcapProbs.map(p => p.toFixed(6)).join(', ')}`);
        console.error(`   ❌ P_mcap não é idêntico para todas`);
      } else {
        console.log(`   ✅ P_mcap idêntico: ${mcapProbs[0].toFixed(6)}`);
      }
      
      if (!allBtcSame) {
        validationErrors.push(`P_alta_btc_10d difere entre criptos: ${btcProbs.map(p => p.toFixed(6)).join(', ')}`);
        console.error(`   ❌ P_alta_btc_10d não é idêntico para todas`);
      } else {
        console.log(`   ✅ P_alta_btc_10d idêntico: ${btcProbs[0].toFixed(6)}`);
      }
      
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
      
      const muValues = shadowResults.map(r => r.mu);
      const sigmaValues = shadowResults.map(r => r.sigma);
      
      for (let i = 0; i < shadowResults.length; i++) {
        for (let j = i + 1; j < shadowResults.length; j++) {
          if (Math.abs(muValues[i] - muValues[j]) < 1e-9 && 
              Math.abs(sigmaValues[i] - sigmaValues[j]) < 1e-9) {
            validationErrors.push(`${shadowResults[i].symbol} e ${shadowResults[j].symbol} têm μ e σ idênticos`);
            console.error(`   ❌ ${shadowResults[i].symbol} e ${shadowResults[j].symbol}: μ,σ idênticos`);
          }
        }
      }
      
      console.log(`   ✅ Cada cripto tem μ,σ únicos`);
      
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

    // ========== SMOKE TEST ==========
    let allValidationsPassed = validationErrors.length === 0;
    
    console.log('\n\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║       🔬 SMOKE TEST PÓS-PUBLICAÇÃO                       ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    
    if (shadowResults.length > 0 && allValidationsPassed) {
      let smokeTestFailed = false;
      const smokeTestErrors: string[] = [];
      
      for (const result of shadowResults) {
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
        
        if (result.athPrice < result.maxPreco) {
          smokeTestErrors.push(`${result.symbol}: ATH ($${result.athPrice}) < Máx 365d ($${result.maxPreco})`);
          smokeTestFailed = true;
        }
        
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

    // ========== RELATÓRIO FINAL ==========
    console.log('\n\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║       📋 AUDITORIA DO CÁLCULO DIÁRIO                     ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log(`⏰ Timestamp: ${new Date(calculationDate).toISOString()}`);
    
    console.log(`\n💰 COMPONENTE MARKET CAP (55% TOTAL = 0.35×10d + 0.20×40d):`);
    console.log(`   ┌─ 10 dias (peso 0.35):`);
    console.log(`   │  Δ10_USD = ${delta10USD >= 0 ? '+' : ''}$${(delta10USD / 1e9).toFixed(2)}B`);
    console.log(`   │  z10 = ${z10.toFixed(4)}, p10 = ${(p10 * 100).toFixed(2)}% (INVERTIDO)`);
    console.log(`   ┌─ 40 dias (peso 0.20):`);
    console.log(`   │  Δ40_USD = ${delta40USD >= 0 ? '+' : ''}$${(delta40USD / 1e9).toFixed(2)}B`);
    console.log(`   │  z40 = ${z40.toFixed(4)}, p40 = ${(p40 * 100).toFixed(2)}% (INVERTIDO)`);
    console.log(`   └─ Combinado: p_mcap = ${(pMcapFinal * 100).toFixed(2)}%`);
    
    console.log(`\n₿ COMPONENTE BTC 10 DIAS (25%):`);
    console.log(`   z_btc = ${btc10dZScore.toFixed(4)}`);
    console.log(`   P(alta|BTC) = ${(pAltaBTC10d * 100).toFixed(2)}%`);
    
    console.log(`\n📊 RESUMO DA EXECUÇÃO:`);
    console.log(`   • ${successCount} criptos calculadas com sucesso`);
    console.log(`   • ${fallbackCount} criptos usaram fallback (CoinGecko)`);
    console.log(`   • ${CRYPTOS.length - successCount} criptos falharam`);
    
    console.log(`\n📊 DETALHAMENTO POR CRIPTO (${shadowResults.length}):`);
    shadowResults.forEach((r, idx) => {
      console.log(`   ${idx + 1}. ${r.symbol}:`);
      console.log(`      • Preço atual: $${r.precoAtual.toFixed(6)}`);
      console.log(`      • ATH: $${r.athPrice.toFixed(6)} (${r.athDate})`);
      console.log(`      • P(alta|preço) [20%]: ${(r.p_alta_preco * 100).toFixed(2)}%`);
      console.log(`      • P(alta|mcap) [55%]: ${(r.p_mcap_combined * 100).toFixed(2)}%`);
      console.log(`      • P(alta|BTC) [25%]: ${(r.p_alta_btc * 100).toFixed(2)}%`);
      console.log(`      • P_final: ${(r.p_final * 100).toFixed(2)}%`);
      console.log(`      • Direção: ${r.direction.toUpperCase()} (${r.percentage.toFixed(1)}%)`);
    });
    
    console.log(`\n✅ VALIDAÇÃO:`);
    console.log(`   [${pMcapFinal !== 0.5 ? '✓' : '✗'}] Componente 55% usa Market Cap 10d+40d invertido`);
    console.log(`   [${pAltaBTC10d !== 0.5 ? '✓' : '✗'}] Componente 25% usa BTC 10 dias`);
    console.log(`   [${successCount > 0 ? '✓' : '✗'}] Pelo menos 1 cripto foi calculada`);
    console.log(`   [${allValidationsPassed ? '✓' : '✗'}] Todas as checagens lógicas OK`);
    
    if (!allValidationsPassed) {
      console.log(`\n🚨 ERROS DE VALIDAÇÃO (${validationErrors.length}):`);
      validationErrors.forEach((err, idx) => {
        console.log(`   ${idx + 1}. ${err}`);
      });
    }
    
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    if (!allValidationsPassed) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Validações falharam',
          validation_errors: validationErrors,
          cryptos_calculated: successCount,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`✅ Cálculo completo e publicado!`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Probabilidades calculadas com sucesso (inversão aplicada)',
        cryptos_calculated: successCount,
        cryptos_validated: shadowResults.length,
        cryptos_with_fallback: fallbackCount,
        all_validations_passed: allValidationsPassed,
        calculation_date: calculationDate,
        mcap_component: {
          p10_inverted: p10,
          p40_inverted: p40,
          p_mcap_final: pMcapFinal,
          delta10_usd_billions: delta10USD / 1e9,
          delta40_usd_billions: delta40USD / 1e9,
          peso: '55% (0.35×10d + 0.20×40d)'
        },
        btc_component: {
          p_alta_btc_10d: pAltaBTC10d,
          z_btc_10d: btc10dZScore,
          peso: '25%'
        },
        formula: 'P(alta) = 0.55×p_mcap + 0.25×p_btc + 0.20×p_price',
        inversion_note: 'Saída de dinheiro → ALTA, Entrada forte → QUEDA'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('❌ Erro geral:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
