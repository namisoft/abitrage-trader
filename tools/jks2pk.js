// restore private key from jks file
//_________________________________________________________

const argv = require('minimist')(process.argv.slice(2));
const jksFilePath = argv['jks'];
const password = argv['pwd'];
if(!jksFilePath || !password) {
    console.error("Unspecified jks file or password");
    process.exit(1);
}

const path = require('path');
const fs = require('fs-extra');
const Web3 = require("web3");
const web3 = new Web3();
const inputPath = path.join(__dirname, jksFilePath);
const jks = fs.readJSONSync(inputPath);
const account = web3.eth.accounts.decrypt(jks, password);
console.log(`Restored key: ${account.privateKey}`);
console.log(`(Address: ${account.address})`);