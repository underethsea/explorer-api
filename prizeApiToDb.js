// import {ApiSort} from "./testApiSort.js"
const { ApiSort } = require("./testApiSort.js")
const pgp = require("pg-promise")(/* initialization options */);
const dotenv = require("dotenv");

dotenv.config();
const cn = {
    host: "localhost", // server name or IP address;
    port: 5432,
    database: "prizeapi",
    user: "pooltogether",
    password: process.env.PASSWORD,
  };
const db = pgp(cn);

let currentDraw = 278
let startDraw = 278

async function go() {
    let totalPrizeCount = 0
    let totalPrizeCountClaimable = 0
    let totalValueClaimable = 0
    let totalValueDropped = 0
    for (let draw = startDraw; draw <= currentDraw; draw++) {
        let result = await ApiSort(draw);
let winners = result.result
for(let x of winners){
let network = ""
if(x.n==3){network = "polygon"}
if(x.n==4){network = "avalanche"}
if(x.n==6){network = "optimism"}

if(x.n==1){network = "ethereum"}

let address = "\\" + x.a.substring(1)
let claimable = x.c.map( x => x * 1e14)
let dropped = x.u.map( x => x * 1e14)
let newWinner = "INSERT into prizes (network,address,draw_id,claimable_prizes,dropped_prizes) values('" + network + "','" + address  +"','" + draw +"','{" + claimable +"}','{" + dropped + "}')";
// console.log(newWinner)
  await db.any(newWinner);
}
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

