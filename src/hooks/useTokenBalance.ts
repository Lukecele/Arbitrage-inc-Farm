import { useState, useEffect } from 'react';
import { useConnectWallet } from '@web3-onboard/react';
import { ethers } from 'ethers';

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)"
];

export function useTokenBalance(tokenAddress: string, targetAddress?: string) {
  const [{ wallet }] = useConnectWallet();
  const [balance, setBalance] = useState<string>('0');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchBalance() {
      // Use targetAddress if provided, otherwise fallback to connected wallet
      const address = targetAddress || wallet?.accounts[0].address;
      if (!address) return setBalance('0');
      
      try {
        setLoading(true);
        
        // Create provider - if there's an injected EIP-1193 provider, wrap it with Web3Provider
        let provider;
        if (wallet?.provider) {
          provider = new ethers.providers.Web3Provider(wallet.provider as any);
        } else {
          // Use BSC public RPC as fallback
          provider = new ethers.providers.JsonRpcProvider("https://bsc-dataseed.binance.org/");
        }
        
        if (tokenAddress.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
          const bal = await provider.getBalance(address);
          // format to 4 decimals max for UI
          const formatted = ethers.utils.formatEther(bal);
          setBalance(parseFloat(formatted).toFixed(4));
        } else {
          const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
          const [bal, dec] = await Promise.all([
            contract.balanceOf(address),
            contract.decimals().catch(() => 18) // fallback to 18
          ]);
          const formatted = ethers.utils.formatUnits(bal, dec);
          setBalance(parseFloat(formatted).toFixed(4));
        }
      } catch (e) {
        console.error("Failed to fetch balance:", e);
        setBalance('0');
      } finally {
        setLoading(false);
      }
    }
    fetchBalance();
    
    // Set up polling every 15s
    const interval = setInterval(fetchBalance, 15000);
    return () => clearInterval(interval);
  }, [tokenAddress, wallet, targetAddress]);

  return { balance, loading };
}
