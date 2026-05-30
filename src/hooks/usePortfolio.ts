import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { STATIC_POOLS } from '../lib/constants';

export interface Position {
  id: string;
  poolId: string;
  pool: any;
  amountUSD: number;
  nftId?: string;
  minPrice?: number;
  maxPrice?: number;
  balanceToken0?: string;
  balanceToken1?: string;
  realizedBalance?: number; // Balance fetched from blockchain
  dex?: string;
  manager?: string;
}

const POSITION_MANAGER_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
  'function positions(uint256 tokenId) view returns (tuple(uint96 nonce, address operator, address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1))'
];

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)'
];

const V3_DEX_CONFIGS = [
  {
    name: 'PancakeSwap V3',
    manager: '0x46a15b0b27311cedf172ab29e4f4766fbe7f4364',
    factory: '0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865'
  },
  {
    name: 'Uniswap V3',
    manager: '0x7b8A01B39D58278b5DE7e48c8449c9f4F5170613',
    factory: '0xdB1d10011AD0F69208368f7d06e153118BA8b793'
  }
];

const buildPositionId = (poolId: string, nftId?: string) => nftId ? `${poolId}:${nftId}` : poolId;

const isV3Pool = (pool: any) =>
  typeof pool.platform === 'string' && pool.platform.includes('V3') && pool.token0Address && pool.token1Address;

const getLegacyPositionId = (pos: any) => {
  if (pos.id) return pos.id;
  return buildPositionId(pos.poolId || pos.pool?.id || '', pos.nftId);
};

/**
 * Hook to manage user's liquidity positions
 * - Reads from localStorage for persistence
 * - Fetches real balance data from blockchain when wallet connected
 */
export function usePortfolio(walletAddress?: string) {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  // Load from localStorage on mount or when wallet changes
  useEffect(() => {
    if (!walletAddress) {
      setPositions([]);
      return;
    }

    const saved = localStorage.getItem(`portfolio_v1_${walletAddress.toLowerCase()}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as any[];
        setPositions(
          parsed.map((pos) => ({
            ...pos,
            id: getLegacyPositionId(pos),
            poolId: pos.poolId || pos.pool?.id || '',
            amountUSD: typeof pos.amountUSD === 'number' ? pos.amountUSD : parseFloat(pos.amountUSD) || 0
          }))
        );
      } catch (e) {
        console.error('Failed to parse portfolio from localStorage:', e);
        setPositions([]);
      }
    } else {
      setPositions([]);
    }
  }, [walletAddress]);

  // Fetch real balances from blockchain
  useEffect(() => {
    if (!walletAddress || positions.length === 0) return;
    fetchRealBalances();
  }, [walletAddress, positions.length]);

  const fetchRealBalances = async () => {
    if (!walletAddress) return;

    try {
      setLoading(true);
      const provider = new ethers.providers.JsonRpcProvider('https://bsc-dataseed.binance.org/');

      const balances = new Map<string, { balance0: string; balance1: string; realized: number }>();

      for (const position of positions) {
        try {
          if (!position.pool?.token0Address || !position.pool?.token1Address) continue;

          const contract0 = new ethers.Contract(position.pool.token0Address, ERC20_ABI, provider);
          const contract1 = new ethers.Contract(position.pool.token1Address, ERC20_ABI, provider);

          const [bal0, dec0, bal1, dec1] = await Promise.all([
            contract0.balanceOf(walletAddress),
            contract0.decimals().catch(() => 18),
            contract1.balanceOf(walletAddress),
            contract1.decimals().catch(() => 18)
          ]);

          const balance0Formatted = ethers.utils.formatUnits(bal0, dec0);
          const balance1Formatted = ethers.utils.formatUnits(bal1, dec1);
          const estimatedValue = position.amountUSD;

          balances.set(position.id, {
            balance0: parseFloat(balance0Formatted).toFixed(4),
            balance1: parseFloat(balance1Formatted).toFixed(4),
            realized: estimatedValue
          });
        } catch (error) {
          console.warn(`Failed to fetch balance for position ${position.id}:`, error);
        }
      }

      setPositions((prev) =>
        prev.map((pos) => {
          const fetched = balances.get(pos.id);
          return {
            ...pos,
            balanceToken0: fetched?.balance0,
            balanceToken1: fetched?.balance1,
            realizedBalance: fetched?.realized
          };
        })
      );
      setLastFetched(new Date());
    } catch (error) {
      console.error('Failed to fetch real balances:', error);
    } finally {
      setLoading(false);
    }
  };

  const detectExternalDeposits = async () => {
    if (!walletAddress) return;

    try {
      const provider = new ethers.providers.JsonRpcProvider('https://bsc-dataseed.binance.org/');
      const existingIds = new Set(positions.map((pos) => pos.id));
      const detected: Position[] = [];

      for (const config of V3_DEX_CONFIGS) {
        try {
          const positionContract = new ethers.Contract(config.manager, POSITION_MANAGER_ABI, provider);
          const balance = await positionContract.balanceOf(walletAddress);
          const owned = balance.toNumber();
          if (owned <= 0) continue;

          const requestCount = Math.min(owned, 120);
          const tokenIds = await Promise.all(
            Array.from({ length: requestCount }, (_, idx) =>
              positionContract.tokenOfOwnerByIndex(walletAddress, idx).catch(() => null)
            )
          );

          const resolved = await Promise.all(
            tokenIds
              .filter((id): id is ethers.BigNumber => id !== null)
              .map((id) =>
                positionContract.positions(id).catch(() => null)
              )
          );

          for (let i = 0; i < resolved.length; i += 1) {
            const pos = resolved[i] as any;
            const tokenId = tokenIds[i] as ethers.BigNumber;
            if (!pos || !tokenId || !pos.liquidity || pos.liquidity.isZero()) continue;

            const t0 = pos.token0?.toLowerCase();
            const t1 = pos.token1?.toLowerCase();
            const fee = pos.fee;

            const matchingPool = STATIC_POOLS.find((pool) => {
              if (!isV3Pool(pool)) return false;
              const poolT0 = pool.token0Address?.toLowerCase();
              const poolT1 = pool.token1Address?.toLowerCase();
              const poolFee = pool.feeRaw ?? Math.round(parseFloat(pool.fee) * 10000);
              return (
                poolT0 &&
                poolT1 &&
                ((t0 === poolT0 && t1 === poolT1) || (t0 === poolT1 && t1 === poolT0)) &&
                poolFee === fee
              );
            });

            if (!matchingPool) continue;
            const positionId = buildPositionId(matchingPool.id, tokenId.toString());
            if (existingIds.has(positionId)) continue;
            existingIds.add(positionId);

            const estimatedUsd = Math.max(1, matchingPool.tvl * 0.02);
            detected.push({
              id: positionId,
              poolId: matchingPool.id,
              pool: matchingPool,
              amountUSD: parseFloat(estimatedUsd.toFixed(2)),
              nftId: tokenId.toString(),
              minPrice: matchingPool.minPrice,
              maxPrice: matchingPool.maxPrice,
              dex: config.name,
              manager: config.manager,
              realizedBalance: parseFloat(estimatedUsd.toFixed(2))
            });
          }
        } catch (error) {
          // ignore per-dex scanning errors
        }
      }

      if (detected.length > 0) {
        setPositions((prev) => {
          const merged = [...prev, ...detected];
          localStorage.setItem(`portfolio_v1_${walletAddress.toLowerCase()}`, JSON.stringify(merged));
          return merged;
        });
      }
    } catch (err) {
      console.warn('External deposit detection failed:', err);
    }
  };

  useEffect(() => {
    if (!walletAddress) return;
    detectExternalDeposits();
    const id = setInterval(detectExternalDeposits, 60_000);
    return () => clearInterval(id);
  }, [walletAddress, positions.length]);

  const addPosition = (pool: any, amountUSD: number, nftId?: string) => {
    if (!walletAddress) return;

    setPositions((prev) => {
      const id = buildPositionId(pool.id, nftId);
      const idx = prev.findIndex((p) => p.id === id);
      let newPositions = [...prev];

      if (idx >= 0) {
        if (amountUSD < 0 && (Math.abs(amountUSD) >= newPositions[idx].amountUSD * 0.95 || newPositions[idx].amountUSD + amountUSD < 0.1)) {
          newPositions = newPositions.filter((_, i) => i !== idx);
        } else {
          newPositions[idx] = {
            ...newPositions[idx],
            amountUSD: newPositions[idx].amountUSD + amountUSD,
            nftId: nftId ?? newPositions[idx].nftId
          };
        }
      } else if (amountUSD > 0) {
        const currentPrice = pool.currentPrice || 1.0;
        const minPrice = currentPrice * 0.9;
        const maxPrice = currentPrice * 1.1;
        newPositions.push({
          id,
          poolId: pool.id,
          pool,
          amountUSD,
          nftId,
          minPrice,
          maxPrice
        });
      }

      localStorage.setItem(`portfolio_v1_${walletAddress.toLowerCase()}`, JSON.stringify(newPositions));
      return newPositions;
    });
  };

  const removePosition = (id: string) => {
    if (!walletAddress) return;

    setPositions((prev) => {
      const newPositions = prev.filter((p) => p.id !== id);
      localStorage.setItem(`portfolio_v1_${walletAddress.toLowerCase()}`, JSON.stringify(newPositions));
      return newPositions;
    });
  };

  return {
    positions,
    addPosition,
    removePosition,
    loading,
    lastFetched,
    refreshBalances: fetchRealBalances
  };
}
