import {autoInjectable, container, inject, singleton} from "tsyringe";
import {ChainConfig} from "./config/chain-config";
import Web3 from "web3";
import {SequentialTaskQueue} from "sequential-task-queue";
import {AppConfig} from "./config/app-config";
import {ArbitrageProfile} from "./config/arbitrage-profile";
import {ArbitrageDetector, Route, TokenTradesConfig, TradeOpportunity} from "./ArbitrageDetector";
import {BotManager} from "./BotManager";
import {ArbitrageBot} from "./ArbitrageBot";
import BN from "bignumber.js";

const path = require("path");
const fs = require("fs");

type LpPoolInfo = { router: string, token0: string, token1: string };

@singleton()
@autoInjectable()
export class ArbitrageService {
    private readonly _tradesConfig: TokenTradesConfig[] = [];
    private readonly _web3: Web3;
    private readonly _arbitrageDetector: ArbitrageDetector;
    private readonly _arbitrageProfile: ArbitrageProfile;
    private readonly _lastCheckedBlocks = new Map<string, number>();    // inputToken => blockNumber
    private readonly _botsForTokens = new Map<string, ArbitrageBot[]>();

    private _scanTradeOpportunitiesTimer: NodeJS.Timer;
    private readonly _scanTradeOpportunitiesTaskQueue = new SequentialTaskQueue();

    constructor(@inject("ChainConfig") private chainConfig: ChainConfig,
                private botManager: BotManager) {
        this._web3 = container.resolve("Web3");
        this._arbitrageProfile = container.resolve("ArbitrageProfile");
        this._arbitrageDetector = new ArbitrageDetector();
    }

    scanForPotentialTrades() {
        this._scanTradeOpportunitiesTimer = setInterval(
            () => {
                return this._scanTradeOpportunitiesTaskQueue.push(() => {
                        // TODO: current only take trade with token #0 in the list
                        return this.detectTradesRoutine(this._tradesConfig[0]);
                    }
                )
            },
            AppConfig.ScanTradeOpportunitiesInterval
        );
    }

    loadInputData() {
        // load all LP pairs (pools) from config files
        const pools = new Map<string, LpPoolInfo>();
        for (const dex of this._arbitrageProfile.DEXes) {
            const pairsFilePath = path.join(__dirname, "..", "data", dex.pairsDataFile);
            const pairsData = JSON.parse(fs.readFileSync(pairsFilePath, "utf-8"));
            for (const pair of Object.keys(pairsData)) {
                const pairData = pairsData[pair] as { token0: string, token1: string };
                if (!this._arbitrageProfile.ExcludedPairs.includes(pair) &&
                    !this._arbitrageProfile.ExcludedTokens.includes(pairData.token0) &&
                    !this._arbitrageProfile.ExcludedTokens.includes(pairData.token1)
                ) {
                    pools.set(pair, {router: dex.router, ...pairData})
                }
            }
        }
        console.log(`Total pairs loaded: ${pools.size}`);

        // build the list of `TokenTradesConfig`
        for (const arbitrageInParam of this._arbitrageProfile.SeekingParams) {
            const token = arbitrageInParam.token.toLowerCase();
            const routes = ArbitrageService.buildCyclicRoutes(token, 3, pools);
            //console.log(JSON.stringify(routes));
            const routesWithInfo: Route[] = [];
            let path3Numbers = 0;       // var for debugging
            for (const route of routes) {
                const rWithInfo = route.map(address => {
                    const pool = pools.get(address);
                    return {address, token0: pool.token0, token1: pool.token1, router: pool.router}
                })
                routesWithInfo.push(rWithInfo);
                if(rWithInfo.length === 3) {
                    path3Numbers += 1;
                }
            }
            this._tradesConfig.push({
                token,
                routes: routesWithInfo,
                minProfit: new BN(arbitrageInParam.minProfit)
            });
            this._botsForTokens.set(token, this.botManager.getTokenSupportedBots(token));
            // Log some useful info
            console.log(`Trade routes for ${token}: ${routesWithInfo.length} (3-pairs routes: ${path3Numbers})`);
        }
        //console.log(JSON.stringify(this._arbitrageInput));
    }

    private async detectTradesRoutine(tradesConfig: TokenTradesConfig) {
        const token = tradesConfig.token;
        // TODO: handle promise exception here?!
        const checkResult = await this._arbitrageDetector.checkForTradeOpportunities(tradesConfig);
        const lastCheckedBlock = this._lastCheckedBlocks.get(token)
        if (checkResult.block === lastCheckedBlock) {
            // skip
            return;
        }
        if(checkResult.trades.length === 0) {
            // skip but update last checked block
            this._lastCheckedBlocks.set(token, checkResult.block);
            return;
        }
        // update last checked block
        this._lastCheckedBlocks.set(token, checkResult.block);
        // sort trades from max to min ideal profit
        const potentialTrades = checkResult.trades.sort((a, b) => b.idealProfit.minus(a.idealProfit).toNumber());
        // note that we will ignore the duplication trades those
        // have the same pairs of route but in a difference order!
        const pickyTrades: TradeOpportunity[] = [];
        for (let i = 0; i < potentialTrades.length; i++) {
            let isDuplicate = false;
            const iPairs = potentialTrades[i].route.map(v => v.pair);
            for (let j = 0; j < pickyTrades.length; j++) {
                const jPairs = pickyTrades[j].route.map(v => v.pair);
                if (ArbitrageService.equalRoute(iPairs, jPairs)) {
                    isDuplicate = true;
                    break;
                }
            }
            if (!isDuplicate) {
                pickyTrades.push(potentialTrades[i]);
            }
        }

        //console.log(`Promising trades: block=${checkResult.block}, ${JSON.stringify(pickyTrades)}`);

        console.log(`Promising trades for ${token}: ${pickyTrades.length}, block=${checkResult.block}`);

        // we only take the best trades depending on the number of available bots for this input token.
        // TODO: 1. Set timeout for TX and solve the issue the TX stuck by sending new TX with higher gas price
        //       2. Use multiples bot capture the opportunities as much as possible
        const availableBots = this.botManager.getAvailableBotsFor(token);
        const tradesNum = Math.min(pickyTrades.length, availableBots.length);
        for (let i = 0; i < tradesNum; i++) {
            const bot = availableBots[i];
            const trade = pickyTrades[i];
            const tradeId = `${checkResult.block}#${i}`;
            this.botManager.assignToTask(bot.address, tradeId);
            let isSingleRouterTrade = true;
            let router0 = trade.route[0].router;
            for (let k = 1; k < trade.route.length; k++) {
                if (trade.route[k].router !== router0) {
                    isSingleRouterTrade = false;
                    break;
                }
            }
            if (isSingleRouterTrade) {
                // construct input params, then call `single router trade`
                const route = trade.route.map(v => v.pair);
                console.log(`Assign bot ${bot.address} to single-router trade ${tradeId}: ${JSON.stringify({
                    token, optimalAmtIn: trade.optimalAmtIn.toString(10), 
                    idealProfit: trade.idealProfit.toString(10), route, router: router0 
                })}`);
                bot.tradeOnSingleRouter(
                    tradeId,
                    token,
                    trade.optimalAmtIn,
                    route,
                    router0,
                    tradesConfig.minProfit,
                    checkResult.block + this._arbitrageProfile.MaxBlocksOffsetFromSpotOut,
                ).then(r => {
                    console.log(`Trade ${tradeId} result: ${JSON.stringify(r)}`);
                    this.botManager.releaseFromTask(bot.address);
                }).catch(e => {
                    console.error(`Trade ${tradeId} exception: ${JSON.stringify(e)}`);
                    this.botManager.releaseFromTask(bot.address);
                })
            } else {
                // construct input params, then call `multiples routers trade`
                // TODO:
                console.log('Multi routers trade: implement later');
            }
        }
    }

    private static equalRoute(route1: string[], route2: string[]): boolean {
        const len = route1.length;
        if (len === 0 || route2.length !== len) {
            return false;
        }
        for (const pair of route1) {
            if (!route2.includes(pair)) {
                return false;
            }
        }
        return true;
    }

    private static buildCyclicRoutes(token: string, maxPathDeep: number, pools: Map<string, LpPoolInfo>): string[][] {
        const ret: string[][] = [];
        let pathDeep = 1;
        let currentRoutes = ArbitrageService.findNextRoutes(token, [], pools);
        while (pathDeep <= maxPathDeep) {
            const tmpPaths = [];
            for (const route of currentRoutes) {
                if (pathDeep >= 2 && route.lastToken === token) {
                    ret.push(route.path);
                } else {
                    tmpPaths.push(...ArbitrageService.findNextRoutes(route.lastToken, route.path, pools))
                }
            }
            currentRoutes = tmpPaths;
            pathDeep++;
        }

        return ret;
    }

    private static findNextRoutes(token: string, pathTo: string[], pools: Map<string, LpPoolInfo>): { path: string[], lastToken: string }[] {
        const ret: { path: string[], lastToken: string }[] = [];
        for (const poolId of pools.keys()) {
            if (!pathTo.includes(poolId)) {
                const poolInfo = pools.get(poolId);
                if (poolInfo.token0 === token || poolInfo.token1 === token) {
                    ret.push({
                        path: [...pathTo, poolId],
                        lastToken: poolInfo.token0 === token ? poolInfo.token1 : poolInfo.token0
                    })
                }
            }
        }
        return ret;
    }
}