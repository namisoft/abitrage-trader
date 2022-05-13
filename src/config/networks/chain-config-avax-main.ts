import {ChainConfig} from "../chain-config";
import {ABIs} from "../contracts";

export const ChainConfigAvaxMain: ChainConfig = {
    chainId: 43114,
    rpcUrl: "https://api.avax.network/ext/bc/C/rpc",
    symbol: "AVAX",
    explorerUrl: "https://cchain.explorer.avax.network",
    contracts: {
        DexArbitrage: {
            address: "0x9C97d84DC3ecB3adAcDa3c8DB3b68C41358Ea178",
            abi: ABIs.DexArbitrage
        },
        Multicall: {
            address: "0x98e2060F672FD1656a07bc12D7253b5e41bF3876",
            abi: ABIs.Muticall
        }
    }
}