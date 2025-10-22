// Cache manager for crypto data with TTL
export type CachedCryptoData = {
  prices: any[];
  currentPrice: number;
  change24h: number;
  timestamp: number;
  ttl: number; // 6 hours in ms
};

const CACHE_PREFIX = 'crypto_cache_';
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

export const cryptoCache = {
  set: (assetId: string, data: Omit<CachedCryptoData, 'timestamp' | 'ttl'>) => {
    try {
      const cacheData: CachedCryptoData = {
        ...data,
        timestamp: Date.now(),
        ttl: CACHE_TTL,
      };
      localStorage.setItem(`${CACHE_PREFIX}${assetId}`, JSON.stringify(cacheData));
    } catch (error) {
      console.warn(`Failed to cache data for ${assetId}:`, error);
    }
  },

  get: (assetId: string): CachedCryptoData | null => {
    try {
      const cached = localStorage.getItem(`${CACHE_PREFIX}${assetId}`);
      if (!cached) return null;

      const data: CachedCryptoData = JSON.parse(cached);
      const isExpired = Date.now() - data.timestamp > data.ttl;

      if (isExpired) {
        localStorage.removeItem(`${CACHE_PREFIX}${assetId}`);
        return null;
      }

      return data;
    } catch (error) {
      console.warn(`Failed to retrieve cache for ${assetId}:`, error);
      return null;
    }
  },

  clear: (assetId?: string) => {
    if (assetId) {
      localStorage.removeItem(`${CACHE_PREFIX}${assetId}`);
    } else {
      // Clear all crypto caches
      Object.keys(localStorage)
        .filter(key => key.startsWith(CACHE_PREFIX))
        .forEach(key => localStorage.removeItem(key));
    }
  },
};

// Rate limiting helper
class RateLimiter {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private lastRequestTime = 0;
  private minDelay = 1500; // 1.5s between requests

  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.process();
    });
  }

  private async process() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;

      if (timeSinceLastRequest < this.minDelay) {
        await new Promise(resolve => setTimeout(resolve, this.minDelay - timeSinceLastRequest));
      }

      const fn = this.queue.shift();
      if (fn) {
        this.lastRequestTime = Date.now();
        await fn();
      }
    }

    this.processing = false;
  }
}

export const rateLimiter = new RateLimiter();

// Retry with exponential backoff
export async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: any;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
