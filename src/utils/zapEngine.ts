const DEV_FEE_ADDRESS = "0xafF5340ECFaf7ce049261cff193f5FED6BDF04E7";
const DEV_FEE_PCM = 200; // 0.2% commissione partner

export interface ZapRouteParams {
  poolAddress: string;
  amountInRaw: string;
  slippageBps?: number;
  userAddress: string;
  dex: string;
  /** Numeric NFT token ID (V3 only). Required for ZapOut on V3 pools. */
  nftId?: string;
  /** Tick range for ZapIn on V3. Defaults to full-range if omitted. */
  tickLower?: number;
  tickUpper?: number;
}

/**
 * ZapIn — entra in una pool con BNB nativo.
 * NON inviare position.id: KyberSwap ZaaS crea una nuova posizione.
 */
export async function getZapInRoute({
  poolAddress,
  amountInRaw,
  slippageBps = 150,
  dex,
  tickLower,
  tickUpper,
}: ZapRouteParams) {
  // Per V3 CLM i tick del range sono obbligatori; usiamo il full-range come default.
  const isV3 = dex === "DEX_PANCAKESWAPV3" || dex === "DEX_UNISWAPV3";
  const effectiveTickLower = isV3 ? (tickLower ?? -887200) : undefined;
  const effectiveTickUpper = isV3 ? (tickUpper ?? 887200) : undefined;

  const entries: Record<string, string> = {
    dex,
    "pool.id": poolAddress.toLowerCase(),
    tokensIn: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", // BNB nativo
    amountsIn: amountInRaw,
    slippage: slippageBps.toString(),
    feeAddress: DEV_FEE_ADDRESS.toLowerCase(),
    feePcm: DEV_FEE_PCM.toString(),
  };
  if (effectiveTickLower !== undefined)
    entries["position.tickLower"] = effectiveTickLower.toString();
  if (effectiveTickUpper !== undefined)
    entries["position.tickUpper"] = effectiveTickUpper.toString();

  const params = new URLSearchParams(entries);

  const url = `https://zap-api.kyberswap.com/bsc/api/v1/in/route?${params.toString()}`;
  const response = await fetch(url, {
    headers: { "X-Client-Id": "Arbitrage-Inc" },
  });
  const result = await response.json();

  if (result.code !== 0)
    throw new Error(result.message || "Nessuna rotta Zap-In trovata.");
  return result.data;
}

/**
 * ZapOut — esci da una pool ricevendo BNB nativo.
 * Per pool V3 CLM: passa nftId (il token ID numerico della posizione NFT).
 * Per pool V2 (LP token): nftId non serve, usa amountsIn come quantità LP.
 */
export async function getZapOutRoute({
  poolAddress,
  amountInRaw,
  slippageBps = 150,
  dex,
  nftId,
}: ZapRouteParams) {
  const entries: Record<string, string> = {
    dexFrom: dex,
    "pool_from.id": poolAddress.toLowerCase(),
    tokens_to: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", // BNB nativo
    slippage: slippageBps.toString(),
    feeAddress: DEV_FEE_ADDRESS.toLowerCase(),
    feePcm: DEV_FEE_PCM.toString(),
  };

  // position_from.id richiesto solo per posizioni V3 NFT (deve essere un numero)
  if (nftId && /^\d+$/.test(nftId)) {
    entries["position_from.id"] = nftId;
  } else {
    // V2 LP: la quantità di LP da rimuovere
    entries["amountsIn"] = amountInRaw;
  }

  const params = new URLSearchParams(entries);
  const url = `https://zap-api.kyberswap.com/bsc/api/v1/out/route?${params.toString()}`;
  const response = await fetch(url, {
    headers: { "X-Client-Id": "Arbitrage-Inc" },
  });
  const result = await response.json();

  if (result.code !== 0)
    throw new Error(result.message || "Nessuna rotta Zap-Out trovata.");
  return result.data;
}

export async function buildZapTransaction(
  userAddress: string,
  routeData: any,
  type: "in" | "out",
) {
  const url = `https://zap-api.kyberswap.com/bsc/api/v1/${type}/route/build`;
  const response = await fetch(url, {
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
  const result = await response.json();
  if (result.code !== 0)
    throw new Error(
      result.message || "Errore di generazione del payload di transazione.",
    );
  return result.data;
}
