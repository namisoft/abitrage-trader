import {Ownable} from "./Ownable";
import {SendOptions} from "../common/contract-base";
import {ChainConfig} from "../config/chain-config";
import {container} from "tsyringe";
import {MultiCall} from "./MultiCall";
import {to32BytesHex} from "../common/utils";

export class DexArbitrage extends Ownable {
    private static _instance?: DexArbitrage;

    static getInstance() {
        if (!DexArbitrage._instance) {
            const chainConfig: ChainConfig = container.resolve("ChainConfig");
            DexArbitrage._instance = new DexArbitrage(chainConfig.contracts.DexArbitrage);
        }
        return DexArbitrage._instance as DexArbitrage;
    }

    async controlState() {
        const muticall = MultiCall.getInstance();
        const abiRequestCounter = this.underlyingContract.methods["requestCounter"]().encodeABI();
        const abiTotalUsableHashes = this.underlyingContract.methods["totalUsableHashes"]().encodeABI();
        const input = [
            {target: this.contractInfo.address, callData: abiRequestCounter},
            {target: this.contractInfo.address, callData: abiTotalUsableHashes}
        ]
        const rCall = await muticall.aggregate(input);
        const requestCounter = Number(
            this.web3.eth.abi.decodeParameters(["uint256"], rCall.outputData[0])[0]
        );
        const totalUsableHashes = Number(
            this.web3.eth.abi.decodeParameters(["uint256"], rCall.outputData[1])[0]
        );
        return {
            requestCounter: requestCounter,
            totalUsableHashes: totalUsableHashes,
            block: Number(rCall.blockNumber)
        }
    }

    encodeGetOutputWAVAXForCyclicSwap(amountIn: number, intermTokensChain: string[], router: string) {
        const amountInWei = this.web3.utils.toWei(`${amountIn}`, "ether");
        return this.underlyingContract
            .methods["getOutputWAVAXForCyclicSwap"](amountInWei, intermTokensChain, router)
            .encodeABI()
    }

    getOutputWAVAXForCyclicSwap(amountIn: number, intermTokensChain: string[], router: string): Promise<number> {
        const amountInWei = this.web3.utils.toWei(`${amountIn}`, "ether");
        return this.underlyingContract.methods["getOutputWAVAXForCyclicSwap"](amountInWei, intermTokensChain, router)
            .call({})
            .then(r => Number(this.web3.utils.fromWei(r, "ether")))
    }

    encodeGetOutputWAVAXForCyclicSwap2(amountIn: number, intermTokensChain: string[], routersChain: string[]) {
        const amountInWei = this.web3.utils.toWei(`${amountIn}`, "ether");
        return this.underlyingContract
            .methods["getOutputWAVAXForCyclicSwap2"](amountInWei, intermTokensChain, routersChain)
            .encodeABI()
    }

    getOutputWAVAXForCyclicSwap2(amountIn: number, intermTokensChain: string[], routersChain: string[]): Promise<number> {
        const amountInWei = this.web3.utils.toWei(`${amountIn}`, "ether");
        return this.underlyingContract.methods["getOutputWAVAXForCyclicSwap2"](amountInWei, intermTokensChain, routersChain)
            .call({})
            .then(r => Number(this.web3.utils.fromWei(r, "ether")))
    }

    encodeGetCyclicPoolReserves(token: string, intermPath: string[], router: string) {
        return this.underlyingContract
            .methods["getCyclicPoolReserves"](token, intermPath, router)
            .encodeABI()
    }

    getCyclicPoolReserves(token: string, intermPath: string[], router: string): Promise<{ poolsRevIn: number[], poolsRevOut: number[] }> {
        return this.underlyingContract.methods["getCyclicPoolReserves"](token, intermPath, router)
            .call({})
            .then(r => {
                const poolsRevIn = (r["poolsRevIn"] as string[]).map(v => Number(v));
                const poolsRevOut = (r["poolsRevOut"] as string[]).map(v => Number(v));
                return {poolsRevIn, poolsRevOut}
            })
    }

    encodeGetCyclicPoolReservesCrossAMMs(token: string, intermPath: string[], routers: string[]) {
        return this.underlyingContract
            .methods["getCyclicPoolReservesCrossAMMs"](token, intermPath, routers)
            .encodeABI()
    }

    getCyclicPoolReservesCrossAMMs(token: string, intermPath: string[], routers: string[]): Promise<{ poolsRevIn: number[], poolsRevOut: number[] }> {
        return this.underlyingContract.methods["getCyclicPoolReservesCrossAMMs"](token, intermPath, routers)
            .call({})
            .then(r => {
                const poolsRevIn = (r["poolsRevIn"] as string[]).map(v => Number(v));
                const poolsRevOut = (r["poolsRevOut"] as string[]).map(v => Number(v));
                return {poolsRevIn, poolsRevOut}
            })
    }

    // each secret hash must be in hex string number form
    commit(secretHashes: string[], options?: SendOptions) {
        return this.sendTx("commit", [secretHashes], options)
    }

    // secret & secret hash must be in hex string number form
    reveal(hash: string, secret: string, options?: SendOptions) {
        return this.sendTx("reveal", [hash, secret], options)
    }


    readonly pastEvents = ((self: DexArbitrage) => {
        return {
            secretHashAssigned: (fromBlock: number, toBlock: number) =>
                new Promise<DexArbitrageEventData.SecretHashAssigned[]>((resolve, reject) => {
                    self.underlyingContract
                        .getPastEvents("SecretHashAssigned", {
                            fromBlock: fromBlock,
                            toBlock: toBlock
                        })
                        .then(events => {
                            const ret: DexArbitrageEventData.SecretHashAssigned[] = [];
                            for (const evt of events) {
                                const secretHash = to32BytesHex(evt.returnValues["secretHash"]);
                                const secretIndex = Number(evt.returnValues["secretIndex"]);
                                ret.push({secretHash: secretHash, secretIndex: secretIndex, block: evt.blockNumber})
                            }
                            resolve(ret);
                        })
                        .catch(err => {
                            reject(err);
                        })
                }),
        }
    })(this)
}

export namespace DexArbitrageEventData {
    export type SecretHashAssigned = { secretHash: string, secretIndex: number, block: number }
}