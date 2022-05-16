import {ServiceRunner} from "./ServiceRunner";
import {container, singleton} from "tsyringe";
import Web3 from "web3";
import {ArbitrageService} from "./ArbitrageService";
import {BotManager} from "./BotManager";

const argv = require('minimist')(process.argv.slice(2));
const fs = require('fs-extra');
const readline = require('readline');

@singleton()
export class RunnerProd implements ServiceRunner {
    constructor(private arbitrageService: ArbitrageService,
                private botManager: BotManager) {
    }

    run() {

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl.stdoutMuted = true;

        const self = this;

        // let user enter the password of keystore file
        rl.question('Keystore password: ', function (password) {
            console.log("Keystore password entered!");
            rl.close();
            try {
                // start service
                self.startService(password);
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

    private startService(privateKey: string) {
        try {
            if(this.botManager.loadConfiguredBots(privateKey)) {
                this.arbitrageService.loadInputData();
                this.arbitrageService.scanForPotentialTrades();
            }
        } catch (e) {
            console.error(`Cannot start service: ${e.toString()}`);
            process.exit(1);
        }
    }
}