const fetch = require('cross-fetch')
const dotenv = require("dotenv");


async function fetchPlayers(chainId) {
try{
let ticket = ""
if (chainId === 137) { ticket = "0x6a304dfdb9f808741244b6bfee65ca7b3b3a6076" }
        else if (chainId === 10) {ticket = "0x62BB4fc73094c83B5e952C2180B23fA7054954c4" }
        else if (chainId === 1) {ticket = "0xdd4d117723c257cee402285d3acf218e9a8236e1" }
        else if (chainId === 43114) {ticket = "0xb27f379c050f6ed0973a01667458af6ecebc1d90" }
        else { ticket = "0x6a304dfdb9f808741244b6bfee65ca7b3b3a6076" }
let fetchString = "https://api.covalenthq.com/v1/" + chainId + "/tokens/" + ticket + 
"/token_holders/?page-size=35000&key=" + process.env.COVALENT_KEY
let covalentFetch = await fetch(fetchString)
covalentFetch = await covalentFetch.json()
return covalentFetch;}
catch(error){console.log(error)}
}
module.exports.FetchPlayers = fetchPlayers
