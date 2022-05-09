import {ChainConfig} from "./chain-config";
import {ABIs} from "./contracts";

export const ChainConfigAvaxTest: ChainConfig = {
    chainId: 43113,
    rpcUrl: "https://api.avax-test.network/ext/bc/C/rpc",
    symbol: "AVAX",
    explorerUrl: "https://cchain.explorer.avax-test.network",
    contracts: {
        DexArbitrage: {
            address: "0x00",
            abi: ABIs.DexArbitrage
        },
        Multicall: {
            address: "0x00",
            abi: ABIs.Muticall
        }
    }
}