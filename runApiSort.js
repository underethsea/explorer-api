// import {ApiSort} from "./testApiSort.js"
const { ApiSort } = require("./testApiSort.js")
let currentDraw = 272
let startDraw = 272 - 7

async function go() {
    let totalPrizeCount = 0
    let totalPrizeCountClaimable = 0
    let totalValueClaimable = 0
    let totalValueDropped = 0
    for (let x = startDraw; x <= currentDraw; x++) {
        let result = await ApiSort(x);
        totalPrizeCount += result.totalPrizeCount
        totalPrizeCountClaimable += result.totalPrizeCountClaimable
        totalValueClaimable += result.totalValueClaimable
        totalValueDropped += result.totalValueDropped

    }
    console.log("\n\ntotal prize count ",totalPrizeCount,
      "\ntotal prize count claimable ",totalPrizeCountClaimable,
    "\ntotal value claimable ",totalValueClaimable,
       "\ntotal value dropped ", totalValueDropped)
}
go()

