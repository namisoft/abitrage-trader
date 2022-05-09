import {ContractBase} from "../common/contract-base";
import {container} from "tsyringe";
import {ChainConfig} from "../config/chain-config";

export class MultiCall extends ContractBase {
    async aggregate(input: { target: string; callData: string }[]) {
        const ret = await this.underlyingContract.methods["aggregate"](input).call({});
        return {
            blockNumber: ret["blockNumber"],
            outputData: ret["returnData"] as string[]
        };
    }

    private static _instance?: MultiCall;

    static getInstance() {
        if (!MultiCall._instance) {
            const chainConfig: ChainConfig = container.resolve("ChainConfig");
            MultiCall._instance = new MultiCall(chainConfig.contracts.Multicall);
        }
        return MultiCall._instance as MultiCall;
    }
}
