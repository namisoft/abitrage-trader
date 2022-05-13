import {ChainConfig} from "../chain-config";
import {ABIs} from "../contracts";

export const ChainConfigPolygonMain: ChainConfig = {
    chainId: 137,
    rpcUrl: "https://polygon-rpc.com",
    symbol: "MATIC",
    explorerUrl: "https://polygonscan.com",
    contracts: {
        DexArbitrage: {
            address: "0xD81E6B674bCF8Ce318cb98cDa0dadd23E0206D9e",
            abi: ABIs.DexArbitrage
        },
        Multicall: {
            address: "0x9e313E9B72CD96E32E50023175162d4BBF3561B8",
            abi: ABIs.Muticall
        }
    }
}