import {ServiceRunner} from "./ServiceRunner";
import {singleton} from "tsyringe";
import {ArbitrageService} from "./ArbitrageService";

@singleton()
export class RunnerDev implements ServiceRunner {
    constructor(private arbitrageService: ArbitrageService) {
    }

    run() {
        // Using hard-coded private key
        const privateKey = "1112222";
        this.arbitrageService.loadInputData();
        this.arbitrageService.scanForPotentialTrades();
    }

    stop() {
    }
}