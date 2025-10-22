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
};

const Market = () => {
  const [cryptos, setCryptos] = useState<Crypto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadCryptoData();
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

      // STEP 2: Fetch historical data with cache + rate limiting
      const historicalMap: Record<string, any[]> = {};
      
      for (const crypto of cryptoList) {
        // Check cache first
        const cached = cryptoCache.get(crypto.id);
        
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

        // Fetch with rate limiting + retry
        try {
          const prices = await rateLimiter.add(async () => {
            return await fetchWithRetry(async () => {
              const response = await fetch(
                `https://api.coingecko.com/api/v3/coins/${crypto.id}/market_chart?vs_currency=usd&days=365&interval=daily`
              );
              
              if (!response.ok) {
                if (response.status === 429) {
                  throw new Error('RATE_LIMITED');
                }
                throw new Error(`Historical API failed: ${response.status}`);
              }
              
              const data = await response.json();
              return data.prices || [];
            }, 2, 2000); // 2 retries, 2s base delay
          });

          historicalMap[crypto.id] = prices;
          
          // Cache successful fetch
          const currentData = priceData[crypto.id];
          if (currentData && prices.length > 0) {
            cryptoCache.set(crypto.id, {
              prices,
              currentPrice: currentData.usd,
              change24h: currentData.usd_24h_change
            });
          }
          
          console.log(`[${crypto.symbol}] Fetched ${prices.length} historical data points`);
        } catch (error) {
          console.warn(`[${crypto.symbol}] Historical fetch failed, using mock:`, error);
          historicalMap[crypto.id] = mockHistoricalPrices[crypto.id] || [];
          
          // Use mock current price too if needed
          if (!priceData[crypto.id]) {
            priceData[crypto.id] = mockCurrentPrices[crypto.id];
          }
        }
      }

      // STEP 3: Calculate BTC flow component (for 40% weight)
      const btcFlowComponent = calculateBTCFlowComponent(historicalMap['bitcoin'] || []);
      console.log(`[BTC_FLOW] p_alta=${btcFlowComponent.pAlta.toFixed(3)}, p_queda=${btcFlowComponent.pQueda.toFixed(3)}`);

      // STEP 4: Process each crypto independently with DETAILED LOGGING
      const cryptosWithData: Crypto[] = cryptoList.map(crypto => {
        const data = priceData[crypto.id];
        const price = data?.usd || 0;
        const change24h = data?.usd_24h_change || 0;
        
        const trend: "up" | "down" = change24h >= 0 ? "up" : "down";
        
        // CRITICAL: Use ONLY this asset's historical data (no shared variables!)
        const historicalPricesData = historicalMap[crypto.id] || [];
        
        // ==================== VALIDATION CHECK ====================
        if (historicalPricesData.length === 0) {
          console.error(`[${crypto.symbol}] ❌ NO HISTORICAL DATA - this should never happen!`);
        }
        // ==========================================================
        
        let minPrice = price * 0.70;
        let maxPrice = price * 1.30;
        let pAltaPreco = 0.5;
        let pQuedaPreco = 0.5;
        let mean = 0;
        let stdDev = 0;
        let nPoints = 0;
        let firstPrice = 0;
        let lastPrice = 0;

        // Component 1: Price-based probability (60% weight) - INDEPENDENT per asset
        if (historicalPricesData.length > 30) {
          // Extract ONLY this asset's prices (365 days daily close)
          const assetPrices = historicalPricesData.map((p: any) => p[1]);
          nPoints = assetPrices.length;
          firstPrice = assetPrices[0];
          lastPrice = assetPrices[assetPrices.length - 1];
          
          console.log(`[${crypto.symbol}] 📊 Data range: ${nPoints} points, first=${firstPrice.toFixed(6)}, last=${lastPrice.toFixed(6)}, current=${price.toFixed(6)}`);
          
          // Calculate log returns for THIS asset ONLY
          const assetReturns: number[] = [];
          for (let i = 1; i < assetPrices.length; i++) {
            const logReturn = Math.log(assetPrices[i]) - Math.log(assetPrices[i - 1]);
            if (isFinite(logReturn)) {
              assetReturns.push(logReturn);
            }
          }

          if (assetReturns.length > 0) {
            // Calculate mean and std dev for THIS asset ONLY
            mean = assetReturns.reduce((sum, r) => sum + r, 0) / assetReturns.length;
            const variance = assetReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / assetReturns.length;
            stdDev = Math.sqrt(variance);

            console.log(`[${crypto.symbol}] 📈 Returns: n=${assetReturns.length}, μ=${mean.toFixed(8)}, σ=${stdDev.toFixed(8)}`);

            // Confidence interval 95%
            const ic95Lower = mean - 1.96 * stdDev;
            const ic95Upper = mean + 1.96 * stdDev;
            
            // Convert back to price range
            minPrice = Math.max(0, price * Math.exp(ic95Lower * 30)); // ~1 month projection
            maxPrice = price * Math.exp(ic95Upper * 30);

            console.log(`[${crypto.symbol}] 📉 IC95%: [${ic95Lower.toFixed(8)}, ${ic95Upper.toFixed(8)}] → prices [${minPrice.toFixed(6)}, ${maxPrice.toFixed(6)}]`);

            // Probability calculation with sanity check
            const epsilon = 1e-8;
            
            // Low variance check - force neutral if asset has very low volatility
            if (stdDev < epsilon) {
              console.warn(`[${crypto.symbol}] ⚠️ LOW_VARIANCE_ASSET (σ=${stdDev}) - forcing neutral probability`);
              pAltaPreco = 0.5;
              pQuedaPreco = 0.5;
            } else {
              // Normal probability calculation
              const zScore = (0 - mean) / (stdDev + epsilon);
              pQuedaPreco = normalCDF(zScore);
              pAltaPreco = 1 - pQuedaPreco;
              
              console.log(`[${crypto.symbol}] 🎲 Z-score=${zScore.toFixed(4)}, Φ(z)=${pQuedaPreco.toFixed(4)} → p_alta_preço=${pAltaPreco.toFixed(4)}`);
            }
          }
        } else {
          console.warn(`[${crypto.symbol}] ⚠️ Insufficient data (${historicalPricesData.length} points) - using neutral probabilities`);
        }

        // Component 2: BTC flow component (40% weight) - SAME for all except BTC
        let pAltaFluxo = 0.5;
        let pQuedaFluxo = 0.5;
        
        if (crypto.id === 'bitcoin') {
          // For BTC itself, use neutral flow to avoid circularity
          pAltaFluxo = 0.5;
          pQuedaFluxo = 0.5;
          console.log(`[${crypto.symbol}] 🔄 BTC self-reference: p_alta_fluxo=NEUTRAL (0.5)`);
        } else {
          pAltaFluxo = btcFlowComponent.pAlta;
          pQuedaFluxo = btcFlowComponent.pQueda;
          console.log(`[${crypto.symbol}] 🔄 BTC flow: p_alta_fluxo=${pAltaFluxo.toFixed(4)}`);
        }

        // Final weighted probability: 60% price + 40% BTC flow
        const pAltaFinal = 0.60 * pAltaPreco + 0.40 * pAltaFluxo;
        const pQuedaFinal = 1 - pAltaFinal;

        // COMPREHENSIVE DEBUG LOG
        console.log(`[${crypto.symbol}] ✅ FINAL CALC:
  - Component PREÇO (60%): p_alta=${pAltaPreco.toFixed(4)} → contribui ${(0.60 * pAltaPreco).toFixed(4)}
  - Component FLUXO (40%): p_alta=${pAltaFluxo.toFixed(4)} → contribui ${(0.40 * pAltaFluxo).toFixed(4)}
  - RESULTADO: p_alta_final=${pAltaFinal.toFixed(4)} (${(pAltaFinal * 100).toFixed(1)}%)
  - RÓTULO: ${pAltaFinal >= 0.5 ? 'ALTA ⬆️' : 'QUEDA ⬇️'}`);

        // Determine label and probability
        const probabilityType: "Alta" | "Queda" = pAltaFinal >= 0.5 ? "Alta" : "Queda";
        const probability = pAltaFinal >= 0.5 ? pAltaFinal * 100 : pQuedaFinal * 100;

        return {
          name: crypto.name,
          symbol: crypto.symbol,
          logo: crypto.logo,
          price,
          trend: probabilityType === "Alta" ? "up" : "down",
          probabilityType,
          probability: Number(probability.toFixed(1)),
          minPrice,
          maxPrice,
          confidence: 95,
        };
      });

      console.log(`[MARKET] ✅ Successfully processed ${cryptosWithData.length} cryptos`);
      console.log(`[MARKET] 📊 Probability distribution:`, cryptosWithData.map(c => `${c.symbol}=${c.probability}%`).join(', '));
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

  // Calculate BTC flow component (40% weight)
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
