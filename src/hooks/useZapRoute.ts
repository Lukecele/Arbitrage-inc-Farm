import { useState, useEffect } from "react";
import { useConnectWallet } from "@web3-onboard/react";
import { getDefaultZapClient } from "../lib/zap-api-client";
import { ethers } from "ethers";
import { DEV_FEE_ADDRESS, DEV_FEE_PCM } from "../lib/constants";

// ─── ZapIn ───────────────────────────────────────────────────────────────────
// Docs: https://docs.kyberswap.com/developer-guide/zap-as-a-service-zaas-api/api-reference/zaas-http-api
//
// position.id behaviour (from official docs):
//   V3 new position  → omit position.id, provide tickLower + tickUpper
//   V3 existing      → position.id = NFT token ID (number string)
//   V2               → position.id = user wallet address

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
  const [{ wallet }] = useConnectWallet();
  const userAddress = wallet?.accounts[0]?.address ?? "";

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

        const isV2 =
          targetPoolDex === "DEX_PANCAKESWAPV2" ||
          targetPoolDex === "DEX_UNISWAPV2";
        const isV3 = !isV2;

        // Build position params according to docs
        const positionParams: Record<string, string | number | undefined> = {};
        if (isV2) {
          // V2: position.id must be the user wallet address
          positionParams["position.id"] = userAddress;
        } else {
          // V3 new position: provide tick range (required by KyberSwap ZaaS)
          positionParams["position.tickLower"] = tickLower ?? -886800;
          positionParams["position.tickUpper"] = tickUpper ?? 886800;
        }

        // client.getZapInRoute ora ritorna già il payload interno (route, positionDetails, ...)
        const routeData = await client.getZapInRoute({
          dex: targetPoolDex,
          "pool.id": targetPoolId,
          ...positionParams,
          tokensIn: tokenInAddress,
          amountsIn: parsedAmount,
          slippage: slippageBps,
          feeAddress: DEV_FEE_ADDRESS,
          feePcm: DEV_FEE_PCM,
        });
        setRoute(routeData);
      } catch (err: any) {
        console.error("Kyber ZaaS ZapIn failed", err);
        setError(err.message || "Route not found");
        setRoute(null);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchRoute, 600);
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
    userAddress,
  ]);

  return { route, loading, error };
}

// ─── ZapOut ──────────────────────────────────────────────────────────────────
// Docs: official parameter names use camelCase dot notation:
//   poolFrom.id, positionFrom.id, tokenOut
//
// positionFrom.id behaviour:
//   V3      → NFT token ID (numeric string, e.g. "42831")
//   V2      → user wallet address

export function useZapOutRoute(
  tokenOutAddress: string,
  targetPoolDex: string,
  targetPoolId: string,
  nftPositionId: string,
  slippageBps: number,
) {
  const [{ wallet }] = useConnectWallet();
  const userAddress = wallet?.accounts[0]?.address ?? "";

  const [route, setRoute] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tokenOutAddress || !targetPoolId) {
      setRoute(null);
      setError(null);
      return;
    }

    const fetchRoute = async () => {
      setLoading(true);
      setError(null);
      try {
        const client = getDefaultZapClient();

        const isV2 =
          targetPoolDex === "DEX_PANCAKESWAPV2" ||
          targetPoolDex === "DEX_UNISWAPV2";
        const isNumericNftId = /^\d+$/.test(nftPositionId);

        // For V2: positionFrom.id = user address
        // For V3: positionFrom.id = numeric NFT token ID (if available)
        const positionFromId = isV2
          ? userAddress
          : isNumericNftId
            ? nftPositionId
            : "";

        if (!positionFromId) {
          setRoute(null);
          setError(null);
          return;
        }

        const routeData = await client.getZapOutRoute({
          dexFrom: targetPoolDex,
          "poolFrom.id": targetPoolId,
          "positionFrom.id": positionFromId,
          tokenOut: tokenOutAddress,
          slippage: slippageBps,
          feeAddress: DEV_FEE_ADDRESS,
          feePcm: DEV_FEE_PCM,
        });
        setRoute(routeData);
      } catch (err: any) {
        console.error("Kyber ZaaS ZapOut failed", err);
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
    userAddress,
  ]);

  return { route, loading, error };
}
