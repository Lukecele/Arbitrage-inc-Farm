import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from "axios";

export interface ZapApiConfig {
  apiDomain: string;
  chainId: number;
  clientId?: string;
}

const DEFAULT_CONFIG: ZapApiConfig = {
  apiDomain: "https://zap-api.kyberswap.com",
  chainId: 56, // BSC as default
};

interface ZapInRouteParams {
  dex: string;
  "pool.id": string;
  "position.tickLower"?: number;
  "position.tickUpper"?: number;
  tokensIn: string;
  amountsIn: string;
  slippage?: number;
  feeAddress?: string;
  feePcm?: number;
  deadline?: number;
}

interface ZapOutRouteParams {
  dexFrom: string;
  "poolFrom.id": string; // pool address (camelCase dot notation per docs ufficiali)
  "positionFrom.id": string; // V3: NFT token ID | V2: user wallet address
  tokenOut: string; // token address to receive
  slippage?: number;
  feeAddress?: string;
  feePcm?: number;
  deadline?: number;
}

export class ZapApiClient {
  private client: AxiosInstance;
  private config: ZapApiConfig;

  constructor(config?: Partial<ZapApiConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    const chainMap: Record<number, string> = {
      1: "ethereum",
      56: "bsc",
      137: "polygon",
      42161: "arbitrum",
      10: "optimism",
      43114: "avalanche",
      250: "fantom",
      59144: "linea",
      324: "zksync",
      1101: "polygon-zkevm",
      8453: "base",
    };
    const chainPath =
      chainMap[this.config.chainId] || this.config.chainId.toString();

    this.client = axios.create({
      baseURL: `${this.config.apiDomain}/${chainPath}`,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(this.config.clientId
          ? { "X-Client-Id": this.config.clientId }
          : {}),
      },
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response) {
          const data = error.response.data as any;
          throw new Error(data?.message || data?.error || error.message);
        }
        throw new Error(error.message);
      },
    );
  }

  // KyberSwap risponde sempre { message: 'OK', data: {...} }
  // Tutti i metodi estraggono body.data per restituire il payload reale.

  async getZapInRoute(params: ZapInRouteParams) {
    const { data: body } = await this.client.get("/api/v1/in/route", {
      params,
    });
    if (!body.data) throw new Error(body.message || "ZapIn route failed");
    return body.data;
  }

  async buildZapInTx(params: {
    sender: string;
    recipient: string;
    route: string;
    deadline?: number;
  }) {
    const { data: body } = await this.client.post(
      "/api/v1/in/route/build",
      params,
    );
    if (!body.data) throw new Error(body.message || "ZapIn build failed");
    return body.data; // contiene routerAddress + callData
  }

  async getZapOutRoute(params: ZapOutRouteParams) {
    const { data: body } = await this.client.get("/api/v1/out/route", {
      params,
    });
    if (!body.data) throw new Error(body.message || "ZapOut route failed");
    return body.data;
  }

  async buildZapOutTx(params: {
    sender: string;
    recipient: string;
    route: string;
    deadline?: number;
  }) {
    const { data: body } = await this.client.post(
      "/api/v1/out/route/build",
      params,
    );
    if (!body.data) throw new Error(body.message || "ZapOut build failed");
    return body.data; // contiene routerAddress + callData
  }
}

let defaultInstance: ZapApiClient | null = null;
export function getDefaultZapClient(): ZapApiClient {
  if (!defaultInstance) {
    defaultInstance = new ZapApiClient();
  }
  return defaultInstance;
}
