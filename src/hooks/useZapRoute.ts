import { useState, useEffect } from "react";
import { getDefaultZapClient } from "../lib/zap-api-client";
import { ethers } from "ethers";
import { DEV_FEE_ADDRESS, DEV_FEE_PCM } from "../lib/constants";

export function useZapInRoute(
  tokenInAddress: string,
  tokenInDecimals: number,
  amountIn: string,
  targetPoolDex: string,
  targetPoolId: string,
  slippageBps: number,
  tickLower?: number,
  tickUpper?: number,
) {
  const [route, setRoute] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (
      !amountIn ||
      isNaN(Number(amountIn)) ||
      Number(amountIn) <= 0 ||
      !tokenInAddress ||
      !targetPoolId
    ) {
      setRoute(null);
      setError(null);
      return;
    }

    const fetchRoute = async () => {
      setLoading(true);
      setError(null);
      try {
        const client = getDefaultZapClient();
        const parsedAmount = ethers.utils
          .parseUnits(amountIn, tokenInDecimals)
          .toString();

        // Per V3 CLM i tick del range sono obbligatori.
        // Se l'utente non ne ha selezionato uno, usiamo il full-range
        // (-887200 / 887200 sono multipli di tutti i tick-spacing V3 comuni).
        const isV3 =
          targetPoolDex === "DEX_PANCAKESWAPV3" ||
          targetPoolDex === "DEX_UNISWAPV3";
        const effectiveTickLower = isV3 ? (tickLower ?? -887200) : undefined;
        const effectiveTickUpper = isV3 ? (tickUpper ?? 887200) : undefined;

        const response = await client.getZapInRoute({
          dex: targetPoolDex,
          "pool.id": targetPoolId,
          tokensIn: tokenInAddress,
          amountsIn: parsedAmount,
          slippage: slippageBps,
          "position.tickLower": effectiveTickLower,
          "position.tickUpper": effectiveTickUpper,
          feeAddress: DEV_FEE_ADDRESS,
          feePcm: DEV_FEE_PCM,
        });

        setRoute(response);
      } catch (err: any) {
        console.error("Kyber ZaaS API failed", err);
        setError(err.message || "Route not found");
        setRoute(null);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchRoute, 600); // Debounce to prevent API spam
    return () => clearTimeout(timer);
  }, [
    tokenInAddress,
    tokenInDecimals,
    amountIn,
    targetPoolDex,
    targetPoolId,
    slippageBps,
    tickLower,
    tickUpper,
  ]);

  return { route, loading, error };
}

export function useZapOutRoute(
  tokenOutAddress: string,
  targetPoolDex: string,
  targetPoolId: string,
  nftPositionId: string,
  slippageBps: number,
) {
  const [route, setRoute] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!nftPositionId || !tokenOutAddress || !targetPoolId) {
      setRoute(null);
      setError(null);
      return;
    }

    const fetchRoute = async () => {
      setLoading(true);
      setError(null);
      try {
        const client = getDefaultZapClient();

        // position_from.id deve essere un numero (NFT token ID per V3).
        // Se nftPositionId non è numerico lo escludiamo (pool V2 LP, nessun NFT).
        const isNumericNftId = /^\d+$/.test(nftPositionId);

        const response = await client.getZapOutRoute({
          dexFrom: targetPoolDex,
          "pool_from.id": targetPoolId,
          ...(isNumericNftId ? { "position_from.id": nftPositionId } : {}),
          tokens_to: tokenOutAddress,
          slippage: slippageBps,
          feeAddress: DEV_FEE_ADDRESS,
          feePcm: DEV_FEE_PCM,
        });

        setRoute(response);
      } catch (err: any) {
        console.error("Kyber ZaaS API failed", err);
        setError(err.message || "Route not found");
        setRoute(null);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchRoute, 600);
    return () => clearTimeout(timer);
  }, [
    tokenOutAddress,
    nftPositionId,
    targetPoolDex,
    targetPoolId,
    slippageBps,
  ]);

  return { route, loading, error };
}
