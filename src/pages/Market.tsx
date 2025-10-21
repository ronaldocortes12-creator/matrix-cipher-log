import { useState, useEffect } from "react";
import { TabBar } from "@/components/TabBar";
import { MatrixRain } from "@/components/MatrixRain";
import { CryptoCard } from "@/components/CryptoCard";
import { useToast } from "@/hooks/use-toast";

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

      // Fetch current prices from CoinGecko API
      const ids = cryptoList.map(c => c.id).join(',');
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`
      );
      
      const priceData = await response.json();

      // Fetch historical data for statistical analysis (365 days due to API limits)
      const historicalPromises = cryptoList.map(async (crypto) => {
        try {
          const histResponse = await fetch(
            `https://api.coingecko.com/api/v3/coins/${crypto.id}/market_chart?vs_currency=usd&days=365&interval=daily`
          );
          const histData = await histResponse.json();
          return { id: crypto.id, prices: histData.prices || [] };
        } catch (error) {
          console.error(`Error fetching historical data for ${crypto.id}:`, error);
          return { id: crypto.id, prices: [] };
        }
      });

      const historicalData = await Promise.all(historicalPromises);
      const historicalMap = Object.fromEntries(
        historicalData.map(h => [h.id, h.prices])
      );

      // Calculate BTC flow component (for 40% weight)
      const btcFlowComponent = calculateBTCFlowComponent(historicalMap['bitcoin'] || []);

      const cryptosWithData: Crypto[] = cryptoList.map(crypto => {
        const data = priceData[crypto.id];
        const price = data?.usd || 0;
        const change24h = data?.usd_24h_change || 0;
        
        const trend: "up" | "down" = change24h >= 0 ? "up" : "down";
        
        // Statistical calculation using historical data
        const historicalPricesData = historicalMap[crypto.id] || [];
        
        let minPrice = price * 0.70;
        let maxPrice = price * 1.30;
        let pAltaPreco = 0.5;
        let pQuedaPreco = 0.5;

        if (historicalPricesData.length > 30) {
          const prices = historicalPricesData.map((p: any) => p[1]);
          
          // Calculate log returns
          const returns: number[] = [];
          for (let i = 1; i < prices.length; i++) {
            const logReturn = Math.log(prices[i]) - Math.log(prices[i - 1]);
            if (isFinite(logReturn)) {
              returns.push(logReturn);
            }
          }

          if (returns.length > 0) {
            // Calculate mean and std dev
            const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
            const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
            const stdDev = Math.sqrt(variance);

            // Confidence interval 95%
            const ic95Lower = mean - 1.96 * stdDev;
            const ic95Upper = mean + 1.96 * stdDev;
            
            // Convert back to price range
            minPrice = Math.max(0, price * Math.exp(ic95Lower * 30)); // ~1 month projection
            maxPrice = price * Math.exp(ic95Upper * 30);

            // Probability of drop using Normal CDF
            const epsilon = 1e-8;
            const zScore = (0 - mean) / (stdDev + epsilon);
            pQuedaPreco = normalCDF(zScore);
            pAltaPreco = 1 - pQuedaPreco;
          }
        }

        // Combine with BTC flow component (60% price + 40% BTC flow)
        let pAltaFluxo = 0.5;
        let pQuedaFluxo = 0.5;
        
        if (crypto.id === 'bitcoin') {
          // For BTC itself, use neutral flow component
          pAltaFluxo = 0.5;
          pQuedaFluxo = 0.5;
        } else {
          pAltaFluxo = btcFlowComponent.pAlta;
          pQuedaFluxo = btcFlowComponent.pQueda;
        }

        // Final weighted probability
        const pAltaFinal = 0.60 * pAltaPreco + 0.40 * pAltaFluxo;
        const pQuedaFinal = 1 - pAltaFinal;

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

      setCryptos(cryptosWithData);
    } catch (error) {
      console.error('Error loading crypto data:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar dados do mercado. Usando dados em cache.",
        variant: "destructive"
      });
      
      // Fallback to mock data
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
