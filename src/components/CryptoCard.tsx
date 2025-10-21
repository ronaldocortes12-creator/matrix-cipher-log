import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

type CryptoCardProps = {
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

export const CryptoCard = ({
  name,
  symbol,
  logo,
  price,
  trend,
  dropProbability,
  minPrice,
  maxPrice,
  confidence,
}: CryptoCardProps) => {
  return (
    <div className="glass-effect rounded-xl p-5 border border-primary/20 hover:border-primary/40 transition-all duration-300 group">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-card/50 flex items-center justify-center">
            <img src={logo} alt={name} className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">{name}</h3>
            <p className="text-sm text-muted-foreground">{symbol}</p>
          </div>
        </div>
        <div
          className={cn(
            "p-2 rounded-full",
            trend === "up" ? "bg-green-500/20" : "bg-red-500/20"
          )}
        >
          {trend === "up" ? (
            <TrendingUp className="h-5 w-5 text-green-500" />
          ) : (
            <TrendingDown className="h-5 w-5 text-red-500" />
          )}
        </div>
      </div>

      {/* Price */}
      <div className="mb-4">
        <div className="text-2xl font-bold text-primary">
          ${price < 0.01 
            ? price.toLocaleString('en-US', { minimumFractionDigits: 6, maximumFractionDigits: 8 })
            : price < 1
            ? price.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 })
            : price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          }
        </div>
      </div>

      {/* Drop Probability */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-muted-foreground">Probabilidade de Queda</span>
          <span
            className={cn(
              "font-semibold px-2 py-0.5 rounded",
              dropProbability > 50
                ? "bg-red-500/20 text-red-400"
                : "bg-green-500/20 text-green-400"
            )}
          >
            {dropProbability.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Price Range */}
      <div className="space-y-2 pt-3 border-t border-primary/10">
        <div className="text-xs text-muted-foreground font-medium mb-2">
          Range de Preço (3 anos)
        </div>
        <div className="flex justify-between text-sm">
          <div>
            <div className="text-muted-foreground text-xs">Mínimo</div>
            <div className="font-semibold text-foreground">
              ${minPrice < 0.01 
                ? minPrice.toLocaleString('en-US', { minimumFractionDigits: 6, maximumFractionDigits: 8 })
                : minPrice < 1
                ? minPrice.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 })
                : minPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
              }
            </div>
          </div>
          <div className="text-right">
            <div className="text-muted-foreground text-xs">Máximo</div>
            <div className="font-semibold text-foreground">
              ${maxPrice < 0.01 
                ? maxPrice.toLocaleString('en-US', { minimumFractionDigits: 6, maximumFractionDigits: 8 })
                : maxPrice < 1
                ? maxPrice.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 })
                : maxPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
              }
            </div>
          </div>
        </div>
        <div className="text-xs text-muted-foreground mt-2">
          Intervalo de Confiança: {confidence}%
        </div>
      </div>
    </div>
  );
};
