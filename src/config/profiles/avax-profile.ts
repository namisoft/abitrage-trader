import {ArbitrageProfile} from "../arbitrage-profile";

const KNOWN_TOKENS = {
    WAVAX: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
    DAI_E: "0xba7deebbfc5fa1100fb055a87773e1e99cd3507a",
    USDC: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E"
}

export const AvaxProfile: ArbitrageProfile = {
    DEXes: [
        {name: "TraderJoe", pairsDataFile: "JLP_pairs.json", router: "0x60aE616a2155Ee3d9A68541Ba4544862310933d4"},
        {name: "Pangolin", pairsDataFile: "PGL_pairs.json", router: "0xE54Ca86531e17Ef3616d22Ca28b0D458b6C89106"},
        {name: "ElkDex", pairsDataFile: "ELK_pairs.json", router: "0x9E4AAbd2B3E60Ee1322E94307d0776F2c8e6CFbb"},
        {name: "SushiSwap", pairsDataFile: "SLP_pairs.json", router: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506"}],

    MaxBlocksOffsetFromSpotOut: 1,

    SeekingParams: [
        {token: KNOWN_TOKENS.WAVAX, minProfit: 0.01 * 1e18},        // WAVAX
        {token: KNOWN_TOKENS.DAI_E, minProfit: 0.5 * 1e18},         // DAI.e
        {token: KNOWN_TOKENS.USDC, minProfit: 0.5 * 1e6}           // USDC
    ],

    ExcludedPairs: [],

    ExcludedTokens: [],

    Bots: [
        {
            jksFile: "0x1bcae667ad66c4f9d04971f84d062546ca5fa127.json",
            supportedTokens: [
                KNOWN_TOKENS.WAVAX,
                KNOWN_TOKENS.USDC
            ]
        }
    ],

    TxSendDefaultOptions: {
        gasLimit: 1000000,
        gasPrice: 50000000000,
        maxPriorityFeePerGas: 5000000000
    }
}