import { useState, useEffect } from 'react';

export interface BeefyVault {
  id: string;
  name: string;
  chain: string;
  tokenAddress: string;
  earnedTokenAddress: string;
  status: string;
  platformId: string;
  assets: string[];
  risk?: string;
  apy: number;
  tvl: number;
  fee: string;
  token0Logo?: string;
  token1Logo?: string;
}

export function useBeefyVaults(chain: string = 'bsc') {
  const [vaults, setVaults] = useState<BeefyVault[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        // Fetch vaults, apys, and tvls concurrently
        const [vaultsRes, apyRes, tvlRes] = await Promise.all([
          fetch('https://api.beefy.finance/vaults').then(r => r.json()),
          fetch('https://api.beefy.finance/apy').then(r => r.json()),
          fetch('https://api.beefy.finance/tvl').then(r => r.json())
        ]);

        const chainVaults = vaultsRes.filter((v: any) => v.chain === chain && v.status === 'active');
        const chainTvls = tvlRes[chain] || {};

        const enrichedVaults = chainVaults.map((v: any) => {
          const apy = apyRes[v.id] || 0;
          const tvl = chainTvls[v.id] || 0;
          
          let risk = 'Medium';
          if (apy > 200) risk = 'High';   // >200% APY
          if (apy > 500) risk = 'Extreme'; // >500% APY
          if (apy < 10) risk = 'Low';      // <10% APY

          return {
            ...v,
            apy: Number((apy * 100).toFixed(2)),
            tvl: Number(tvl),
            risk,
            fee: '0.1%', // Generic fee for UI
            token0Logo: v.assets.length > 0 ? `https://cryptologos.cc/logos/${v.assets[0].toLowerCase()}-${v.assets[0].toLowerCase()}-logo.png?v=025` : undefined,
            token1Logo: v.assets.length > 1 ? `https://cryptologos.cc/logos/${v.assets[1].toLowerCase()}-${v.assets[1].toLowerCase()}-logo.png?v=025` : undefined,
          };
        }).sort((a: any, b: any) => b.tvl - a.tvl); // Sort by TVL to show most popular ones

        setVaults(enrichedVaults.filter((v:any) => v.tvl > 1000));
      } catch (err) {
        console.error("Failed to fetch Beefy vaults", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [chain]);

  return { vaults, loading };
}
