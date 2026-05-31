export const SUPPORTED_TOKENS = [
  {
    symbol: "BNB",
    address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    decimals: 18,
    logoUrl: "https://cryptologos.cc/logos/bnb-bnb-logo.png?v=025",
    coingeckoId: "binancecoin",
  },
  {
    symbol: "WBNB",
    address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
    decimals: 18,
    logoUrl:
      "https://assets.coingecko.com/coins/images/12591/small/binance-coin-logo.png",
    coingeckoId: "binancecoin",
  },
  {
    symbol: "USDC",
    address: "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
    decimals: 18,
    logoUrl: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png?v=025",
    coingeckoId: "usd-coin",
  },
  {
    symbol: "USDT",
    address: "0x55d398326f99059fF775485246999027B3197955",
    decimals: 18,
    logoUrl: "https://cryptologos.cc/logos/tether-usdt-logo.png?v=025",
    coingeckoId: "tether",
  },
  {
    symbol: "CAKE",
    address: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82",
    decimals: 18,
    logoUrl:
      "https://assets.coingecko.com/coins/images/12632/small/pancakeswap-cake-logo.png",
    coingeckoId: "pancakeswap-token",
  },
  {
    symbol: "BTCB",
    address: "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c",
    decimals: 18,
    logoUrl: "https://assets.coingecko.com/coins/images/14103/small/btcb.png",
    coingeckoId: "bitcoin",
  },
  {
    symbol: "ETH",
    address: "0x2170Ed0880ac9A755fd29B2688956BD959F933F8",
    decimals: 18,
    logoUrl: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
    coingeckoId: "ethereum",
  },
];

// Coingecko IDs used for price fetching
export const PRICE_TOKEN_IDS =
  "binancecoin,usd-coin,tether,pancakeswap-token,bitcoin,ethereum";

export interface PoolInfo {
  id: string;
  name: string;
  dex: string;
  platform: string;
  token0: string;
  token1: string;
  token0Address?: string;
  token1Address?: string;
  token0Logo: string;
  token1Logo: string;
  fee: string;
  feeRaw?: number;
  apy: number;
  tvl: number;
  risk: "Low" | "Medium" | "High" | "Extreme";
  isInRange?: boolean;
  currentPrice?: number;
  minPrice?: number;
  maxPrice?: number;
}

// NOTE: APY and TVL values here are seeds/fallbacks.
// Real APY is fetched live from KyberSwap Elastic pools API when available.
// Real TVL comes from KyberSwap pool data.
// currentPrice is always fetched live from CoinGecko.
export const STATIC_POOLS: PoolInfo[] = [
  // --- HIGH APY / HIGH-EXTREME RISK ---
  {
    // PancakeSwap V3 GENIUS/USDT 1% — pool address verified from user research
    id: "0x9dff5b244427bd42c650de57766b3a85761de780",
    name: "GENIUS-USDT",
    dex: "DEX_PANCAKESWAPV3",
    platform: "PancakeSwap V3",
    token0: "GENIUS",
    token1: "USDT",
    token0Address: "0x1f12b85aac097e43aa1555b2881e98a51090e9a6",
    token1Address: "0x55d398326f99059fF775485246999027B3197955",
    token0Logo:
      "https://assets.coingecko.com/coins/images/28368/small/genius.png",
    token1Logo: "https://cryptologos.cc/logos/tether-usdt-logo.png?v=025",
    fee: "1%",
    feeRaw: 10000,
    apy: 496.56,
    tvl: 10345,
    risk: "Extreme",
    isInRange: true,
    currentPrice: 0.0042,
    minPrice: 0.0035,
    maxPrice: 0.0055,
  },

  {
    // PancakeSwap V3 ASTER/USDT 0.25% — pool address verified from user research
    id: "0xaead6bd31dd66eb3a6216aaf271d0e661585b0b1",
    name: "ASTER-USDT",
    dex: "DEX_PANCAKESWAPV3",
    platform: "PancakeSwap V3",
    token0: "ASTER",
    token1: "USDT",
    token0Address: "0x000ae314e2a2172a039b26378814c252734f556a",
    token1Address: "0x55d398326f99059fF775485246999027B3197955",
    token0Logo:
      "https://tokens.pancakeswap.finance/images/0x000ae314e2a2172a039b26378814c252734f556a.png",
    token1Logo: "https://cryptologos.cc/logos/tether-usdt-logo.png?v=025",
    fee: "0.25%",
    feeRaw: 2500,
    apy: 83.26,
    tvl: 145042,
    risk: "High",
    isInRange: true,
    currentPrice: 0,
    minPrice: 0,
    maxPrice: 0,
  },
  {
    // PancakeSwap V2 PALU/WBNB — pool address verified from user research
    id: "0x126fadb82cc4ab91e6cd03accaf209fb6d1ffaab",
    name: "PALU-WBNB",
    dex: "DEX_PANCAKESWAPV2",
    platform: "PancakeSwap V2",
    token0: "PALU",
    token1: "WBNB",
    token0Address: "0x02e75d28a8aa2a0033b8cf866fcf0bb0e1ee4444",
    token1Address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
    token0Logo:
      "https://tokens.pancakeswap.finance/images/0x02e75d28a8aa2a0033b8cf866fcf0bb0e1ee4444.png",
    token1Logo: "https://cryptologos.cc/logos/bnb-bnb-logo.png?v=025",
    fee: "0.25%",
    feeRaw: 2500,
    apy: 305.198,
    tvl: 1,
    risk: "Extreme",
    isInRange: true,
    currentPrice: 0,
    minPrice: 0,
    maxPrice: 0,
  },
  {
    // PancakeSwap V2 PUP/WBNB — pool address verified from user research
    id: "0x8e86a6c334ab270084bf8273d5293488f2578207",
    name: "PUP-WBNB",
    dex: "DEX_PANCAKESWAPV2",
    platform: "PancakeSwap V2",
    token0: "PUP",
    token1: "WBNB",
    token0Address: "0x73b84F7E3901F39FC29F3704a03126D317Ab4444",
    token1Address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
    token0Logo:
      "https://tokens.pancakeswap.finance/images/0x73b84f7e3901f39fc29f3704a03126d317ab4444.png",
    token1Logo: "https://cryptologos.cc/logos/bnb-bnb-logo.png?v=025",
    fee: "0.25%",
    feeRaw: 2500,
    apy: 88.231,
    tvl: 706,
    risk: "High",
    isInRange: true,
    currentPrice: 0,
    minPrice: 0,
    maxPrice: 0,
  },
  {
    // Uniswap V3 XPL/USDT 0.3% — principale, pool address verified from user research
    id: "0x7deef378b6befa291e2e255294e532b2c1bca419",
    name: "XPL-USDT",
    dex: "DEX_UNISWAPV3",
    platform: "Uniswap V3",
    token0: "XPL",
    token1: "USDT",
    token0Address: "0x0926715f02f90a6e60b297893a74360e227318db",
    token1Address: "0x55d398326f99059fF775485246999027B3197955",
    token0Logo: "https://assets.coingecko.com/coins/images/31242/small/xpl.png",
    token1Logo: "https://cryptologos.cc/logos/tether-usdt-logo.png?v=025",
    fee: "0.3%",
    feeRaw: 3000,
    apy: 124.02,
    tvl: 4482,
    risk: "High",
    isInRange: true,
    currentPrice: 0.25,
    minPrice: 0.2,
    maxPrice: 0.35,
  },
  {
    // PancakeSwap V3 XPL/USDT 0.01% — alt, pool address verified from user research
    id: "0x50203DF8eFcddBa9755C886F086b9B2D537a15F9",
    name: "XPL-USDT",
    dex: "DEX_PANCAKESWAPV3",
    platform: "PancakeSwap V3",
    token0: "XPL",
    token1: "USDT",
    token0Address: "0x0926715f02f90a6e60b297893a74360e227318db",
    token1Address: "0x55d398326f99059fF775485246999027B3197955",
    token0Logo: "https://assets.coingecko.com/coins/images/31242/small/xpl.png",
    token1Logo: "https://cryptologos.cc/logos/tether-usdt-logo.png?v=025",
    fee: "0.01%",
    feeRaw: 100,
    apy: 153.1,
    tvl: 1934,
    risk: "High",
    isInRange: true,
    currentPrice: 0.25,
    minPrice: 0.2,
    maxPrice: 0.35,
  },
  {
    // PancakeSwap V3 ZEC/USDT 1% — pool address verified from user research
    id: "0x1b7ce0f923c5d109f695b6a95dc29b0225368bb7",
    name: "ZEC-USDT",
    dex: "DEX_PANCAKESWAPV3",
    platform: "PancakeSwap V3",
    token0: "ZEC",
    token1: "USDT",
    token0Address: "0x1ba42e5193dfa8b03d15dd1b86a3113bbbef8eeb",
    token1Address: "0x55d398326f99059fF775485246999027B3197955",
    token0Logo: "https://cryptologos.cc/logos/zcash-zec-logo.png",
    token1Logo: "https://cryptologos.cc/logos/tether-usdt-logo.png?v=025",
    fee: "1%",
    feeRaw: 10000,
    apy: 276.23,
    tvl: 1652,
    risk: "High",
    isInRange: true,
    currentPrice: 32.45,
    minPrice: 28.0,
    maxPrice: 38.0,
  },

  {
    // PancakeSwap V3 mubarak/WBNB 0.25% — pool address verified from user research
    id: "0x90a54475d512b8f3852351611c38fad30a513491",
    name: "mubarak-WBNB",
    dex: "DEX_PANCAKESWAPV3",
    platform: "PancakeSwap V3",
    token0: "mubarak",
    token1: "WBNB",
    token0Address: "",
    token1Address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
    token0Logo: "",
    token1Logo: "https://cryptologos.cc/logos/bnb-bnb-logo.png?v=025",
    fee: "0.25%",
    feeRaw: 2500,
    apy: 82.18,
    tvl: 6470,
    risk: "High",
    isInRange: true,
    currentPrice: 0,
    minPrice: 0,
    maxPrice: 0,
  },
];

// Kept for backwards compatibility; components should use STATIC_POOLS
export const MOCK_POOLS = STATIC_POOLS;

export const DEX_OPTIONS = [
  { id: "DEX_PANCAKESWAPV3", name: "PancakeSwap V3" },
  { id: "DEX_PANCAKESWAPV2", name: "PancakeSwap V2" },
  { id: "DEX_UNISWAPV3", name: "Uniswap V3" },
  { id: "DEX_UNISWAPV2", name: "Uniswap V2" },
];

// Indirizzo dev per la raccolta delle fee di protocollo
export const DEV_FEE_ADDRESS = "0xafF5340ECFaf7ce049261cff193f5FED6BDF04E7";
// feePcm: per cent mille KyberSwap (1 = 0.001%). 200 = 0.2%
export const DEV_FEE_PCM = 200;
