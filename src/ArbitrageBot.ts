import {DexArbitrage} from "./contracts/DexArbitrage";
import {MultiCall} from "./contracts/MultiCall";
import Web3 from "web3";
import {container} from "tsyringe";
import {Contract} from "web3-eth-contract";
import {ABIs} from "./config/contracts";

type SingleAMMPath = { intermPath: string[], router: string };
type CrossAMMsPath = { intermPath: string[], routers: string[] };

export type ExchangePath = SingleAMMPath | CrossAMMsPath;

export type ArbitrageTarget = {
    token: string,                                                 // like this `AVAX`
    route: { address: string, token0: string, token1: string }[],  // like this `[(WAVAX/USDC), (USDC/DAI), (DAI/WAVAX]`
    minProfit: number                                              // in `wei` unit
}

const AMOUNT_MAX_BIPS = 1000;
const AMOUNT_WITH_FEE_BIPS = 997;
const AMOUNT_MAX_BIPS_POW2 = AMOUNT_MAX_BIPS * AMOUNT_MAX_BIPS;
const AMOUNT_WITH_FEE_BIPS_POW2 = AMOUNT_WITH_FEE_BIPS * AMOUNT_WITH_FEE_BIPS;
const AMOUNT_MAX_BIPS_POW3 = AMOUNT_MAX_BIPS_POW2 * AMOUNT_MAX_BIPS;
const AMOUNT_WITH_FEE_BIPS_POW3 = AMOUNT_WITH_FEE_BIPS_POW2 * AMOUNT_WITH_FEE_BIPS;

export class ArbitrageBot {
    private readonly _web3: Web3;
    private readonly _arbitrageContract: DexArbitrage;
    private readonly _multicallContract: MultiCall;
    private readonly _lpPairRawContract: Contract;

    constructor() {
        this._web3 = container.resolve("Web3");
        this._arbitrageContract = DexArbitrage.getInstance();
        this._multicallContract = MultiCall.getInstance();
        this._lpPairRawContract = new this._web3.eth.Contract(ABIs.LpPair as any[])
    }

    async checkForTradeOpportunities(targets: ArbitrageTarget[], isValidLiquidity: (token: string, reserve: number) => boolean) {
        // firstly, extract all LP pools for calling 'get reserve' aggregation
        const pools = new Map<string, { reserve0: number, reserve1: number }>();
        const multiCallInput: { target: string, callData: string }[] = [];
        const getReservesEncodedABI = this._lpPairRawContract.methods["getReserves"]().encodeABI();
        for (const item of targets) {
            for (const pair of item.route) {
                if (!pools.has(pair.address)) {
                    pools.set(pair.address, {reserve0: 0, reserve1: 0});
                    multiCallInput.push({target: pair.address, callData: getReservesEncodedABI})
                }
            }
        }
        const rMultiCall = await this._multicallContract.aggregate(multiCallInput);
        for (let i = 0; i < multiCallInput.length; i++) {
            const r = this._web3.eth.abi.decodeParameters(["uint256", "uint256"], rMultiCall.outputData[i]);
            const reserve0 = r[0] as number, reserve1 = r[1] as number;
            pools.set(multiCallInput[i].target, {reserve0, reserve1})
        }

        //console.log(JSON.stringify(targets));

        // secondly, find trade opportunities based on pool reserves
        const result = [];
        for (const item of targets) {
            const poolsRevIn = [], poolsRevOut = [];
            let inputToken = item.token;
            //let invalidLiquidity = false;
            for (let i = 0; i < item.route.length; i++) {
                const reserves = pools.get(item.route[i].address);
            /*    if (!isValidLiquidity(item.route[i].token0, reserves.reserve0) ||
                    !isValidLiquidity(item.route[i].token1, reserves.reserve1)) {
                    invalidLiquidity = true;
                    break;
                }*/
                if (item.route[i].token0 === inputToken) {
                    poolsRevIn.push(reserves.reserve0);
                    poolsRevOut.push(reserves.reserve1);
                    inputToken = item.route[i].token1;
                } else {
                    poolsRevIn.push(reserves.reserve1);
                    poolsRevOut.push(reserves.reserve0);
                    inputToken = item.route[i].token0;
                }
            }
            /*if (invalidLiquidity) {
                //console.log(`Invalid liq: ${JSON.stringify(item.route)}`)
                continue;
            }*/
            let rCheck: { optimalAmtIn: number, idealProfit: number } | null = null;
            if (poolsRevIn.length === 2) {
                rCheck = this.checkForTwoPoolsTrade(poolsRevIn, poolsRevOut);
            } else if (poolsRevIn.length === 3) {
                rCheck = this.checkForThreePoolsTrade(poolsRevIn, poolsRevOut);
            }
            if (rCheck && rCheck.idealProfit >= item.minProfit) {
                result.push({
                    token: item.token,
                    route: item.route.map(v => v.address),
                    optimalAmtIn: rCheck.optimalAmtIn,
                    idealProfit: rCheck.idealProfit
                })
            }
        }

        return {result, block: rMultiCall.blockNumber};
    }

    async checkForTradeOpportunities_(token: string, paths: ExchangePath[]) {
        const targetAddress = this._arbitrageContract.contractInfo.address;
        const input = [];
        for (const path of paths) {
            if ((path as Object).hasOwnProperty("router")) {
                // Single AMM case
                const singleAMMPath = path as SingleAMMPath;
                input.push({
                    target: targetAddress,
                    callData: this._arbitrageContract.encodeGetCyclicPoolReserves(
                        token,
                        singleAMMPath.intermPath,
                        singleAMMPath.router
                    )
                })
            } else {
                // Cross AMMs path
                const crossAMMs = path as CrossAMMsPath;
                input.push({
                    target: targetAddress,
                    callData: this._arbitrageContract.encodeGetCyclicPoolReservesCrossAMMs(
                        token,
                        crossAMMs.intermPath,
                        crossAMMs.routers
                    )
                })
            }
        }

        // Do Multicall
        const rCall = await this._multicallContract.aggregate(input);
        const result: ({ optimalAmtIn: number, idealProfit: number } | null) [] = [];
        for (let i = 0; i < paths.length; i++) {
            const r = this._web3.eth.abi.decodeParameters(["uint256[]", "uint256[]"], rCall.outputData[i]);
            const poolsRevIn = (r[0] as string[]).map(v => Number(v));
            const poolsRevOut = (r[1] as string[]).map(v => Number(v));
            if (poolsRevIn.length === 2) {
                result.push(this.checkForTwoPoolsTrade(poolsRevIn, poolsRevOut));
            } else if (poolsRevIn.length === 3) {
                result.push(this.checkForThreePoolsTrade(poolsRevIn, poolsRevOut))
            } else {
                result.push(null)
            }
        }
        return result;
    }

    private checkForTwoPoolsTrade(poolsRevIn: number[], poolsRevOut: number[]): { optimalAmtIn: number, idealProfit: number } | null {
        if (poolsRevIn.length !== 2 || poolsRevOut.length !== 2) {
            return null
        }
        const a = poolsRevOut[0] * poolsRevOut[1];
        const b = poolsRevIn[0] * poolsRevIn[1] * AMOUNT_MAX_BIPS_POW2 / AMOUNT_WITH_FEE_BIPS_POW2;
        const c = poolsRevOut[0] + poolsRevIn[1] * AMOUNT_MAX_BIPS / AMOUNT_WITH_FEE_BIPS;
        //console.log({a: a, b: b})
        if (a > b) {
            const abSqrt = Math.sqrt(a * b);
            return {
                optimalAmtIn: (abSqrt - b) / c,
                idealProfit: (a + b - 2 * abSqrt) / c
            }
        } else {
            return null
        }
    }

    private checkForThreePoolsTrade(poolsRevIn: number[], poolsRevOut: number[]): { optimalAmtIn: number, idealProfit: number } | null {
        if (poolsRevIn.length !== 3 || poolsRevOut.length !== 3) {
            return null
        }
        const a = poolsRevOut[0] * poolsRevOut[1] * poolsRevOut[2];
        const b = poolsRevIn[0] * poolsRevIn[1] * poolsRevIn[2] * AMOUNT_MAX_BIPS_POW3 / AMOUNT_WITH_FEE_BIPS_POW3;
        const c = poolsRevOut[0] * poolsRevOut[1] + poolsRevOut[0] * poolsRevIn[2] * AMOUNT_MAX_BIPS / AMOUNT_WITH_FEE_BIPS +
            poolsRevIn[1] * poolsRevIn[2] * AMOUNT_MAX_BIPS_POW2 / AMOUNT_WITH_FEE_BIPS_POW2;
        //console.log({a: a, b: b})
        if (a > b) {
            const abSqrt = Math.sqrt(a * b);
            return {
                optimalAmtIn: (abSqrt - b) / c,
                idealProfit: (a + b - 2 * abSqrt) / c
            }
        } else {
            return null
        }
    }
}