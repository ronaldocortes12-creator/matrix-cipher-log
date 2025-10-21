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
  dropProbability: number;
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

      // Fetch historical data for statistical analysis (last 365 days)
      const historicalPromises = cryptoList.map(async (crypto) => {
        try {
          const histResponse = await fetch(
            `https://api.coingecko.com/api/v3/coins/${crypto.id}/market_chart?vs_currency=usd&days=1095&interval=daily`
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
        historicalData.map(h => [h.id, h.prices.map((p: any) => p[1])])
      );

      const cryptosWithData: Crypto[] = cryptoList.map(crypto => {
        const data = priceData[crypto.id];
        const price = data?.usd || 0;
        const change24h = data?.usd_24h_change || 0;
        
        const trend: "up" | "down" = change24h >= 0 ? "up" : "down";
        
        // Statistical calculation using historical data
        const historicalPrices = historicalMap[crypto.id] || [];
        
        let mean = price;
        let stdDev = price * 0.20; // fallback
        let minPrice = price * 0.70;
        let maxPrice = price * 1.30;
        let dropProbability = 50.0;

        if (historicalPrices.length > 0) {
          // Calculate mean
          mean = historicalPrices.reduce((sum: number, p: number) => sum + p, 0) / historicalPrices.length;
          
          // Calculate standard deviation
          const variance = historicalPrices.reduce((sum: number, p: number) => 
            sum + Math.pow(p - mean, 2), 0) / historicalPrices.length;
          stdDev = Math.sqrt(variance);
          
          // 95% confidence interval: mean ± 2 * stdDev
          minPrice = Math.max(0, mean - 2 * stdDev);
          maxPrice = mean + 2 * stdDev;
          
          // Calculate drop probability based on position in the range
          // If price is near maxPrice (upper bound), higher drop probability
          // If price is near minPrice (lower bound), lower drop probability
          const range = maxPrice - minPrice;
          if (range > 0) {
            const pricePosition = (price - minPrice) / range; // 0 to 1
            // Position of 1 (at max) = 80% drop probability
            // Position of 0 (at min) = 20% drop probability
            dropProbability = 20 + (pricePosition * 60);
          }
        }
        
        return {
          name: crypto.name,
          symbol: crypto.symbol,
          logo: crypto.logo,
          price,
          trend,
          dropProbability: Number(dropProbability.toFixed(1)),
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

  const getVolatilityFactor = (symbol: string): number => {
    // Historical volatility factors (simplified)
    const volatilityMap: Record<string, number> = {
      'BTC': 0.15,
      'ETH': 0.20,
      'BNB': 0.25,
      'SOL': 0.35,
      'XRP': 0.30,
      'ADA': 0.30,
      'AVAX': 0.40,
      'DOGE': 0.45,
      'DOT': 0.35,
      'LINK': 0.35,
      'MATIC': 0.40,
      'UNI': 0.40,
      'LTC': 0.25,
      'XLM': 0.35,
      'WLD': 0.50,
      'PEPE': 0.60,
      'NEAR': 0.40,
      'GRT': 0.45,
      'ATOM': 0.35,
      'FIL': 0.40,
    };
    return volatilityMap[symbol] || 0.35;
  };

  const loadMockData = () => {
    setCryptos([
      {
        name: "Bitcoin",
        symbol: "BTC",
        logo: "https://assets.coingecko.com/coins/images/1/small/bitcoin.png",
        price: 43250.0,
        trend: "up",
        dropProbability: 35.2,
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
        dropProbability: 52.1,
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
          Análise estatística baseada em 3 anos de dados
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
