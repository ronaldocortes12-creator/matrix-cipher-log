import { TrendingUp, TrendingDown } from "lucide-react";
import { TabBar } from "@/components/TabBar";
import { MatrixRain } from "@/components/MatrixRain";
import { cn } from "@/lib/utils";

type Crypto = {
  name: string;
  symbol: string;
  price: number;
  trend: "up" | "down";
  dropProbability: number;
  minPrice: number;
  maxPrice: number;
  confidence: number;
};

const Market = () => {
  const cryptos: Crypto[] = [
    {
      name: "Bitcoin",
      symbol: "BTC",
      price: 43250.0,
      trend: "up",
      dropProbability: 35,
      minPrice: 40000,
      maxPrice: 45000,
      confidence: 99,
    },
    {
      name: "Ethereum",
      symbol: "ETH",
      price: 2340.5,
      trend: "down",
      dropProbability: 52,
      minPrice: 2200,
      maxPrice: 2500,
      confidence: 95,
    },
    {
      name: "Binance Coin",
      symbol: "BNB",
      price: 315.8,
      trend: "up",
      dropProbability: 28,
      minPrice: 300,
      maxPrice: 340,
      confidence: 92,
    },
    {
      name: "Solana",
      symbol: "SOL",
      price: 98.2,
      trend: "up",
      dropProbability: 41,
      minPrice: 90,
      maxPrice: 105,
      confidence: 88,
    },
    {
      name: "Cardano",
      symbol: "ADA",
      price: 0.52,
      trend: "down",
      dropProbability: 63,
      minPrice: 0.48,
      maxPrice: 0.58,
      confidence: 85,
    },
    {
      name: "Polkadot",
      symbol: "DOT",
      price: 7.45,
      trend: "up",
      dropProbability: 38,
      minPrice: 7.0,
      maxPrice: 8.0,
      confidence: 90,
    },
  ];

  return (
    <div className="min-h-screen w-full relative">
      <MatrixRain />
      
      <div className="fixed inset-0 bg-gradient-to-br from-deep-navy via-background to-secondary/30" style={{ zIndex: 1 }} />
      
      {/* Header */}
      <div className="relative z-10 bg-card/50 backdrop-blur-lg border-b border-primary/20 p-4">
        <h1 className="text-xl font-bold text-center bg-gradient-to-r from-primary to-foreground bg-clip-text text-transparent">
          Mercado Cripto
        </h1>
      </div>

      <div className="relative z-10 p-4 pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
          {cryptos.map((crypto) => (
            <div
              key={crypto.symbol}
              className="glass-effect rounded-xl p-5 border border-primary/20 hover:border-primary/40 transition-all duration-300"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-foreground">{crypto.name}</h3>
                  <p className="text-sm text-muted-foreground">{crypto.symbol}</p>
                </div>
                <div
                  className={cn(
                    "p-2 rounded-full",
                    crypto.trend === "up" ? "bg-green-500/20" : "bg-red-500/20"
                  )}
                >
                  {crypto.trend === "up" ? (
                    <TrendingUp className="h-5 w-5 text-green-500" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-500" />
                  )}
                </div>
              </div>

              {/* Price */}
              <div className="mb-4">
                <div className="text-2xl font-bold text-primary">
                  ${crypto.price.toLocaleString()}
                </div>
              </div>

              {/* Drop Probability */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Probabilidade de Queda</span>
                  <span
                    className={cn(
                      "font-semibold px-2 py-0.5 rounded",
                      crypto.dropProbability > 50
                        ? "bg-red-500/20 text-red-400"
                        : "bg-green-500/20 text-green-400"
                    )}
                  >
                    {crypto.dropProbability}%
                  </span>
                </div>
              </div>

              {/* Price Range */}
              <div className="space-y-2 pt-3 border-t border-primary/10">
                <div className="text-xs text-muted-foreground font-medium mb-2">
                  Range de Preço
                </div>
                <div className="flex justify-between text-sm">
                  <div>
                    <div className="text-muted-foreground text-xs">Mínimo</div>
                    <div className="font-semibold text-foreground">
                      ${crypto.minPrice.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-muted-foreground text-xs">Máximo</div>
                    <div className="font-semibold text-foreground">
                      ${crypto.maxPrice.toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  Intervalo de Confiança: {crypto.confidence}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <TabBar />
    </div>
  );
};

export default Market;
