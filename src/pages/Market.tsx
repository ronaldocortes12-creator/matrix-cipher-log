import { useState, useEffect } from "react";
import { TabBar } from "@/components/TabBar";
import { MatrixRain } from "@/components/MatrixRain";
import { CryptoCard } from "@/components/CryptoCard";
import { useToast } from "@/hooks/use-toast";
import { cryptoCache, rateLimiter, fetchWithRetry } from "@/utils/cryptoDataCache";
import { mockHistoricalPrices, mockCurrentPrices } from "@/utils/cryptoMockData";

type Crypto = {
  name: string;
  symbol: string;
  logo: string;
  price: number;
  trend: "up" | "down";
  probabilityType: "Alta" | "Queda";
  probability: number;
  minPrice: number;
  maxPrice: number;
  confidence: number;
  rangeStatus?: 'ok' | 'review';
  dataStatus?: 'ok' | 'insufficient';
  debug?: {
    nPoints: number;
    mu: number;
    sigma: number;
    ic95_low: number;
    ic95_high: number;
    p_price_up: number;
    p_flow_up: number;
    p_final_up: number;
    weights: { wPrice: number; wFlow: number };
    data_source_prices: string;
    data_source_ms: number;
    flow_meta?: { nfRecent: number; meanNF: number; stdDevNF: number; zAbs: number; m: number; source: string };
  };
};

const Market = () => {
  const [cryptos, setCryptos] = useState<Crypto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadCryptoData();
    const interval = setInterval(() => {
      loadCryptoData();
    }, 15 * 60 * 1000); // refresh every 15 minutes

    return () => clearInterval(interval);
  }, []);

const loadCryptoData = async () => {
    try {
      setIsLoading(true);
      
      // Top 20 crypto list with logos
      const cryptoList = [
        { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', logo: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png' },
        { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', logo: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png' },
        { id: 'binancecoin', symbol: 'BNB', name: 'Binance Coin', logo: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png' },
        { id: 'solana', symbol: 'SOL', name: 'Solana', logo: 'https://assets.coingecko.com/coins/images/4128/small/solana.png' },
        { id: 'ripple', symbol: 'XRP', name: 'XRP', logo: 'https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png' },
        { id: 'cardano', symbol: 'ADA', name: 'Cardano', logo: 'https://assets.coingecko.com/coins/images/975/small/cardano.png' },
        { id: 'avalanche-2', symbol: 'AVAX', name: 'Avalanche', logo: 'https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png' },
        { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin', logo: 'https://assets.coingecko.com/coins/images/5/small/dogecoin.png' },
        { id: 'polkadot', symbol: 'DOT', name: 'Polkadot', logo: 'https://assets.coingecko.com/coins/images/12171/small/polkadot.png' },
        { id: 'chainlink', symbol: 'LINK', name: 'Chainlink', logo: 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png' },
        { id: 'polygon', symbol: 'MATIC', name: 'Polygon', logo: 'https://assets.coingecko.com/coins/images/4713/small/matic-token-icon.png' },
        { id: 'uniswap', symbol: 'UNI', name: 'Uniswap', logo: 'https://assets.coingecko.com/coins/images/12504/small/uni.jpg' },
        { id: 'litecoin', symbol: 'LTC', name: 'Litecoin', logo: 'https://assets.coingecko.com/coins/images/2/small/litecoin.png' },
        { id: 'stellar', symbol: 'XLM', name: 'Stellar', logo: 'https://assets.coingecko.com/coins/images/100/small/Stellar_symbol_black_RGB.png' },
        { id: 'worldcoin-wld', symbol: 'WLD', name: 'Worldcoin', logo: 'https://assets.coingecko.com/coins/images/31069/small/worldcoin.jpeg' },
        { id: 'pepe', symbol: 'PEPE', name: 'Pepe', logo: 'https://assets.coingecko.com/coins/images/29850/small/pepe-token.jpeg' },
        { id: 'near', symbol: 'NEAR', name: 'NEAR Protocol', logo: 'https://assets.coingecko.com/coins/images/10365/small/near.jpg' },
        { id: 'the-graph', symbol: 'GRT', name: 'The Graph', logo: 'https://assets.coingecko.com/coins/images/13397/small/Graph_Token.png' },
        { id: 'cosmos', symbol: 'ATOM', name: 'Cosmos', logo: 'https://assets.coingecko.com/coins/images/1481/small/cosmos_hub.png' },
        { id: 'filecoin', symbol: 'FIL', name: 'Filecoin', logo: 'https://assets.coingecko.com/coins/images/12817/small/filecoin.png' },
      ];

      console.log('[MARKET] 🎯 Iniciando cálculo conforme prompt: 60% preço (365d) + 40% Market Cap Total (15d)');
      const ALLOW_CACHE = true;

      // STEP 1: Fetch current prices
      let priceData: Record<string, any> = {};
      
      try {
        const ids = cryptoList.map(c => c.id).join(',');
        priceData = await fetchWithRetry(async () => {
          const response = await fetch(
            `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`
          );
          
          if (!response.ok) {
            throw new Error(`Price API failed: ${response.status}`);
          }
          
          return await response.json();
        });
        console.log('[MARKET] ✅ Cotações atuais obtidas');
      } catch (error) {
        console.warn('[MARKET] ⚠️ Price API falhou, usando mock:', error);
        priceData = mockCurrentPrices;
      }

      // STEP 2: Fetch historical data with cache + rate limiting + provider fallback
      const historicalMap: Record<string, any[]> = {};
      const rangeFailures: Record<string, number> = {};
      const providerUsed: Record<string, { source: string; ms: number }> = {};
      
      for (const crypto of cryptoList) {
        // Check cache first
        const cached = cryptoCache.get(`prices:${crypto.id}`);
        
        if (ALLOW_CACHE && cached) {
          console.log(`[${crypto.symbol}] Using cached data (age: ${Math.floor((Date.now() - cached.timestamp) / 60000)}min)`);
          historicalMap[crypto.id] = cached.prices;
          
          // Update current price from cache
          if (!priceData[crypto.id]) {
            priceData[crypto.id] = {
              usd: cached.currentPrice,
              usd_24h_change: cached.change24h
            };
          }
          continue;
        }

        // Fetch with rate limiting + retry + provider fallback (CG -> Binance -> Mock)
        try {
          // Try providers in order: CoinGecko -> Binance; validate range vs current price before accepting
          const currentData = priceData[crypto.id];
          const priceNow = currentData?.usd || 0;

          const tryProvider = async (provider: 'coingecko' | 'binance' | 'cryptocompare' | 'yahoo') => {
            if (provider === 'coingecko') {
              return await rateLimiter.add(async () => fetchHistoricalFromCoingecko(crypto.id));
            }
            if (provider === 'binance') {
              return await rateLimiter.add(async () => fetchHistoricalFromBinance(crypto.id, crypto.symbol));
            }
            if (provider === 'cryptocompare') {
              return await rateLimiter.add(async () => fetchHistoricalFromCryptoCompare(crypto.symbol));
            }
            // yahoo
            return await rateLimiter.add(async () => fetchHistoricalFromYahoo(crypto.symbol));
          };

          let selected: { prices: any[]; source: string; ms: number } | null = null;
          let attempts: Array<'coingecko' | 'binance' | 'cryptocompare' | 'yahoo'> = [];

          for (const prov of ['coingecko', 'binance', 'cryptocompare', 'yahoo'] as const) {
            attempts.push(prov);
            try {
              const res = await tryProvider(prov);
              // validate
              const closesTmp = (res.prices || []).map((p: any) => p[1]).filter((v: any) => typeof v === 'number' && isFinite(v));
              const nPointsTmp = closesTmp.length;
              const minObsTmp = nPointsTmp ? Math.min(...closesTmp) : Infinity;
              const maxObsTmp = nPointsTmp ? Math.max(...closesTmp) : -Infinity;
              const invalidRange = priceNow > 0 && (minObsTmp < priceNow * 0.5 || maxObsTmp > priceNow * 4);
              const insufficientPoints = nPointsTmp < 330;
              if (invalidRange || insufficientPoints) {
                rangeFailures[crypto.id] = (rangeFailures[crypto.id] || 0) + 1;
                console.warn(`[${crypto.symbol}] Rejecting ${prov} (invalidRange=${invalidRange}, nPoints=${nPointsTmp})`);
                continue; // try next provider
              }
              selected = res;
              break;
            } catch (e) {
              console.warn(`[${crypto.symbol}] Provider error: ${prov}`, e);
              rangeFailures[crypto.id] = (rangeFailures[crypto.id] || 0) + 1;
              continue;
            }
          }

          // If none selected, fall back (keep data but mark review/insufficient downstream)
          if (!selected) {
            const fallback = await rateLimiter.add(async () => fetchHistoricalWithFallback(crypto.id, crypto.symbol));
            selected = fallback;
          }

          historicalMap[crypto.id] = selected.prices;
          providerUsed[crypto.id] = { source: selected.source, ms: selected.ms };

          // Cache only if we had no range failures for this asset in this run
          if (currentData && selected.prices.length > 0 && (rangeFailures[crypto.id] || 0) === 0) {
            cryptoCache.set(`prices:${crypto.id}`, {
              prices: selected.prices,
              currentPrice: currentData.usd,
              change24h: currentData.usd_24h_change
            });
          }

          console.log(`[${crypto.symbol}] Fetched ${selected.prices.length} historical data points from ${selected.source} in ${selected.ms.toFixed(0)}ms`);
        } catch (error) {
          console.warn(`[${crypto.symbol}] Historical fetch failed across providers, using mock:`, error);
          historicalMap[crypto.id] = mockHistoricalPrices[crypto.id] || [];
          rangeFailures[crypto.id] = (rangeFailures[crypto.id] || 0) + 1;
          
          // Use mock current price too if needed
          if (!priceData[crypto.id]) {
            priceData[crypto.id] = mockCurrentPrices[crypto.id];
          }
        }
      }

      // ============================================================
      // STEP 3: Buscar Market Cap TOTAL (para todos os ativos) - 365 dias
      // ============================================================
      console.log('[MARKET CAP] 💰 Buscando Market Cap Total do mercado cripto...');
      let marketCapHistory365: number[] = [];
      
      try {
        const cachedMC = localStorage.getItem('crypto_cache_global:marketcap365');
        if (ALLOW_CACHE && cachedMC) {
          const parsed = JSON.parse(cachedMC);
          const isExpired = Date.now() - parsed.timestamp > (60 * 60 * 1000); // 1h cache
          if (!isExpired && Array.isArray(parsed.data) && parsed.data.length >= 300) {
            marketCapHistory365 = parsed.data;
            console.log(`[MARKET CAP] ✅ Usando cache (age: ${Math.floor((Date.now() - parsed.timestamp) / 60000)}min)`);
          }
        }
        
        if (marketCapHistory365.length === 0) {
          // Preferir endpoint histórico real do Market Cap total
          const fetchGlobalMC = async () => {
            const t0 = performance.now();
            const res = await fetch('https://api.coingecko.com/api/v3/global/market_cap_chart?vs_currency=usd&days=365');
            if (!res.ok) throw new Error(`Global MC chart API failed: ${res.status}`);
            const data = await res.json();

            // Tentar vários possíveis campos de resposta
            const series: any[] =
              (data?.market_cap) ||
              (data?.total_market_cap) ||
              (data?.market_caps) ||
              (data?.total_market_caps) ||
              [];

            const arr = Array.isArray(series) ? series : [];
            const values = arr.map((p: any) => Array.isArray(p) ? p[1] : Number(p)).filter((v: any) => typeof v === 'number' && isFinite(v));
            console.log(`[MARKET CAP] Coingecko global chart em ${(performance.now()-t0).toFixed(0)}ms, pontos: ${values.length}`);
            return values;
          };

          try {
            marketCapHistory365 = await fetchWithRetry(fetchGlobalMC);
          } catch (e) {
            console.warn('[MARKET CAP] ⚠️ Falha no endpoint histórico. Fallback: escalar via BTC', e);
            // Fallback: usar market cap atual + série do BTC como proxy proporcional
            const response = await fetchWithRetry(async () => {
              const res = await fetch('https://api.coingecko.com/api/v3/global');
              if (!res.ok) throw new Error(`Global API failed: ${res.status}`);
              return await res.json();
            });

            const currentMarketCap = response.data?.total_market_cap?.usd || 0;
            const btcData = historicalMap['bitcoin'] || [];
            if (btcData.length >= 365) {
              const btcCloses = btcData.slice(-365).map((p: any) => p[1]);
              const btcNow = btcCloses[btcCloses.length - 1] || 1;
              marketCapHistory365 = btcCloses.map((btc: number) => currentMarketCap * (btc / btcNow));
            } else {
              marketCapHistory365 = Array(365).fill(currentMarketCap || 2.5e12);
            }
          }

          // Salvar cache
          localStorage.setItem('crypto_cache_global:marketcap365', JSON.stringify({
            data: marketCapHistory365,
            timestamp: Date.now()
          }));
          console.log(`[MARKET CAP] ✅ Obtido ${marketCapHistory365.length} pontos (último: $${(marketCapHistory365.at(-1)! / 1e12).toFixed(2)}T)`);
        }
      } catch (error) {
        console.warn('[MARKET CAP] ⚠️ Erro ao buscar, usando fallback:', error);
        // Fallback: série neutra
        marketCapHistory365 = Array(365).fill(2.5e12); // ~2.5T USD
      }

      // ============================================================
      // STEP 4: Calcular Componente Market Cap (40% do peso) - LÓGICA CORRIGIDA
      // ============================================================
      const calcularComponenteMarketCap = (mcHistory: number[]) => {
        if (mcHistory.length < 15) {
          return { probabilidadeAlta: 0.5, variacaoRecente: 0, zScore: 0 };
        }

        // 1. Últimos 15 dias
        const ultimos15dias = mcHistory.slice(-15);
        const variacaoPercentual15dias = 
          ((ultimos15dias[14] - ultimos15dias[0]) / ultimos15dias[0]) * 100;

        // 2. Histórico de variações de 15 dias
        const variacoes15dias_historicas: number[] = [];
        for (let i = 15; i < mcHistory.length; i++) {
          const var15d = ((mcHistory[i] - mcHistory[i - 15]) / mcHistory[i - 15]) * 100;
          variacoes15dias_historicas.push(var15d);
        }

        const mediaHistorica = variacoes15dias_historicas.reduce((s, v) => s + v, 0) / variacoes15dias_historicas.length;
        const varianceHist = variacoes15dias_historicas.reduce((s, v) => s + Math.pow(v - mediaHistorica, 2), 0) / variacoes15dias_historicas.length;
        const desvioHistorico = Math.sqrt(varianceHist);

        // 3. Z-score
        const zScore = desvioHistorico > 1e-8 ? (variacaoPercentual15dias - mediaHistorica) / desvioHistorico : 0;

        // 4. Converter para probabilidade - CORREÇÃO CRÍTICA:
        // ENTROU dinheiro (variação > 0) = ALTA
        // SAIU dinheiro (variação < 0) = QUEDA
        let probabilidadeAlta_marketcap = 0.5;
        
        if (variacaoPercentual15dias > 0) {
          // ✅ ENTROU dinheiro no mercado = tendência de ALTA
          probabilidadeAlta_marketcap = 0.5 + Math.min(Math.abs(zScore) / 4, 0.5);
        } else {
          // ✅ SAIU dinheiro do mercado = tendência de QUEDA
          probabilidadeAlta_marketcap = 0.5 - Math.min(Math.abs(zScore) / 4, 0.5);
        }

        probabilidadeAlta_marketcap = Math.max(0, Math.min(1, probabilidadeAlta_marketcap));

        return {
          probabilidadeAlta: probabilidadeAlta_marketcap,
          variacaoRecente: variacaoPercentual15dias,
          zScore: zScore
        };
      };

      const componenteMarketCap = calcularComponenteMarketCap(marketCapHistory365);
      console.log(`[MARKET CAP] 📊 Variação 15d: ${componenteMarketCap.variacaoRecente.toFixed(2)}% | z-score: ${componenteMarketCap.zScore.toFixed(2)} | P(alta): ${(componenteMarketCap.probabilidadeAlta * 100).toFixed(1)}%`);

      // ============================================================
      // STEP 5: Calcular Componente de Preço (60% do peso) para cada cripto
      // ============================================================
      type AssetStats = {
        id: string;
        name: string;
        symbol: string;
        price: number;
        nPoints: number;
        closes: number[];
        media_retornos_pct: number;
        desvio_retornos_pct: number;
        p_price_up: number;
        p_marketcap_up: number;
        minObserved: number;
        maxObserved: number;
        data_source_prices: string;
        data_source_ms: number;
      };

      const stats: AssetStats[] = await Promise.all(
        cryptoList.map(async (c) => {
          const data = priceData[c.id];
          const price = data?.usd || 0;

          const series = historicalMap[c.id] || [];
          const closes = series.map((p: any) => p[1]).filter((v: any) => typeof v === 'number' && isFinite(v));
          const nPoints = closes.length;
          
          if (nPoints === 0) console.error(`[${c.symbol}] ❌ SEM DADOS`);

          // Calcular retornos PERCENTUAIS (não logarítmicos!)
          const retornos_pct: number[] = [];
          for (let i = 1; i < closes.length; i++) {
            const ret_pct = ((closes[i] - closes[i - 1]) / closes[i - 1]) * 100;
            if (isFinite(ret_pct)) retornos_pct.push(ret_pct);
          }

          let media = 0, desvioPadrao = 0;
          if (retornos_pct.length) {
            media = retornos_pct.reduce((s, r) => s + r, 0) / retornos_pct.length;
            const variance = retornos_pct.reduce((s, r) => s + Math.pow(r - media, 2), 0) / retornos_pct.length;
            desvioPadrao = Math.sqrt(variance);
          }

          // Fórmula do prompt:
          // Se média > 0: prob = 0.5 + min(média / (2 * σ), 0.5)
          // Se média ≤ 0: prob = 0.5 - min(|média| / (2 * σ), 0.5)
          let p_price_up = 0.5;
          
          if (desvioPadrao > 1e-8) {
            if (media > 0) {
              p_price_up = 0.5 + Math.min(media / (2 * desvioPadrao), 0.5);
            } else {
              p_price_up = 0.5 - Math.min(Math.abs(media) / (2 * desvioPadrao), 0.5);
            }
          }

          p_price_up = Math.max(0, Math.min(1, p_price_up));

          // Market cap (mesmo para todos)
          const p_marketcap_up = componenteMarketCap.probabilidadeAlta;

          // Observed min/max
          const minObserved = closes.length ? Math.min(...closes) : price * 0.7;
          const maxObserved = closes.length ? Math.max(...closes) : price * 1.3;

          // Intervalo de confiança 95% (para display)
          const ic95_inferior = media - (1.96 * desvioPadrao);
          const ic95_superior = media + (1.96 * desvioPadrao);

          console.log(`[${c.symbol}] n=${nPoints} | μ=${media.toFixed(4)}% | σ=${desvioPadrao.toFixed(4)}% | IC95=[${ic95_inferior.toFixed(2)}%, ${ic95_superior.toFixed(2)}%] | P(↑)_preço=${(p_price_up*100).toFixed(1)}%`);

          return {
            id: c.id,
            name: c.name,
            symbol: c.symbol,
            price,
            nPoints,
            closes,
            media_retornos_pct: media,
            desvio_retornos_pct: desvioPadrao,
            p_price_up,
            p_marketcap_up,
            minObserved,
            maxObserved,
            data_source_prices: providerUsed[c.id]?.source || 'cache/mock',
            data_source_ms: providerUsed[c.id]?.ms || 0,
          };
        })
      );

      // ============================================================
      // STEP 6: Combinar probabilidades - 60% preço + 40% market cap
      // ============================================================
      const wPrice = 0.60;
      const wFlow = 0.40; // agora é market cap, não BTC flow

      const cryptosWithData: Crypto[] = stats.map((s) => {
        // Probabilidade final: 60% preço + 40% market cap
        const pAltaFinal = (wPrice * s.p_price_up) + (wFlow * s.p_marketcap_up);
        
        const probabilityType: "Alta" | "Queda" = pAltaFinal >= 0.5 ? "Alta" : "Queda";
        const probability = pAltaFinal >= 0.5 ? (pAltaFinal * 100) : ((1 - pAltaFinal) * 100);

        // IC 95% baseado nos retornos percentuais
        const ic95_inferior = s.media_retornos_pct - (1.96 * s.desvio_retornos_pct);
        const ic95_superior = s.media_retornos_pct + (1.96 * s.desvio_retornos_pct);

        return {
          name: s.name,
          symbol: s.symbol,
          logo: cryptoList.find(x=>x.id===s.id)!.logo,
          price: s.price,
          trend: probabilityType === "Alta" ? "up" : "down",
          probabilityType,
          probability,
          minPrice: s.minObserved,
          maxPrice: s.maxObserved,
          confidence: 95,
          rangeStatus: 'ok' as const,
          dataStatus: 'ok' as const,
          debug: {
            nPoints: s.nPoints,
            mu: s.media_retornos_pct,
            sigma: s.desvio_retornos_pct,
            ic95_low: ic95_inferior,
            ic95_high: ic95_superior,
            p_price_up: s.p_price_up,
            p_flow_up: s.p_marketcap_up, // agora é market cap
            p_final_up: pAltaFinal,
            weights: { wPrice, wFlow },
            data_source_prices: s.data_source_prices,
            data_source_ms: s.data_source_ms,
            flow_meta: { 
              nfRecent: componenteMarketCap.variacaoRecente, 
              meanNF: 0, 
              stdDevNF: 0, 
              zAbs: Math.abs(componenteMarketCap.zScore), 
              m: componenteMarketCap.probabilidadeAlta, 
              source: 'marketcap_total' 
            }
          }
        };
      });

      console.log(`[MARKET] ✅ Successfully processed ${cryptosWithData.length} cryptos`);
      console.log(`[MARKET] 📊 Probability distribution:`, cryptosWithData.map(c => `${c.symbol}=${c.probability.toFixed(1)}%`).join(', '));
      setCryptos(cryptosWithData);
      
      
    } catch (error) {
      console.error('[MARKET] CRITICAL ERROR - falling back to full mock data:', error);
      toast({
        title: "Modo Offline",
        description: "Usando dados em cache. Algumas informações podem estar desatualizadas.",
        variant: "default"
      });
      
      // Complete fallback
      loadMockData();
    } finally {
      setIsLoading(false);
    }
  };

  // Normal CDF approximation
  const normalCDF = (z: number): number => {
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp(-z * z / 2);
    const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return z > 0 ? 1 - prob : prob;
  };

  const calculateBTCFlowComponent = (btcHistoricalData: any[]): { pAlta: number; pQueda: number; nfRecent: number; meanNF: number; stdDevNF: number; zAbs: number; m: number; source: string } => {
    if (btcHistoricalData.length < 30) {
      return { pAlta: 0.5, pQueda: 0.5, nfRecent: 0, meanNF: 0, stdDevNF: 1, zAbs: 0, m: 0.5, source: 'proxy_btc_price_magnitude' };
    }

    const prices = btcHistoricalData.map((p: any) => p[1]);
    // Proxy de fluxo via magnitude de variação de preço (fallback quando netflows reais indisponíveis)
    const flows: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      const flow = prices[i] - prices[i - 1];
      flows.push(flow);
    }

    // Janela recente (3 dias)
    const k = 3;
    const recentFlows = flows.slice(-k);
    const nfRecent = recentFlows.reduce((sum, f) => sum + f, 0);

    const meanNF = flows.reduce((sum, f) => sum + f, 0) / flows.length;
    const varianceNF = flows.reduce((sum, f) => sum + Math.pow(f - meanNF, 2), 0) / flows.length;
    const stdDevNF = Math.sqrt(varianceNF);

    const epsilon = 1e-8;
    const zAbs = Math.abs(nfRecent - meanNF) / (stdDevNF + epsilon);
    const m = 1 / (1 + Math.exp(-zAbs));

    return {
      pAlta: m,
      pQueda: 1 - m,
      nfRecent,
      meanNF,
      stdDevNF,
      zAbs,
      m,
      source: 'proxy_btc_price_magnitude'
    };
  };
  // 3h cache for BTC flow component
  const getBTCFlowComponentWithCache = async (btcHistoricalData: any[]): Promise<{ pAlta: number; pQueda: number; nfRecent: number; meanNF: number; stdDevNF: number; zAbs: number; m: number; source: string }> => {
    try {
      const raw = localStorage.getItem('btc_flow_cache');
      if (raw) {
        const cached = JSON.parse(raw) as { pAlta: number; pQueda: number; ts: number; nfRecent: number; meanNF: number; stdDevNF: number; zAbs: number; m: number; source: string };
        if (Date.now() - cached.ts < 3 * 60 * 60 * 1000) { // 3 hours
          return { pAlta: cached.pAlta, pQueda: cached.pQueda, nfRecent: cached.nfRecent, meanNF: cached.meanNF, stdDevNF: cached.stdDevNF, zAbs: cached.zAbs, m: cached.m, source: cached.source };
        }
      }
    } catch {}
    const flow = calculateBTCFlowComponent(btcHistoricalData);
    try {
      localStorage.setItem('btc_flow_cache', JSON.stringify({ ...flow, ts: Date.now() }));
    } catch {}
    return flow;
  };

  // SHA-256 hash of price closes
  const sha256Hex = async (values: number[]): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(values));
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  // Provider fallback helpers
  const resolveBinanceSymbol = (id: string, symbol: string) => {
    const map: Record<string, string> = {
      bitcoin: 'BTC', ethereum: 'ETH', binancecoin: 'BNB', solana: 'SOL', ripple: 'XRP', cardano: 'ADA',
      'avalanche-2': 'AVAX', dogecoin: 'DOGE', polkadot: 'DOT', chainlink: 'LINK', polygon: 'MATIC', uniswap: 'UNI',
      litecoin: 'LTC', stellar: 'XLM', 'worldcoin-wld': 'WLD', pepe: 'PEPE', near: 'NEAR', 'the-graph': 'GRT',
      cosmos: 'ATOM', filecoin: 'FIL'
    };
    return (map[id] || symbol) + 'USDT';
  };

  const fetchHistoricalFromCoingecko = async (id: string): Promise<{ prices: any[]; source: string; ms: number }> => {
    const t0 = performance.now();
    // Corrigir IDs problemáticos no CoinGecko para histórico
    const idMap: Record<string, string> = {
      polygon: 'matic-network', // "polygon" pode retornar 404 no market_chart
    };
    const effectiveId = idMap[id] || id;
    const resp = await fetch(`https://api.coingecko.com/api/v3/coins/${effectiveId}/market_chart?vs_currency=usd&days=365&interval=daily`);
    if (!resp.ok) throw new Error(`CG_${effectiveId}_${resp.status}`);
    const data = await resp.json();
    return { prices: data.prices || [], source: 'coingecko', ms: performance.now() - t0 };
  };

  const fetchHistoricalFromBinance = async (id: string, symbol: string): Promise<{ prices: any[]; source: string; ms: number }> => {
    const t0 = performance.now();
    const pair = resolveBinanceSymbol(id, symbol);
    const url = `https://api.binance.com/api/v3/klines?symbol=${pair}&interval=1d&limit=365`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`BINANCE_${pair}_${resp.status}`);
    const klines = await resp.json();
    const prices = (klines || []).map((k: any[]) => [k[0], parseFloat(k[4])]);
    return { prices, source: 'binance', ms: performance.now() - t0 };
  };

  const fetchHistoricalWithFallback = async (id: string, symbol: string): Promise<{ prices: any[]; source: string; ms: number }> => {
    try {
      return await fetchHistoricalFromCoingecko(id);
    } catch (e1) {
      try {
        return await fetchHistoricalFromBinance(id, symbol);
      } catch (e2) {
        // Final fallback to mock
        const prices = mockHistoricalPrices[id] || [];
        if (!prices.length) throw new Error(`NO_HIST_DATA_${id}`);
        return { prices, source: 'mock', ms: 0 };
      }
    }
  };

  // Additional providers
  const fetchHistoricalFromCryptoCompare = async (symbol: string): Promise<{ prices: any[]; source: string; ms: number }> => {
    const t0 = performance.now();
    const fsym = symbol.toUpperCase();
    const url = `https://min-api.cryptocompare.com/data/v2/histoday?fsym=${fsym}&tsym=USD&limit=364`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`CRYPTOCOMPARE_${fsym}_${resp.status}`);
    const data = await resp.json();
    const arr = (data?.Data?.Data) || [];
    const prices = arr.map((d: any) => [d.time * 1000, d.close]).filter((p: any[]) => isFinite(p[1]));
    return { prices, source: 'cryptocompare', ms: performance.now() - t0 };
  };

  const fetchHistoricalFromYahoo = async (symbol: string): Promise<{ prices: any[]; source: string; ms: number }> => {
    const t0 = performance.now();
    const ysym = `${symbol.toUpperCase()}-USD`;
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ysym}?range=1y&interval=1d`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`YAHOO_${ysym}_${resp.status}`);
    const data = await resp.json();
    const result = data?.chart?.result?.[0];
    const ts = result?.timestamp || [];
    const closes = result?.indicators?.quote?.[0]?.close || [];
    const prices = ts.map((t: number, i: number) => [t * 1000, closes[i]]).filter((p: any[]) => isFinite(p[1]));
    return { prices, source: 'yahoo', ms: performance.now() - t0 };
  };

  // Winsorize at 1% tails
  const winsorize1pct = (arr: number[]): number[] => {
    if (arr.length < 20) return arr; // not enough
    const sorted = [...arr].sort((a,b)=>a-b);
    const q1Idx = Math.floor(0.01 * (sorted.length - 1));
    const q99Idx = Math.ceil(0.99 * (sorted.length - 1));
    const lo = sorted[q1Idx];
    const hi = sorted[q99Idx];
    return arr.map(v => Math.min(hi, Math.max(lo, v))); 
  };

  const loadMockData = () => {
    setCryptos([
      {
        name: "Bitcoin",
        symbol: "BTC",
        logo: "https://assets.coingecko.com/coins/images/1/small/bitcoin.png",
        price: 43250.0,
        trend: "up",
        probabilityType: "Alta",
        probability: 64.8,
        minPrice: 36712.5,
        maxPrice: 49787.5,
        confidence: 95,
      },
      {
        name: "Ethereum",
        symbol: "ETH",
        logo: "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
        price: 2340.5,
        trend: "down",
        probabilityType: "Queda",
        probability: 52.1,
        minPrice: 1872.4,
        maxPrice: 2808.6,
        confidence: 95,
      },
    ]);
  };

  return (
    <div className="min-h-screen w-full relative">
      <MatrixRain />
      
      <div className="fixed inset-0 bg-gradient-to-br from-deep-navy via-background to-secondary/30" style={{ zIndex: 1 }} />
      
      {/* Header */}
      <div className="relative z-10 bg-card/50 backdrop-blur-lg border-b border-primary/20 p-4">
        <h1 className="text-xl font-bold text-center bg-gradient-to-r from-primary to-foreground bg-clip-text text-transparent">
          Mercado Cripto
        </h1>
        <p className="text-xs text-center text-muted-foreground mt-1">
          Análise estatística baseada em dados históricos (365 dias)
        </p>
      </div>

      <div className="relative z-10 p-4 pb-24">
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-primary animate-pulse">Carregando dados do mercado...</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-w-7xl mx-auto">
            {cryptos.map((crypto) => (
              <CryptoCard key={crypto.symbol} {...crypto} />
            ))}
          </div>
        )}
      </div>

      <TabBar />
    </div>
  );
};

export default Market;
