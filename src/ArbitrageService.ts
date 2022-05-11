import {autoInjectable, container, inject, singleton} from "tsyringe";
import {ChainConfig} from "./config/chain-config";
import Web3 from "web3";
import {ArbitrageBot, ArbitrageTarget} from "./ArbitrageBot";
import {SequentialTaskQueue} from "sequential-task-queue";
import {AppConfig} from "./config/app-config";

const path = require("path");
const fs = require("fs");

type LpPoolInfo = { router: string, token0: string, token1: string };

@singleton()
@autoInjectable()
export class ArbitrageService {
    private readonly _arbitrageInput: ArbitrageTarget[] = [];
    private readonly _web3: Web3;
    private readonly _arbitrageBot: ArbitrageBot;
    private _scanTradeOpportunitiesTimer: NodeJS.Timer;
    private readonly _scanTradeOpportunitiesTaskQueue = new SequentialTaskQueue();

    constructor(@inject("ChainConfig") private chainConfig: ChainConfig) {
        this._web3 = container.resolve("Web3");
        this._arbitrageBot = new ArbitrageBot();
    }

    scanForPotentialTrades() {
        this._scanTradeOpportunitiesTimer = setInterval(
            () => {
                return this._scanTradeOpportunitiesTaskQueue.push(() => {
                        return this._arbitrageBot.checkForTradeOpportunities(this._arbitrageInput
                        )
                            .then(r => {
                                if (r.result.length > 0) {
                                    console.log(`${new Date().toString()}, block=${r.block}: ${JSON.stringify(r.result)}`)
                                }
                            })
                    }
                )
            },
            AppConfig.ScanTradeOpportunitiesInterval
        );
    }

    loadInputData() {
        // load pairs / tokens data to build paths for arbitrage
        /*       const tokensFilePath = path.join(__dirname, "..", "data", AppConfig.TokensDataFile);
               const tokensData = JSON.parse(fs.readFileSync(tokensFilePath, "utf-8"));
               const tokens = new Map<string, { symbol: string, name: string, decimals: number }>();
               for (const token of Object.keys(tokensData)) {
                   tokens.set(token, tokensData[token]);
               }*/

        const pools = new Map<string, LpPoolInfo>();
        for (const dex of AppConfig.DEXes) {
            const pairsFilePath = path.join(__dirname, "..", "data", dex.pairsDataFile);
            const pairsData = JSON.parse(fs.readFileSync(pairsFilePath, "utf-8"));
            for (const pair of Object.keys(pairsData)) {
                if (!AppConfig.EXCLUDED_PAIRS.includes(pair)) {
                    pools.set(pair, {router: dex.router, ...pairsData[pair]})
                }
            }
        }
        console.log(pools.size);

        for (const arbitrageInParam of AppConfig.ArbitrageSeekingParams) {
            const token = arbitrageInParam.token.toLowerCase();
            const routes = ArbitrageService.buildCyclicRoutes(token, 3, pools);
            //console.log(JSON.stringify(routes));
            for (const route of routes) {
                const routeWithInfo = route.map(address => {
                    const pool = pools.get(address);
                    return {address, token0: pool.token0, token1: pool.token1}
                })
                this._arbitrageInput.push({token, route: routeWithInfo, minProfit: arbitrageInParam.minProfit});
            }
        }
        //console.log(JSON.stringify(this._arbitrageInput));
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