const path = require('path');
const fs = require('fs-extra');
const Web3 = require("web3");
const Contracts = require("./contracts");
const {ChainsConfig} = require("./def");

const ChainConfig = ChainsConfig.Polygon;       // Change here for your target chain !!!

const web3 = new Web3(ChainConfig.RpcUrl);

const FactoryAddress = ChainConfig.ContractAddresses.QuickSwapFactory;

const factoryContract = new web3.eth.Contract(Contracts.AmmFactory.abi, FactoryAddress);

const multicallContract = new web3.eth.Contract(Contracts.Multicall.abi, ChainConfig.ContractAddresses.Multicall);


const PAIRS_FILE_PATH = path.join(__dirname, "output/polygon", "Quick_pairs.json");   // Change here for output file!!!


const READ_PAIRS_FROM_INDEX = 0;              // TODO: please change on each call
const READ_PAIRS_TOTAL_SIZE = 50000;         // TODO: please change on each call
const READ_PAIRS_EACH_SIZE = 100;

const EXCLUDED_PAIRS = [
].map(address => address.toLowerCase());

const EXCLUDED_TOKENS = [
    ""
].map(address => address.toLowerCase())

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

async function getErc20Info(address) {
    const erc20Contract = new web3.eth.Contract(Contracts.Erc20.abi, address);
    const rCall = await aggregateCall(
        [
            {target: address, callData: erc20Contract.methods["name"]().encodeABI()},
            {target: address, callData: erc20Contract.methods["symbol"]().encodeABI()},
            {target: address, callData: erc20Contract.methods["decimals"]().encodeABI()}
        ]
    );
    return {
        name: web3.eth.abi.decodeParameters(["string"], rCall.outputData[0])[0],
        symbol: web3.eth.abi.decodeParameters(["string"], rCall.outputData[1])[0],
        decimals: Number(web3.eth.abi.decodeParameters(["uint256"], rCall.outputData[2])[0])
    }
}

// Get all pairs
(async () => {
    const totalPairs = Number(await factoryContract.methods["allPairsLength"]().call({}));
    console.log(`Total pairs found: ${totalPairs}`);
    const pairs = new Map();

    if (fs.existsSync(PAIRS_FILE_PATH)) {
        const pairsData = JSON.parse(fs.readFileSync(PAIRS_FILE_PATH, "utf-8"));
        for (const pair of Object.keys(pairsData)) {
            pairs.set(pair, pairsData[pair])
        }
        console.log(`Existed pairs in the file: ${pairs.size}`);
    }

    const READ_PAIR_TO_INDEX = Math.min(READ_PAIRS_FROM_INDEX + READ_PAIRS_TOTAL_SIZE - 1, totalPairs - 1)
    let fromIndex = READ_PAIRS_FROM_INDEX;
    let toIndex = Math.min(fromIndex + READ_PAIRS_EACH_SIZE - 1, READ_PAIR_TO_INDEX);
    while (fromIndex <= toIndex) {
        console.log(`Reading pairs ${fromIndex} ==> ${toIndex} ...`);
        const getPairsInput = [];
        for (let i = fromIndex; i <= toIndex; i++) {
            getPairsInput.push({
                target: FactoryAddress,
                callData: factoryContract.methods["allPairs"](i).encodeABI()
            })
        }
        const rGetPairs = await aggregateCall(getPairsInput);
        const getTokensInput = [];
        for (let i = 0; i <= toIndex - fromIndex; i++) {
            const pairAddress = web3.eth.abi.decodeParameters(["address"], rGetPairs.outputData[i])[0].toLowerCase();
            if (!EXCLUDED_PAIRS.includes(pairAddress)) {
                const pairContract = new web3.eth.Contract(Contracts.LpPair.abi, pairAddress);
                getTokensInput.push(
                    {target: pairAddress, callData: pairContract.methods["token0"]().encodeABI()},
                    {target: pairAddress, callData: pairContract.methods["token1"]().encodeABI()}
                )
            }
        }
        const rGetTokens = await aggregateCall(getTokensInput);
        for (let i = 0; i < getTokensInput.length / 2; i++) {
            const pairAddress = getTokensInput[2 * i].target;
            const token0 = web3.eth.abi.decodeParameters(["address"], rGetTokens.outputData[2 * i])[0].toLowerCase();
            const token1 = web3.eth.abi.decodeParameters(["address"], rGetTokens.outputData[2 * i + 1])[0].toLowerCase();
            pairs.set(pairAddress, {token0, token1})
        }

        // update from, to index to continue the loop
        fromIndex = toIndex + 1;
        toIndex = Math.min(fromIndex + READ_PAIRS_EACH_SIZE - 1, READ_PAIR_TO_INDEX);
    }

    // export data to file
    console.log(`Exporting ${pairs.size} pairs to file ${PAIRS_FILE_PATH}`);
    fs.outputJSONSync(PAIRS_FILE_PATH, Object.fromEntries(pairs));
})()