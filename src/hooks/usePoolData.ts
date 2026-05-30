import { useState, useEffect, useCallback } from 'react';
import { PoolInfo, STATIC_POOLS } from '../lib/constants';
import { TokenPrices, SYMBOL_TO_CG_ID } from './useTokenPrices';

/**
 * Enrich static pool definitions with live data:
 *   - currentPrice: derived from live CoinGecko prices (ratio of token0/token1 in USD)
 *   - isInRange: computed against the pool's price range (if set)
 *
 * APY / TVL enrichment from KyberSwap Elastic API is attempted but gracefully
 * degrades to the static seed values when the request fails (rate-limit, CORS, etc.)
 */

function computeCurrentPrice(
  token0Symbol: string,
  token1Symbol: string,
  prices: TokenPrices
): number {
  const p0Id = SYMBOL_TO_CG_ID[token0Symbol.toUpperCase()];
  const p1Id = SYMBOL_TO_CG_ID[token1Symbol.toUpperCase()];
  const p0 = p0Id ? (prices[p0Id] ?? 0) : 1;
  const p1 = p1Id ? (prices[p1Id] ?? 0) : 1;
  if (!p0 || !p1) return 0;
  // Price expressed as "how much token1 per token0"  (same convention as Uniswap/Pancake V3 UI)
  return p0 / p1;
}

interface KyberPoolData {
  id: string;
  apr: number;   // annualized fee APR (0-1 fraction, e.g. 0.15 = 15%)
  tvlUSD: number;
}

// Try to fetch APY + TVL from KyberSwap Elastic subgraph (BSC)
// Falls back silently on error — the UI still works with static seeds.
async function fetchKyberPoolData(poolIds: string[]): Promise<Map<string, KyberPoolData>> {
  const map = new Map<string, KyberPoolData>();
  try {
    const url = `https://zap-api.kyberswap.com/bsc/api/v1/pools?ids=${poolIds.join(',')}&page=1&size=${poolIds.length}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return map;
    const json = await res.json();
    const pools: any[] = json?.data?.pools ?? json?.pools ?? [];
    for (const p of pools) {
      const id = (p.id ?? p.address ?? '').toLowerCase();
      if (!id) continue;
      const apr = parseFloat(p.apr ?? p.feesUSD24h ?? '0');
      const tvl = parseFloat(p.tvlUSD ?? p.totalValueLockedUSD ?? '0');
      map.set(id, { id, apr: isNaN(apr) ? 0 : apr, tvlUSD: isNaN(tvl) ? 0 : tvl });
    }
  } catch {
    // Silently degrade
  }
  return map;
}

export function usePoolData(livePrices: TokenPrices) {
  const [pools, setPools] = useState<PoolInfo[]>(() =>
    STATIC_POOLS.map((p) => ({ ...p }))
  );
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    // 1) Try to get live APY/TVL from KyberSwap for mainstream pools
    const mainPoolIds = STATIC_POOLS
      .filter((p) => p.risk === 'Low' || p.risk === 'Medium')
      .map((p) => p.id.toLowerCase());

    const kyberData = await fetchKyberPoolData(mainPoolIds);

    // 2) Merge everything
    const enriched: PoolInfo[] = STATIC_POOLS.map((base) => {
      const live = kyberData.get(base.id.toLowerCase());

      // APY: use live if meaningful, else keep static seed
      const liveApy = live?.apr && live.apr > 0 ? live.apr * 100 : null;
      const apy = liveApy !== null ? parseFloat(liveApy.toFixed(2)) : base.apy;

      // TVL: use live if meaningful, else keep static seed
      const tvl = live?.tvlUSD && live.tvlUSD > 1000 ? live.tvlUSD : base.tvl;

      // Current price: always computed from live CoinGecko prices
      let currentPrice = base.currentPrice;
      if (base.token0 && base.token1) {
        const computed = computeCurrentPrice(base.token0, base.token1, livePrices);
        if (computed > 0) currentPrice = computed;
      }

      // isInRange: only meaningful when min/maxPrice are set in the pool definition
      let isInRange = base.isInRange;
      if (
        currentPrice &&
        base.minPrice &&
        base.maxPrice &&
        base.minPrice > 0 &&
        base.maxPrice > 0
      ) {
        isInRange = currentPrice >= base.minPrice && currentPrice <= base.maxPrice;
      }

      return { ...base, apy, tvl, currentPrice, isInRange };
    });

    setPools(enriched);
    setLastUpdated(new Date());
  }, [livePrices]);

  // Refresh on mount and whenever live prices change
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Periodic refresh every 30s for price-driven updates
  useEffect(() => {
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, [refresh]);

  return { pools, lastUpdated, refresh };
}
