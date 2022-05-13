import {ChainConfig} from "../chain-config";
import {ABIs} from "../contracts";

export const ChainConfigPolygonTest: ChainConfig = {
    chainId: 80001,
    rpcUrl: "https://rpc-mumbai.maticvigil.com",
    symbol: "MATIC",
    explorerUrl: "https://mumbai.polygonscan.com",
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