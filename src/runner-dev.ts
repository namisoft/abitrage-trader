import {ServiceRunner} from "./ServiceRunner";
import {singleton} from "tsyringe";
import {ArbitrageService} from "./ArbitrageService";
import {BotManager} from "./BotManager";

const DEV_JKS_PASSWORD = "12345a@";

@singleton()
export class RunnerDev implements ServiceRunner {
    constructor(private arbitrageService: ArbitrageService,
                private botManager: BotManager) {
    }

    run() {
        // Using hard-coded jks password for all bot accounts
        if(this.botManager.loadConfiguredBots(DEV_JKS_PASSWORD)) {
            this.arbitrageService.loadInputData();
            this.arbitrageService.scanForPotentialTrades();
        }
    }

    stop() {
    }
}