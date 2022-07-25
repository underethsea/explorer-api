const fetch = require('cross-fetch')
const prizeCap = 1
const chains = [{
  name: "Avalanche",
  chainId: "43114",
  apiId: "4",
  prizeDistributor: "0x83332f908f403ce795d90f677ce3f382fe73f3d1"
},
{
  name: "Polygon",
  chainId: "137",
  apiId: "3",
  prizeDistributor: "0x8141bcfbcee654c5de17c4e2b2af26b67f9b9056"
},
{
  name: "Ethereum",
  chainId: "1",
  apiId: "1",
  prizeDistributor: "0xb9a179dca5a7bf5f8b9e088437b3a85ebb495efe"
},
{
  name: "Optimism",
  chainId: "10",
  apiId: "6",
  prizeDistributor: "0x722e9BFC008358aC2d445a8d892cF7b62B550F3F"
}
]
async function processPrizeApiDraw(drawId) {

  // initialize variables
  let totalPrizeLength = 0
  let prizeNetworkClaimableCount = 0
  let prizeNetworkClaimable = 0
  let prizeNetworkDropped = 0
  let prizesAllChains = []

  // loop through all of the supported chains
  for (let chain of chains) {
    const api = await fetchApi(drawId, chain)
    // check api returned
    if (api !== undefined) {
      // add to total prize count for the draw
      totalPrizeLength += parseInt(api.length);

      // group results by address
      let consolidated = await consolidateByAddress(api)
      let sortedConsolidated = []
      // loop through results by address
      for (let winner in consolidated) {
        let prizes = consolidated[winner].amount.sort().reverse()
        let prizesFloat = []

        // yuckkky yuckerson
        prizes.forEach(p => {
          let float = parseFloat(p)
          float = float / 1e6
          float = float.toFixed(0)
          float = float.toString()
          prizesFloat.push(float)
        })

        // split claimable prizes from dropped according to prize cap
        let claimable = []
        let dropped = []
        // sort prizes by higher values for splitting into claimable vs dropped
        prizesFloat.sort(function (a, b) {
          return b - a;
        });
        if (drawId < 264) {
          // console.log("prizecap 2")
          // console.log("prizes: ",prizesFloat)
          claimable = prizesFloat.slice(0, 2)
          // console.log("claimable: ",claimable)
          dropped = prizesFloat.slice(2, prizes.length)
          // console.log("dropped: ",dropped)
        } else {

          claimable = prizesFloat.slice(0, prizeCap)
          dropped = prizesFloat.slice(prizeCap, prizes.length)
        }
        // sum claimable and dropped arrays
        let totalClaimable = claimable.reduce((partialSum, a) => partialSum + (parseFloat(a)), 0);
        let totalDropped = dropped.reduce((partialSum, a) => partialSum + (parseFloat(a)), 0);


        // total amount and value of prizes claimable and dropped on this specific network
        prizeNetworkClaimableCount += claimable.length
        prizeNetworkClaimable += totalClaimable;
        prizeNetworkDropped += totalDropped;

        let poolerAddress = consolidated[winner].address
        // add address to chain prize array
        sortedConsolidated.push({
          n: chain.apiId,
          a: poolerAddress,
          k: consolidated[winner].pick,
          c: claimable,
          u: dropped,
          w: totalClaimable,
          d: totalDropped
        })
      }

      // add chain to mega prize return
      prizesAllChains = [...prizesAllChains, ...sortedConsolidated]

    }
  }

  //    console.log(prizesAllChains)
  console.log("total prizes: ", totalPrizeLength)
  console.log("total prizes claimable ", prizeNetworkClaimableCount)
  console.log("total claimable: ", prizeNetworkClaimable)
  console.log("total dropped: ", prizeNetworkDropped)
  const prizeApiReturn = {
    result: prizesAllChains,
    totalPrizeCount: totalPrizeLength,
    totalPrizeCountClaimable: prizeNetworkClaimableCount,
    totalValueClaimable: prizeNetworkClaimable,
    totalValueDropped: prizeNetworkDropped,
  }
  return prizeApiReturn;

}

async function fetchApi(drawId, chain) {
  console.log("Fetching prize API data for ", chain.chainId)

  // api urls based on chain and draw information
  // const statusApiUrl = "https://api.pooltogether.com/prizes/" + chain.chainId + "/" + chain.prizeDistributor + "/draw/" + drawId + "/status.json";
  const prizesApiUrl = "https://api.pooltogether.com/prizes/" + chain.chainId + "/" + chain.prizeDistributor + "/draw/" + drawId + "/prizes.json";
  try {
    // fetch api status for specified draw and chain
    // const apiStatusReturn = await fetch(statusApiUrl)
    // const apiStatusJson = await apiStatusReturn.json()
    const prizeApiReturn = await fetch(prizesApiUrl)
    const prizeApiJson = await prizeApiReturn.json()
    return prizeApiJson

  } catch (error) { console.log("api fetch fail for draw ", drawId, " chain ", chain.chainId) }
}

async function consolidateByAddress(results) {

  const consolidatedResult = {};
  for (const { address, pick, amount } of results) {
    if (!consolidatedResult[address]) consolidatedResult[address] = { address, pick, amount: [] };
    consolidatedResult[address].amount.push(amount);
  }
  return consolidatedResult;
}

// test( drawId heere )
module.exports.ProcessPrizeApiDraw = processPrizeApiDraw;

