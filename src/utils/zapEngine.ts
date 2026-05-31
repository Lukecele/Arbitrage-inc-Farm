// KyberSwap ZaaS API helper — BSC
// Docs: https://docs.kyberswap.com/developer-guide/zap-as-a-service-zaas-api/api-reference/zaas-http-api

const DEV_FEE_ADDRESS = "0xafF5340ECFaf7ce049261cff193f5FED6BDF04E7";
const DEV_FEE_PCM = 200; // 0.2%

export interface ZapRouteParams {
  poolAddress: string;
  amountInRaw: string;
  slippageBps?: number;
  userAddress: string;
  dex: string;
  /** V3 only: existing NFT token ID to add to (numeric string). Omit to create a new position. */
  nftId?: string;
  /** V3 only: custom tick range. Defaults to full-range if omitted. */
  tickLower?: number;
  tickUpper?: number;
}

/**
 * ZapIn
 * - V2: position.id = userAddress  (docs: "for uniswapV2 this is user address")
 * - V3 new: position.tickLower + position.tickUpper (required)
 * - V3 existing: position.id = numeric NFT token ID
 */
export async function getZapInRoute({
  poolAddress,
  amountInRaw,
  slippageBps = 150,
  dex,
  userAddress,
  nftId,
  tickLower,
  tickUpper,
}: ZapRouteParams) {
  const isV2 = dex === "DEX_PANCAKESWAPV2" || dex === "DEX_UNISWAPV2";

  const entries: Record<string, string> = {
    dex,
    "pool.id": poolAddress.toLowerCase(),
    tokensIn: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    amountsIn: amountInRaw,
    slippage: slippageBps.toString(),
    feeAddress: DEV_FEE_ADDRESS.toLowerCase(),
    feePcm: DEV_FEE_PCM.toString(),
  };

  if (isV2) {
    entries["position.id"] = userAddress.toLowerCase();
  } else if (nftId && /^\d+$/.test(nftId)) {
    entries["position.id"] = nftId;
  } else {
    entries["position.tickLower"] = (tickLower ?? -886800).toString();
    entries["position.tickUpper"] = (tickUpper ?? 886800).toString();
  }

  const url = `https://zap-api.kyberswap.com/bsc/api/v1/in/route?${new URLSearchParams(entries)}`;
  const res = await fetch(url, { headers: { "X-Client-Id": "Arbitrage-Inc" } });
  const result = await res.json();
  // KyberSwap success: { message: 'OK', data: {...} } — no 'code' field on success
  if (!result.data)
    throw new Error(result.message || "Nessuna rotta Zap-In trovata.");
  return result.data;
}

/**
 * ZapOut
 * - poolFrom.id, positionFrom.id, tokenOut  (camelCase dot notation — docs ufficiali)
 * - V2: positionFrom.id = userAddress
 * - V3: positionFrom.id = numeric NFT token ID
 */
export async function getZapOutRoute({
  poolAddress,
  slippageBps = 150,
  dex,
  userAddress,
  nftId,
}: ZapRouteParams) {
  const isV2 = dex === "DEX_PANCAKESWAPV2" || dex === "DEX_UNISWAPV2";
  const isNumericNft = nftId && /^\d+$/.test(nftId);

  const positionId = isV2
    ? userAddress.toLowerCase()
    : isNumericNft
      ? nftId!
      : null;
  if (!positionId)
    throw new Error(
      "positionFrom.id mancante: per V3 fornire il token ID NFT numerico.",
    );

  const entries: Record<string, string> = {
    dexFrom: dex,
    "poolFrom.id": poolAddress.toLowerCase(),
    "positionFrom.id": positionId,
    tokenOut: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    slippage: slippageBps.toString(),
    feeAddress: DEV_FEE_ADDRESS.toLowerCase(),
    feePcm: DEV_FEE_PCM.toString(),
  };

  const url = `https://zap-api.kyberswap.com/bsc/api/v1/out/route?${new URLSearchParams(entries)}`;
  const res = await fetch(url, { headers: { "X-Client-Id": "Arbitrage-Inc" } });
  const result = await res.json();
  if (!result.data)
    throw new Error(result.message || "Nessuna rotta Zap-Out trovata.");
  return result.data;
}

export async function buildZapTransaction(
  userAddress: string,
  routeData: any,
  type: "in" | "out",
) {
  const url = `https://zap-api.kyberswap.com/bsc/api/v1/${type}/route/build`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Client-Id": "Arbitrage-Inc",
    },
    body: JSON.stringify({
      sender: userAddress,
      recipient: userAddress,
      route: routeData.route || routeData,
    }),
  });
  const result = await res.json();
  if (!result.data)
    throw new Error(
      result.message || "Errore nella generazione del payload di transazione.",
    );
  return result.data;
}
