import {ContractBase, SendOptions} from "../common/contract-base";

export class Ownable extends ContractBase {
    getOwner(): Promise<string> {
        return this.underlyingContract.methods["getOwner"]()
            .call({})
            .then(r => r["0"].valueOf() as string)
    }

    changeOwner(newOwner: string, options?: SendOptions) {
        return this.sendTx("changeOwner", [newOwner], options)
    }
}