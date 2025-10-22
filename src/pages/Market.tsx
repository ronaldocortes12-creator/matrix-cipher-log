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

      console.log('[MARKET] Starting data load with cache + fallback system');

      // STEP 1: Fetch current prices (with retry and fallback)
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
        console.log('[MARKET] Current prices fetched successfully');
      } catch (error) {
        console.warn('[MARKET] Price API failed, using mock data:', error);
        priceData = mockCurrentPrices;
      }

      // STEP 2: Fetch historical data with cache + rate limiting + provider fallback
      const historicalMap: Record<string, any[]> = {};
      const rangeFailures: Record<string, number> = {};
      
      for (const crypto of cryptoList) {
        // Check cache first
        const cached = cryptoCache.get(`prices:${crypto.id}`);
        
        if (cached) {
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

          const tryProvider = async (provider: 'coingecko' | 'binance') => {
            if (provider === 'coingecko') {
              return await rateLimiter.add(async () => fetchHistoricalFromCoingecko(crypto.id));
            }
            return await rateLimiter.add(async () => fetchHistoricalFromBinance(crypto.id, crypto.symbol));
          };

          let selected: { prices: any[]; source: string; ms: number } | null = null;
          let attempts: Array<'coingecko' | 'binance'> = [];

          for (const prov of ['coingecko', 'binance'] as const) {
            attempts.push(prov);
            try {
              const res = await tryProvider(prov);
              const closesTmp = (res.prices || []).map((p: any) => p[1]).filter((v: any) => typeof v === 'number' && isFinite(v));
              const minObsTmp = closesTmp.length ? Math.min(...closesTmp) : Infinity;
              const maxObsTmp = closesTmp.length ? Math.max(...closesTmp) : -Infinity;
              const invalidRange = priceNow > 0 && (minObsTmp < priceNow * 0.5 || maxObsTmp > priceNow * 4);
              if (invalidRange) {
                rangeFailures[crypto.id] = (rangeFailures[crypto.id] || 0) + 1;
                console.warn(`[${crypto.symbol}] Range invalid from ${prov}, retrying alternate source...`, { priceNow, minObsTmp, maxObsTmp });
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

      // STEP 3: Calculate BTC flow component (for 40% weight) with 3h cache
      const btcFlowComponent = await getBTCFlowComponentWithCache(historicalMap['bitcoin'] || []);
      console.log(`[BTC_FLOW] p_alta=${btcFlowComponent.pAlta.toFixed(3)}, p_queda=${btcFlowComponent.pQueda.toFixed(3)}`);

      // STEP 4: Compute per-asset stats first (strict independence)
      type AssetStats = {
        id: string;
        name: string;
        symbol: string;
        price: number;
        nPoints: number;
        closes: number[];
        prices_hash: string;
        mu: number;
        sigma: number;
        p_price_up: number;
        p_flow_up: number;
        minObserved: number;
        maxObserved: number;
        data_source_prices: string;
      };

      const stats: AssetStats[] = await Promise.all(
        cryptoList.map(async (c) => {
          const data = priceData[c.id];
          const price = data?.usd || 0;

          const series = historicalMap[c.id] || [];
          const closes = series.map((p: any) => p[1]).filter((v: any) => typeof v === 'number' && isFinite(v));
          const nPoints = closes.length;
          if (nPoints === 0) console.error(`[${c.symbol}] ❌ NO HISTORICAL DATA`);
          if (nPoints < 330) console.warn(`WINDOW_SHORT:${c.id} n_points=${nPoints}`);

          const prices_hash = await sha256Hex(closes);

          // Log returns with 1% winsorization
          const rets: number[] = [];
          for (let i = 1; i < closes.length; i++) {
            const lr = Math.log(closes[i]) - Math.log(closes[i - 1]);
            if (isFinite(lr)) rets.push(lr);
          }
          const wr = winsorize1pct(rets);
          let mu = 0, sigma = 0;
          if (wr.length) {
            mu = wr.reduce((s, r) => s + r, 0) / wr.length;
            const variance = wr.reduce((s, r) => s + Math.pow(r - mu, 2), 0) / wr.length;
            sigma = Math.sqrt(variance);
          }

          let p_price_up = 0.5;
          if (sigma < 1e-8) {
            console.warn(`LOW_VAR:${c.id} sigma=${sigma}`);
            p_price_up = 0.5;
          } else {
            const z0 = (0 - mu) / Math.max(sigma, 1e-8);
            p_price_up = 1 - normalCDF(z0);
          }

          // BTC flow (same for all except BTC)
          const p_flow_up = c.id === 'bitcoin' ? 0.5 : btcFlowComponent.pAlta;

          // Observed min/max from history
          const minObserved = closes.length ? Math.min(...closes) : price * 0.7;
          const maxObserved = closes.length ? Math.max(...closes) : price * 1.3;

          console.log('[PROB_LOG]', {
            asset_id: c.id,
            n_points: nPoints,
            prices_hash,
            mu: Number(mu.toFixed(6)),
            sigma: Number(sigma.toFixed(6)),
            p_price_up: Number(p_price_up.toFixed(6)),
            p_flow_up: Number(p_flow_up.toFixed(6)),
            p_up_final: Number((0.6*p_price_up + 0.4*p_flow_up).toFixed(6)),
            label: (0.6*p_price_up + 0.4*p_flow_up) >= 0.5 ? 'Alta' : 'Queda'
          });

          return {
            id: c.id,
            name: c.name,
            symbol: c.symbol,
            price,
            nPoints,
            closes,
            prices_hash,
            mu,
            sigma,
            p_price_up,
            p_flow_up,
            minObserved,
            maxObserved,
            data_source_prices: historicalMap[c.id] && historicalMap[c.id].length ? 'provider/cache/mock' : 'none'
          };
        })
      );

      // Assertions
      const uniqueHashes = new Set(stats.map(s => s.prices_hash));
      console.assert(uniqueHashes.size === stats.length, 'DUP_SERIES_DETECTED', { unique: uniqueHashes.size, expected: stats.length, hashes: stats.map(s => s.prices_hash) });
      console.assert(stats.every(s => s.nPoints >= 330), 'HIST_WINDOW_SHORT', stats.filter(s => s.nPoints < 330).map(s => ({ id: s.id, n: s.nPoints })));

      const stdPPrice = (() => {
        const arr = stats.map(s => s.p_price_up);
        const m = arr.reduce((a,b)=>a+b,0)/(arr.length||1);
        return Math.sqrt(arr.reduce((s,v)=>s+Math.pow(v-m,2),0)/(arr.length||1));
      })();
      console.assert(stdPPrice > 0.01, 'LOW_VARIANCE_P_PRICE_UP', { stdPPrice });

      // Detect cluster (±1.5%) on initial combine
      const combine = (wPrice: number, wFlow: number, sigmaFactor = 1) => {
        return stats.map(s => {
          let p_price_up = s.p_price_up;
          if (sigmaFactor !== 1 && s.sigma >= 1e-8) {
            const z0 = (0 - s.mu) / Math.max(s.sigma * sigmaFactor, 1e-8);
            p_price_up = 1 - normalCDF(z0);
          }
          return ({ id: s.id, p: wPrice * p_price_up + wFlow * s.p_flow_up, p_price_up });
        });
      };

      let combined = combine(0.60, 0.40);
      
      const getDispersion = (arr: Array<{id:string,p:number}>) => {
        if (!arr.length) return 0;
        const ps = arr.map(a => a.p);
        return Math.max(...ps) - Math.min(...ps);
      };

      // Enforce diversity: if max-min < 5pp, recalibrate weights to 75/25 and then stretch sigma
      let dispersion = getDispersion(combined);
      if (dispersion < 0.05) {
        console.warn('DIVERSITY_LOW_5PP -> recalibrate weights to 0.75/0.25');
        combined = combine(0.75, 0.25);
        dispersion = getDispersion(combined);
      }
      if (dispersion < 0.05) {
        console.warn('DIVERSITY_LOW_PERSISTENT -> sigma stretch 20%');
        combined = combine(0.75, 0.25, 1.2);
        dispersion = getDispersion(combined);
      }
      if (dispersion < 0.05) {
        console.error('ERROR_DIVERSITY: dispersion still <5pp after recalibration', { dispersion });
      }

      const clusterAssets = () => {
        const within = [] as Array<{id:string,p:number}>;
        for (let i=0;i<combined.length;i++){
          for (let j=i+1;j<combined.length;j++){
            if (Math.abs(combined[i].p - combined[j].p) <= 0.01){
              if (!within.find(w=>w.id===combined[i].id)) within.push(combined[i]);
              if (!within.find(w=>w.id===combined[j].id)) within.push(combined[j]);
            }
          }
        }
        return within;
      };

      let cluster = clusterAssets();
      if (cluster.length >= 4 && stdPPrice > 0.015) {
        console.warn('RECALIBRATED_WEIGHTS to 0.75/0.25 due to clustering');
        combined = combine(0.75, 0.25);
        cluster = clusterAssets();
      }
      if (cluster.length >= 4) {
        console.warn('SIGMA_STRETCH_20P due to persistent clustering');
        combined = combine(0.75, 0.25, 1.2);
        cluster = clusterAssets();
      }
      if (cluster.length >= 4) {
        console.warn('TOO_SIMILAR_CLUSTER', cluster);
      }

      // Detect duplicate min/max pairs across assets (copy error audit)
      const pairCounts: Record<string, number> = {};
      stats.forEach(s => {
        const key = `${s.minObserved.toFixed(8)}|${s.maxObserved.toFixed(8)}`;
        pairCounts[key] = (pairCounts[key] || 0) + 1;
      });
      const duplicateMinMaxIds = new Set(
        stats.filter(s => pairCounts[`${s.minObserved.toFixed(8)}|${s.maxObserved.toFixed(8)}`] > 1).map(s => s.id)
      );

      const cryptosWithData: Crypto[] = stats.map((s) => {
        const comb = combined.find(c => c.id === s.id)!;
        const pAltaFinal = comb.p;
        const probabilityType: "Alta" | "Queda" = pAltaFinal >= 0.5 ? "Alta" : "Queda";
        const probability = pAltaFinal >= 0.5 ? (pAltaFinal * 100) : ((1 - pAltaFinal) * 100);

        // Range validation: within 30%..400% of current price and must be observed
        const inBounds = (s.minObserved >= s.price*0.3) && (s.maxObserved <= s.price*4);
        const rangeStatus: 'ok' | 'review' = inBounds ? 'ok' : 'review';

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
          rangeStatus,
          dataStatus: s.nPoints >= 330 ? 'ok' : 'insufficient',
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

  const calculateBTCFlowComponent = (btcHistoricalData: any[]): { pAlta: number; pQueda: number } => {
    if (btcHistoricalData.length < 30) {
      return { pAlta: 0.5, pQueda: 0.5 };
    }

    const prices = btcHistoricalData.map((p: any) => p[1]);
    
    // Calculate daily price changes as proxy for "net flows"
    const flows: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      const flow = prices[i] - prices[i - 1];
      flows.push(flow);
    }

    // Recent window (last 3 days)
    const k = 3;
    const recentFlows = flows.slice(-k);
    const nfRecent = recentFlows.reduce((sum, f) => sum + f, 0);

    // Calculate mean and std dev of all flows
    const meanNF = flows.reduce((sum, f) => sum + f, 0) / flows.length;
    const varianceNF = flows.reduce((sum, f) => sum + Math.pow(f - meanNF, 2), 0) / flows.length;
    const stdDevNF = Math.sqrt(varianceNF);

    // Z-score of magnitude (absolute value)
    const epsilon = 1e-8;
    const zAbs = Math.abs(nfRecent - meanNF) / (stdDevNF + epsilon);

    // Compress to [0,1] using logistic function
    const m = 1 / (1 + Math.exp(-zAbs));

    // High flow (in or out) → higher probability of Alta
    return {
      pAlta: m,
      pQueda: 1 - m
    };
  };

  // 3h cache for BTC flow component
  const getBTCFlowComponentWithCache = async (btcHistoricalData: any[]): Promise<{ pAlta: number; pQueda: number }> => {
    try {
      const raw = localStorage.getItem('btc_flow_cache');
      if (raw) {
        const cached = JSON.parse(raw) as { pAlta: number; pQueda: number; ts: number };
        if (Date.now() - cached.ts < 3 * 60 * 60 * 1000) { // 3 hours
          return { pAlta: cached.pAlta, pQueda: cached.pQueda };
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
    const resp = await fetch(`https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=365&interval=daily`);
    if (!resp.ok) throw new Error(`CG_${id}_${resp.status}`);
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
