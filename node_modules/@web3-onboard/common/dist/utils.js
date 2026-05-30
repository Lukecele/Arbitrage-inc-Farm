import { formatEther, fromHex, hexToBigInt, numberToHex, parseEther } from 'viem';
export const isAddress = (address) => {
    return isAddress(address);
};
export const weiHexToEth = (wei) => {
    const weiBigInt = hexToBigInt(wei);
    return formatEther(weiBigInt);
};
export const weiToEth = (wei) => {
    if (!wei)
        return wei;
    const weiBigInt = fromHex(wei, 'bigint');
    return formatEther(weiBigInt);
};
export const ethToWeiBigInt = (eth) => {
    if (typeof eth !== 'string' && typeof eth !== 'number') {
        throw new Error('eth must be a string or number value');
    }
    const ethString = typeof eth === 'number' ? eth.toString() : eth;
    return parseEther(ethString);
};
export const bigIntToHex = (value) => {
    return numberToHex(value);
};
export const createDownloadMessage = (walletLabel, download) => {
    if (!download)
        return `Please switch to ${walletLabel} to continue`;
    if (typeof download === 'function') {
        return `Please <a href="#" onclick="${() => download()}">install</a> or enable to ${walletLabel} to continue`;
    }
    else {
        return `Please <a href="${download}" target="_blank">install</a> or enable to ${walletLabel} to continue`;
    }
};
export const chainIdToViemImport = async (w3oChain) => {
    const viemChains = await import('viem/chains');
    const { id, label, token, publicRpcUrl, blockExplorerUrl, rpcUrl } = w3oChain;
    switch (id) {
        case '0x89': {
            const { polygon } = viemChains;
            return polygon;
        }
        case '0xa': {
            const { optimism } = viemChains;
            return optimism;
        }
        case '0xa4b1': {
            const { arbitrum } = viemChains;
            return arbitrum;
        }
        case '0x144': {
            const { zkSync } = viemChains;
            return zkSync;
        }
        case '0x38': {
            const { bsc } = viemChains;
            return bsc;
        }
        case '0x1': {
            const { mainnet } = viemChains;
            return mainnet;
        }
        case '0xaa36a7': {
            const { sepolia } = viemChains;
            return sepolia;
        }
        case '0xfa': {
            const { fantom } = viemChains;
            return fantom;
        }
        case '0xa86a': {
            const { avalanche } = viemChains;
            return avalanche;
        }
        case '0xa4ec': {
            const { celo } = viemChains;
            return celo;
        }
        case '0x2105': {
            const { base } = viemChains;
            return base;
        }
        case '0x14a33': {
            const { baseGoerli } = viemChains;
            return baseGoerli;
        }
        case '0x64': {
            const { gnosis } = viemChains;
            return gnosis;
        }
        case '0x63564C40': {
            const { harmonyOne } = viemChains;
            return harmonyOne;
        }
        case '0x27bc86aa': {
            const { degen } = viemChains;
            return degen;
        }
        default: {
            const { extractChain, defineChain } = await import('viem');
            const nonNativeChain = extractChain({
                chains: Object.values(viemChains),
                id: fromHex(id, 'number')
            });
            if (nonNativeChain)
                return nonNativeChain;
            return defineChain({
                id: fromHex(id, 'number'),
                name: label !== null && label !== void 0 ? label : '',
                nativeCurrency: {
                    decimals: 18,
                    name: token !== null && token !== void 0 ? token : '',
                    symbol: token !== null && token !== void 0 ? token : ''
                },
                rpcUrls: {
                    default: {
                        http: [rpcUrl !== null && rpcUrl !== void 0 ? rpcUrl : '', publicRpcUrl !== null && publicRpcUrl !== void 0 ? publicRpcUrl : '']
                    }
                },
                blockExplorers: {
                    default: { name: 'Explorer', url: blockExplorerUrl !== null && blockExplorerUrl !== void 0 ? blockExplorerUrl : '' }
                }
            });
        }
    }
};
