export interface ArbitrageProfile {
    readonly DEXes: {name: string, pairsDataFile: string, router: string}[];
    readonly SeekingParams: {token: string, minProfit: number}[];
    readonly ExcludedPairs: string[];
    readonly ExcludedTokens: string[];
    readonly Bots: {jksFile: string, supportedTokens: string[]}[];
}