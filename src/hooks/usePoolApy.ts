import { useState, useEffect, useCallback } from 'react';

interface PoolApyData {
  id: string;
  apy: number;
  tvl: number;
  source: 'kyber' | 'pancake' | 'beefy' | 'static';
}

/**
 * Fetch real APY data from multiple sources:
 * 1. Kyber Elastic subgraph
 * 2. PancakeSwap V3 subgraph
 * 3. Beefy API
 */
async function fetchApyFromKyber(poolAddresses: string[]): Promise<Map<string, PoolApyData>> {
  const map = new Map<string, PoolApyData>();
  try {
    const poolIdList = poolAddresses.map(addr => `"${addr.toLowerCase()}"`).join(',');
    const query = `
      query {
        pools(where: { id_in: [${poolIdList}], block: { number_gte: 0 } }, first: 1000) {
          id
          address
          totalValueLockedUSD
          feeTier
          poolDayData(first: 1, orderBy: date, orderDirection: desc) {
            volumeUSD
            feesUSD
            date
          }
          token0 { symbol }
          token1 { symbol }
        }
      }
    `;
    
    // Use serverless proxy to avoid CORS issues from browser
    const res = await fetch('/api/proxy-kyber', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ upstream: 'kyber', query }),
      signal: AbortSignal.timeout(6000)
    });
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const pools: any[] = json?.data?.pools ?? [];
    
    for (const pool of pools) {
      const id = pool.id?.toLowerCase() || pool.address?.toLowerCase();
      if (!id) continue;
      
      const tvl = parseFloat(pool.totalValueLockedUSD ?? '0') || 0;
      const dayData = pool.poolDayData?.[0];
      const feesUSD24h = parseFloat(dayData?.feesUSD ?? '0') || 0;
      
      let apy = 0;
      if (tvl > 100 && feesUSD24h >= 0) {
        // APY = (24h fees * 365 * 100) / TVL (in percentage)
        apy = (feesUSD24h * 365 * 100) / Math.max(tvl, 1);
      }
      
      map.set(id, { id, apy: Math.min(apy, 100000), tvl, source: 'kyber' });
    }
  } catch (error) {
    console.warn('Kyber APY fetch failed:', error);
  }
  return map;
}

/**
 * Fetch APY from PancakeSwap V3 subgraph
 */
async function fetchApyFromPancake(poolAddresses: string[]): Promise<Map<string, PoolApyData>> {
  const map = new Map<string, PoolApyData>();
  try {
    const poolIdList = poolAddresses.map(addr => `"${addr.toLowerCase()}"`).join(',');
    const query = `
      query {
        pools(where: { id_in: [${poolIdList}] }, first: 1000) {
          id
          totalValueLockedUSD
          feeTier
          poolDayData(first: 1, orderBy: date, orderDirection: desc) {
            volumeUSD
            feesUSD
          }
          token0 { symbol }
          token1 { symbol }
        }
      }
    `;
    
    const res = await fetch('/api/proxy-kyber', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ upstream: 'pancake', query }),
      signal: AbortSignal.timeout(6000)
    });
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const pools: any[] = json?.data?.pools ?? [];
    
    for (const pool of pools) {
      const id = pool.id?.toLowerCase();
      if (!id) continue;
      
      const tvl = parseFloat(pool.totalValueLockedUSD ?? '0') || 0;
      const dayData = pool.poolDayData?.[0];
      const feesUSD24h = parseFloat(dayData?.feesUSD ?? '0') || 0;
      
      let apy = 0;
      if (tvl > 100 && feesUSD24h >= 0) {
        apy = (feesUSD24h * 365 * 100) / Math.max(tvl, 1);
      }
      
      map.set(id, { id, apy: Math.min(apy, 100000), tvl, source: 'pancake' });
    }
  } catch (error) {
    console.warn('Pancake APY fetch failed:', error);
  }
  return map;
}

/**
 * Fetch APY from Beefy API for vault pools
 */
async function fetchApyFromBeefy(): Promise<Map<string, PoolApyData>> {
  const map = new Map<string, PoolApyData>();
  try {
    // Fetch Beefy APY data
    const res = await fetch('https://api.beefy.finance/apy', {
      signal: AbortSignal.timeout(6000)
    });
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const apyData: Record<string, number> = await res.json();
    
    // Filter for BSC vaults and map to pool addresses
    for (const [vaultId, apy] of Object.entries(apyData)) {
      if (vaultId.includes('bsc')) {
        // Extract pool address if available from vault ID
        // Format might vary: pool-name-bsc-token0-token1
        map.set(vaultId.toLowerCase(), {
          id: vaultId.toLowerCase(),
          apy: Math.min(parseFloat(apy.toString()) * 100, 100000),
          tvl: 0,
          source: 'beefy'
        });
      }
    }
  } catch (error) {
    console.warn('Beefy APY fetch failed:', error);
  }
  return map;
}

/**
 * Hook to fetch real APY data from multiple sources
 */
export function usePoolApy(poolIds: string[]) {
  const [apyData, setApyData] = useState<Map<string, PoolApyData>>(new Map());
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    if (!poolIds || poolIds.length === 0) return;
    
    setLoading(true);
    try {
      // Fetch from all sources in parallel
      const [kyberData, pancakeData, beefyData] = await Promise.all([
        fetchApyFromKyber(poolIds),
        fetchApyFromPancake(poolIds),
        fetchApyFromBeefy()
      ]);
      
      // Merge results, preferring real/live data over fallbacks
      const merged = new Map<string, PoolApyData>();
      
      // Priority: Kyber > Pancake > Beefy
      for (const [id, data] of kyberData) {
        if (data.apy > 0) merged.set(id, data);
      }
      for (const [id, data] of pancakeData) {
        if (!merged.has(id) && data.apy > 0) {
          merged.set(id, data);
        }
      }
      for (const [id, data] of beefyData) {
        if (!merged.has(id) && data.apy > 0) {
          merged.set(id, data);
        }
      }
      
      setApyData(merged);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('APY data fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, [poolIds]);

  // Fetch on mount and when pool IDs change
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(refresh, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { apyData, loading, lastUpdated, refresh };
}

/**
 * Get APY for a specific pool, with fallback to static value
 */
export function getPoolApy(
  poolId: string,
  apyDataMap: Map<string, PoolApyData> | undefined,
  fallbackApy: number
): { apy: number; source: string } {
  if (!apyDataMap) {
    return { apy: fallbackApy, source: 'static' };
  }

  const data = apyDataMap.get(poolId.toLowerCase());
  if (data && data.apy > 0) {
    return { apy: data.apy, source: data.source };
  }

  return { apy: fallbackApy, source: 'static' };
}
