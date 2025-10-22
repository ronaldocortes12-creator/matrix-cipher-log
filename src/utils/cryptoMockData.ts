// Realistic mock data for fallback when API fails
export const mockHistoricalPrices: Record<string, number[][]> = {
  bitcoin: generateMockPrices(108174, 0.015, 365),
  ethereum: generateMockPrices(3810, 0.018, 365),
  binancecoin: generateMockPrices(1070, 0.012, 365),
  solana: generateMockPrices(181, 0.025, 365),
  ripple: generateMockPrices(2.38, 0.020, 365),
  cardano: generateMockPrices(0.628, 0.022, 365),
  'avalanche-2': generateMockPrices(19.3, 0.024, 365),
  dogecoin: generateMockPrices(0.191, 0.028, 365),
  polkadot: generateMockPrices(2.95, 0.023, 365),
  chainlink: generateMockPrices(17.24, 0.019, 365),
  polygon: generateMockPrices(0.28, 0.026, 365),
  uniswap: generateMockPrices(6.1, 0.021, 365),
  litecoin: generateMockPrices(94.34, 0.016, 365),
  stellar: generateMockPrices(0.310, 0.024, 365),
  'worldcoin-wld': generateMockPrices(0.859, 0.030, 365),
  pepe: generateMockPrices(0.00000679, 0.035, 365),
  near: generateMockPrices(2.18, 0.027, 365),
  'the-graph': generateMockPrices(0.062, 0.029, 365),
  cosmos: generateMockPrices(3.14, 0.025, 365),
  filecoin: generateMockPrices(1.53, 0.023, 365),
};

function generateMockPrices(
  currentPrice: number,
  volatility: number,
  days: number
): number[][] {
  const prices: number[][] = [];
  let price = currentPrice * 0.7; // Start from 70% of current
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  for (let i = days; i >= 0; i--) {
    const timestamp = now - i * dayMs;
    
    // Random walk with drift toward current price
    const drift = (currentPrice - price) * 0.003; // Pull toward current
    const randomChange = (Math.random() - 0.5) * 2 * volatility * price;
    price = Math.max(price + drift + randomChange, currentPrice * 0.01);
    
    prices.push([timestamp, price]);
  }

  return prices;
}

export const mockCurrentPrices: Record<string, { usd: number; usd_24h_change: number }> = {
  bitcoin: { usd: 108174, usd_24h_change: -3.22 },
  ethereum: { usd: 3810.23, usd_24h_change: -4.50 },
  binancecoin: { usd: 1070.04, usd_24h_change: -1.76 },
  solana: { usd: 181.11, usd_24h_change: -6.70 },
  ripple: { usd: 2.38, usd_24h_change: -4.20 },
  cardano: { usd: 0.628202, usd_24h_change: -5.88 },
  'avalanche-2': { usd: 19.3, usd_24h_change: -5.53 },
  dogecoin: { usd: 0.19109, usd_24h_change: -5.02 },
  polkadot: { usd: 2.95, usd_24h_change: -5.88 },
  chainlink: { usd: 17.24, usd_24h_change: -5.04 },
  polygon: { usd: 0.28, usd_24h_change: -6.50 },
  uniswap: { usd: 6.1, usd_24h_change: -6.40 },
  litecoin: { usd: 94.34, usd_24h_change: -1.88 },
  stellar: { usd: 0.309757, usd_24h_change: -5.24 },
  'worldcoin-wld': { usd: 0.859373, usd_24h_change: -8.09 },
  pepe: { usd: 0.00000679, usd_24h_change: -5.75 },
  near: { usd: 2.18, usd_24h_change: -5.39 },
  'the-graph': { usd: 0.06176, usd_24h_change: -6.95 },
  cosmos: { usd: 3.14, usd_24h_change: -4.97 },
  filecoin: { usd: 1.53, usd_24h_change: -6.33 },
};
