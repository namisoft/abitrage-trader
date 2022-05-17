import {Ownable} from "./Ownable";
import {ChainConfig} from "../config/chain-config";
import {container} from "tsyringe";
import {MultiCall} from "./MultiCall";
import BN from "bignumber.js";

export class DexArbitrage extends Ownable {
    private static _instance?: DexArbitrage;

    static getInstance() {
        if (!DexArbitrage._instance) {
            const chainConfig: ChainConfig = container.resolve("ChainConfig");
            DexArbitrage._instance = new DexArbitrage(chainConfig.contracts.DexArbitrage);
        }
        return DexArbitrage._instance as DexArbitrage;
    }

    tradeOnSingleRoute(token: string,
                       amount: BN,
                       pairsRoute: string[],
                       router: string,
                       minProfit: BN,
                       validToBlock: number,
                       sendOptions?: any) {
        // amount number process
        const appliedAmt = this.web3.utils.toBN(amount.integerValue(BN.ROUND_DOWN).toString());
        const appliedMinProfit = this.web3.utils.toBN(minProfit.integerValue(BN.ROUND_DOWN).toString());
        return this.sendTx(
            "tradeOnSingleRouter",
            [token, appliedAmt, pairsRoute, router, appliedMinProfit, validToBlock],
            sendOptions)
    }

    tradeOnMultiRouters(token: string,
                        amount: BN,
                        pairsRoute: string[],
                        routers: string[],
                        minProfit: BN,
                        validToBlock: number,
                        sendOptions?: any) {
        // amount number process
        const appliedAmt = this.web3.utils.toBN(amount.integerValue(BN.ROUND_DOWN).toString());
        const appliedMinProfit = this.web3.utils.toBN(minProfit.integerValue(BN.ROUND_DOWN).toString());
        return this.sendTx(
            "tradeOnMultiRouters",
            [token, appliedAmt, pairsRoute, routers, appliedMinProfit, validToBlock],
            sendOptions)
    }

}