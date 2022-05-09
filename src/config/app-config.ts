import {AvaxProfile} from "./avax-profile";

export const AppConfig = {
    HttpPort: 3068,
    ScanTradeOpportunitiesInterval: 500,
    TokensDataFile: "avax_tokens.json",
    DEXes: [
      /*  {name: "TraderJoe", pairsDataFile: "JLP_pairs.json", router: AvaxProfile.Routers.TraderJoe},
        {name: "Pangolin", pairsDataFile: "PGL_pairs.json", router: AvaxProfile.Routers.Pangolin},
        {name: "ElkDex", pairsDataFile: "ELK_pairs.json", router: AvaxProfile.Routers.ElkDex},
        {name: "SushiSwap", pairsDataFile: "SLP_pairs.json", router: AvaxProfile.Routers.SushiSwap}*/
        {name: "QuickSwap", pairsDataFile: "Quick_pairs.json", router: AvaxProfile.Routers.TraderJoe}
    ],
    ArbitrageSeekingParams: [
      /*  {token: AvaxProfile.Tokens.WAVAX, minProfit: 0.02 * 1e18},
        {token: "0xba7deebbfc5fa1100fb055a87773e1e99cd3507a", minProfit: 1e18},
        {token: AvaxProfile.Tokens.USDC, minProfit: 1e6}*/
        {token: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270".toLowerCase(), minProfit: 0.1 * 1e18}
    ],
    MIN_REQUIRED_LIQUIDITY_AMOUNT: new Map([
      //[AvaxProfile.Tokens.WAVAX.toLowerCase(), 100 * 1e18],
      //[AvaxProfile.Tokens.CRA.toLowerCase(), 3000 * 1e18]
    ]),
    EXCLUDED_PAIRS : [
        "0x3ee7e2cfffce40331c6070d6d4c48ea365e32039",
        "0x43B9C8dEC26C2D21146466cAacabf94FdbEac473",
        "0xe4b9865c0866346ba3613ec122040a365637fb46",
        "0xc992Ab46428a5a2eDeB8F44D946CE5642F97EF71"
    ],
    ArbitragePaths: [
        {intermPath: [AvaxProfile.Tokens.TUS], routers: [AvaxProfile.Routers.Pangolin, AvaxProfile.Routers.TraderJoe]},
        {intermPath: [AvaxProfile.Tokens.TUS], routers: [AvaxProfile.Routers.TraderJoe, AvaxProfile.Routers.Pangolin]},
        {intermPath: [AvaxProfile.Tokens.LOST], routers: [AvaxProfile.Routers.Pangolin, AvaxProfile.Routers.TraderJoe]},
        {intermPath: [AvaxProfile.Tokens.LOST], routers: [AvaxProfile.Routers.TraderJoe, AvaxProfile.Routers.Pangolin]},
        {intermPath: [AvaxProfile.Tokens.QI], routers: [AvaxProfile.Routers.Pangolin, AvaxProfile.Routers.TraderJoe]},
        {intermPath: [AvaxProfile.Tokens.QI], routers: [AvaxProfile.Routers.TraderJoe, AvaxProfile.Routers.Pangolin]},
        {intermPath: [AvaxProfile.Tokens.CRA, AvaxProfile.Tokens.TUS], router: AvaxProfile.Routers.TraderJoe},
        {
            intermPath: [AvaxProfile.Tokens.TIME, AvaxProfile.Tokens.MIM],
            routers: [AvaxProfile.Routers.TraderJoe, AvaxProfile.Routers.SushiSwap, AvaxProfile.Routers.TraderJoe]
        },
        {
            intermPath: [AvaxProfile.Tokens.MIM, AvaxProfile.Tokens.TIME],
            routers: [AvaxProfile.Routers.TraderJoe, AvaxProfile.Routers.SushiSwap, AvaxProfile.Routers.TraderJoe]
        },
        {intermPath: [AvaxProfile.Tokens.KACY], routers: [AvaxProfile.Routers.Pangolin, AvaxProfile.Routers.TraderJoe]},
        {intermPath: [AvaxProfile.Tokens.KACY], routers: [AvaxProfile.Routers.TraderJoe, AvaxProfile.Routers.Pangolin]},
        {intermPath: [AvaxProfile.Tokens.PEFI], routers: [AvaxProfile.Routers.Pangolin, AvaxProfile.Routers.TraderJoe]},
        {intermPath: [AvaxProfile.Tokens.PEFI], routers: [AvaxProfile.Routers.TraderJoe, AvaxProfile.Routers.Pangolin]},
        {intermPath: [AvaxProfile.Tokens.XAVA], routers: [AvaxProfile.Routers.TraderJoe, AvaxProfile.Routers.Pangolin]},
        {intermPath: [AvaxProfile.Tokens.UST], routers: [AvaxProfile.Routers.TraderJoe, AvaxProfile.Routers.Pangolin]},
        {intermPath: [AvaxProfile.Tokens.UST], routers: [AvaxProfile.Routers.TraderJoe, AvaxProfile.Routers.Pangolin]},
        /*
        {intermPath: [DexProfile.Tokens.WAVAX, DexProfile.Tokens.TUS], router: DexProfile.Routers.TraderJoe},
        {intermPath: [DexProfile.Tokens.TUS, DexProfile.Tokens.WAVAX], router: DexProfile.Routers.TraderJoe},
        {intermPath: [DexProfile.Tokens.WAVAX], routers: [DexProfile.Routers.TraderJoe, DexProfile.Routers.Pangolin]},
        {intermPath: [DexProfile.Tokens.WAVAX], routers: [DexProfile.Routers.Pangolin, DexProfile.Routers.TraderJoe]},
         */
    ]
}