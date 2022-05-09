const Erc20Abi = require('./ERC20.json');
const AmmFactoryAbi = require('./AmmFactory.json');
const LpPairAbi = require('./LpPair.json');
const MulticallAbi = require('./Multicall.json');

const Contracts = {
    Erc20: {
      abi: Erc20Abi
    },
    AmmFactory: {
        abi: AmmFactoryAbi
    },
    LpPair: {
        abi: LpPairAbi
    },
    Multicall: {
        abi: MulticallAbi,
    },
};

module.exports = Contracts;