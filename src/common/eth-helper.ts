/**
 * Created by IntelliJ IDEA.
 * Author: @cryptoz
 * Date: 9/6/2019
 * Time: 11:13 AM
 */
import {inject, singleton} from "tsyringe";
import Web3 from "web3";
import {BaseResult} from "./base-result";
import {TransactionReceipt} from "web3-eth";

@singleton()
export class EthHelper {
    constructor(@inject("Web3") private web3: Web3) {

    }

    getWeb3() {
        return this.web3;
    }


    newAccount() {
        return this.web3.eth.accounts.create();
    }

    getBalance(address: string){
        return this.web3.eth.getBalance(address).then(v => this.web3.utils.fromWei(v, "ether"))
    }

    sendEther(callerPk: string, toAddress: string, amount: number, gas?: number) {
        return new Promise<BaseResult<TransactionReceipt, any>>((resolve, reject) => {
            try {
                const callerAcc = this.web3.eth.accounts.privateKeyToAccount(callerPk);
                this.web3.eth.accounts.wallet.add(callerPk);
                this.web3.eth.net.isListening().then(isListening => {
                    if (isListening) {
                        this.web3.eth.sendTransaction({
                            from: callerAcc.address,
                            to: toAddress,
                            value: `${this.web3.utils.toWei(amount.toString(), "ether")}`,
                            gas: gas
                        }).on("receipt", receipt => {
                            resolve({data: receipt})
                        }).on("error", error => {
                            resolve({error: error})
                        }).catch(err => {
                            reject(err)
                        })
                    } else {
                        console.error(`Cannot connect to Eth RPC endpoint`);
                        reject("RPCConnectFailed");
                    }
                }).catch(err => {
                    console.error(`Cannot connect to Eth RPC endpoint: ${err}`);
                    reject("RPCConnectFailed");
                })
            } catch (err) {
                reject(err)
            }
        });
    }
}
