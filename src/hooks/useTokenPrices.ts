import { useState, useEffect, useCallback } from 'react';
import { PRICE_TOKEN_IDS } from '../lib/constants';

export interface TokenPrices {
  binancecoin: number;   // BNB / WBNB
  'usd-coin': number;    // USDC
  tether: number;        // USDT
  'pancakeswap-token': number; // CAKE
  bitcoin: number;       // BTCB
  ethereum: number;      // ETH
  [key: string]: number;
}

const FALLBACK_PRICES: TokenPrices = {
  binancecoin: 600,
  'usd-coin': 1,
  tether: 1,
  'pancakeswap-token': 2.5,
  bitcoin: 68000,
  ethereum: 3500,
};

// Map token symbol → coingecko id
export const SYMBOL_TO_CG_ID: Record<string, string> = {
  BNB: 'binancecoin',
  WBNB: 'binancecoin',
  USDC: 'usd-coin',
  USDT: 'tether',
  CAKE: 'pancakeswap-token',
  BTCB: 'bitcoin',
  ETH: 'ethereum',
};

let cachedPrices: TokenPrices | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60_000; // 60s

export function useTokenPrices() {
  const [prices, setPrices] = useState<TokenPrices>(cachedPrices ?? FALLBACK_PRICES);
  const [loading, setLoading] = useState(!cachedPrices);
  const [error, setError] = useState<string | null>(null);

  const fetchPrices = useCallback(async () => {
    const now = Date.now();
    if (cachedPrices && now - cacheTimestamp < CACHE_TTL_MS) {
      setPrices(cachedPrices);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${PRICE_TOKEN_IDS}&vs_currencies=usd`,
        { headers: { Accept: 'application/json' } }
      );
      if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
      const data = await res.json();
      // data looks like: { binancecoin: { usd: 600 }, ... }
      const parsed: TokenPrices = { ...FALLBACK_PRICES };
      for (const [id, val] of Object.entries(data)) {
        if (val && typeof (val as any).usd === 'number') {
          parsed[id] = (val as any).usd;
        }
      }
      cachedPrices = parsed;
      cacheTimestamp = now;
      setPrices(parsed);
      setError(null);
    } catch (e: any) {
      console.warn('Price fetch failed, using last known / fallback:', e.message);
      setError(e.message);
      // Keep current prices (fallback or previously fetched)
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, CACHE_TTL_MS);
    return () => clearInterval(interval);
  }, [fetchPrices]);

  /** Get USD price for a token symbol. Returns 1 for stablecoins, undefined if unknown. */
  const getPrice = useCallback(
    (symbol: string): number => {
      const cgId = SYMBOL_TO_CG_ID[symbol.toUpperCase()];
      if (!cgId) return 1; // Treat unknown as stablecoin
      return prices[cgId] ?? FALLBACK_PRICES[cgId] ?? 1;
    },
    [prices]
  );

  return { prices, getPrice, loading, error, refetch: fetchPrices };
}
