const fetch = require('cross-fetch')
const dotenv = require("dotenv");


async function fetchHolders(chainId) {
try{
let ticket = ""
if (chainId === 137) { ticket = "0x25788a1a171ec66Da6502f9975a15B609fF54CF6" }
        else if (chainId === 10) {ticket = "0x395ae52bb17aef68c2888d941736a71dc6d4e125" }
        else if (chainId === 1) {ticket = "0x0cEC1A9154Ff802e7934Fc916Ed7Ca50bDE6844e" }
        // else if (chainId === 43114) {ticket = "0xb27f379c050f6ed0973a01667458af6ecebc1d90" }
        else { ticket = "0x0cEC1A9154Ff802e7934Fc916Ed7Ca50bDE6844e" }
let fetchString = "https://api.covalenthq.com/v1/" + chainId + "/tokens/" + ticket + 
"/token_holders/?page-size=40000&key=" + process.env.COVALENT_KEY
let covalentFetch = await fetch(fetchString)
covalentFetch = await covalentFetch.json()
return covalentFetch;}
catch(error){console.log(error)}
}
module.exports.FetchHolders = fetchHolders
