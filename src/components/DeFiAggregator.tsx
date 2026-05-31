import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useConnectWallet } from '@web3-onboard/react';
import { ethers } from 'ethers';
import { useBeefyLive, BeefyVault } from '../hooks/useBeefyLive';
import { getZapInRoute, getZapOutRoute, buildZapTransaction } from '../utils/zapEngine';
import { 
  Search, Info, Sparkles, CheckCircle2, ArrowDownCircle, 
  ArrowUpCircle, Wallet, TrendingUp, Shield, HelpCircle, Flame, ExternalLink, RefreshCw, ZapOff
} from 'lucide-react';

const ERC20_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)"
];

const BEEFY_VAULT_ABI = [
  ...ERC20_ABI,
  "function deposit(uint256 _amount) public",
  "function depositAll() public",
  "function withdrawAll() public",
  "function getPricePerFullShare() view returns (uint256)"
];

// Indirizzi Factory ufficiali di BSC per la risoluzione delle pool V3/CLM
const PCS_V3_FACTORY_ADDRESS = "0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865";
const UNI_V3_FACTORY_ADDRESS = "0xdB1d10011AD0F69208368f7d06e153118BA8b793";
const THENA_V3_FACTORY_ADDRESS = "0x30055F87716d3DFD0E5198C27024481099fB4A98";

const PCS_UNI_FACTORY_ABI = [
  "function getPool(address tokenA, address tokenB, uint24 fee) view returns (address)"
];

const THENA_FACTORY_ABI = [
  "function poolByPair(address tokenA, address tokenB) view returns (address)"
];

export default function DeFiAggregator() {
  const [{ wallet }] = useConnectWallet();
  const { vaults, loading, globalTvl } = useBeefyLive();
  
  // UI States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVault, setSelectedVault] = useState<BeefyVault | null>(null);
  const [activeTab, setActiveTab] = useState<'DEPOSIT' | 'WITHDRAW'>('DEPOSIT');
  const [filterType, setFilterType] = useState<'ALL' | 'STABLES' | 'HIGH_YIELD' | 'BLUECHIP'>('ALL');

  // Input & Transaction States
  const [amount, setAmount] = useState('');
  const [slippage, setSlippage] = useState(150); // 1.5%
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [stepIndex, setStepIndex] = useState<number>(0);

  // Balances
  const [walletBnb, setWalletBnb] = useState('0.00');
  const [walletLp, setWalletLp] = useState('0.00'); 
  const [vaultMooToken, setVaultMooToken] = useState('0.00');
  const [vaultValueUsd, setVaultValueUsd] = useState(0);

  // Risolutore Dinamico On-Chain
  const [resolvedPoolAddress, setResolvedPoolAddress] = useState<string | null>(null);
  const [isResolvingPool, setIsResolvingPool] = useState(false);

  // Portfolio tracking
  const [userPortfolio, setUserPortfolio] = useState<{ [vaultId: string]: number }>({});
  const [portfolioLoading, setPortfolioLoading] = useState(false);

  const userAddress = wallet?.accounts[0]?.address;

  // Rileva se il vault selezionato è Concentrated Liquidity (CLM)
  const isClmVault = useMemo(() => {
    if (!selectedVault) return false;
    const nameLower = selectedVault.name.toLowerCase();
    const platformLower = selectedVault.platformId.toLowerCase();
    return nameLower.includes('clm') || platformLower.includes('clm') || nameLower.includes('clmm');
  }, [selectedVault]);

  // Seleziona l'indirizzo della pool finale per lo Zap (Priorità a quello risolto on-chain o a quello del DB)
  const activePoolAddressForZap = useMemo(() => {
    if (!selectedVault) return null;
    return resolvedPoolAddress || selectedVault.underlyingPoolAddress || selectedVault.tokenAddress;
  }, [selectedVault, resolvedPoolAddress]);

  // Se lo Zap è disponibile per questo vault (sempre per V2, oppure se risolto on-chain/DB per V3)
  const isZapAvailable = useMemo(() => {
    if (!selectedVault) return false;
    if (!isClmVault) return true;
    return !!activePoolAddressForZap && activePoolAddressForZap.startsWith('0x');
  }, [selectedVault, isClmVault, activePoolAddressForZap]);

  // Resetta la pool risolta quando si cambia il vault selezionato
  useEffect(() => {
    setResolvedPoolAddress(null);
  }, [selectedVault]);

  // Fetch balances & Risoluzione on-chain della pool reale
  const fetchBalances = useCallback(async () => {
    if (!wallet || !userAddress) return;
    try {
      const provider = new ethers.providers.Web3Provider(wallet.provider as any);
      const bnbBal = await provider.getBalance(userAddress);
      setWalletBnb(parseFloat(ethers.utils.formatEther(bnbBal)).toFixed(4));

      if (selectedVault) {
        const lpContract = new ethers.Contract(selectedVault.tokenAddress, ERC20_ABI, provider);
        const lpBal = await lpContract.balanceOf(userAddress).catch(() => ethers.constants.Zero);
        setWalletLp(ethers.utils.formatUnits(lpBal, 18));

        const vaultContract = new ethers.Contract(selectedVault.earnContractAddress, BEEFY_VAULT_ABI, provider);
        const mooBal = await vaultContract.balanceOf(userAddress).catch(() => ethers.constants.Zero);
        setVaultMooToken(ethers.utils.formatUnits(mooBal, 18));

        if (mooBal.gt(0)) {
          const pricePerShare = await vaultContract.getPricePerFullShare().catch(() => ethers.utils.parseUnits("1", 18));
          const underlyingLp = mooBal.mul(pricePerShare).div(ethers.constants.WeiPerEther);
          const lpFloat = parseFloat(ethers.utils.formatUnits(underlyingLp, 18));
          setVaultValueUsd(lpFloat * selectedVault.lpPrice);
        } else {
          setVaultValueUsd(0);
        }

        // RISOLUZIONE ON-CHAIN DINAMICA: se la pool è "n/d" cerchiamo l'indirizzo nei contratti Factory di BSC
        if (isClmVault && !selectedVault.underlyingPoolAddress && selectedVault.token0Address && selectedVault.token1Address && !resolvedPoolAddress && !isResolvingPool) {
          setIsResolvingPool(true);
          const t0 = selectedVault.token0Address;
          const t1 = selectedVault.token1Address;
          const dex = selectedVault.kyberDex || 'DEX_PANCAKESWAPV3';
          
          let foundPool: string | null = null;
          
          try {
            if (dex === 'DEX_PANCAKESWAPV3') {
              const contract = new ethers.Contract(PCS_V3_FACTORY_ADDRESS, PCS_UNI_FACTORY_ABI, provider);
              const fees = [100, 500, 2500, 10000];
              for (const fee of fees) {
                const pool = await contract.getPool(t0, t1, fee).catch(() => ethers.constants.AddressZero);
                if (pool && pool !== ethers.constants.AddressZero) {
                  foundPool = pool.toLowerCase();
                  break;
                }
              }
            } else if (dex === 'DEX_UNISWAPV3') {
              const contract = new ethers.Contract(UNI_V3_FACTORY_ADDRESS, PCS_UNI_FACTORY_ABI, provider);
              const fees = [100, 500, 3000, 10000];
              for (const fee of fees) {
                const pool = await contract.getPool(t0, t1, fee).catch(() => ethers.constants.AddressZero);
                if (pool && pool !== ethers.constants.AddressZero) {
                  foundPool = pool.toLowerCase();
                  break;
                }
              }
            } else if (dex === 'DEX_THENA_FUSION') {
              const contract = new ethers.Contract(THENA_V3_FACTORY_ADDRESS, THENA_FACTORY_ABI, provider);
              const pool = await contract.poolByPair(t0, t1).catch(() => ethers.constants.AddressZero);
              if (pool && pool !== ethers.constants.AddressZero) {
                foundPool = pool.toLowerCase();
              }
            }
          } catch (err) {
            console.error("Errore durante la scansione della pool:", err);
          } finally {
            setIsResolvingPool(false);
          }

          if (foundPool) {
            setResolvedPoolAddress(foundPool);
          }
        }
      }
    } catch (e) { 
      console.error("Errore durante la lettura dei saldi on-chain:", e); 
    }
  }, [wallet, userAddress, selectedVault, isClmVault, resolvedPoolAddress, isResolvingPool]);

  // Scan user balances across active vaults
  const scanUserPortfolio = useCallback(async () => {
    if (!wallet || !userAddress || vaults.length === 0) return;
    setPortfolioLoading(true);
    const portfolioMap: { [vaultId: string]: number } = {};
    try {
      const provider = new ethers.providers.Web3Provider(wallet.provider as any);
      
      const scanPromises = vaults.slice(0, 30).map(async (vault) => {
        try {
          const vaultContract = new ethers.Contract(vault.earnContractAddress, BEEFY_VAULT_ABI, provider);
          const mooBal = await vaultContract.balanceOf(userAddress);
          if (mooBal.gt(0)) {
            const pricePerShare = await vaultContract.getPricePerFullShare();
            const underlyingLp = mooBal.mul(pricePerShare).div(ethers.constants.WeiPerEther);
            const lpFloat = parseFloat(ethers.utils.formatUnits(underlyingLp, 18));
            const valueUsd = lpFloat * vault.lpPrice;
            if (valueUsd > 0.1) {
              portfolioMap[vault.id] = valueUsd;
            }
          }
        } catch (err) {
          // Salta silenziosamente
        }
      });
      await Promise.all(scanPromises);
      setUserPortfolio(portfolioMap);
    } catch (e) {
      console.error("Errore scansione portafoglio:", e);
    } finally {
      setPortfolioLoading(false);
    }
  }, [wallet, userAddress, vaults]);

  useEffect(() => { 
    fetchBalances(); 
  }, [fetchBalances]);

  useEffect(() => {
    if (userAddress && vaults.length > 0) {
      scanUserPortfolio();
    }
  }, [userAddress, vaults, scanUserPortfolio]);

  // Calculators
  const portfolioTotalValue = useMemo(() => {
    let total = 0;
    for (const key in userPortfolio) {
      if (Object.prototype.hasOwnProperty.call(userPortfolio, key)) {
        const val = userPortfolio[key];
        if (typeof val === 'number') {
          total += val;
        }
      }
    }
    return total;
  }, [userPortfolio]);

  const averageApy = useMemo(() => {
    let totalValue = 0;
    let weightedApySum = 0;
    for (const id in userPortfolio) {
      if (Object.prototype.hasOwnProperty.call(userPortfolio, id)) {
        const value = userPortfolio[id];
        if (typeof value === 'number') {
          const v = vaults.find(vault => vault.id === id);
          if (v) {
            totalValue += value;
            weightedApySum += v.apy * value;
          }
        }
      }
    }
    return totalValue > 0 ? parseFloat((weightedApySum / totalValue).toFixed(2)) : 0;
  }, [userPortfolio, vaults]);

  const dailyEarnings = useMemo(() => {
    return portfolioTotalValue > 0 ? (portfolioTotalValue * (averageApy / 100)) / 365 : 0;
  }, [portfolioTotalValue, averageApy]);

  // Step 1: Zap In BNB -> LP Tokens
  const handleZapIn = async () => {
    if (!wallet || !userAddress || !selectedVault || !amount || !activePoolAddressForZap) return;
    setIsProcessing(true);
    setStepIndex(1);
    setStatusMessage(`Ricerca rotta ottimale per ${selectedVault.token}...`);

    try {
      const provider = new ethers.providers.Web3Provider(wallet.provider as any);
      const signer = provider.getSigner();
      const rawAmount = ethers.utils.parseUnits(amount, 18).toString();

      const targetDex = selectedVault.kyberDex || 'DEX_PANCAKESWAPV2';

      const routeData = await getZapInRoute({
        poolAddress: activePoolAddressForZap,
        amountInRaw: rawAmount,
        slippageBps: slippage,
        userAddress: userAddress,
        dex: targetDex
      });

      setStatusMessage("Generazione transazione e firma con MetaMask...");
      const txData = await buildZapTransaction(userAddress, routeData, 'in');

      const tx = await signer.sendTransaction({
        to: txData.routerAddress || txData.to,
        data: txData.callData || txData.data,
        value: ethers.BigNumber.from(rawAmount)
      });

      setStatusMessage("Generazione dell'LP token sulla rete BNB Chain...");
      const receipt = await tx.wait();
      if (receipt.status === 0) throw new Error("Transazione di Zap fallita on-chain.");

      setStatusMessage("Conversione completata! LP Token generati con successo.");
      setAmount('');
      setStepIndex(2);
      fetchBalances(); 
    } catch (err: any) {
      setStatusMessage("Errore Zap: " + (err.reason || err.message));
      setStepIndex(0);
    } finally {
      setIsProcessing(false);
    }
  };

  // Step 2: Deposita gli LP in Beefy
  const handleDepositBeefy = async () => {
    if (!wallet || !userAddress || !selectedVault) return;
    setIsProcessing(true);
    setStatusMessage("Avvio interazione con il Vault Beefy...");

    try {
      const provider = new ethers.providers.Web3Provider(wallet.provider as any);
      const signer = provider.getSigner();

      if (isClmVault && !isZapAvailable) {
        // Deposito Diretto di BNB (per i CLM in cui non siamo riusciti a mappare o risolvere la pool)
        const rawAmount = ethers.utils.parseUnits(amount, 18);
        setStatusMessage("Firma il deposito diretto di BNB...");
        const vaultContract = new ethers.Contract(selectedVault.earnContractAddress, BEEFY_VAULT_ABI, signer);
        const tx = await vaultContract.deposit(rawAmount, { value: rawAmount });
        await tx.wait();
      } else {
        // Deposito classico di LP (sia Standard V2, sia CLM V3 con pool risolta on-chain)
        const lpContract = new ethers.Contract(selectedVault.tokenAddress, ERC20_ABI, signer);
        const rawLpBal = ethers.utils.parseUnits(walletLp, 18);

        setStatusMessage("Verifica permessi di spending per il Vault...");
        const allowance = await lpContract.allowance(userAddress, selectedVault.earnContractAddress);
        
        if (allowance.lt(rawLpBal)) {
          setStatusMessage("Firma per autorizzare l'uso dei tuoi LP...");
          const approveTx = await lpContract.approve(selectedVault.earnContractAddress, ethers.constants.MaxUint256);
          await approveTx.wait();
        }

        setStatusMessage("Firma il deposito nel Vault Beefy (Auto-Compounder)...");
        const vaultContract = new ethers.Contract(selectedVault.earnContractAddress, BEEFY_VAULT_ABI, signer);
        const tx = await vaultContract.depositAll();
        await tx.wait();
      }

      setStatusMessage("Fondi depositati correttamente! L'auto-compound è ora attivo.");
      setAmount('');
      setStepIndex(0);
      fetchBalances();
      scanUserPortfolio();
    } catch (err: any) {
      setStatusMessage("Errore Deposito: " + (err.reason || err.message));
    } finally {
      setIsProcessing(false);
    }
  };

  // Withdraw
  const handleWithdrawBeefy = async () => {
    if (!wallet || !userAddress || !selectedVault) return;
    setIsProcessing(true);
    setStatusMessage("Esecuzione del prelievo dal Vault Beefy...");
    try {
      const provider = new ethers.providers.Web3Provider(wallet.provider as any);
      const signer = provider.getSigner();
      const vaultContract = new ethers.Contract(selectedVault.earnContractAddress, BEEFY_VAULT_ABI, signer);
      
      setStatusMessage("Firma la transazione di ritiro per ottenere i tuoi fondi...");
      const tx = await vaultContract.withdrawAll();
      await tx.wait();

      setStatusMessage("Fondi ritirati con successo!");
      fetchBalances();
      scanUserPortfolio();
    } catch (err: any) {
      setStatusMessage("Errore Prelievo: " + (err.reason || err.message));
    } finally {
      setIsProcessing(false);
    }
  };

  // Zap Out LP -> BNB
  const handleZapOut = async () => {
    if (!wallet || !userAddress || !selectedVault || !activePoolAddressForZap) return;
    setIsProcessing(true);
    setStatusMessage("Conversione dei tuoi LP in BNB nativi...");
    try {
      const provider = new ethers.providers.Web3Provider(wallet.provider as any);
      const signer = provider.getSigner();
      const rawLpBal = ethers.utils.parseUnits(walletLp, 18).toString();

      const targetDex = selectedVault.kyberDex || 'DEX_PANCAKESWAPV2';

      const routeData = await getZapOutRoute({
        poolAddress: activePoolAddressForZap,
        amountInRaw: rawLpBal,
        slippageBps: slippage,
        userAddress: userAddress,
        dex: targetDex
      });
      const routerAddress = routeData.routerAddress || routeData.route?.routerAddress;

      setStatusMessage("Verifica autorizzazioni per Kyber Router...");
      const lpContract = new ethers.Contract(selectedVault.tokenAddress, ERC20_ABI, signer);
      const allowance = await lpContract.allowance(userAddress, routerAddress);
      
      if (allowance.lt(rawLpBal)) {
        const approveTx = await lpContract.approve(routerAddress, ethers.constants.MaxUint256);
        await approveTx.wait();
      }

      setStatusMessage("Firma la transazione di Zap Out per la restituzione dei BNB...");
      const txData = await buildZapTransaction(userAddress, routeData, 'out');
      const tx = await signer.sendTransaction({
        to: txData.routerAddress || txData.to,
        data: txData.callData || txData.data
      });

      setStatusMessage("Smantellamento LP e ricezione dei BNB...");
      await tx.wait();

      setStatusMessage("Conversione terminata. BNB disponibili nel wallet.");
      fetchBalances();
      scanUserPortfolio();
    } catch (err: any) {
      setStatusMessage("Errore Zap Out: " + (err.reason || err.message));
    } finally {
      setIsProcessing(false);
    }
  };

  // Filters
  const filteredVaults = useMemo(() => {
    return vaults.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.token.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;

      if (filterType === 'STABLES') {
        return p.name.includes('USDT') || p.name.includes('USDC') || p.name.includes('BUSD') || p.name.includes('DAI');
      }
      if (filterType === 'HIGH_YIELD') {
        return p.apy > 50;
      }
      if (filterType === 'BLUECHIP') {
        return p.name.includes('ETH') || p.name.includes('BTC') || p.name.includes('BNB');
      }
      return true;
    });
  }, [vaults, searchTerm, filterType]);

  const hasLpTokens = parseFloat(walletLp) > 0.00001;
  const hasDeposited = parseFloat(vaultMooToken) > 0.00001;

  return (
    <div className="w-full text-slate-100 bg-[#0d0e12] font-sans min-h-screen selection:bg-emerald-500 selection:text-black">
      {/* Top Navbar */}
      <header className="border-b border-[#222431] bg-[#12131a] p-4 sticky top-0 z-40 flex justify-between items-center shadow-lg backdrop-blur-md bg-opacity-95">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-gradient-to-tr from-[#00ff88] to-[#00b0ff] rounded-xl flex items-center justify-center font-bold text-black shadow-md shadow-emerald-500/10">B</div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight">BEEFY <span className="text-[#00ff88] font-medium text-xs px-2 py-0.5 bg-emerald-950/40 border border-emerald-800 rounded ml-2">BSC PORTAL</span></h1>
            <p className="text-[10px] text-slate-500 font-mono tracking-wider">SECURE AUTO-COMPOUNDER YIELD GATEWAY</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 bg-[#181922] border border-[#222431] px-3 py-1.5 rounded-lg text-xs font-mono">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-slate-400">BSC Global TVL:</span>
            <span className="text-[#00ff88] font-bold">${globalTvl.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* User Portfolio & Stats Dashboard */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-[#12131a] p-5 rounded-2xl border border-[#222431] flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>PORTFOLIO NET WORTH</span>
              <Wallet className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="mt-2">
              {portfolioLoading ? (
                <div className="h-8 w-24 bg-slate-800 animate-pulse rounded"></div>
              ) : (
                <h3 className="text-2xl font-black text-white font-mono">
                  ${portfolioTotalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h3>
              )}
              <p className="text-[10px] text-slate-500 mt-1 uppercase font-semibold">Live in active BSC Vaults</p>
            </div>
          </div>

          <div className="bg-[#12131a] p-5 rounded-2xl border border-[#222431] flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>WEIGHTED APY</span>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="mt-2">
              <h3 className="text-2xl font-black text-[#00ff88] font-mono">
                {averageApy > 0 ? `${averageApy}%` : '0.00%'}
              </h3>
              <p className="text-[10px] text-slate-500 mt-1 uppercase font-semibold">Auto-compounding weighted average</p>
            </div>
          </div>

          <div className="bg-[#12131a] p-5 rounded-2xl border border-[#222431] flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>ESTIMATED DAILY YIELD</span>
              <Flame className="h-4 w-4 text-[#00ff88]" />
            </div>
            <div className="mt-2">
              <h3 className="text-2xl font-black text-white font-mono">
                ${dailyEarnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <p className="text-[10px] text-slate-500 mt-1 uppercase font-semibold">≈ ${(dailyEarnings * 30).toLocaleString('en-US', { maximumFractionDigits: 0 })} / Month</p>
            </div>
          </div>

          <div className="bg-[#12131a] p-5 rounded-2xl border border-[#222431] flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>ZAP CONVERSION FEE</span>
              <Shield className="h-4 w-4 text-[#00b0ff]" />
            </div>
            <div className="mt-2">
              <h3 className="text-2xl font-black text-slate-200 font-mono">0.20%</h3>
              <p className="text-[10px] text-slate-500 mt-1 uppercase font-semibold">Partner Routing Commission</p>
            </div>
          </div>
        </section>

        {/* Dashboard Vaults + Action Interface */}
        <section className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          {/* Left Column: Vault Search, Filters and Live List */}
          <div className="xl:col-span-2 space-y-4">
            
            {/* Filter Navigation */}
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-[#12131a] p-4 rounded-2xl border border-[#222431]">
              <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto">
                {(['ALL', 'STABLES', 'BLUECHIP', 'HIGH_YIELD'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 uppercase tracking-wider ${
                      filterType === type 
                        ? 'bg-[#00ff88]/10 text-[#00ff88] border border-[#00ff88]/30 shadow-sm' 
                        : 'bg-[#181922] text-slate-400 border border-transparent hover:text-white hover:bg-[#222431]'
                    }`}
                  >
                    {type.replace('_', ' ')}
                  </button>
                ))}
              </div>
              
              <div className="flex items-center gap-3 bg-[#181922] px-3 py-2 rounded-xl border border-[#222431] w-full sm:w-64">
                <Search className="text-slate-500 h-4 w-4 shrink-0" />
                <input 
                  type="text" 
                  placeholder="Cerca token o piattaforma..." 
                  className="bg-transparent w-full outline-none text-xs text-white" 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Live Vault List */}
            {loading ? (
              <div className="py-20 text-center text-slate-500 font-mono text-xs flex flex-col items-center justify-center gap-3 bg-[#12131a] border border-[#222431] rounded-2xl">
                <RefreshCw className="h-6 w-6 animate-spin text-emerald-500" />
                <span>Sincronizzazione API e contratti di Beefy...</span>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {filteredVaults.map(vault => {
                  const isSelected = selectedVault?.id === vault.id;
                  const activeDeposit = userPortfolio[vault.id] || 0;
                  const isVaultClm = vault.name.toLowerCase().includes('clm') || vault.platformId.toLowerCase().includes('clm');

                  return (
                    <div 
                      key={vault.id} 
                      onClick={() => {
                        setSelectedVault(vault); 
                        setAmount('');
                        setStepIndex(0);
                      }} 
                      className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                        isSelected 
                          ? 'bg-[#1b2a24] border-[#00ff88] shadow-md shadow-emerald-500/5' 
                          : 'bg-[#12131a] border-[#222431] hover:border-slate-600'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-slate-800 rounded-xl flex items-center justify-center font-bold text-xs uppercase text-emerald-400 border border-slate-700">
                            {vault.platformId.substring(0, 3)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-white text-sm">{vault.name}</h4>
                              <span className="text-[9px] text-slate-400 font-mono uppercase bg-[#181922] px-2 py-0.5 rounded border border-[#222431]">
                                {vault.platformId}
                              </span>
                              {isVaultClm && (
                                <span className="text-[9px] text-[#00b0ff] font-bold uppercase bg-[#00b0ff]/10 px-1.5 py-0.5 rounded border border-[#00b0ff]/20">
                                  CLM V3
                                </span>
                              )}
                              {vault.isVerified && (
                                <span className="text-[9px] text-emerald-400 font-bold uppercase bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-800">
                                  ✓ Verificato
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1 font-mono">
                              <span>Liquidity: {vault.tvl}</span>
                              {activeDeposit > 0 && (
                                <span className="text-[#00ff88] font-semibold bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-800">
                                  Saldo: ${activeDeposit.toFixed(2)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-6 text-right border-t sm:border-0 border-slate-800/60 pt-2 sm:pt-0">
                          <div className="text-left sm:text-right">
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">DAILY compounded</p>
                            <p className="text-sm font-semibold text-slate-300 font-mono">{(vault.apy / 365).toFixed(3)}%</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">APY Composto</p>
                            <p className="text-xl font-black text-[#00ff88] font-mono">{vault.apy}%</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {filteredVaults.length === 0 && (
                  <div className="py-16 text-center text-slate-500 text-xs bg-[#12131a] border border-[#222431] rounded-2xl">
                    Nessuna cassaforte BSC corrisponde ai filtri impostati.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Interaction Hub & Zap Panel */}
          <div className="bg-[#12131a] border border-[#222431] rounded-3xl p-6 shadow-xl h-fit relative overflow-hidden">
            <h3 className="font-bold text-base mb-4 flex items-center gap-2 text-white">
              <Sparkles className="text-[#00ff88] h-5 w-5" /> Gestione Posizione Vault
            </h3>

            {!selectedVault ? (
              <div className="text-center py-16 text-slate-500 text-xs space-y-2">
                <p>Seleziona un vault dalla lista a sinistra per avviare lo Zap, depositare o ritirare i tuoi fondi.</p>
                <div className="h-12 w-12 rounded-full border-2 border-dashed border-slate-700 flex items-center justify-center mx-auto text-slate-600">?</div>
              </div>
            ) : (
              <div className="space-y-4">
                
                {/* Vault Specs */}
                <div className="bg-[#181922] p-4 rounded-2xl border border-[#222431] space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Vault Target:</span>
                    <span className="font-bold text-white text-right">{selectedVault.name}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">APY Reale Composto:</span>
                    <span className="font-bold text-[#00ff88] font-mono">{selectedVault.apy}%</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Oracle Price:</span>
                    <span className="font-mono text-slate-300">${selectedVault.lpPrice.toFixed(4)}</span>
                  </div>
                  {isClmVault && (
                    <div className="flex justify-between items-center text-[10px] text-slate-500">
                      <span>Stato Riconoscimento Pool:</span>
                      {activePoolAddressForZap ? (
                        <span className="text-emerald-400 font-bold font-mono">
                          {resolvedPoolAddress ? "Risolto On-Chain ✓" : "Verificato nel DB ✓"}
                        </span>
                      ) : (
                        <span className="text-amber-500 font-bold animate-pulse">Risoluzione in corso...</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Tabs selection */}
                <div className="flex border-b border-[#222431] mb-2">
                  <button 
                    onClick={() => { setActiveTab('DEPOSIT'); setStepIndex(0); }} 
                    className={`flex-1 pb-2.5 text-center font-bold text-xs flex items-center justify-center gap-1.5 ${
                      activeTab === 'DEPOSIT' ? 'text-[#00ff88] border-b-2 border-[#00ff88]' : 'text-slate-500'
                    }`}
                  >
                    <ArrowDownCircle className="w-4 h-4" /> DEPOSIT & ZAP
                  </button>
                  <button 
                    onClick={() => { setActiveTab('WITHDRAW'); setStepIndex(0); }} 
                    className={`flex-1 pb-2.5 text-center font-bold text-xs flex items-center justify-center gap-1.5 ${
                      activeTab === 'WITHDRAW' ? 'text-rose-500 border-b-2 border-rose-500' : 'text-slate-500'
                    }`}
                  >
                    <ArrowUpCircle className="w-4 h-4" /> PRELEVA LP / ZAP OUT
                  </button>
                </div>

                {/* Main Interactive Workspaces */}
                {activeTab === 'DEPOSIT' ? (
                  <div className="space-y-4">
                    
                    {!isZapAvailable ? (
                      /* FLUSSO CLM V3 ADATTIVO IN CASO DI ERRORE DI SCANSIONE: Deposito Diretto */
                      <div className="space-y-4">
                        <div className="bg-emerald-950/20 p-4 rounded-xl border border-emerald-900/30">
                          <h4 className="text-xs font-bold text-white flex items-center gap-1.5 mb-2">
                            <ZapOff size={14} className="text-amber-400"/> Deposito Diretto CLM V3
                          </h4>
                          <p className="text-[11px] text-slate-400 leading-normal">
                            Scansione dei Factory V3 in corso o pool non ancora disponibile. Puoi depositare i tuoi BNB direttamente nel contratto Beefy in un click senza passare per lo Zap.
                          </p>
                        </div>

                        <div className="space-y-3">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-400">Importo da Depositare (BNB):</span>
                            <span className="font-mono text-slate-300">Saldo: {walletBnb}</span>
                          </div>
                          <div className="relative">
                            <input 
                              type="text" 
                              value={amount} 
                              onChange={e => setAmount(e.target.value)} 
                              placeholder="0.00 BNB" 
                              className="w-full bg-[#181922] border border-[#222431] rounded-xl p-3 text-white text-sm outline-none font-mono focus:border-[#00ff88]"
                            />
                            <button 
                              type="button" 
                              onClick={() => setAmount(walletBnb)} 
                              className="absolute right-3 top-3 text-[#00ff88] font-bold text-[10px] hover:text-white bg-[#00ff88]/10 px-2 py-1 rounded"
                            >
                              MAX
                            </button>
                          </div>

                          <button 
                            onClick={handleDepositBeefy} 
                            disabled={isProcessing || !amount || parseFloat(amount) <= 0} 
                            className="w-full bg-[#00ff88] text-black font-extrabold py-3 rounded-xl hover:opacity-95 transition disabled:opacity-40 text-xs uppercase tracking-wider"
                          >
                            {isProcessing ? "Elaborazione deposito..." : "Conferma Deposito CLM Diretto"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* FLUSSO AUTOMATICO COMPLETO: Kyber Zap + Beefy Deposit */
                      <div className="space-y-4">
                        {hasLpTokens && (
                          <div className="bg-[#00ff88]/10 p-4 rounded-xl border border-[#00ff88]/20 flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-[#00ff88] shrink-0 mt-0.5" />
                            <div className="text-xs">
                              <p className="font-bold text-white mb-1">Step 2: Deposito in Beefy pronto</p>
                              <p className="text-slate-300 leading-normal mb-3">
                                Hai <strong>{parseFloat(walletLp).toFixed(5)} {selectedVault.token}</strong> nel wallet. Depositali nel Vault per attivare l'auto-compounder.
                              </p>
                              <button 
                                onClick={handleDepositBeefy} 
                                disabled={isProcessing} 
                                className="w-full bg-[#00ff88] text-black font-extrabold py-2.5 rounded-lg hover:opacity-95 transition disabled:opacity-50 text-xs uppercase tracking-wider"
                              >
                                {isProcessing ? "Elaborazione deposito..." : "Conferma Deposito nel Vault"}
                              </button>
                            </div>
                          </div>
                        )}

                        {!hasLpTokens && (
                          <div className="space-y-3">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-slate-400">Paga con BNB:</span>
                              <span className="font-mono text-slate-300">Saldo: {walletBnb}</span>
                            </div>
                            <div className="relative">
                              <input 
                                type="text" 
                                value={amount} 
                                onChange={e => setAmount(e.target.value)} 
                                placeholder="0.00 BNB" 
                                className="w-full bg-[#181922] border border-[#222431] rounded-xl p-3 text-white text-sm outline-none font-mono focus:border-[#00ff88]"
                              />
                              <button 
                                type="button" 
                                onClick={() => setAmount(walletBnb)} 
                                className="absolute right-3 top-3 text-[#00ff88] font-bold text-[10px] hover:text-white bg-[#00ff88]/10 px-2 py-1 rounded"
                              >
                                MAX
                              </button>
                            </div>

                            <div className="flex justify-between items-center text-[10px] text-slate-500 pt-2 border-t border-[#222431] border-dashed">
                              <span>Slippage Tolerance:</span>
                              <select 
                                value={slippage} 
                                onChange={e => setSlippage(Number(e.target.value))} 
                                className="bg-[#181922] text-slate-300 outline-none border border-[#222431] rounded px-1.5 py-0.5 font-mono"
                              >
                                <option value={50}>0.5%</option>
                                <option value={100}>1.0%</option>
                                <option value={150}>1.5%</option>
                                <option value={300}>3.0%</option>
                              </select>
                            </div>

                            <button 
                              onClick={handleZapIn} 
                              disabled={isProcessing || !amount || isResolvingPool} 
                              className="w-full bg-[#181922] text-slate-200 border border-[#222431] font-black py-3 rounded-xl hover:bg-[#222431] transition disabled:opacity-40 text-xs uppercase tracking-wider"
                            >
                              {isProcessing ? "Elaborazione rotta..." : isResolvingPool ? "Scansione Pool in corso..." : `Step 1: Crea LP con Zap`}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  // Withdraw view (Sia V2 che CLM V3)
                  <div className="space-y-4">
                    <div className="bg-[#181922] p-4 rounded-xl border border-[#222431] space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">Share nel Vault:</span>
                        <span className="font-bold text-white font-mono">{parseFloat(vaultMooToken).toFixed(5)} MOO</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">Controvalore Reale:</span>
                        <span className="font-bold text-[#00ff88] font-mono">${vaultValueUsd.toFixed(2)}</span>
                      </div>
                    </div>

                    {hasDeposited ? (
                      <button 
                        onClick={handleWithdrawBeefy} 
                        disabled={isProcessing} 
                        className="w-full bg-rose-950/30 text-rose-400 border border-rose-900/40 font-bold py-3 rounded-xl hover:bg-rose-900 hover:text-white transition disabled:opacity-50 text-xs uppercase tracking-wider"
                      >
                        {isProcessing ? "Prelievo in corso..." : (!isZapAvailable ? "Preleva BNB" : "Step 1: Ritiro LP dal Vault")}
                      </button>
                    ) : (hasLpTokens && isZapAvailable) ? (
                      <div className="bg-amber-950/20 p-4 rounded-xl border border-amber-900/30 space-y-3">
                        <p className="text-xs text-slate-300 leading-normal">
                          Disponi di <strong>{parseFloat(walletLp).toFixed(5)} LP</strong>. Puoi convertirli in BNB nativi in un'unica operazione di Zap-Out.
                        </p>
                        <button 
                          onClick={handleZapOut} 
                          disabled={isProcessing} 
                          className="w-full bg-amber-500 text-black font-extrabold py-2.5 rounded-lg hover:opacity-95 transition disabled:opacity-50 text-xs uppercase tracking-wider"
                        >
                          {isProcessing ? "Smantellamento Zap Out..." : "Step 2: Zap Out (LP -> BNB)"}
                        </button>
                      </div>
                    ) : (
                      <div className="py-6 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                        <HelpCircle className="h-5 w-5 text-slate-600" />
                        <span>Nessun saldo depositato in questo Vault.</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Status Console */}
                {statusMessage && (
                  <div className="p-3 bg-[#181922] rounded-xl border border-[#222431] text-[11px] font-mono text-slate-400 flex items-start gap-2 leading-relaxed">
                    <div className="h-2.5 w-2.5 rounded-full bg-[#00ff88] animate-ping mt-0.5 shrink-0" />
                    <span>{statusMessage}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
