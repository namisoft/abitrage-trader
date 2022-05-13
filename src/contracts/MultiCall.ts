import {ContractBase} from "../common/contract-base";
import {container} from "tsyringe";
import {ChainConfig} from "../config/chain-config";

export class MultiCall extends ContractBase {
    async aggregate(input: { target: string, callData: string }[]) {
        const ret = await this.underlyingContract.methods["aggregate"](input)
            .call({})
            .then(r => {
                return {data: r}
            })
            .catch(e => {
                return {error: e}
            });
        if("error" in ret) {
            return ret
        } else {
            return {
                blockNumber: ret.data["blockNumber"],
                outputData: ret.data["returnData"] as string[]
            };
        }
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
