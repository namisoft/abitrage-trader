import {Contract} from "web3-eth-contract";
import Web3 from "web3";
import {container} from "tsyringe";
import {TransactionReceipt} from "web3-core";

export type SendOptions = {
    from?: string;
    gas?: number;
}

export abstract class ContractBase {
    readonly web3: Web3;
    protected readonly underlyingContract: Contract;
    protected defaultAccount?: string
    protected defaultGas?: number;

    constructor(public readonly contractInfo: { abi: any[], address: string }) {
        this.web3 = container.resolve("Web3");
        this.underlyingContract = new this.web3.eth.Contract(this.contractInfo.abi, this.contractInfo.address);
    }

    setDefaultAccount(address: string) {
        this.defaultAccount = address;
        // Set as the contract default account
        this.underlyingContract.defaultAccount = address;
    }

    setDefaultGasLimit(gas: number) {
        this.defaultGas = gas;
    }

    protected sendTx(methodName: string, params: any[], options?: SendOptions) {
        const appliedOptions = options ? options : {from: this.defaultAccount, gas: this.defaultGas}
        const self = this;
        return new Promise<{ success: boolean, receipt?: TransactionReceipt }>(((resolve, reject) => {
            try {
                this.underlyingContract.methods[methodName]
                    .apply(null, params)
                    .send(appliedOptions)
                    .on('transactionHash', txHash => {
                        console.log(`Invoking method ${self.contractInfo.address}.${methodName} tx sent successfully`);
                        console.log(`  TxHash: ${JSON.stringify(txHash)}`);
                    })
                    .on('receipt', receipt => {
                        console.log(`Method ${self.contractInfo.address}.${methodName} invoked successfully: tx=${receipt.transactionHash}, gasUsed=${receipt.gasUsed}`);
                        resolve({success: true, receipt: receipt});
                    })
                    .on('error', (err, receipt) => {
                        if (!receipt) {
                            // If no receipt, we have an error occurs during sending
                            console.error(`Method ${self.contractInfo.address}.${methodName}: send TX failed - ${err.toString()}`);
                            resolve({success: false});
                        } else {
                            // Otherwise, this is out of gas error or execution failed (revert for example)
                            console.log(`Method ${self.contractInfo.address}.${methodName} invoked failure: err=${err.toString().split("\n")[0]}, gasUsed=${receipt.gasUsed}`);
                            resolve({success: false, receipt: receipt});
                        }
                    })
            } catch (err) {
                console.log(`Invoke send method ${self.contractInfo.address}.${methodName} failed: ${err.toString()}`);
                reject(err);
            }
        }));
    }
}