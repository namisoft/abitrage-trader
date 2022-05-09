const path = require('path');
const fs = require('fs-extra');

const Web3 = require("web3");

const Web3Provider = "https://api.avax.network/ext/bc/C/rpc";

const web3 = new Web3(Web3Provider);

const Contracts = require("./contracts");

const PAIRS_INPUT_FILE_PATH = path.join(__dirname, "output", "avax_pairs.json");

const TRUSTED_TOKENS_FILE_PATHS = [
    path.join(__dirname, "input", "joe.tokenlist.json"),
    path.join(__dirname, "input", "pangolin.tokenlist.json")
]

const ADDITIONAL_TOKENS_FILE_PATH = path.join(__dirname, "input", "tokens_plus.json");

const TO_BE_REVIEWED_PAIRS_FILE_PATH = path.join(__dirname, "output", "review_pending_pairs.json");

const PAIRS_OUTPUT_FILE_PATH = path.join(__dirname, "output", "avax_pairs_final.json");


const trustedTokens = new Map(), pairs = new Map();

// load trusted tokens

// Load pairs from file
const pairsData = (JSON.parse(fs.readFileSync(PAIRS_INPUT_FILE_PATH, "utf-8")));
for(const pairAddress of Object.keys(pairsData)) {
    const pairInfo = pairsData[pairAddress];
}