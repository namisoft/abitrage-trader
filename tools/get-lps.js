const argv = require('minimist')(process.argv.slice(2));
const path = require('path');
const fs = require('fs-extra');

const Web3 = require("web3");

const Web3Provider = "https://api.avax.network/ext/bc/C/rpc";

const web3 = new Web3(Web3Provider);

const Contracts = require("./contracts");

const FactoryAddress = "0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10";        // TODO: JOE Factory
//const FactoryAddress = "0xefa94DE7a4656D787667C749f7E1223D71E9FD88";        // TODO: Pangolin Factory

const factoryContract = new web3.eth.Contract(Contracts.AmmFactory.abi, FactoryAddress);

const multicallContract = new web3.eth.Contract(Contracts.Multicall.abi, Contracts.Multicall.address);

//const TOKENS_FILE_PATH = path.join(__dirname, "output", "avax_tokens.json");
const PAIRS_FILE_PATH = path.join(__dirname, "output", "JLP_pairs_.json");   // TODO:
//const PAIRS_FILE_PATH = path.join(__dirname, "output", "PGL_pairs_.json");   // TODO:
const TRUSTED_TOKENS_FILE_PATHS = [
    path.join(__dirname, "input", "joe.tokenlist.json"),
    path.join(__dirname, "input", "pangolin.tokenlist.json")
]

const READ_PAIRS_FROM_INDEX = 0;     // TODO: please change on each call
const READ_PAIRS_TOTAL_SIZE = 20000;         // TODO: please change on each call
const READ_PAIRS_EACH_SIZE = 100;

const EXCLUDED_PAIRS = [
    //"0xa37cd29A87975f44b83F06F9BA4D51879a99d378"
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
    //const tokens = new Map(), pairs = new Map(), trustedTokens = new Map();
    const pairs = [];

    // load existing tokens to memory
    /*   if (fs.existsSync(TOKENS_FILE_PATH)) {
           const tokensData = JSON.parse(fs.readFileSync(TOKENS_FILE_PATH, "utf-8"));
           for (const token of Object.keys(tokensData)) {
               tokens.set(token, tokensData[token]);
           }
       }*/
    // load existing pairs to memory
    /* if (fs.existsSync(PAIRS_FILE_PATH)) {
         const pairsData = JSON.parse(fs.readFileSync(PAIRS_FILE_PATH, "utf-8"));
         for (const pair of Object.keys(pairsData)) {
             pairs.set(pair, pairsData[pair])
         }
         console.log(`Existed pairs in the file: ${pairs.size}`);
     }
 */
    if (fs.existsSync(PAIRS_FILE_PATH)) {
        const pairsData = JSON.parse(fs.readFileSync(PAIRS_FILE_PATH, "utf-8"));
        pairs.push(...pairsData);
        console.log(`Existed pairs in the file: ${pairs.length}`);
    }
    // load trusted tokens
    /*   for (const fileName of TRUSTED_TOKENS_FILE_PATHS) {
           const trustedTokens = (JSON.parse(fs.readFileSync(fileName, "utf-8")))["tokens"];
           for (const token of trustedTokens) {
               const address = token.address.toLowerCase();
               if (!tokens.has(address)) {
                   tokens.set(address, {name: token.name, symbol: token.symbol, decimal: token.symbol}
                   )
               }
           }
       }

       console.log(JSON.stringify(Object.fromEntries(tokens)));

       console.log(`Loaded Tokens: ${tokens.size}`);*/
    const END_INDEX = Math.min(READ_PAIRS_FROM_INDEX + READ_PAIRS_TOTAL_SIZE - 1, totalPairs - 1)
    let fromIndex = READ_PAIRS_FROM_INDEX;
    let toIndex = Math.min(fromIndex + READ_PAIRS_EACH_SIZE - 1, END_INDEX);
    let count = 0;
    while (fromIndex <= toIndex) {
        console.log(`Reading pairs ${fromIndex} ==> ${toIndex} ...`);
        const multicallInput = [];
        for (let i = fromIndex; i <= toIndex; i++) {
            multicallInput.push({
                target: FactoryAddress,
                callData: factoryContract.methods["allPairs"](i).encodeABI()
            })
        }
        const rCall = await aggregateCall(multicallInput);
        for (let i = 0; i <= toIndex-fromIndex; i++) {
            const pairAddress = web3.eth.abi.decodeParameters(["address"], rCall.outputData[i])[0].toLowerCase();
            if (!EXCLUDED_PAIRS.includes(pairAddress)) {
                pairs.push(pairAddress);
                count++;
            }
        }
        fromIndex = toIndex + 1;
        toIndex = Math.min(fromIndex + READ_PAIRS_EACH_SIZE - 1, END_INDEX);
    }


  /*  console.log(`Reading pairs ${READ_PAIRS_FROM_INDEX} ==> ${readPairsToIndex} ...`);
    for (let i = READ_PAIRS_FROM_INDEX; i <= readPairsToIndex; i++) {
        const pairAddress = String(await factoryContract.methods["allPairs"](i).call({})).toLowerCase();
        if (!EXCLUDED_PAIRS.includes(pairAddress)) {
            pairs.push(pairAddress);
            count++;
        }

        /!*     const pairContract = new web3.eth.Contract(Contracts.LpPair.abi, pairAddress);
             const rGetPairTokens = await aggregateCall(
                 [
                     {target: pairAddress, callData: pairContract.methods["token0"]().encodeABI()},
                     {target: pairAddress, callData: pairContract.methods["token1"]().encodeABI()}
                 ]
             );
             const token0 = web3.eth.abi.decodeParameters(["address"], rGetPairTokens.outputData[0])[0].toLowerCase();
             const token1 = web3.eth.abi.decodeParameters(["address"], rGetPairTokens.outputData[1])[0].toLowerCase();
             if (EXCLUDED_TOKENS.includes(token0) || EXCLUDED_TOKENS.includes(token1)) {
                 continue;
             }
             console.log(`Pair: ${pairAddress}, token0: ${token0}, token1: ${token1}`);
             if(tokens.has(token0) && tokens.has(token1)){
                 console.log(`Pair: ${pairAddress}, token0: ${token0}, token1: ${token1}`);
                 pairs.set(pairAddress, {token0: token0, token1: token1});
             }*!/


        //console.log(`Pair: ${pairAddress}, token0: ${token0}, token1: ${token1}`);
        /!*  pairs.set(pairAddress, {token0: token0, token1: token1});
          if (!tokens.has(token0)) {
              const tokenInfo = await getErc20Info(token0);
              //console.log(JSON.stringify(tokenInfo));
              tokens.set(token0, tokenInfo);
          }
          if (!tokens.has(token1)) {
              const tokenInfo = await getErc20Info(token1);
              //console.log(JSON.stringify(tokenInfo));
              tokens.set(token1, tokenInfo);
          }

          const symbol0 = tokens.get(token0).symbol;
          const symbol1 = tokens.get(token1).symbol;
          console.log(`Pair ${pairAddress}: ${symbol0} / ${symbol1}`);*!/
    }
*/
    console.log(`Exporting ${count} pairs to file ${PAIRS_FILE_PATH}`);
    // export data to file
    fs.outputJSONSync(PAIRS_FILE_PATH, pairs);
    //fs.outputJSONSync(TOKENS_FILE_PATH, Object.fromEntries(tokens));
})()