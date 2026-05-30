import { useState, useEffect } from 'react';

export interface Position {
  poolId: string;
  pool: any;
  amountUSD: number;
  nftId?: string;
  minPrice?: number;
  maxPrice?: number;
}

export function usePortfolio(walletAddress?: string) {
  const [positions, setPositions] = useState<Position[]>([]);

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
          setPositions([]);
      }
    } else {
      setPositions([]);
    }
  }, [walletAddress]);

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
        newPositions.push({ poolId: pool.id, pool, amountUSD, nftId, minPrice, maxPrice });
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

  return { positions, addPosition, removePosition };
}
