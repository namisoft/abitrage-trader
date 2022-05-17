const ChainsConfig = {

    Avax: {
        RpcUrl: "https://api.avax.network/ext/bc/C/rpc",
        ContractAddresses: {
            Multicall: "0x98e2060F672FD1656a07bc12D7253b5e41bF3876",
            TraderJoeFactory: "0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10",
            PangolinFactory: "0xefa94DE7a4656D787667C749f7E1223D71E9FD88",
            ElkDexFactory: "0x091d35d7F63487909C863001ddCA481c6De47091",
            SushiSwapFactory: "0xc35DADB65012eC5796536bD9864eD8773aBc74C4"
        }
    },

    Polygon: {
        RpcUrl: "https://polygon-rpc.com",
        ContractAddresses: {
            Multicall: "0x9e313e9b72cd96e32e50023175162d4bbf3561b8",
            QuickSwapFactory: "0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32",
            SushiSwapFactory: "0xc35DADB65012eC5796536bD9864eD8773aBc74C4",
        }
    },
}

const Filters = {

    Avax: {
        MinPoolReserveRequired: new Map([
            ["0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7".toLowerCase(), 60 * 1e18],            // WAVAX
            ["0x60781C2586D68229fde47564546784ab3fACA982".toLowerCase(), 30000 * 1e18],         // PNG,
            ["0x19860CCB0A68fd4213aB9D8266F7bBf05A8dDe98".toLowerCase(), 3000 * 1e18],          // BUSD.e
            ["0xd586E7F844cEa2F87f50152665BCbc2C279D8d70".toLowerCase(), 3000 * 1e18],          // DAI.e
            ["0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664".toLowerCase(), 3000 * 1e6],           // USDC.e
            ["0xc7198437980c041c805A1EDcbA50c1Ce5db95118".toLowerCase(), 3000 * 1e6],           // USDT.e
            ["0x50b7545627a5162F82A992c33b87aDc75187B218".toLowerCase(), 0.1 * 1e8],           // WBTC.e
            ["0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB".toLowerCase(), 1e18],                 // WETH.e
            ["0xf20d962a6c8f70c731bd838a3a388D7d48fA6e15".toLowerCase(), 1e18],                 // WETH
            ["0x63a72806098Bd3D9520cC43356dD78afe5D386D9".toLowerCase(), 30 * 1e18],            // AAVE.e
            ["0xbA7dEebBFC5fA1100Fb055a87773e1E99Cd3507a".toLowerCase(), 3000 * 1e18],          // DAI
            ["0x408D4cD0ADb7ceBd1F1A1C33A0Ba2098E1295bAB".toLowerCase(), 0.14 * 1e8],           // WBTC
            ["0x2147EFFF675e4A4eE1C2f918d181cDBd7a8E208f".toLowerCase(), 15000 * 1e18],         // ALPHA.e
            ["0x5947BB275c521040051D82396192181b413227A3".toLowerCase(), 300 * 1e18],           // LINK.e
            ["0xc7B5D72C836e718cDA8888eaf03707fAef675079".toLowerCase(), 6000 * 1e18],          // SWAP.e
            ["0xde3A24028580884448a5397872046a019649b084".toLowerCase(), 3000 * 1e6],           // USDT
            ["0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E".toLowerCase(), 3000 * 1e6],           // USDC
            ["0x130966628846BFd36ff31a822705796e8cb8C18D".toLowerCase(), 3000 * 1e18],          // MIM
            ["0xce347E069B68C53A9ED5e7DA5952529cAF8ACCd4".toLowerCase(), 4000 * 1e18],          // JOE
            ["0xE1C110E1B1b4A1deD0cAf3E42BfBdbB7b5d7cE1C".toLowerCase(), 3000 * 1e18],          // ELK
            ["0x260Bbf5698121EB85e7a74f2E45E16Ce762EbE11".toLowerCase(), 30000 * 1e6],          // Wrapped UST
            ["0xb599c3590F42f8F995ECfa0f85D2980B76862fc1".toLowerCase(), 30000 * 1e6]            // UST (wormhole)
            // 0x39cf1BD5f15fb22eC3D9Ff86b0727aFc203427cc: SUSHI token
        ])
    },

    Polygon: {
        MinPoolReserveRequired: new Map([
            ["0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270".toLowerCase(), 4500 * 1e18],          // WMATIC
            ["0xA8D394fE7380b8cE6145d5f85E6aC22d4E91ACDe".toLowerCase(), 5000 * 1e18],         // BUSD (wormhole)
            ["0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063".toLowerCase(), 5000 * 1e18],          // DAI
            ["0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174".toLowerCase(), 5000 * 1e6],           // USDC
            ["0x576Cf361711cd940CD9C397BB98C4C896cBd38De".toLowerCase(), 5000 * 1e6],           // USDC (wormhole)
            ["0x4318CB63A2b8edf2De971E2F17F77097e499459D".toLowerCase(), 5000 * 1e6],           // USD Coin (wormhole)
            ["0xc2132D05D31c914a87C6611C10748AEb04B58e8F".toLowerCase(), 5000 * 1e6],           // USDT
            ["0x3553f861dEc0257baDA9F8Ed268bf0D74e45E89C".toLowerCase(), 5000 * 1e6],           // USDT (wormhole)
            ["0x9417669fBF23357D2774e9D421307bd5eA1006d2".toLowerCase(), 5000 * 1e6],           // Tether USD (wormhole)
            ["0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6".toLowerCase(), 0.14 * 1e8],           // WBTC
            ["0x5D49c278340655B56609FdF8976eb0612aF3a0C3".toLowerCase(), 0.14 * 1e8],           // WBTC (wormhole)
            ["0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619".toLowerCase(), 1.5 * 1e18],           // WETH
            ["0x11CD37bb86F65419713f30673A480EA33c826872".toLowerCase(), 1.5 * 1e18],           // WETH (wormhole)
            ["0xD6DF932A45C0f255f85145f286eA0b292B21C90B".toLowerCase(), 40 * 1e18],            // AAVE
            ["0x53E0bca35eC356BD5ddDFebbD1Fc0fD03FaBad39".toLowerCase(), 450 * 1e18],           // LINK
            ["0x692597b009d13C4049a947CAB2239b7d6517875F".toLowerCase(), 5000 * 1e18],          // UST
            ["0xE6469Ba6D2fD6130788E0eA9C0a0515900563b59".toLowerCase(), 5000 * 1e6],          // UST (wormhole)
            ["0x2e1AD108fF1D8C782fcBbB89AAd783aC49586756".toLowerCase(), 5000 * 1e18]           // TUSD
        ])
    },
}

module.exports = {ChainsConfig, Filters};