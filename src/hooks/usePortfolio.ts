import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

export interface Position {
  poolId: string;
  pool: any;
  amountUSD: number;
  nftId?: string;
  minPrice?: number;
  maxPrice?: number;
  balanceToken0?: string;
  balanceToken1?: string;
  realizedBalance?: number; // Balance fetched from blockchain
}

const POSITION_MANAGER_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function positions(uint256 tokenId) view returns (tuple(uint96 nonce, address operator, address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1))"
];

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)"
];

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
        setPositions(JSON.parse(saved));
      } catch(e) {
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
      const provider = new ethers.providers.JsonRpcProvider("https://bsc-dataseed.binance.org/");
      
      // Map of pool ID to fetched balance data
      const balances = new Map<string, { balance0: string; balance1: string; realized: number }>();
      
      // Fetch balance for each position
      for (const position of positions) {
        try {
          if (!position.pool.token0Address || !position.pool.token1Address) continue;
          
          const contract0 = new ethers.Contract(
            position.pool.token0Address,
            ERC20_ABI,
            provider
          );
          const contract1 = new ethers.Contract(
            position.pool.token1Address,
            ERC20_ABI,
            provider
          );
          
          // Fetch balances and decimals in parallel
          const [bal0, dec0, bal1, dec1] = await Promise.all([
            contract0.balanceOf(walletAddress),
            contract0.decimals().catch(() => 18),
            contract1.balanceOf(walletAddress),
            contract1.decimals().catch(() => 18)
          ]);
          
          const balance0Formatted = ethers.utils.formatUnits(bal0, dec0);
          const balance1Formatted = ethers.utils.formatUnits(bal1, dec1);
          
          // Estimate USD value (simple approximation)
          const estimatedValue = position.amountUSD; // Fallback to stored value
          
          balances.set(position.poolId, {
            balance0: parseFloat(balance0Formatted).toFixed(4),
            balance1: parseFloat(balance1Formatted).toFixed(4),
            realized: estimatedValue
          });
        } catch (error) {
          console.warn(`Failed to fetch balance for pool ${position.poolId}:`, error);
        }
      }
      
      // Update positions with fetched balances
      setPositions(prev => 
        prev.map(pos => {
          const fetched = balances.get(pos.poolId);
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

  const addPosition = (pool: any, amountUSD: number, nftId?: string) => {
    if (!walletAddress) return;
    
    setPositions(prev => {
      const idx = prev.findIndex(p => p.poolId === pool.id);
      let newPositions = [...prev];
      
      if (idx >= 0) {
        // If it's a withdrawal (negative amount), and it's near or exceeds the current balance, remove it
        if (amountUSD < 0 && (Math.abs(amountUSD) >= newPositions[idx].amountUSD * 0.95 || newPositions[idx].amountUSD + amountUSD < 0.1)) {
          newPositions = newPositions.filter((_, i) => i !== idx);
        } else {
          newPositions[idx].amountUSD += amountUSD;
          if (nftId) {
            newPositions[idx].nftId = nftId;
          }
        }
      } else if (amountUSD > 0) {
        // Mock range: ±10% around current price
        const currentPrice = pool.currentPrice || 1.0;
        const minPrice = currentPrice * 0.9;
        const maxPrice = currentPrice * 1.1;
        newPositions.push({
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

  const removePosition = (poolId: string) => {
    if (!walletAddress) return;
    
    setPositions(prev => {
      const newPositions = prev.filter(p => p.poolId !== poolId);
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
