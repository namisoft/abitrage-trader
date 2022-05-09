const path = require('path');
const fs = require('fs-extra');
const Contracts = require("./contracts");
const {ChainsConfig, Filters} = require("./def");

const Web3 = require("web3");

const ChainConfig = ChainsConfig.Polygon;       // Change here for your target chain !!!
const Filter = Filters.Polygon;

const web3 = new Web3(ChainConfig.RpcUrl);

const multicallContract = new web3.eth.Contract(Contracts.Multicall.abi, ChainConfig.ContractAddresses.Multicall);

const PAIR_SYMBOL = "Quick";          // change here to your desired value
const CHAIN_SUB_DIR = "polygon";      // change here to your desired value

const PAIRS_INPUT_FILE_PATH = path.join(__dirname, `output/${CHAIN_SUB_DIR}`, `${PAIR_SYMBOL}_pairs.json`);

const PAIRS_OUTPUT_FILE_PATH = path.join(__dirname, `output/${CHAIN_SUB_DIR}`, `${PAIR_SYMBOL}_pairs_filtered3.json`);

const L2PAIRS_INTERM_FILE_PATH = path.join(__dirname, `output/${CHAIN_SUB_DIR}`, `${PAIR_SYMBOL}_L2Pairs_interm.json`);

const L2PAIRS_FINAL_FILE_PATH = path.join(__dirname, `output/${CHAIN_SUB_DIR}`, `${PAIR_SYMBOL}_L2Pairs.json`);

const L2PAIRS_INVALID_FILE_PATH = path.join(__dirname, `output/${CHAIN_SUB_DIR}`, `${PAIR_SYMBOL}_L2Pairs_invalid.json`);

const MMR_ADJUSTMENT_FACTOR = 0.6;      // change it if you want to adjust the pool reserves min values

const KnownTokensMRR = new Map(Array.from(Filter.MinPoolReserveRequired, ([k,v]) => [k, MMR_ADJUSTMENT_FACTOR * v]));


// aggregation call using Multicall contract
// @input: in the form { target: string; callData: string }[]
// @return: {blockNumber: number, outputData: string[]}
async function aggregateCall(input) {
    const ret = await multicallContract.methods["aggregate"](input).call({});
    return {
        blockNumber: ret["blockNumber"],
        outputData: ret["returnData"]
    };
}

// Load pairs from file
const oriPairsData = JSON.parse(fs.readFileSync(PAIRS_INPUT_FILE_PATH, "utf-8"));
console.log(`Total pairs loaded: ${Object.keys(oriPairsData).length}`);

// construct the list of pairs for each token
const tokensPairs = new Map();  // in the form: token -> [pair1, pair2,...]
for (const pairAddress of Object.keys(oriPairsData)) {
    const pairInfo = oriPairsData[pairAddress];
    if (!tokensPairs.has(pairInfo.token0)) {
        tokensPairs.set(pairInfo.token0, [pairAddress]);
    } else {
        const tmp = tokensPairs.get(pairInfo.token0);
        tmp.push(pairAddress);
        tokensPairs.set(pairInfo.token0, tmp);
    }
    if (!tokensPairs.has(pairInfo.token1)) {
        tokensPairs.set(pairInfo.token1, [pairAddress]);
    } else {
        const tmp = tokensPairs.get(pairInfo.token1);
        tmp.push(pairAddress);
        tokensPairs.set(pairInfo.token1, tmp);
    }
}

const hasPairedWithKnownToken = token => {
    let pairs = tokensPairs.get(token);
    for (const p of pairs) {
        const token0 = oriPairsData[p].token0;
        const token1 = oriPairsData[p].token1;
        if (KnownTokensMRR.has(token0) || KnownTokensMRR.has(token1)) {
            return true;
        }
    }
    return false;
}

const pairedWithKnownTokens = token => {
    let pairs = tokensPairs.get(token);
    const result = [];
    for (const p of pairs) {
        const token0 = oriPairsData[p].token0;
        const token1 = oriPairsData[p].token1;
        if (KnownTokensMRR.has(token0) || KnownTokensMRR.has(token1)) {
            result.push(p)
        }
    }
    return result;
}

(async () => {
    const pairsL1 = [], intermPairsL2 = new Map();
    for (const pairAddress of Object.keys(oriPairsData)) {
        const token0 = oriPairsData[pairAddress].token0;
        const token1 = oriPairsData[pairAddress].token1;
        if (KnownTokensMRR.has(token0) || KnownTokensMRR.has(token1)) {
            pairsL1.push(pairAddress);
        } else {
            const pp0 = pairedWithKnownTokens(token0);
            const pp1 = pairedWithKnownTokens(token1);
            const tmp = [...pp0, ...pp1];
            if (tmp.length > 0) {
                intermPairsL2.set(pairAddress, tmp);
            }
        }
    }

// get reserves for all pairs of L1 and L2
    const pairsReserves = new Map();     // pair -> {reserve0:..., reserve1:...}
    const pairsL1L2 = [...pairsL1, ...intermPairsL2.keys()];
    const BATCH_SIZE = 200;
    let fromIdx = 0, toIdx = Math.min(fromIdx + BATCH_SIZE - 1, pairsL1L2.length - 1);
    while (fromIdx <= toIdx) {
        const multicallInput = [];
        for (let i = fromIdx; i <= toIdx; i++) {
            const pairContract = new web3.eth.Contract(Contracts.LpPair.abi, pairsL1L2[i]);
            multicallInput.push({
                target: pairsL1L2[i],
                callData: pairContract.methods["getReserves"]().encodeABI()
            })
        }
        const rMulticall = await aggregateCall(multicallInput);
        for (let i = 0; i < multicallInput.length; i++) {
            const r = web3.eth.abi.decodeParameters(["uint256", "uint256"], rMulticall.outputData[i]);
            pairsReserves.set(multicallInput[i].target, {reserve0: r[0], reserve1: r[1]})
        }
        fromIdx = toIdx + 1;
        toIdx = Math.min(fromIdx + BATCH_SIZE - 1, pairsL1L2.length - 1)
    }

    const validPairs = [];

    // process for L1 pairs
    for (const p of pairsL1) {
        const token0 = oriPairsData[p].token0;
        const token1 = oriPairsData[p].token1;
        const reserves = pairsReserves.get(p);
        const isValid =
            (KnownTokensMRR.has(token0) && reserves.reserve0 >= KnownTokensMRR.get(token0)) ||
            (KnownTokensMRR.has(token1) && reserves.reserve1 >= KnownTokensMRR.get(token1));
        if (isValid) {
            validPairs.push(p);
        }
    }

    console.log(`L1 pairs: ${validPairs.length}`);

    console.log(`Interm L2 pairs: ${intermPairsL2.size}`);

    fs.outputJSONSync(L2PAIRS_INTERM_FILE_PATH, Object.fromEntries(intermPairsL2));

    // process for L2 pairs
    const l2Pairs = [];
    for (const p of intermPairsL2.keys()) {
        const token0 = oriPairsData[p].token0;
        const token1 = oriPairsData[p].token1;
        const rev = pairsReserves.get(p);
        const knowTokensPairs = intermPairsL2.get(p);
        for (const pl2 of knowTokensPairs) {
            const token2_0 = oriPairsData[pl2].token0;
            const token2_1 = oriPairsData[pl2].token1;
            const rev2 = pairsReserves.get(pl2);
            const linkedToken = (token0 === token2_0 || token0 === token2_1) ? token0 : token1;
            const knownToken = (linkedToken === token2_0) ? token2_1 : token2_0;
            let linkedTokenRev2 = 0, knownTokenRev2 = 0;
            if (linkedToken === token2_0) {
                linkedTokenRev2 = rev2.reserve0;
                knownTokenRev2 = rev2.reserve1;
            } else {
                linkedTokenRev2 = rev2.reserve1;
                knownTokenRev2 = rev2.reserve0;
            }
            const toCheckRev = (linkedToken === token0) ? rev.reserve0 : rev.reserve1;
            const minRevRequired = KnownTokensMRR.get(knownToken);
            //console.log(`Linked token: ${linkedToken}:${linkedTokenRev2}, known token: ${knownToken}:${knownTokenRev2}, check rev: ${toCheckRev} against ${minRevRequired}`);
            if (knownTokenRev2 >= minRevRequired && linkedTokenRev2 !== 0 &&
                toCheckRev * knownTokenRev2 / linkedTokenRev2 >= minRevRequired) {
                validPairs.push(p);
                l2Pairs.push(p);
                break;
            }
        }
    }


    console.log(`Total valid L2 pairs: ${l2Pairs.length}`);
    fs.outputJSONSync(L2PAIRS_FINAL_FILE_PATH, l2Pairs);

    const invalidL2Pairs = [];
    for(const p of intermPairsL2.keys()) {
        if(!l2Pairs.includes(p)) {
            invalidL2Pairs.push(p);
        }
    }
    console.log(`Total invalid L2 pairs: ${invalidL2Pairs.length}`);
    fs.outputJSONSync(L2PAIRS_INVALID_FILE_PATH, invalidL2Pairs);


    console.log(`Total valid pairs: ${validPairs.length}`);

    const outputPairs = new Map();
    for (const p of validPairs) {
        outputPairs.set(p, oriPairsData[p]);
    }
    fs.outputJSONSync(PAIRS_OUTPUT_FILE_PATH, Object.fromEntries(outputPairs));
})()