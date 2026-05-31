/**
 * useBeefyLive — versione statica.
 * Nessuna chiamata a API esterne: usa esclusivamente STATIC_POOLS
 * (gli 8 indirizzi pool verificati dall'utente in constants.ts).
 */
import { STATIC_POOLS, PoolInfo } from "../lib/constants";

export interface BeefyVault {
  id: string;
  name: string;
  token: string;
  tokenAddress: string;
  earnedTokenAddress: string;
  earnContractAddress: string;
  apy: number;
  tvl: string;
  tvlRaw: number;
  lpPrice: number;
  platformId: string;
  oracle: string;
  status: string;

  // Campi arricchiti (già disponibili da STATIC_POOLS)
  token0Name?: string;
  token0Address?: string;
  token1Name?: string;
  token1Address?: string;
  underlyingPoolAddress?: string | null;
  isVerified?: boolean;
  kyberDex?: string;
}

function formatTvl(tvl: number): string {
  if (tvl >= 1_000_000) return `$${(tvl / 1_000_000).toFixed(2)}M`;
  if (tvl >= 1_000) return `$${(tvl / 1_000).toFixed(1)}K`;
  return `$${tvl.toFixed(0)}`;
}

function poolToVault(pool: PoolInfo): BeefyVault {
  return {
    id: pool.id,
    name: pool.name,
    token: `${pool.token0}-${pool.token1}`,
    tokenAddress: pool.id,
    earnedTokenAddress: "",
    earnContractAddress: "",
    apy: pool.apy,
    tvl: formatTvl(pool.tvl),
    tvlRaw: pool.tvl,
    lpPrice: 1,
    platformId: pool.platform,
    oracle: "lp",
    status: "active",
    token0Name: pool.token0,
    token0Address: pool.token0Address ?? "",
    token1Name: pool.token1,
    token1Address: pool.token1Address ?? "",
    underlyingPoolAddress: pool.id,
    isVerified: true,
    kyberDex: pool.dex,
  };
}

// Dati statici calcolati una sola volta all'avvio — zero fetch
const STATIC_VAULTS: BeefyVault[] = STATIC_POOLS.map(poolToVault);
const STATIC_GLOBAL_TVL: number = STATIC_POOLS.reduce(
  (sum, p) => sum + p.tvl,
  0,
);

export function useBeefyLive() {
  return {
    vaults: STATIC_VAULTS,
    loading: false,
    globalTvl: STATIC_GLOBAL_TVL,
  };
}
