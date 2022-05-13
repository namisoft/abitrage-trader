// export private key to jks file with password-protection
//_________________________________________________________

const argv = require('minimist')(process.argv.slice(2));
const privateKey = argv['pk'];
const password = argv['pwd'];
if(!privateKey || !password) {
    console.error("Unspecified private key or password");
    process.exit(1);
}

const Web3 = require("web3");
const web3 = new Web3();
const jks = web3.eth.accounts.encrypt(privateKey, password);
let outputFile = argv['outfile'];
if(!outputFile) {
    const account = web3.eth.accounts.privateKeyToAccount(privateKey);
    outputFile = account.address.toLowerCase() + ".json";
}
const path = require('path');
const fs = require('fs-extra');
const outputPath = path.join(__dirname, "output/__accounts", outputFile);
fs.outputJSONSync(outputPath, jks);


