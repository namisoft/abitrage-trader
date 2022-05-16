import {DexArbitrage} from "./contracts/DexArbitrage";
import {MultiCall} from "./contracts/MultiCall";
import Web3 from "web3";
import {container} from "tsyringe";
import {Contract} from "web3-eth-contract";
import {ABIs} from "./config/contracts";
import BN from "bignumber.js";

type Pair = { address: string, token0: string, token1: string };

export type Route = (Pair & { router: string })[];

export type TokenTradesConfig = {
    token: string,      // token to trade from
    routes: Route[],    // swapping routes
    minProfit: BN   // in `wei` unit
}

export type TradeOpportunity = {
    route: { pair: string, router: string }[],
    optimalAmtIn: BN,
    idealProfit: BN
}

const BN_ZERO = new BN(0);
const BN_AMOUNT_MAX_BIPS = new BN(1000);
const BN_AMOUNT_WITH_FEE_BIPS = new BN(997);
const BN_AMOUNT_MAX_BIPS_POW2 = BN_AMOUNT_MAX_BIPS.times(BN_AMOUNT_MAX_BIPS);
const BN_AMOUNT_WITH_FEE_BIPS_POW2 = BN_AMOUNT_WITH_FEE_BIPS.times(BN_AMOUNT_WITH_FEE_BIPS);
const BN_AMOUNT_MAX_BIPS_POW3 = BN_AMOUNT_MAX_BIPS_POW2.times(BN_AMOUNT_MAX_BIPS);
const BN_AMOUNT_WITH_FEE_BIPS_POW3 = BN_AMOUNT_WITH_FEE_BIPS_POW2.times(BN_AMOUNT_WITH_FEE_BIPS);

BN.config({DECIMAL_PLACES: 3, POW_PRECISION: 2})

export class ArbitrageDetector {
    private readonly _web3: Web3;
    private readonly _arbitrageContract: DexArbitrage;
    private readonly _multicallContract: MultiCall;
    private readonly _lpPairRawContract: Contract;
    private readonly _kErrorPairs = new Map<string, string[]>();

    constructor() {
        this._web3 = container.resolve("Web3");
        this._arbitrageContract = DexArbitrage.getInstance();
        this._multicallContract = MultiCall.getInstance();
        this._lpPairRawContract = new this._web3.eth.Contract(ABIs.LpPair as any[])
    }

    async checkForTradeOpportunities(tradesConfig: TokenTradesConfig):
        Promise<{ trades: TradeOpportunity[], block: number }> {
        // firstly, extract all LP pools for calling 'get reserve' aggregation
        const pools = new Map<string, { reserve0: BN, reserve1: BN }>();
        const multiCallInput: { target: string, callData: string }[] = [];
        const getReservesEncodedABI = this._lpPairRawContract.methods["getReserves"]().encodeABI();
        for (const route of tradesConfig.routes) {
            for (const pair of route) {
                if (!pools.has(pair.address)) {
                    pools.set(pair.address, {reserve0: BN_ZERO, reserve1: BN_ZERO});
                    multiCallInput.push({target: pair.address, callData: getReservesEncodedABI})
                }
            }
        }
        //console.log(JSON.stringify(multiCallInput));
        const rMultiCall = await this._multicallContract.aggregate(multiCallInput);
        //console.log(JSON.stringify(rMultiCall));
        if ("error" in rMultiCall) {
            console.error(`Multicall error: ${rMultiCall.error}`);
            return {trades: [], block: 0};
        }
        for (let i = 0; i < multiCallInput.length; i++) {
            const r = this._web3.eth.abi.decodeParameters(["uint256", "uint256"], rMultiCall.outputData[i]);
            const reserve0 = new BN(r[0]), reserve1 = new BN(r[1]);
            //console.log(`${multiCallInput[i].target}, r0: ${reserve0.toString()}, r1: ${reserve1.toString()}`)
            pools.set(multiCallInput[i].target, {reserve0, reserve1})
        }

        // secondly, find trade opportunities based on pool reserves
        const result = [];
        for (const route of tradesConfig.routes) {
            const poolsRevIn: BN[] = [], poolsRevOut: BN[] = [];
            let inputToken = tradesConfig.token;
            for (let i = 0; i < route.length; i++) {
                const reserves = pools.get(route[i].address);
                if (route[i].token0 === inputToken) {
                    poolsRevIn.push(reserves.reserve0);
                    poolsRevOut.push(reserves.reserve1);
                    inputToken = route[i].token1;
                } else {
                    poolsRevIn.push(reserves.reserve1);
                    poolsRevOut.push(reserves.reserve0);
                    inputToken = route[i].token0;
                }
            }
            let rCheck: { optimalAmtIn: BN, idealProfit: BN } | null = null;
            if (poolsRevIn.length === 2) {
                rCheck = ArbitrageDetector.checkForTwoPoolsTrade(poolsRevIn, poolsRevOut);
            } else if (poolsRevIn.length === 3) {
                rCheck = ArbitrageDetector.checkForThreePoolsTrade(poolsRevIn, poolsRevOut);
            }
            if (rCheck && rCheck.idealProfit.gte(tradesConfig.minProfit)) {
                if (ArbitrageDetector.verifyK(rCheck.optimalAmtIn, poolsRevIn, poolsRevOut)) {
                    result.push({
                        route: route.map(v => {
                            return {pair: v.address, router: v.router}
                        }),
                        optimalAmtIn: rCheck.optimalAmtIn,
                        idealProfit: rCheck.idealProfit
                    })
                } else {
                    // K error case: just log
                    // wrap logging activity in an async block to avoid process blocking
                    (async () => {
                        const pairs = route.map(v => v.address);
                        let tmpId = new BN(0);
                        for(const p of pairs) {
                            tmpId = tmpId.plus(new BN(p.toLowerCase()));
                        }
                        const kErrorRouteId = tmpId.toString(32);
                        if(!this._kErrorPairs.has(kErrorRouteId)){
                            this._kErrorPairs.set(kErrorRouteId, pairs);
                            console.log(`K error: ${JSON.stringify({
                                token: tradesConfig.token,
                                route: pairs
                            })}`)
                        }
                    })().then().catch()
                }
            }
        }

        return {trades: result, block: rMultiCall.blockNumber};
    }


    private static checkForTwoPoolsTrade(poolsRevIn: BN[], poolsRevOut: BN[])
        : { optimalAmtIn: BN, idealProfit: BN } | null {
        if (poolsRevIn.length !== 2 || poolsRevOut.length !== 2) {
            return null
        }
        const a = poolsRevOut[0].times(poolsRevOut[1]);
        const b = poolsRevIn[0].times(poolsRevIn[1]).times(BN_AMOUNT_MAX_BIPS_POW2).div(BN_AMOUNT_WITH_FEE_BIPS_POW2);
        const c = poolsRevOut[0].plus(poolsRevIn[1].times(BN_AMOUNT_MAX_BIPS).div(BN_AMOUNT_WITH_FEE_BIPS));
        //console.log({a: a, b: b})
        if (a.isGreaterThan(b)) {
            const abSqrt = (a.times(b)).sqrt();
            return {
                optimalAmtIn: (abSqrt.minus(b)).div(c),
                idealProfit: (a.plus(b).minus(abSqrt.times(2))).div(c)
            }
        } else {
            return null
        }
    }

    private static checkForThreePoolsTrade(poolsRevIn: BN[], poolsRevOut: BN[])
        : { optimalAmtIn: BN, idealProfit: BN } | null {
        if (poolsRevIn.length !== 3 || poolsRevOut.length !== 3) {
            return null
        }
        const a = poolsRevOut[0].times(poolsRevOut[1]).times(poolsRevOut[2]);
        const b = poolsRevIn[0].times(poolsRevIn[1]).times(poolsRevIn[2])
            .times(BN_AMOUNT_MAX_BIPS_POW3).div(BN_AMOUNT_WITH_FEE_BIPS_POW3);
        const c = poolsRevOut[0].times(poolsRevOut[1])
            .plus(poolsRevOut[0].times(poolsRevIn[2]).times(BN_AMOUNT_MAX_BIPS).div(BN_AMOUNT_WITH_FEE_BIPS))
            .plus(poolsRevIn[1].times(poolsRevIn[2]).times(BN_AMOUNT_MAX_BIPS_POW2).div(BN_AMOUNT_WITH_FEE_BIPS_POW2));
        //console.log({a: a, b: b})
        if (a.isGreaterThan(b)) {
            const abSqrt = (a.times(b)).sqrt();
            return {
                optimalAmtIn: (abSqrt.minus(b)).div(c),
                idealProfit: (a.plus(b).minus(abSqrt.times(2))).div(c)
            }
        } else {
            return null
        }
    }

    private static verifyK(amountIn: BN, poolsRevIn: BN[], poolsRevOut: BN[]): boolean {
        const poolsLength = poolsRevIn.length;
        let amtIn = amountIn;
        for (let i = 0; i < poolsLength; i++) {
            const amtOut = ArbitrageDetector.getAmountOut(amtIn, poolsRevIn[i], poolsRevOut[i]);
            const poolRevInAfter = poolsRevIn[i].plus( amtIn.times(BN_AMOUNT_WITH_FEE_BIPS).div(BN_AMOUNT_MAX_BIPS));
            const poolRevOutAfter = poolsRevOut[i].minus(amtOut);
            if (poolRevInAfter.times(poolRevOutAfter).isLessThan(poolsRevIn[i].times( poolsRevOut[i]))) {
                return false;
            }
            amtIn = amtOut;
        }
        return true;
    }

    // calculation formula is from UniswapV2
    private static getAmountOut(amountIn: BN, poolRevIn: BN, poolRevOut: BN): BN {
        const amountInWithFee = amountIn.times(BN_AMOUNT_WITH_FEE_BIPS);
        const numerator = amountInWithFee.times(poolRevOut);
        const denominator = (poolRevIn.times(BN_AMOUNT_MAX_BIPS)).plus(amountInWithFee);
        return numerator.div(denominator);
    }
}