import { useState, useEffect } from "react";
import { TabBar } from "@/components/TabBar";
import { MatrixRain } from "@/components/MatrixRain";
import { CryptoCard } from "@/components/CryptoCard";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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

      // Se não houver dados suficientes, disparar cálculo agora e refazer a consulta
      const uniqueCount = new Set((probabilities || []).map((p: any) => p.symbol)).size;
      if (uniqueCount < cryptoList.length) {
        console.log(`[MARKET] ⚠️ Apenas ${uniqueCount}/${cryptoList.length} com dados. Disparando cálculo agora...`);
        toast({ title: 'Atualizando dados', description: 'Calculando probabilidades agora...', duration: 3500 });
        try {
          await supabase.functions.invoke('calculate-crypto-probabilities', { body: {} });
          // pequena espera para o banco consolidar
          await new Promise((r) => setTimeout(r, 1200));
          const refetch = await supabase
            .from('crypto_probabilities')
            .select('*')
            .gte('calculation_date', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            .order('calculation_date', { ascending: false });
          if (!refetch.error) {
            probabilities = refetch.data || [];
          }
        } catch (e) {
          console.warn('[MARKET] Falha ao disparar cálculo imediato', e);
        }
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
          // Sem dados calculados
          return {
            name: crypto.name,
            symbol: crypto.symbol,
            logo: crypto.logo,
            price: currentPrice,
            trend: change24h >= 0 ? "up" : "down",
            probabilityType: "Alta",
            probability: 50.0,
            minPrice: currentPrice * 0.95,
            maxPrice: currentPrice * 1.05,
            confidence: 95,
            dataStatus: 'insufficient',
            rangeStatus: 'review',
            debug: {
              nPoints: 0,
              mu: 0,
              sigma: 0,
              ic95_low: 0,
              ic95_high: 0,
              p_price_up: 0.5,
              p_flow_up: 0.5,
              p_final_up: 0.5,
              weights: { wPrice: 0.6, wFlow: 0.4 },
              data_source_prices: 'none',
              data_source_ms: 0,
            },
          };
        }

        // Dados calculados disponíveis
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
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-primary">Market Analysis</h1>
          </div>

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
