const path = require('path');
const fs = require('fs-extra');

const Web3 = require("web3");

const Web3Provider = "https://api.avax.network/ext/bc/C/rpc";

const web3 = new Web3(Web3Provider);

const Contracts = require("./contracts");

const PAIRS_INPUT_FILE_PATH = path.join(__dirname, "output", "JLP_pairs.json");

const TRUSTED_TOKENS_FILE_PATHS = [
    path.join(__dirname, "input", "joe.tokenlist.json"),
    path.join(__dirname, "input", "ab.tokenlist.json"),
    path.join(__dirname, "input", "aeb.tokenlist.json")
]


const PAIRS_OUTPUT_FILE_PATH = path.join(__dirname, "output", "JLP_pairs_filtered.json");

const trustedTokens = new Map(), pairs = new Map();

// load trusted tokens
for (const fileName of TRUSTED_TOKENS_FILE_PATHS) {
    const tokensList = (JSON.parse(fs.readFileSync(fileName, "utf-8")))["tokens"];
    for (const token of tokensList) {
        const address = token.address.toLowerCase();
        if (!trustedTokens.has(address)) {
            trustedTokens.set(address, {name: token.name, symbol: token.symbol, decimal: token.symbol})
        }
    }
}

// Load pairs from file
const pairsData = (JSON.parse(fs.readFileSync(PAIRS_INPUT_FILE_PATH, "utf-8")));
console.log(`Total pairs loaded: ${Object.keys(pairsData).length}`);
for(const pairAddress of Object.keys(pairsData)) {
    const pairInfo = pairsData[pairAddress];
    if(trustedTokens.has(pairInfo.token0) && trustedTokens.has(pairInfo.token1)){
        pairs.set(pairAddress, pairInfo);
    }
}

// Save filtered pairs
console.log(`Total valid pairs: ${pairs.size}`);
fs.outputJSONSync(PAIRS_OUTPUT_FILE_PATH, Object.fromEntries(pairs));