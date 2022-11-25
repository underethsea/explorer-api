const pgp = require("pg-promise")(/* initialization options */);
const ethers = require("ethers");
const fs = require("fs");

const dotenv = require("dotenv");

const CheckPrizeApi = require("./checkPrizeApi.js");
dotenv.config();
const startBuild =  375

const cn = {
  host: "localhost", // server name or IP address;
  port: 5432,
  database: "pooltogether",
  user: "pooltogether",
  password: process.env.PASSWORD,
};
const cnMax = {
    host: "localhost", // server name or IP address;
    port: 5432,
    database: "pooltogether_max",
    user: "pooltogether",
    password: process.env.PASSWORD,
  };
const db = pgp(cn);
const db2 = pgp(cnMax);
async function getCurrentDraw() {
  let queryDrawNumber = "SELECT max(draw_id) FROM draws";
  let currentDrawNumber = await db.any(queryDrawNumber);
  // console.log("current draw number",currentDrawNumber)
  currentDrawNumber = parseInt(currentDrawNumber[0].max);
  return currentDrawNumber;
}

let drawString = ""
let network = "";
let drawClaimable = 0;
let drawDropped = 0;
// database instance;
let dropDecimal = 0;
let draw = {};
let query = "";
let user = {};
let total = 0;
let userClaimable = 0;
let userDropped = 0;
let dropping = [];
let claimDecimal = 0;
let winning = [];
let normalizeBalance = 0;
let averageBalance = 0;
let prizesTotal = 0
let totalPrizesInDraw = 0
module.exports = async () => {
//   app.use(limiter);

  let newestDrawId = await getCurrentDraw();
  console.log("current draw ",newestDrawId)
// newestDrawId = 348 
 
 let calcStatus = []

  for (x = startBuild; x <= newestDrawId; x++) {
      console.log("Draw ",x)
      let drcpuDrawQuery = await dbDrawQuery(x,db)
      let maxDrawQuery = await dbDrawQuery(x,db2)
      console.log(drcpuDrawQuery," <Drcpu DB>")
      console.log(maxDrawQuery," <Max' DB>")
      
             let prizeApi = await CheckPrizeApi(x.toString())
        console.log(prizeApi," <Prize API>")
 //     calcStatus[x].prizeApi = prizeApi
calcStatus.push({drawId:x,drcpu:drcpuDrawQuery,max:maxDrawQuery,prizeApi:prizeApi})       
 


  
  }

return calcStatus;
}



async function dbDrawQuery(x,database){
    total = 0;
    prizesTotal = 0;
    drawClaimable = 0;
    drawDropped = 0;
    totalPrizesInDraw = 0;
try {
    query =
      "SELECT network,address,claimable_prizes,dropped_prizes,normalized_balance,average_balance FROM prizes WHERE draw_id='" +
      x +
      "'";
    draw = await database.any(query);
    // console.log(draw)
    for (row of draw) {
      total += 1;
      // console.log(row)
      if (row.network == "ethereum") {
        network = "1";
      }
      if (row.network == "polygon") {
        network = "3";
      }
      if (row.network == "avalanche") {
        network = "4";
      }
      averageBalance = parseFloat(row.average_balance) / 1e6;

      if (row.dropped_prizes !== null) {
        userDropped = 0;
        dropping = [];
        for (dropped of row.dropped_prizes) {
          dropDecimal = parseFloat(dropped) / 10000000 / 10000000;
          userDropped += dropDecimal; // 14 decimal, why i dunno
          drawDropped += dropDecimal;
          totalPrizesInDraw += 1
          // dropping.push(dropDecimal.toFixed());
        }
      }
      normalizeBalance = row.normalized_balance;

      if (row.claimable_prizes !== null && row.claimable_prizes.length > 0) {
        userClaimable = 0;
        winning = [];
        for (claimable of row.claimable_prizes) {
          
          claimDecimal = parseFloat(claimable) / 10000000 / 10000000; // 14 decimal, why i dunno
          userClaimable += claimDecimal;
          drawClaimable += claimDecimal;
          totalPrizesInDraw += 1

          prizesTotal += 1; // claimable specific
          // winning.push(claimDecimal.toFixed());
        }

    
      } else {
        // no wins for user
     
      }
    }
    let totalPrizeValue = drawClaimable + drawDropped
  
  

    let databaseResult = {totalPrizeCt: totalPrizesInDraw,
    totalPrizeAmt: totalPrizeValue.toFixed(0)}
    return databaseResult
    
   
} catch (e) {
    console.log("errors", e);
  }}
