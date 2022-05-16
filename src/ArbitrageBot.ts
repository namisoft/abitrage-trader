import Web3 from "web3";
import {container} from "tsyringe";
import {BaseResult} from "./common/base-result";
import {DexArbitrage} from "./contracts/DexArbitrage";
import BN from "bignumber.js";

export class ArbitrageBot {
    private readonly _web3: Web3;
    private readonly _dexArbitrage: DexArbitrage;
    private readonly _txSendOptions: any;

    readonly address: string;

    constructor(_privateKey: string,
                private readonly _supportedTokens: string[],
                _txSendDefaultOptions: any) {
        this._web3 = container.resolve("Web3");
        const account = this._web3.eth.accounts.privateKeyToAccount(_privateKey);
        this.address = account.address.toLowerCase();
        this._web3.eth.accounts.wallet.add(_privateKey);
        this._dexArbitrage = DexArbitrage.getInstance();
        this._txSendOptions = {from: this.address, ..._txSendDefaultOptions};
        console.log(`Bot loaded: ${this.address}`);
    }

    isSupportedToken(token: string): boolean {
        return this._supportedTokens.includes(token);
    }

    supportedTokens(): string[] {
        return Array.from(this._supportedTokens)
    }


    tradeOnSingleRouter = (tradeId: string,
                           token: string,
                           amount: BN,
                           pairsRoute: string[],
                           router: string,
                           minProfit: BN,
                           validToBlockNumber: number) =>
        new Promise<BaseResult<string, { txProcessingError?: boolean, txSendingError?: boolean }>>(resolve => {
            return this._dexArbitrage
                .tradeOnSingleRoute(token, amount, pairsRoute, router, minProfit, validToBlockNumber,
                    this._txSendOptions
                )
                .then(r => {
                    if (r.success) {
                        // Tx success
                        console.log(`tradeOnSingleRouter ${tradeId} success: block= ${r.receipt.blockNumber}, tx=${r.receipt.transactionHash}`);
                        resolve({data: r.receipt.transactionHash})
                    } else if (r.receipt) {
                        // Tx processing failed
                        console.error(`tradeOnSingleRouter ${tradeId} failed in tx processing: block=${r.receipt.blockNumber}, tx=${r.receipt.transactionHash}`);
                        resolve({error: {txProcessingError: true}})
                    } else {
                        // Tx sending failed
                        console.error(`tradeOnSingleRouter ${tradeId} failed in tx sending`);
                        resolve({error: {txSendingError: true}})
                    }
                })
                .catch(err => {
                    console.error(`tradeOnSingleRouter ${tradeId} failed with exception: ${err.toString()}`);
                    resolve({error: {txSendingError: true}})
                })
        })


}