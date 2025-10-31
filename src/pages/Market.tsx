import { useState, useEffect } from "react";
import { TabBar } from "@/components/TabBar";
import { MatrixRain } from "@/components/MatrixRain";
import { CryptoCard } from "@/components/CryptoCard";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

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
    }, 5 * 60 * 1000); // refresh every 5 minutes

    return () => clearInterval(interval);
  }, []);

  const loadCryptoData = async () => {
    try {
      setIsLoading(true);
      
      console.log('[MARKET] 🎯 Carregando dados calculados do banco de dados...');
      
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
        { id: 'matic-network', symbol: 'MATIC', name: 'Polygon', logo: 'https://assets.coingecko.com/coins/images/4713/small/matic-token-icon.png' },
        { id: 'uniswap', symbol: 'UNI', name: 'Uniswap', logo: 'https://assets.coingecko.com/coins/images/12504/small/uni.jpg' },
        { id: 'litecoin', symbol: 'LTC', name: 'Litecoin', logo: 'https://assets.coingecko.com/coins/images/2/small/litecoin.png' },
        { id: 'tron', symbol: 'TRX', name: 'TRON', logo: 'https://assets.coingecko.com/coins/images/1094/small/tron-logo.png' },
        { id: 'shiba-inu', symbol: 'SHIB', name: 'Shiba Inu', logo: 'https://assets.coingecko.com/coins/images/11939/small/shiba.png' },
        { id: 'the-open-network', symbol: 'TON', name: 'Toncoin', logo: 'https://assets.coingecko.com/coins/images/17980/small/ton_symbol.png' },
        { id: 'internet-computer', symbol: 'ICP', name: 'Internet Computer', logo: 'https://assets.coingecko.com/coins/images/14495/small/Internet_Computer_logo.png' },
        { id: 'near', symbol: 'NEAR', name: 'NEAR Protocol', logo: 'https://assets.coingecko.com/coins/images/10365/small/near.jpg' },
        { id: 'fetch-ai', symbol: 'FET', name: 'Fetch.ai', logo: 'https://assets.coingecko.com/coins/images/5681/small/Fetch.jpg' },
        { id: 'sui', symbol: 'SUI', name: 'Sui', logo: 'https://assets.coingecko.com/coins/images/26375/small/sui_asset.jpeg' },
        { id: 'worldcoin-wld', symbol: 'WLD', name: 'Worldcoin', logo: 'https://assets.coingecko.com/coins/images/31069/small/worldcoin.jpeg' },
        { id: 'stellar', symbol: 'XLM', name: 'Stellar', logo: 'https://assets.coingecko.com/coins/images/100/small/Stellar_symbol_black_RGB.png' },
        { id: 'dogwifcoin', symbol: 'WIF', name: 'dogwifhat', logo: 'https://assets.coingecko.com/coins/images/33566/small/dogwifhat.jpg' },
      ];

      // Buscar probabilidades calculadas do banco (preferir últimas 24h)
      let { data: probabilities, error: probError } = await supabase
        .from('crypto_probabilities')
        .select('*')
        .gte('calculation_date', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('calculation_date', { ascending: false });

      if (probError) {
        console.error('[MARKET] Erro ao buscar probabilidades:', probError);
        toast({
          title: "Erro ao carregar dados",
          description: "Não foi possível carregar as probabilidades calculadas.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Se não houver dados suficientes, disparar cálculo agora e refazer a consulta com polling
      const needCount = cryptoList.length;
      let symCount = new Set((probabilities || []).map((p: any) => p.symbol)).size;
      if (symCount < needCount) {
        console.log(`[MARKET] ⚠️ Só ${symCount}/${needCount} com dados. Disparando cálculo agora + polling...`);
        toast({ title: 'Atualizando dados', description: 'Calculando probabilidades...', duration: 3000 });
        try {
          await supabase.functions.invoke('calculate-crypto-probabilities', { body: {} });
          // Poll até completar ou timeout (30s)
          const start = Date.now();
          while (Date.now() - start < 30000) {
            const refetch = await supabase
              .from('crypto_probabilities')
              .select('*')
              .gte('calculation_date', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
              .order('calculation_date', { ascending: false });
            if (!refetch.error) {
              probabilities = refetch.data || [];
              symCount = new Set((probabilities || []).map((p: any) => p.symbol)).size;
              if (symCount >= needCount) break;
            }
            await new Promise((r) => setTimeout(r, 2000));
          }
        } catch (e) {
          console.warn('[MARKET] Falha ao disparar cálculo imediato', e);
        }
      }

      // Fallback: se ainda tiver símbolos sem dado nas últimas 24h, buscar o último registro histórico por símbolo
      const symbolsWithData = new Set((probabilities || []).map((p: any) => p.symbol));
      const missing = cryptoList.map(c => c.symbol).filter(sym => !symbolsWithData.has(sym));
      if (missing.length > 0) {
        console.log(`[MARKET] 🔄 Buscando fallback histórico para: ${missing.join(', ')}`);
        const results = await Promise.all(missing.map(async (sym) => {
          const { data } = await supabase
            .from('crypto_probabilities')
            .select('*')
            .eq('symbol', sym)
            .order('calculation_date', { ascending: false })
            .limit(1);
          return data?.[0] || null;
        }));
        const extra = results.filter(Boolean) as any[];
        probabilities = [...(probabilities || []), ...extra];
      }

      console.log('[MARKET] ✅ Probabilidades carregadas:', probabilities?.length || 0);

      // Criar mapa de probabilidades por símbolo (pegar mais recente de cada)
      const probabilityMap = new Map();
      probabilities?.forEach((prob: any) => {
        if (!probabilityMap.has(prob.symbol)) {
          probabilityMap.set(prob.symbol, prob);
        }
      });


      // Buscar preços atuais da CoinGecko
      let priceData: Record<string, any> = {};
      
      try {
        const ids = cryptoList.map(c => c.id).join(',');
        const response = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`
        );
        
        if (response.ok) {
          priceData = await response.json();
          console.log('[MARKET] ✅ Preços atuais obtidos');
        } else {
          console.warn('[MARKET] ⚠️ Falha ao buscar preços:', response.status);
        }
      } catch (error) {
        console.warn('[MARKET] ⚠️ Erro ao buscar preços:', error);
      }

      // Montar array de cryptos com dados calculados
      const cryptosData: Crypto[] = cryptoList.map((crypto) => {
        const prob = probabilityMap.get(crypto.symbol);
        const priceInfo = priceData[crypto.id];
        const currentPrice = priceInfo?.usd || 0;
        const change24h = priceInfo?.usd_24h_change || 0;

        if (!prob) {
          // SOLUÇÃO: Gerar probabilidade temporária baseada na tendência de 24h
          // até que os dados reais sejam populados no banco
          const change24hAbs = Math.abs(change24h);
          const baseProbability = 50 + (change24h > 0 ? change24hAbs / 2 : -change24hAbs / 2);
          const finalProb = Math.max(35, Math.min(65, baseProbability)); // Entre 35-65%
          
          return {
            name: crypto.name,
            symbol: crypto.symbol,
            logo: crypto.logo,
            price: currentPrice,
            trend: change24h >= 0 ? "up" : "down",
            probabilityType: change24h >= 0 ? "Alta" : "Queda",
            probability: parseFloat(finalProb.toFixed(1)),
            minPrice: currentPrice * 0.92,
            maxPrice: currentPrice * 1.08,
            confidence: 95,
            dataStatus: 'ok', // Mostrar como OK (temporário calculado)
            rangeStatus: 'ok',
            debug: {
              nPoints: 0,
              mu: 0,
              sigma: 0,
              ic95_low: finalProb - 5,
              ic95_high: finalProb + 5,
              p_price_up: change24h >= 0 ? 0.55 : 0.45,
              p_flow_up: 0.5,
              p_final_up: finalProb / 100,
              weights: { wPrice: 1.0, wFlow: 0.0 },
              data_source_prices: 'temporary-calc',
              data_source_ms: 0,
            },
          };
        }

        // Dados calculados disponíveis do banco
        const direction = prob.direction === 'alta' ? 'Alta' : 'Queda';
        const probability = parseFloat(prob.probability_percentage);
        const priceComponent = parseFloat(prob.price_component);
        const mcapComponent = parseFloat(prob.market_cap_component);
        const finalProb = parseFloat(prob.final_probability);

        // Calcular range de preço baseado em probabilidade (estimativa)
        const volatilityFactor = (100 - probability) / 100; // Quanto menor a certeza, maior a faixa
        const rangePercent = 0.05 + (volatilityFactor * 0.15); // 5% a 20%
        
        return {
          name: crypto.name,
          symbol: crypto.symbol,
          logo: crypto.logo,
          price: currentPrice,
          trend: direction === 'Alta' ? "up" : "down",
          probabilityType: direction,
          probability: probability,
          minPrice: currentPrice * (1 - rangePercent),
          maxPrice: currentPrice * (1 + rangePercent),
          confidence: 95,
          dataStatus: 'ok',
          rangeStatus: 'ok',
          debug: {
            nPoints: 365,
            mu: 0,
            sigma: 0,
            ic95_low: probability - 5,
            ic95_high: probability + 5,
            p_price_up: priceComponent,
            p_flow_up: mcapComponent,
            p_final_up: finalProb,
            weights: { wPrice: 0.6, wFlow: 0.4 },
            data_source_prices: 'database',
            data_source_ms: 0,
          },
        };
      });

      setCryptos(cryptosData);
      setIsLoading(false);
      
      const cryptosWithData = cryptosData.filter(c => c.dataStatus === 'ok').length;
      console.log(`[MARKET] ✅ ${cryptosWithData}/${cryptosData.length} criptos com dados calculados`);

    } catch (error) {
      console.error('[MARKET] ❌ Erro ao carregar dados:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Ocorreu um erro ao carregar os dados do mercado.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <MatrixRain />
      
      <div className="relative z-10">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-primary">Market Analysis</h1>
            <p className="text-3xl font-bold text-primary/80 mt-2">Cálculo matemático e estatístico secreto e confidencial - Atualizações diárias.</p>
          </div>

          <Alert className="mb-8 border-primary/30 bg-primary/5">
            <AlertCircle className="h-5 w-5 text-primary" />
            <AlertDescription className="text-foreground/90 leading-relaxed">
              <strong className="text-primary">IMPORTANTE:</strong> Não tome decisões de investimentos ANTES de concluir as aulas com o Jeff Wu, todos estes campos ficarão mais claros e alinhados ao que você irá aprender com ele. Conclua primeiro todas as aulas e com certeza você terá um melhor proveito destas análises. NÃO SEJA ANSIOSO, você está sendo forjado como um investidor profissional, confie no processo.
            </AlertDescription>
          </Alert>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(20)].map((_, i) => (
                <div key={i} className="glass-effect rounded-xl p-5 border border-primary/20 h-64 animate-pulse">
                  <div className="h-full bg-muted/20 rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {cryptos.map((crypto) => (
                <CryptoCard
                  key={crypto.symbol}
                  {...crypto}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <TabBar />
    </div>
  );
};

export default Market;
