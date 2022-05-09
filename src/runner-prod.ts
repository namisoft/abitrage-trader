import {ServiceRunner} from "./ServiceRunner";
import {container, singleton} from "tsyringe";
import Web3 from "web3";
import {ArbitrageService} from "./ArbitrageService";

const argv = require('minimist')(process.argv.slice(2));
const fs = require('fs-extra');
const readline = require('readline');

@singleton()
export class RunnerProd implements ServiceRunner {
    constructor(private arbitrageService: ArbitrageService) {
    }

    run() {
        // firstly, read private key from commandline
        const privateKey = argv['pk'];
        if (privateKey) {
            // start bot
            this._startBot(privateKey);
            return;
        }
        // otherwise, read json keystore file from commandline
        const jksFile = argv['jks'];
        if (!jksFile) {
            console.error("Private key or Keystore file required");
            process.exit(1);
        }
        const keystore = fs.readJSONSync(jksFile);

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl.stdoutMuted = true;

        const self = this;

        // let user enter the password of keystore file
        rl.question('Keystore password: ', function (password) {
            rl.close();
            try {
                const web3: Web3 = container.resolve("Web3");
                const decryptedKey = web3.eth.accounts.decrypt(keystore, password);
                // start bot
                self._startBot(decryptedKey.privateKey);
            } catch (e) {
                console.error(`\n${e.toString()}`);
                process.exit(1);
            }
        });

        rl._writeToOutput = function _writeToOutput(stringToWrite) {
            if (rl.stdoutMuted)
                rl.output.write("*");
            else
                rl.output.write(stringToWrite);
        };
    }

    stop() {

    }

    private _startBot(privateKey: string) {
        try {
            this.arbitrageService.scanForPotentialTrades();
        } catch (e) {
            console.error(`Cannot start bot: ${e.toString()}`);
            process.exit(1);
        }
    }
}