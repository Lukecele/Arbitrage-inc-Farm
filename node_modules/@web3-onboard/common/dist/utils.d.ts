import type { Chain } from './types.js';
import type { Chain as ViemChain } from 'viem';
export declare const isAddress: (address: string) => address is `0x${string}`;
export declare const weiHexToEth: (wei: `0x${string}`) => string;
export declare const weiToEth: (wei: string) => string;
export declare const ethToWeiBigInt: (eth: string | number) => bigint;
export declare const bigIntToHex: (value: bigint) => string;
export declare const createDownloadMessage: (walletLabel: string, download?: string | (() => void)) => string;
export declare const chainIdToViemImport: (w3oChain: Chain) => Promise<ViemChain | unknown>;
