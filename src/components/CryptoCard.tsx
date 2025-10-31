import { TrendingUp, TrendingDown, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type CryptoCardProps = {
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
  historicalATH?: number;
  historicalATHDate?: string;
  historicalATL?: number;
  historicalATLDate?: string;
  debug?: any;
};

export const CryptoCard = ({
  name,
  symbol,
  logo,
  price,
  trend,
  probabilityType,
  probability,
  minPrice,
  maxPrice,
  confidence,
  rangeStatus,
  dataStatus,
  historicalATH,
  historicalATHDate,
  historicalATL,
  historicalATLDate,
  debug,
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

      {/* Probability */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-muted-foreground">Probabilidade de {probabilityType}</span>
          <div className="flex items-center gap-2">
            {dataStatus !== 'insufficient' ? (
              <span
                className={cn(
                  "font-semibold px-2 py-0.5 rounded",
                  probabilityType === "Alta"
                    ? "bg-green-500/20 text-green-400"
                    : "bg-red-500/20 text-red-400"
                )}
              >
                {probability.toFixed(1)}%
              </span>
            ) : (
              <span className="text-xs text-yellow-500">Dados insuficientes</span>
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button aria-label="Ver detalhes" className="p-1 rounded hover:bg-primary/10">
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-[320px] text-xs">
                  <div className="space-y-1">
                    <div><strong>μ</strong>: {debug?.mu?.toFixed(6)} | <strong>σ</strong>: {debug?.sigma?.toFixed(6)}</div>
                    <div><strong>IC95</strong>: [{debug?.ic95_low?.toFixed(2)}%, {debug?.ic95_high?.toFixed(2)}%]</div>
                    <div><strong>p_preço↑</strong>: {(debug?.p_price_up! * 100).toFixed(2)}% | <strong>p_marketcap↑</strong>: {(debug?.p_flow_up! * 100).toFixed(2)}%</div>
                    <div><strong>pesos</strong>: preço {debug?.weights?.wPrice}, fluxo {debug?.weights?.wFlow}</div>
                    <div><strong>p_final↑</strong>: {(debug?.p_final_up! * 100).toFixed(2)}%</div>
                    <div><strong>pontos</strong>: {debug?.nPoints} | <strong>fonte</strong>: {debug?.data_source_prices} ({debug?.data_source_ms}ms)</div>
                    <div><strong>flow</strong>: z={debug?.flow_meta?.zAbs?.toFixed(3)} m={debug?.flow_meta?.m?.toFixed(3)} nf3={debug?.flow_meta?.nfRecent?.toFixed(2)}</div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>

      {/* Historical ATH/ATL */}
      {historicalATH && historicalATL && (
        <div className="space-y-2 pt-3 border-t border-primary/10">
          <div className="text-xs text-muted-foreground font-medium mb-2">
            Histórico
          </div>
          <div className="flex justify-between text-sm">
            <div>
              <div className="text-muted-foreground text-xs">ATL</div>
              <div className="font-semibold text-red-400">
                ${historicalATL < 0.01 
                  ? historicalATL.toLocaleString('en-US', { minimumFractionDigits: 6, maximumFractionDigits: 8 })
                  : historicalATL < 1
                  ? historicalATL.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 })
                  : historicalATL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                }
              </div>
              {historicalATLDate && (
                <div className="text-xs text-muted-foreground">{new Date(historicalATLDate).toLocaleDateString('pt-BR')}</div>
              )}
            </div>
            <div className="text-right">
              <div className="text-muted-foreground text-xs">ATH</div>
              <div className="font-semibold text-green-400">
                ${historicalATH < 0.01 
                  ? historicalATH.toLocaleString('en-US', { minimumFractionDigits: 6, maximumFractionDigits: 8 })
                  : historicalATH < 1
                  ? historicalATH.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 })
                  : historicalATH.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                }
              </div>
              {historicalATHDate && (
                <div className="text-xs text-muted-foreground">{new Date(historicalATHDate).toLocaleDateString('pt-BR')}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Price Range (IC 95%) */}
      <div className="space-y-2 pt-3 border-t border-primary/10">
        <div className="text-xs text-muted-foreground font-medium mb-2">
          Faixa (IC 95%)
        </div>
        {dataStatus === 'insufficient' ? (
          <div className="text-xs text-yellow-500">Sem faixa confiável (dados insuficientes)</div>
        ) : rangeStatus === 'review' ? (
          <div className="text-xs text-yellow-500">Faixa em revisão</div>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  );
};
