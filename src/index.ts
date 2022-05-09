import * as http from 'http';
import express from 'express';
import "reflect-metadata";
import {container} from "tsyringe";
import {AppConfig} from "./config/app-config";
import {ChainConfigAvaxMain} from "./config/chain-config-avax-main";
import {ChainConfigPolygonMain} from "./config/chain-config-polygon-main";
import {ChainConfigPolygonTest} from "./config/chain-config-polygon-test";
import {ChainConfigAvaxTest} from "./config/chain-config-avax-test";
import {ChainConfig} from "./config/chain-config";
import {ServiceRunner} from "./ServiceRunner";
import {RunnerProd} from "./runner-prod";
import {RunnerDev} from "./runner-dev";

const bodyParser = require('body-parser');

const Web3 = require('web3');

const argv = require('minimist')(process.argv.slice(2));


// Chain config mapping
const ChainConfigMap: {[cfgName: string]: ChainConfig} = {
    avaxmain: ChainConfigAvaxMain,
    avaxtest: ChainConfigAvaxTest,
    polygonmain: ChainConfigPolygonMain,
    polygontest: ChainConfigPolygonTest
}

let runMode: "dev" | "prod";

if (process.env.NODE_ENV === 'production') {
    // We are running in production mode
    console.log(`App started in PRODUCTION mode...`);
    runMode = "prod";
} else {
    // We are running in development mode
    console.log(`App started in DEV mode...`);
    runMode = "dev";
}

let networkId = "avaxmain";
if (argv['network']) {
    networkId = argv['network'];
}

// Register components
const chainConfig = ChainConfigMap[networkId];
container.register("ChainConfig", {useValue: chainConfig});

container.registerInstance("Web3", new Web3(chainConfig.rpcUrl));

// Start the service runner
const serviceRunner: ServiceRunner =
    runMode === "prod" ?
        container.resolve(RunnerProd) :
        container.resolve(RunnerDev);
serviceRunner.run();

// Setup and spin-up a HTTP server -----------------------------------------------------------
import {ArbitrageController} from "./ArbitrageController";

const app: express.Express = express();
const server: http.Server = new http.Server(app);
app.use(bodyParser.json());

const chainAccessCtrl = container.resolve(ArbitrageController);
app.get("/test", chainAccessCtrl.test);

server.listen(AppConfig.HttpPort);

server.on('error', (e: Error) => {
    console.log('Error starting HTTP server' + e);
});

server.on('listening', () => {
    //console.log(`HTTP server started on port ${AppConfig.HttpPort} on env ${process.env.NODE_ENV || 'dev'}`);
});