import "reflect-metadata";
import {container} from "tsyringe";
import {ChainConfigAvaxMain} from "./config/networks/chain-config-avax-main";
import {ChainConfigPolygonMain} from "./config/networks/chain-config-polygon-main";
import {ChainConfigPolygonTest} from "./config/networks/chain-config-polygon-test";
import {ChainConfigAvaxTest} from "./config/networks/chain-config-avax-test";
import {ChainConfig} from "./config/chain-config";
import {ArbitrageProfile} from "./config/arbitrage-profile";
import {AvaxProfile} from "./config/profiles/avax-profile";
import {PolygonProfile} from "./config/profiles/polygon-profile";
import {ServiceRunner} from "./ServiceRunner";
import {RunnerProd} from "./runner-prod";
import {RunnerDev} from "./runner-dev";

const Web3 = require('web3');

const argv = require('minimist')(process.argv.slice(2));

// Setup logger
import * as logform from "logform";
const {createLogger, format, transports} = require('winston');
const {combine, timestamp, label, printf} = format;
require('winston-daily-rotate-file');

const logFormatter = printf((info: logform.TransformableInfo & { timestamp: string }) => {
    return `[${info.timestamp}][${info.level}]${info.message}`;
});

const logger = createLogger({
    format: combine(
        label({label: 'ArbitrageTrader'}),
        timestamp(),
        logFormatter
    ),
    transports: [
        new transports.Console(),
        new (transports.DailyRotateFile)({
            filename: 'arbitrage-trader-%DATE%.log',
            dirname: 'logs',
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            level: 'error',
            maxSize: '20m',
            maxFiles: '180d'
        }),
        new (transports.DailyRotateFile)({
            filename: 'arbitrage-trader-%DATE%.log',
            dirname: 'logs',
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '180d'
        })
    ]
});

console.log = function () {
    logger.info.apply(null, arguments);
};
console.error = function () {
    logger.error.apply(null, arguments);
};
// -- End of logger setup

// Chain config mapping
const ChainConfigMap: { [cfgName: string]: ChainConfig } = {
    avaxmain: ChainConfigAvaxMain,
    avaxtest: ChainConfigAvaxTest,
    polygonmain: ChainConfigPolygonMain,
    polygontest: ChainConfigPolygonTest
}

// Profile mapping
const ArbitrageProfileMap: { [cfgName: string]: ArbitrageProfile } = {
    avaxmain: AvaxProfile,
    polygonmain: PolygonProfile,
}

let runMode: "dev" | "prod";

if (process.env.NODE_ENV.toLowerCase() === 'production') {
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

container.register("ArbitrageProfile", {useValue: ArbitrageProfileMap[networkId]});

// Start the service runner
const serviceRunner: ServiceRunner =
    runMode === "prod" ? container.resolve(RunnerProd) : container.resolve(RunnerDev);
serviceRunner.run();