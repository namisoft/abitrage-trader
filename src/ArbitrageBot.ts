import Web3 from "web3";
import {container} from "tsyringe";
import {BaseResult} from "./common/base-result";
import {DexArbitrage} from "./contracts/DexArbitrage";

const DEFAULT_GAS_LIMIT = 1000000;
const DEFAULT_GAS_PRICE = 100000000000;

export class ArbitrageBot {
    private readonly _web3: Web3;
    private readonly _dexArbitrage: DexArbitrage;

    readonly address: string;

    constructor(private readonly _privateKey: string,
                private readonly _supportedTokens: string[]) {
        this._web3 = container.resolve("Web3");
        const account = this._web3.eth.accounts.privateKeyToAccount(_privateKey);
        this.address = account.address.toLowerCase();
        console.log(`Bot loaded: ${this.address}`);
        this._web3.eth.accounts.wallet.add(_privateKey);
        this._dexArbitrage = DexArbitrage.getInstance();
    }

    isSupportedToken(token: string): boolean {
        return this._supportedTokens.includes(token);
    }

    supportedTokens(): string[] {
        return Array.from(this._supportedTokens)
    }


    tradeOnSingleRouter = (token: string,
                           amount: number,
                           pairsRoute: string[],
                           router: string,
                           minProfit: number,
                           spotOutBlock: number,
                           maxBlocksOffset: number) =>
        new Promise<BaseResult<string, { txProcessingError?: boolean, txSendingError?: boolean }>>(resolve => {
            return this._dexArbitrage
                .tradeOnSingleRoute(token, amount, pairsRoute, router, minProfit, spotOutBlock, maxBlocksOffset,
                    {
                        from: this.address,
                        gas: DEFAULT_GAS_LIMIT,
                        gasPrice: DEFAULT_GAS_PRICE
                    })
                .then(r => {
                    if (r.success) {
                        // Tx success
                        console.log(`tradeOnSingleRouter success: tx=${r.receipt.transactionHash}`);
                        resolve({data: r.receipt.transactionHash})
                    } else if (r.receipt) {
                        // Tx processing failed
                        console.error(`tradeOnSingleRouter failed in tx processing: block=${r.receipt.blockNumber}, tx=${r.receipt.transactionHash}`);
                        resolve({error: {txProcessingError: true}})
                    } else {
                        // Tx sending failed
                        console.error(`tradeOnSingleRouter failed in tx sending`);
                        resolve({error: {txSendingError: true}})
                    }
                })
                .catch(err => {
                    console.error(`tradeOnSingleRouter failed with exception: ${err.toString()}`);
                    resolve({error: {txSendingError: true}})
                })
        })


}