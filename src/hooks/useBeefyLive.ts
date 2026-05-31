import { useState, useEffect } from 'react';

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
  
  // Dati arricchiti dal Database Locale
  token0Name?: string;
  token0Address?: string;
  token1Name?: string;
  token1Address?: string;
  underlyingPoolAddress?: string | null;
  isVerified?: boolean;
  kyberDex?: string;
}

// Database locale dei contratti e dei pool verificati fornito dall'utente
const LOCAL_CONTRACTS_DB = [
  {n:"4–USDT",t0:"4 / FORM (Four/BinaryX)",a0:"0x0a43fc31a73013089df59194872ecae4cae14444",v0:true,t1:"USDT (BSC-USD)",a1:"0x55d398326f99059fF775485246999027B3197955",v1:true,pool:"n/d — PancakeSwap CLM",vpool:false,p:["ps"],type:"clm",apy:"1.358%",tvl:"$10,838"},
  {n:"PALU–WBNB",t0:"PALU (Palu)",a0:"0x02e75d28a8aa2a0033b8cf866fcf0bb0e1ee4444",v0:true,t1:"WBNB",a1:"0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",v1:true,pool:"0x126fadb82cc4ab91e6cd03accaf209fb6d1ffaab",vpool:true,p:["ps"],type:"clm",apy:"305.198%",tvl:"$0.53"},
  {n:"PUP–WBNB",t0:"PUP",a0:"0x73b84F7E3901F39FC29F3704a03126D317Ab4444",v0:true,t1:"WBNB",a1:"0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",v1:true,pool:"0x8e86a6c334ab270084bf8273d5293488f2578207",vpool:true,p:["ps"],type:"clm",apy:"88.231%",tvl:"$706.30"},
  {n:"PALU–USDT",t0:"PALU (Palu)",a0:"0x02e75d28a8aa2a0033b8cf866fcf0bb0e1ee4444",v0:true,t1:"USDT (BSC-USD)",a1:"0x55d398326f99059fF775485246999027B3197955",v1:true,pool:"n/d — PancakeSwap CLM",vpool:false,p:["ps"],type:"clm",apy:"12.370%",tvl:"$60.98"},
  {n:"USDT–OPG",t0:"USDT (BSC-USD)",a0:"0x55d398326f99059fF775485246999027B3197955",v0:true,t1:"OPG (OpenGradient)",a1:"0x5feCcD17C393CaF1001D18164236A37E731FCb9d",v1:true,pool:"n/d — Uniswap BSC CLM",vpool:false,p:["uni"],type:"clm",apy:"5.906%",tvl:"$195.29"},
  {n:"ZEST–USDT",t0:"ZEST (Zest Protocol)",a0:"0x5506599c722389a60580b5213ea1da60d64754a1",v0:true,t1:"USDT (BSC-USD)",a1:"0x55d398326f99059fF775485246999027B3197955",v1:true,pool:"n/d — Uniswap BSC CLM",vpool:false,p:["uni"],type:"clm",apy:"3.524%",tvl:"$117.25"},
  {n:"ZEC–USDT (Uniswap)",t0:"Binance-Peg ZEC",a0:"0x1ba42e5193dfa8b03d15dd1b86a3113bbbef8eeb",v0:true,t1:"USDT (BSC-USD)",a1:"0x55d398326f99059fF775485246999027B3197955",v1:true,pool:"n/d — Uniswap BSC CLM",vpool:false,p:["uni"],type:"clm",apy:"1.436%",tvl:"$49,157"},
  {n:"ZEC–WBNB",t0:"Binance-Peg ZEC",a0:"0x1ba42e5193dfa8b03d15dd1b86a3113bbbef8eeb",v0:true,t1:"WBNB",a1:"0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",v1:true,pool:"n/d — Uniswap BSC CLM",vpool:false,p:["uni"],type:"clm",apy:"1.020%",tvl:"$6,904"},
  {n:"ZEC–BTCB",t0:"Binance-Peg ZEC",a0:"0x1ba42e5193dfa8b03d15dd1b86a3113bbbef8eeb",v0:true,t1:"BTCB",a1:"0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c",v1:true,pool:"n/d — Uniswap BSC CLM",vpool:false,p:["uni"],type:"clm",apy:"823.91%",tvl:"$9,382"},
  {n:"ASTER–WBNB",t0:"ASTER (Aster DEX)",a0:"0x000ae314e2a2172a039b26378814c252734f556a",v0:true,t1:"WBNB",a1:"0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",v1:true,pool:"n/d — Uniswap BSC CLM",vpool:false,p:["uni"],type:"clm",apy:"543.59%",tvl:"$17,342"},
  {n:"GENIUS–USDT (PancakeSwap)",t0:"GENIUS",a0:"0x1f12b85aac097e43aa1555b2881e98a51090e9a6",v0:true,t1:"USDT (BSC-USD)",a1:"0x55d398326f99059fF775485246999027B3197955",v1:true,pool:"n/d — PancakeSwap CLM",vpool:false,p:["ps"],type:"clm",apy:"496.56%",tvl:"$10,345"},
  {n:"FORM–USDT",t0:"FORM (Four/BinaryX)",a0:"0x0a43fc31a73013089df59194872ecae4cae14444",v0:true,t1:"USDT (BSC-USD)",a1:"0x55d398326f99059fF775485246999027B3197955",v1:true,pool:"n/d — PancakeSwap CLM",vpool:false,p:["ps"],type:"clm",apy:"336%",tvl:"$938.86"},
  {n:"GENIUS–USDT (Uniswap)",t0:"GENIUS",a0:"0x1f12b85aac097e43aa1555b2881e98a51090e9a6",v0:true,t1:"USDT (BSC-USD)",a1:"0x55d398326f99059fF775485246999027B3197955",v1:true,pool:"0x02a0a4f3fb39bec59b25a356c273b4df05c1a96e2bb1ab250318d584a2a83dd0",vpool:true,p:["uni"],type:"clm",apy:"311.94%",tvl:"$6,571"},
  {n:"ZEC–USDT (PancakeSwap)",t0:"Binance-Peg ZEC",a0:"0x1ba42e5193dfa8b03d15dd1b86a3113bbbef8eeb",v0:true,t1:"USDT (BSC-USD)",a1:"0x55d398326f99059fF775485246999027B3197955",v1:true,pool:"n/d — PancakeSwap CLM",vpool:false,p:["ps"],type:"clm",apy:"276.23%",tvl:"$1,652"},
  {n:"USDT–WBNB (Uniswap)",t0:"USDT (BSC-USD)",a0:"0x55d398326f99059fF775485246999027B3197955",v0:true,t1:"WBNB",a1:"0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",v1:true,pool:"n/d — Uniswap BSC CLM",vpool:false,p:["uni"],type:"clm",apy:"222.9%",tvl:"$78,795"},
  {n:"Broccoli–WBNB (img1)",t0:"Broccoli (CZ's Broccoli)",a0:"0x6d5ad1592ed9d6d1df9b93c793ab759573ed6714",v0:true,t1:"WBNB",a1:"0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",v1:true,pool:"0xa5067360b13fc7a2685dc82dcd1bf2b4b8d7868b",vpool:true,p:["ps"],type:"clm",apy:"211.55%",tvl:"$15,113"},
  {n:"XPL–USDT (PancakeSwap)",t0:"XPL",a0:"n/d — cerca su bscscan.com: XPL BEP-20",v0:false,t1:"USDT (BSC-USD)",a1:"0x55d398326f99059fF775485246999027B3197955",v1:true,pool:"n/d — PancakeSwap CLM",vpool:false,p:["ps"],type:"clm",apy:"153.1%",tvl:"$1,934"},
  {n:"XPL–USDT (Uniswap)",t0:"XPL",a0:"n/d — cerca su bscscan.com: XPL BEP-20",v0:false,t1:"USDT (BSC-USD)",a1:"0x55d398326f99059fF775485246999027B3197955",v1:true,pool:"n/d — Uniswap BSC CLM",vpool:false,p:["uni"],type:"clm",apy:"124.02%",tvl:"$4,482"},
  {n:"XVS–WBNB (CLM Vault)",t0:"XVS (Venus)",a0:"0xcF6BB5389c92Bdda8a3747Ddb454cB7a64626C63",v0:true,t1:"WBNB",a1:"0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",v1:true,pool:"n/d — PancakeSwap CLM Vault",vpool:false,p:["ps"],type:"vault",apy:"88.07%",tvl:"$17,020"},
  {n:"XVS–WBNB (CLM Pool)",t0:"XVS (Venus)",a0:"0xcF6BB5389c92Bdda8a3747Ddb454cB7a64626C63",v0:true,t1:"WBNB",a1:"0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",v1:true,pool:"n/d — PancakeSwap CLM",vpool:false,p:["ps"],type:"clm",apy:"88.07%",tvl:"$3.95"},
  {n:"ASTER–USDT",t0:"ASTER (Aster DEX)",a0:"0x000ae314e2a2172a039b26378814c252734f556a",v0:true,t1:"USDT (BSC-USD)",a1:"0x55d398326f99059fF775485246999027B3197955",v1:true,pool:"0x7e58f160b5b77b8b24cd9900c09a3e730215ac47",vpool:true,p:["ps"],type:"clm",apy:"83.26%",tvl:"$145,042"},
  {n:"mubarak–WBNB",t0:"mubarak",a0:"n/d — cerca su bscscan.com: mubarak BEP-20",v0:false,t1:"WBNB",a1:"0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",v1:true,pool:"n/d — PancakeSwap CLM",vpool:false,p:["ps"],type:"clm",apy:"82.18%",tvl:"$6,470"},
  {n:"BNBHolder–USDT",t0:"BNBHolder",a0:"n/d — cerca su bscscan.com: BNBHolder BEP-20",v0:false,t1:"USDT (BSC-USD)",a1:"0x55d398326f99059fF775485246999027B3197955",v1:true,pool:"n/d — PancakeSwap CLM",vpool:false,p:["ps"],type:"clm",apy:"75.38%",tvl:"$328.26"},
  {n:"SIREN–WBNB",t0:"SIREN",a0:"n/d — cerca su bscscan.com: SIREN BEP-20",v0:false,t1:"WBNB",a1:"0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",v1:true,pool:"n/d — PancakeSwap CLM",vpool:false,p:["ps"],type:"clm",apy:"63.96%",tvl:"$10,170"},
  {n:"WBNB–USDT (CLM Vault)",t0:"WBNB",a0:"0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",v0:true,t1:"USDT (BSC-USD)",a1:"0x55d398326f99059fF775485246999027B3197955",v1:true,pool:"n/d — PancakeSwap CLM Vault",vpool:false,p:["ps"],type:"vault",apy:"48.3%",tvl:"$123,466"},
  {n:"WBNB–USDT (CLM Pool)",t0:"WBNB",a0:"0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",v0:true,t1:"USDT (BSC-USD)",a1:"0x55d398326f99059fF775485246999027B3197955",v1:true,pool:"n/d — PancakeSwap CLM",vpool:false,p:["ps"],type:"clm",apy:"47.93%",tvl:"$9,613"},
  {n:"BTCB–WBNB (Thena CLM)",t0:"BTCB (Binance-Peg BTC)",a0:"0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c",v0:true,t1:"WBNB",a1:"0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",v1:true,pool:"n/d — Thena CLM",vpool:false,p:["thena"],type:"clm",apy:"45.15%",tvl:"$156,494"},
  {n:"BTCB–WBNB (Uniswap)",t0:"BTCB (Binance-Peg BTC)",a0:"0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c",v0:true,t1:"WBNB",a1:"0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",v1:true,pool:"n/d — Uniswap BSC CLM",vpool:false,p:["uni"],type:"clm",apy:"35.67%",tvl:"$205,577"},
  {n:"ZRO–WBNB (CLM Vault)",t0:"ZRO (LayerZero)",a0:"0x6985884C4392D348587B19cb9eAAf157F13271cd",v0:true,t1:"WBNB",a1:"0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",v1:true,pool:"n/d — PancakeSwap CLM Vault",vpool:false,p:["ps"],type:"vault",apy:"33.81%",tvl:"$2,913"},
  {n:"ZRO–WBNB (CLM Pool)",t0:"ZRO (LayerZero)",a0:"0x6985884C4392D348587B19cb9eAAf157F13271cd",v0:true,t1:"WBNB",a1:"0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",v1:true,pool:"n/d — PancakeSwap CLM",vpool:false,p:["ps"],type:"clm",apy:"33.81%",tvl:"$327.39"},
  {n:"ETH–WBNB (Thena CLM)",t0:"ETH (Binance-Peg ETH)",a0:"0x2170Ed0880ac9A755fd29B2688956BD959F933F8",v0:true,t1:"WBNB",a1:"0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",v1:true,pool:"n/d — Thena CLM",vpool:false,p:["thena"],type:"clm",apy:"31.58%",tvl:"$83,493"},
  {n:"USDC–WBNB (CLM Vault)",t0:"USDC (Binance-Peg)",a0:"0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",v0:true,t1:"WBNB",a1:"0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",v1:true,pool:"n/d — PancakeSwap CLM Vault",vpool:false,p:["ps"],type:"vault",apy:"30.82%",tvl:"$37,816"},
  {n:"USDC–WBNB (CLM Pool)",t0:"USDC (Binance-Peg)",a0:"0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",v0:true,t1:"WBNB",a1:"0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",v1:true,pool:"n/d — PancakeSwap CLM",vpool:false,p:["ps"],type:"clm",apy:"30%",tvl:"$8,867"},
  {n:"LINK–WBNB",t0:"LINK (Binance-Peg)",a0:"0xF8A0BF9cF54Bb92F17374d9e9A321E6a111a51bD",v0:true,t1:"WBNB",a1:"0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",v1:true,pool:"n/d — Uniswap BSC CLM",vpool:false,p:["uni"],type:"clm",apy:"29.44%",tvl:"$2,618"},
  {n:"ETH–WBNB (Uniswap)",t0:"ETH (Binance-Peg ETH)",a0:"0x2170Ed0880ac9A755fd29B2688956BD959F933F8",v0:true,t1:"WBNB",a1:"0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",v1:true,pool:"n/d — Uniswap BSC CLM",vpool:false,p:["uni"],type:"clm",apy:"27.92%",tvl:"$29,886"},
  {n:"XRP–WBNB",t0:"XRP (Binance-Peg)",a0:"0x1D2F0da169ceB9fC7B3144628dB156f3F6c60dBE",v0:true,t1:"WBNB",a1:"0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",v1:true,pool:"n/d — Uniswap BSC CLM",vpool:false,p:["uni"],type:"clm",apy:"27.07%",tvl:"$41,045"},
  {n:"PEPE–WBNB (CLM Vault)",t0:"PEPE (Binance-Peg)",a0:"0x6982508145454Ce325dDbE47a25d4ec3d2311933",v0:true,t1:"WBNB",a1:"0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",v1:true,pool:"n/d — PancakeSwap CLM Vault",vpool:false,p:["ps"],type:"vault",apy:"26.26%",tvl:"$9,060"},
  {n:"PEPE–WBNB (CLM Pool)",t0:"PEPE (Binance-Peg)",a0:"0x6982508145454Ce325dDbE47a25d4ec3d2311933",v0:true,t1:"WBNB",a1:"0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",v1:true,pool:"n/d — PancakeSwap CLM",vpool:false,p:["ps"],type:"clm",apy:"26.26%",tvl:"$347.18"},
  {n:"COAI–USDT (Uniswap)",t0:"COAI (ChainOpera AI)",a0:"0x0a8d6c86e1bce73fe4d0bd531e1a567306836ea5",v0:true,t1:"USDT (BSC-USD)",a1:"0x55d398326f99059fF775485246999027B3197955",v1:true,pool:"n/d — Uniswap BSC CLM",vpool:false,p:["uni"],type:"clm",apy:"26.13%",tvl:"$2,247"},
  {n:"OOE–WBNB LP (OpenOcean Vault)",t0:"OOE (OpenOcean)",a0:"0x8ea5219a16c2dbf1d6335a6aa0c6bd45c50347c5",v0:true,t1:"WBNB",a1:"0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",v1:true,pool:"Vault OpenOcean",vpool:false,p:["oo"],type:"vault",apy:"24.47%",tvl:"$2,552"},
  {n:"ETH–USDT (Uniswap CLM)",t0:"ETH (Binance-Peg ETH)",a0:"0x2170Ed0880ac9A755fd29B2688956BD959F933F8",v0:true,t1:"USDT (BSC-USD)",a1:"0x55d398326f99059fF775485246999027B3197955",v1:true,pool:"n/d — Uniswap BSC CLM",vpool:false,p:["uni"],type:"clm",apy:"19.83%",tvl:"$53,872"},
  {n:"DOGE–WBNB (CLM Vault)",t0:"DOGE (Binance-Peg)",a0:"0xbA2aE424d960c26247Dd6c32edC70B295c744C43",v0:true,t1:"WBNB",a1:"0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",v1:true,pool:"n/d — PancakeSwap CLM Vault",vpool:false,p:["ps"],type:"vault",apy:"19.82%",tvl:"$55,240"},
  {n:"DOGE–WBNB (CLM Pool)",t0:"DOGE (Binance-Peg)",a0:"0xbA2aE424d960c26247Dd6c32edC70B295c744C43",v0:true,t1:"WBNB",a1:"0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",v1:true,pool:"n/d — PancakeSwap CLM",vpool:false,p:["ps"],type:"clm",apy:"19.79%",tvl:"$18,888"},
  {n:"TUT–WBNB",t0:"TUT (Tutorial)",a0:"0xcaae2a2f939f51d97cdfa9a86e79e3f085b799f3",v0:true,t1:"WBNB",a1:"0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",v1:true,pool:"n/d — PancakeSwap CLM",vpool:false,p:["ps"],type:"clm",apy:"19.67%",tvl:"$492.52"},
  {n:"ETH–USDT (PancakeSwap Vault)",t0:"ETH (Binance-Peg ETH)",a0:"0x2170Ed0880ac9A755fd29B2688956BD959F933F8",v0:true,t1:"USDT (BSC-USD)",a1:"0x55d398326f99059fF775485246999027B3197955",v1:true,pool:"n/d — PancakeSwap CLM Vault",vpool:false,p:["ps"],type:"vault",apy:"16.66%",tvl:"$57,014"},
  {n:"CAKE–USDT (Uniswap)",t0:"CAKE (PancakeSwap Token)",a0:"0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82",v0:true,t1:"USDT (BSC-USD)",a1:"0x55d398326f99059fF775485246999027B3197955",v1:true,pool:"n/d — Uniswap BSC CLM",vpool:false,p:["uni"],type:"clm",apy:"16.67%",tvl:"$4,742"},
  {n:"ASTER–USDT (Uniswap)",t0:"ASTER (Aster DEX)",a0:"0x000ae314e2a2172a039b26378814c252734f556a",v0:true,t1:"USDT (BSC-USD)",a1:"0x55d398326f99059fF775485246999027B3197955",v1:true,pool:"n/d — Uniswap BSC CLM",vpool:false,p:["uni"],type:"clm",apy:"15.52%",tvl:"$8,507"},
  {n:"BNBHolder–WBNB",t0:"BNBHolder",a0:"n/d — cerca su bscscan.com",v0:false,t1:"WBNB",a1:"0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",v1:true,pool:"n/d — PancakeSwap CLM",vpool:false,p:["ps"],type:"clm",apy:"15.15%",tvl:"$141.57"},
  {n:"COAI–USDT (PancakeSwap)",t0:"COAI (ChainOpera AI)",a0:"0x0a8d6c86e1bce73fe4d0bd531e1a567306836ea5",v0:true,t1:"USDT (BSC-USD)",a1:"0x55d398326f99059fF775485246999027B3197955",v1:true,pool:"n/d — PancakeSwap CLM",vpool:false,p:["ps"],type:"clm",apy:"14.58%",tvl:"$2,187"},
  {n:"BTCB–WBNB (CLM Vault)",t0:"BTCB (Binance-Peg BTC)",a0:"0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c",v0:true,t1:"WBNB",a1:"0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",v1:true,pool:"n/d — PancakeSwap CLM Vault",vpool:false,p:["ps"],type:"vault",apy:"14.36%",tvl:"$42,794"},
  {n:"BTCB–WBNB (CLM Pool)",t0:"BTCB (Binance-Peg BTC)",a0:"0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c",v0:true,t1:"WBNB",a1:"0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",v1:true,pool:"n/d — PancakeSwap CLM",vpool:false,p:["ps"],type:"clm",apy:"14.33%",tvl:"$124.30"},
  {n:"USD1–WBNB",t0:"USD1",a0:"n/d — cerca su bscscan.com: USD1 BEP-20",v0:false,t1:"WBNB",a1:"0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",v1:true,pool:"n/d — PancakeSwap CLM",vpool:false,p:["ps"],type:"clm",apy:"14.08%",tvl:"$33,791"},
  {n:"4–WBNB",t0:"4 / FORM (Four/BinaryX)",a0:"0x0a43fc31a73013089df59194872ecae4cae14444",v0:true,t1:"WBNB",a1:"0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",v1:true,pool:"n/d — PancakeSwap CLM",vpool:false,p:["ps"],type:"clm",apy:"12.66%",tvl:"$223.78"},
  {n:"币安人生–WBNB",t0:"币安人生 (Binance Life)",a0:"n/d — cerca su bscscan.com: 币安人生",v0:false,t1:"WBNB",a1:"0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",v1:true,pool:"n/d — PancakeSwap CLM",vpool:false,p:["ps"],type:"clm",apy:"12.23%",tvl:"$142.57"},
  {n:"GIGGLE–WBNB",t0:"GIGGLE",a0:"n/d — cerca su bscscan.com: GIGGLE BEP-20",v0:false,t1:"WBNB",a1:"0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",v1:true,pool:"n/d — PancakeSwap CLM",vpool:false,p:["ps"],type:"clm",apy:"11.1%",tvl:"$255.27"},
  {n:"SOL–WBNB (CLM Pool)",t0:"SOL (Binance-Peg)",a0:"0x570A5D26f7765Ecb712C0924E4De545B89fD43dF",v0:true,t1:"WBNB",a1:"0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",v1:true,pool:"n/d — PancakeSwap CLM",vpool:false,p:["ps"],type:"clm",apy:"9.68%",tvl:"$488.12"},
  {n:"SOL–WBNB (CLM Vault)",t0:"SOL (Binance-Peg)",a0:"0x570A5D26f7765Ecb712C0924E4De545B89fD43dF",v0:true,t1:"WBNB",a1:"0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",v1:true,pool:"n/d — PancakeSwap CLM Vault",vpool:false,p:["ps"],type:"vault",apy:"9.16%",tvl:"$34,850"},
  {n:"Broccoli–WBNB (img4)",t0:"Broccoli (CZ's Broccoli)",a0:"0x6d5ad1592ed9d6d1df9b93c793ab759573ed6714",v0:true,t1:"WBNB",a1:"0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",v1:true,pool:"n/d — PancakeSwap CLM",vpool:false,p:["ps"],type:"clm",apy:"8.67%",tvl:"$413.26"},
  {n:"ETH–WBNB (PancakeSwap CLM)",t0:"ETH (Binance-Peg ETH)",a0:"0x2170Ed0880ac9A755fd29B2688956BD959F933F8",v0:true,t1:"WBNB",a1:"0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",v1:true,pool:"n/d — PancakeSwap CLM",vpool:false,p:["ps"],type:"clm",apy:"8.5%",tvl:"$156.31"},
  {n:"ETH–WBNB (PancakeSwap Vault)",t0:"ETH (Binance-Peg ETH)",a0:"0x2170Ed0880ac9A755fd29B2688956BD959F933F8",v0:true,t1:"WBNB",a1:"0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",v1:true,pool:"n/d — PancakeSwap CLM Vault",vpool:false,p:["ps"],type:"vault",apy:"8.49%",tvl:"$13,252"},
  {n:"USDT–Q",t0:"USDT (BSC-USD)",a0:"0x55d398326f99059fF775485246999027B3197955",v0:true,t1:"Q Token",a1:"n/d — cerca su bscscan.com: Q BEP-20",v1:false,pool:"n/d — PancakeSwap CLM",vpool:false,p:["ps"],type:"clm",apy:"8.14%",tvl:"$6.75"},
  {n:"CAKE–WBNB (Uniswap)",t0:"CAKE (PancakeSwap Token)",a0:"0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82",v0:true,t1:"WBNB",a1:"0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",v1:true,pool:"n/d — Uniswap BSC CLM",vpool:false,p:["uni"],type:"clm",apy:"6.41%",tvl:"$2,877"},
  {n:"SOL–WBNB (Thena CLM)",t0:"SOL (Binance-Peg)",a0:"0x570A5D26f7765Ecb712C0924E4De545B89fD43dF",v0:true,t1:"WBNB",a1:"0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",v1:true,pool:"n/d — Thena CLM",vpool:false,p:["thena"],type:"clm",apy:"6.1%",tvl:"$6,600"},
  {n:"USDT–USDC (CLM Vault)",t0:"USDT (BSC-USD)",a0:"0x55d398326f99059fF775485246999027B3197955",v0:true,t1:"USDC (Binance-Peg)",a1:"0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",v1:true,pool:"n/d — PancakeSwap CLM Vault",vpool:false,p:["ps"],type:"vault",apy:"5.7%",tvl:"$18,090"},
  {n:"BTCB–USDT (Uniswap)",t0:"BTCB (Binance-Peg BTC)",a0:"0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c",v0:true,t1:"USDT (BSC-USD)",a1:"0x55d398326f99059fF775485246999027B3197955",v1:true,pool:"n/d — Uniswap BSC CLM",vpool:false,p:["uni"],type:"clm",apy:"5.54%",tvl:"$203,595"},
  {n:"CAKE–USDT (PancakeSwap CLM)",t0:"CAKE (PancakeSwap Token)",a0:"0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82",v0:true,t1:"USDT (BSC-USD)",a1:"0x55d398326f99059fF775485246999027B3197955",v1:true,pool:"n/d — PancakeSwap CLM",vpool:false,p:["ps"],type:"clm",apy:"5.52%",tvl:"$2,207"},
  {n:"CAKE–USDT (PancakeSwap Vault)",t0:"CAKE (PancakeSwap Token)",a0:"0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82",v0:true,t1:"USDT (BSC-USD)",a1:"0x55d398326f99059fF775485246999027B3197955",v1:true,pool:"n/d — PancakeSwap CLM Vault",vpool:false,p:["ps"],type:"vault",apy:"5.13%",tvl:"$67,599"},
  {n:"BTCB–ETH (Uniswap)",t0:"BTCB (Binance-Peg BTC)",a0:"0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c",v0:true,t1:"ETH (Binance-Peg ETH)",a1:"0x2170Ed0880ac9A755fd29B2688956BD959F933F8",v1:true,pool:"n/d — Uniswap BSC CLM",vpool:false,p:["uni"],type:"clm",apy:"3.86%",tvl:"$4,307"},
  {n:"USDT–USDC (Uniswap)",t0:"USDT (BSC-USD)",a0:"0x55d398326f99059fF775485246999027B3197955",v0:true,t1:"USDC (Binance-Peg)",a1:"0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",v1:true,pool:"n/d — Uniswap BSC CLM",vpool:false,p:["uni"],type:"clm",apy:"3.4%",tvl:"$66,730"},
  {n:"SOL–USDT (PancakeSwap CLM)",t0:"SOL (Binance-Peg)",a0:"0x570A5D26f7765Ecb712C0924E4De545B89fD43dF",v0:true,t1:"USDT (BSC-USD)",a1:"0x55d398326f99059fF775485246999027B3197955",v1:true,pool:"n/d — PancakeSwap CLM",vpool:false,p:["ps"],type:"clm",apy:"3.29%",tvl:"$2,992"},
  {n:"BTCB–USDT (PancakeSwap CLM)",t0:"BTCB (Binance-Peg BTC)",a0:"0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c",v0:true,t1:"USDT (BSC-USD)",a1:"0x55d398326f99059fF775485246999027B3197955",v1:true,pool:"n/d — PancakeSwap CLM",vpool:false,p:["ps"],type:"clm",apy:"3.12%",tvl:"$3,494"},
  {n:"BTCB–USDT (PancakeSwap Vault)",t0:"BTCB (Binance-Peg BTC)",a0:"0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c",v0:true,t1:"USDT (BSC-USD)",a1:"0x55d398326f99059fF775485246999027B3197955",v1:true,pool:"n/d — PancakeSwap CLM Vault",vpool:false,p:["ps"],type:"vault",apy:"3.05%",tvl:"$14,170"},
  {n:"SOL–USDT (PancakeSwap Vault)",t0:"SOL (Binance-Peg)",a0:"0x570A5D26f7765Ecb712C0924E4De545B89fD43dF",v0:true,t1:"USDT (BSC-USD)",a1:"0x55d398326f99059fF775485246999027B3197955",v1:true,pool:"n/d — PancakeSwap CLM Vault",vpool:false,p:["ps"],type:"vault",apy:"3.02%",tvl:"$6,526"}
];

// Funzione di utilità per normalizzare i nomi dei vault e facilitare l'accoppiamento
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[\s\-\–\—\(\)]/g, '') // rimuove spazi, trattini di ogni tipo e parentesi
    .trim();
}

export function useBeefyLive() {
  const [vaults, setVaults] = useState<BeefyVault[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalTvl, setGlobalTvl] = useState(0);

  useEffect(() => {
    async function fetchBeefy() {
      try {
        const [vaultsRes, apyRes, tvlRes, lpRes] = await Promise.all([
          fetch('https://api.beefy.finance/vaults').then(r => r.json()),
          fetch('https://api.beefy.finance/apy').then(r => r.json()),
          fetch('https://api.beefy.finance/tvl').then(r => r.json()),
          fetch('https://api.beefy.finance/lps').then(r => r.json())
        ]);

        let computedBscTvl = 0;

        const formatted = vaultsRes
          .filter((v: any) => v.chain === 'bsc' && v.status === 'active' && !v.isGovVault)
          .map((v: any) => {
            const rawApy = apyRes[v.id] || 0;
            const tvlValue = tvlRes[56]?.[v.id] || tvlRes['56']?.[v.id] || tvlRes['bsc']?.[v.id] || 0;
            const price = lpRes[v.id] || 1;

            computedBscTvl += tvlValue;

            // Istanzia le proprietà base del vault
            const vaultObj: BeefyVault = {
              id: v.id,
              name: v.name,
              token: v.token,
              tokenAddress: v.tokenAddress.toLowerCase(),
              earnedTokenAddress: v.earnedTokenAddress.toLowerCase(),
              earnContractAddress: v.earnContractAddress.toLowerCase(),
              apy: parseFloat((rawApy * 100).toFixed(2)),
              tvl: tvlValue ? tvlValue.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }) : 'N/D',
              tvlRaw: tvlValue,
              lpPrice: price,
              platformId: v.platformId,
              oracle: v.oracle,
              status: v.status,
              isVerified: false
            };

            // Eseguiamo il merge adattivo con il database locale
            const normVaultName = normalizeName(v.name);
            const dbMatch = LOCAL_CONTRACTS_DB.find(dbEntry => normalizeName(dbEntry.n) === normVaultName);

            if (dbMatch) {
              vaultObj.token0Name = dbMatch.t0;
              vaultObj.token0Address = dbMatch.a0;
              vaultObj.token1Name = dbMatch.t1;
              vaultObj.token1Address = dbMatch.a1;
              vaultObj.isVerified = dbMatch.v0 && dbMatch.v1;
              
              // Se l'indirizzo della pool nel DB locale è valido (inizia con 0x ed è lungo 42 caratteri)
              if (dbMatch.pool && dbMatch.pool.startsWith('0x') && dbMatch.pool.length === 42) {
                vaultObj.underlyingPoolAddress = dbMatch.pool.toLowerCase();
              } else {
                vaultObj.underlyingPoolAddress = null;
              }
            }

            // Identificazione del DEX di routing per Kyber
            let kyberDex = 'DEX_PANCAKESWAPV2';
            const platformLower = v.platformId.toLowerCase();
            const nameLower = v.name.toLowerCase();

            if (platformLower.includes('uniswap') || nameLower.includes('uniswap')) {
              kyberDex = 'DEX_UNISWAPV3';
            } else if (platformLower.includes('thena') || nameLower.includes('thena')) {
              kyberDex = 'DEX_THENA_FUSION';
            } else if (platformLower.includes('pancake') || nameLower.includes('pancake')) {
              if (nameLower.includes('clm') || nameLower.includes('v3')) {
                kyberDex = 'DEX_PANCAKESWAPV3';
              }
            }
            vaultObj.kyberDex = kyberDex;

            return vaultObj;
          })
          .filter((v: any) => v.tvlRaw > 100 && v.apy > 0)
          .sort((a: any, b: any) => b.tvlRaw - a.tvlRaw);

        setVaults(formatted);
        setGlobalTvl(computedBscTvl);
      } catch (err) {
        console.error("Errore nel recupero o nel merge dei dati Beefy:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchBeefy();
  }, []);

  return { vaults, loading, globalTvl };
}
