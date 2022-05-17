import {ArbitrageProfile} from "../arbitrage-profile";

const KNOWN_TOKENS = {
    WMATIC: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270"
}


export const PolygonProfile: ArbitrageProfile = {
    DEXes: [
        {name: "QuickSwap", pairsDataFile: "Quick_pairs.json", router: "0xa5e0829caced8ffdd4de3c43696c57f7d7a678ff"}
    ],

    MaxBlocksOffsetFromSpotOut: 2,

    SeekingParams: [
        {token: KNOWN_TOKENS.WMATIC, minProfit: 0.02 * 1e18}
    ],

    ExcludedPairs: [],

    ExcludedTokens: [
        "0x0731D0C0D123382C163AAe78A09390cAd2FFC941".toLocaleLowerCase(),    // INK
        "0x61dAECaB65EE2A1D5b6032df030f3fAA3d116Aa7".toLocaleLowerCase(),    // DMAGIC
        "0xf1428850f92B87e629c6f3A3B75BffBC496F7Ba6".toLowerCase()           //GEO$
    ],

    Bots: [
        {jksFile: "0x1bcae667ad66c4f9d04971f84d062546ca5fa127.json", supportedTokens: [KNOWN_TOKENS.WMATIC]}
    ],

    TxSendDefaultOptions: {
        gasLimit: 1000000,
        gasPrice: 100000000000,
        maxPriorityFeePerGas: 50000000000        // 50 GWEI
    }
}