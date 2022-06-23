const fetch = require('cross-fetch')
// const drawId = 212
const chains = [{
    name: "Avalanche",
    chainId: "43114",
    prizeDistributor: "0x83332f908f403ce795d90f677ce3f382fe73f3d1"
},
{
    name: "Polygon",
    chainId: "137",
    prizeDistributor: "0x8141bcfbcee654c5de17c4e2b2af26b67f9b9056"
},
{
    name: "Ethereum",
    chainId: "1",
    prizeDistributor: "0xb9a179dca5a7bf5f8b9e088437b3a85ebb495efe"
}
]
module.exports = async (drawId) => {
    
    let totalPrizeLength = 0
    let totalAmounts = 0
    let prizesAllChains = []
    // loop through all of the supported chains
    for (let chain of chains) {
        const api = await fetchApi(drawId, chain)
        if(api !== undefined) {
       
        // const prizeJson = api.apiPrizeJson
        // const statusJson = api.apiStatusJson
        // console.log(statusJson)
        // const prizeLength = statusJson.meta.prizeLength // number of prizes
        // const amountsTotal = statusJson.meta.amountsTotal // total prizes for chain in 6 decimal for usdc
        const prizeLength = api.length
        let amountsTotal = 0;
        api.forEach(prize=>{amountsTotal += parseFloat(prize.amount)})
        totalPrizeLength += prizeLength
        totalAmounts += parseFloat(amountsTotal) / 1e6;

        let prizesAddedChain = []

        // add chain id to each prize entry
        api.forEach(win => {
            let prizeWin = win
            prizeWin.chain = chain.chainId;
            prizesAddedChain.push(prizeWin)
        })
        // put chains draw results together into one array
        prizesAllChains = [...prizesAllChains, ...prizesAddedChain]
        // console.log("Total Prizes for Draw ", drawId, " - ", totalPrizeLength)
        // console.log("Total Prize value for Draw ", drawId, " - ", totalAmounts)
        // console.log("Total prizes counted",prizesAllChains.length)
        

        
    }}
    await checkMismatchPrizes(prizesAllChains,drawId)
        let prizeApiStatus = {
            totalPrizeCt: prizesAllChains.length,
            totalPrizeAmt: totalAmounts.toFixed(0)
        }
        return prizeApiStatus;
   
    }

    async function fetchApi(drawId, chain) {
        //        console.log("Fetching prize API data for ",chain.chainId)
        // create api urls based on chain and draw information
        // const statusApiUrl = "https://api.pooltogether.com/prizes/" + chain.chainId + "/" + chain.prizeDistributor + "/draw/" + drawId + "/status.json";
        const prizesApiUrl = "https://api.pooltogether.com/prizes/" + chain.chainId + "/" + chain.prizeDistributor + "/draw/" + drawId + "/prizes.json";
        try {
            // fetch api status for specified draw and chain
            // const apiStatusReturn = await fetch(statusApiUrl)
            // const apiStatusJson = await apiStatusReturn.json()
            const prizeApiReturn = await fetch(prizesApiUrl)
            const prizeApiJson = await prizeApiReturn.json()
            return prizeApiJson

        } catch (error) { console.log("api fetch fail for draw ",drawId," chain ",chain.chainId) }
    }

    async function checkMismatchPrizes(prizesAllChains,drawId){
    //check for unmatched prizes
//	console.log(prizesAllChains.length,"   prizes for draw ",drawId);
    let explorerApi = await fetch("https://poolexplorer.xyz/draw" + drawId)
    explorerApi = await explorerApi.json()
    explorerApi.forEach(player => {
        if (player.w > 0) {
            let explorerFilter = explorerApi.filter(function (address) { return address.a === player.a })
            let playerPrizes = prizesAllChains.filter(function (address) { return address.address === player.a })
            let prizesForPlayer = 0
            let explorerPrizesForPlayer = 0
            explorerFilter.forEach(prizesAccrossNetworks => {
                explorerPrizesForPlayer += prizesAccrossNetworks.c.length + prizesAccrossNetworks.u.length
            })
            playerPrizes.forEach(win => {
                prizesForPlayer += 1;
            })
            if (prizesForPlayer !== explorerPrizesForPlayer) {
                console.log("draw ",drawId,player.a, " prize API prizes  ", prizesForPlayer, " poolexplorer prizes ", explorerPrizesForPlayer)
            }
        }
    })
}
