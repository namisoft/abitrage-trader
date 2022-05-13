import {ArbitrageProfile} from "../arbitrage-profile";

export const AvaxProfile: ArbitrageProfile = {
    DEXes: [
        {name: "TraderJoe", pairsDataFile: "JLP_pairs.json", router: "0x60aE616a2155Ee3d9A68541Ba4544862310933d4"},
        {name: "Pangolin", pairsDataFile: "PGL_pairs.json", router: "0xE54Ca86531e17Ef3616d22Ca28b0D458b6C89106"},
        {name: "ElkDex", pairsDataFile: "ELK_pairs.json", router: "0x9E4AAbd2B3E60Ee1322E94307d0776F2c8e6CFbb"},
        {name: "SushiSwap", pairsDataFile: "SLP_pairs.json", router: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506"}],

    SeekingParams: [
        {token: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7", minProfit: 0.02 * 1e18},  // WAVAX
        {token: "0xba7deebbfc5fa1100fb055a87773e1e99cd3507a", minProfit: 1e18},         // DAI.e
        {token: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E", minProfit: 1e6}           // USDC
    ],

    ExcludedPairs: [],

    ExcludedTokens: [],

    Bots: [],
}