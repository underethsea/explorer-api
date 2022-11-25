const pgp = require("pg-promise")(/* initialization options */);
const ethers = require("ethers");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const http = require("http");
const https = require("https");
var compression = require("compression");
const dotenv = require("dotenv");
const rateLimit = require("express-rate-limit");
const CheckPrizeApi = require("./checkPrizeApi.js");
const CheckApi = require("./drawCalculationComparrison.js");
const { ProcessPrizeApiDraw } = require("./processPrizeApiDraw.js")
const { FetchPlayers } = require("./players")
const { FetchHolders } = require("./holders")
const { GetNextDraw } = require("./getNextDraw")
const { GetLidoApy } = require("./getLidoApy")
dotenv.config();
// var sanitizer = require('sanitize');

// use prize api instead of DB for /draw and /recent


const app = express();
const args = process.argv;

// publish recent from the prize api
const recentFromApi =   true
 const manualDrawId = 405 // 0 is ignore
// source control - use previous calculations (json files) to rebuild API or choose db source
// const useStaticFiles = false  // toggle using prize api flat file as source
const dbName = "pooltogether"  // toggle db source
const usePrizeApi = false
const compareApiSources = false

const allowList = ["::ffff:51.81.32.49"];
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minutes
  max: 30, // Limit each IP to 60  requests per `window` (here, per 1 minutes)

  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: function (req, res /*next*/) {
    console.log("rate limit: ", req.ip);
    return res.status(429).json({
      error: "You sent too many requests. Please wait a while then try again",
    });
  },
  skip: function (request, response) {
    return allowList.includes(request.ip);
  },
});

// add for whitelisting
//  skip: function (request, response) { return allowList.includes(request.ip)}
// skip: (request, response) => allowlist.includes(request.ip),

const privateKey = fs.readFileSync(
  "/etc/letsencrypt/live/poolexplorer.xyz/privkey.pem",
  "utf8"
);
const certificate = fs.readFileSync(
  "/etc/letsencrypt/live/poolexplorer.xyz/cert.pem",
  "utf8"
);
const ca = fs.readFileSync(
  "/etc/letsencrypt/live/poolexplorer.xyz/chain.pem",
  "utf8"
);

const credentials = {
  key: privateKey,
  cert: certificate,
  ca: ca,
};

// Starting both http & https servers
const httpServer = http.createServer(app);
const httpsServer = https.createServer(credentials, app);

httpServer.listen(80, () => {
  console.log("HTTP Server running on port 80");
});

httpsServer.listen(443, () => {
  console.log("HTTPS Server running on port 443");
});

const cn = {
  host: "localhost", // server name or IP address;
  port: 5432,
  database: dbName,
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
const cnDrcpu = {
  host: "localhost", // server name or IP address;
  port: 5432,
  database: "pooltogether",
  user: "pooltogether",
  password: process.env.PASSWORD,
};
const db = pgp(cn);
// const db2 = pgp(cnMax);
const dbDrcpu = pgp(cnDrcpu);

async function getCurrentDraw() {
  let queryDrawNumber = "SELECT max(draw_id) FROM prizes";

  let currentDrawNumber = await db.any(queryDrawNumber);
  // console.log("current draw number",currentDrawNumber)
  currentDrawNumber = parseInt(currentDrawNumber[0].max);

  // GET FROM CONTRACT
 //  let nextDraw = await GetNextDraw()
 // currentDrawNumber = nextDraw - 1;

  // manually process draw number

if(manualDrawId > 0) {
return manualDrawId}
else  {  

  return currentDrawNumber;
}}

let drawString = ""
let network = "";
let drawClaimable = 0;
let drawDropped = 0;
// database instance;
let dropDecimal = 0;
let draw = {};
let query = "";
let user = {};
let drawJson = [];
let total = 0;
let totalClaimable = 0;
let totalDropped = 0;
let dropping = [];
let claimDecimal = 0;
let winning = [];
let normalizeBalance = 0;
let averageBalance = 0;
let luckiest = [];
let userLucky = {};
let totalHistory = [];
let prizesTotal = 0
let cookies = []
let totalPrizesInDraw = 0
// let drawAllPlayers = []

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
async function go() {
  app.use(limiter);

  let newestDrawId = await getCurrentDraw();
  console.log("current draw ", newestDrawId)

  try {
    await openApi();
  } catch (e) {
    console.log("express error:", e);
  }
  let startBuild = 1
  //   if(useStaticFiles) {
  //       for (x=startBuild;x<draws;x++) {
  //         let drawData = fs.readFileSync(
  //             "./draws/draw" + x.toString() + ".json",
  //             "utf8"
  //           );
  //           await publish(JSON.stringify(drawData),"/draw"+x)
  //       }
  //       startBuild = draws - 1
  //   }
  //   console.log("start build ",startBuild)
  for (x = startBuild; x <= newestDrawId; x++) {

    try {

// let drawData = fs.readFileSync('./draws/draw'+x+'.json')
//if(drawData == undefined) {
      query =
        "SELECT network,address,claimable_prizes,dropped_prizes,normalized_balance,average_balance FROM prizewins WHERE draw_id='" +
        x +
        "'";
      draw = await db.any(query);
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
        if (row.network == "optimism") {
          network = "6";
        }
        averageBalance = parseFloat(row.average_balance) / 1e6;

        if (row.dropped_prizes !== null) {
          totalDropped = 0;
          dropping = [];
          for (dropped of row.dropped_prizes) {
            dropDecimal = parseFloat(dropped) / 10000000 / 10000000;
            dropDecimal = (Math.round(dropDecimal * 20) / 20).toFixed(2);
            dropDecimal = Number(dropDecimal)
            totalDropped += dropDecimal; // 14 decimal, why i dunno
            drawDropped += dropDecimal;
            totalPrizesInDraw += 1
          
            dropping.push(dropDecimal);
          }
        }
        normalizeBalance = row.normalized_balance;

        if (row.claimable_prizes !== null && row.claimable_prizes.length > 0) {
          totalClaimable = 0;
          winning = [];
          for (claimable of row.claimable_prizes) {

            claimDecimal = parseFloat(claimable) / 10000000 / 10000000; // 14 decimal, why i dunno
            claimDecimal = (Math.round(claimDecimal * 20) / 20).toFixed(2);
            claimDecimal = Number(claimDecimal)
            totalClaimable += claimDecimal;
            drawClaimable += claimDecimal;
            totalPrizesInDraw += 1

            prizesTotal += 1; // claimable specific
            winning.push(claimDecimal);
          }

          user = {
            n: network, // eth=1 poly=3 avax=4
            a: "0x" + row.address.toString("hex"), // user address
            c: winning, // array of prizes claimable
            u: dropping, // array of prizes unclaimable
            // b: normalizeBalance, // normalized balance
            
w: totalClaimable, // sum of prizes claimable
            d: totalDropped, // sum of prizes dropped
            g: averageBalance, // users average balance
          };
          userLucky = {
            n: network,
            d: x, // draw
            a: "0x" + row.address.toString("hex"),
            w: totalClaimable,
            g: averageBalance, // users average balance
            o: totalClaimable - averageBalance,
            r: totalClaimable / averageBalance,
          };
          // drawAllPlayers.push(user)
          drawJson.push(user);
          luckiest.push(userLucky);
        } else {
        // no longer relevant with table prizewins only showing winners  
	// no wins for user
          user = {
            a: "0x" + row.address.toString("hex"),
            // b: normalizeBalance,
            g: averageBalance,  // users average balance
            };
          // drawAllPlayers.push(user)      
        }
      }
      console.log("draw ", x, " players total", total);

      drawJson.sort(function (a, b) {
        return a.w - b.w;
      });
      drawJson.reverse();
      
      let newTimestamp = await getDrawTimestamp(x)
      let cookiesObject = {draw: x,timestamp: newTimestamp,result: drawJson}
      cookies.push(cookiesObject)

      drawString = "/draw" + x
      if (!usePrizeApi) {
if(x===newestDrawId && recentFromApi) {}else{
        publish(drawJson, drawString);
        // publish(drawAllPlayers,drawString + "all");
        }
        if (x === newestDrawId && !recentFromApi) {
          let recentDraw = {};
          recentDraw.result = drawJson;
          recentDraw.id = newestDrawId;
          publish(recentDraw, "/recent");
          console.log("published recent ", x);
        }
        fs.writeFileSync("./draws/draw" + x + ".json", JSON.stringify(drawJson));
      }
      let totalPrizeValue = drawClaimable + drawDropped

      console.log(
        "winners",
        drawJson.length,
        " claimable: ",
        drawClaimable,
        " dropped: ",
        drawDropped,
        " total ",
        totalPrizeValue
      );
      let drawStats = {
        i: x, // drawId
        w: drawJson.length, // winners
        p: prizesTotal, // total claimable prizes
        c: drawClaimable.toFixed(0), // claimable
        d: drawDropped.toFixed(0), // dropped
        t: totalPrizeValue.toFixed(0), //total
      }
      totalHistory.push(drawStats)
      

      //if(x>105) {

      // let prizeApi = await CheckPrizeApi(x.toString())
      //console.log("Prize API: ",prizeApi)
      // }

      //let databaseResult = {totalPrizeCount: totalPrizesInDraw,
      // totalPrizeAmount: totalPrizeValue}
      // console.log("DB Result: ",databaseResult)

      // clear for next draw
      // drawAllPlayers = []
      drawJson = [];
      total = 0;
      prizesTotal = 0;
      drawClaimable = 0;
      drawDropped = 0;
      totalPrizesInDraw = 0;
//    }else{
// publish(drawData,'/draw'+x)
// console.log("published draw ",x," from file")
// }
} catch (e) {
      console.log("errors", e);
    }
  }

  if (usePrizeApi) {
    for (let x = 1; x <= newestDrawId; x++) {
      try {
        let result = await ProcessPrizeApiDraw(x);
        let winners = result.result
        winners.sort(function (a, b) {
          return a.w - b.w;
        });
        winners.reverse();
        let publishUrl = "/draw" + x

        publish(winners, publishUrl)
        if (x === newestDrawId) {
          let recentDraw = {};
          recentDraw.result = winners;
          recentDraw.id = newestDrawId;
          publish(recentDraw, "/recent");
          console.log("published recent ", x);
        }

      } catch (error) { console.log(error) }
    }
  }
  try {
    await openAddressApi();
  } catch (e) {
    console.log(e);
  }

  luckiest.sort(function (a, b) {
    return a.o - b.o;
  });
  luckiest.reverse();
  publish(luckiest.slice(0, 20), "/luckiest");
  //      fs.writeFileSync("./draws/luckiest" + x + ".json",luckiest.slice(0, 20));

  luckiest.sort(function (a, b) {
    return a.r - b.r;
  });
  luckiest.reverse();
  publish(luckiest.slice(0, 20), "/luckiestR");
  publish(totalHistory, "/history");
  let lidoApy = await GetLidoApy()
  publish(JSON.stringify(lidoApy),"/lidoApy")

//   fs.writeFileSync("./draws/luckiestR" + x + ".json",luckiest.slice(0, 20));

  let chocChip = await publish(cookies,"/cookies")
//   fs.writeFileSync("./draws/cookies" + x + ".json",cookies);
// let polygonPlayers = await FetchPlayers(137)  
//   let polygonPlayersPublished = await publish(polygonPlayers,"/polygonPlayers")

  if (compareApiSources) {
    try {
      let check = await CheckApi()
      publish(check, "/calculations")
    } catch (error) { console.log("calculation check failed -> \n", error) }
}

if(recentFromApi) {try{
let recentApi = await ProcessPrizeApiDraw(newestDrawId)
console.log("api 0",recentApi.result[0])
let recentResult = {result: recentApi.result, id: newestDrawId}
          publish(recentResult, "/recent");
publish(recentApi.result,"/draw"+newestDrawId)

}catch(error){console.log(error)}}

  
while(true) {
await updatePlayers(137)
await delay(60000)
await updatePlayers(10)
await delay(60000)
await updatePlayers(1)
await delay(60000)
await updatePlayers(43114)
await delay(60000)
await updateHolders(1)
await delay(60000) 
await updateHolders(10)
await delay(60000) 
await updateHolders(137)
}
if(recentFromApi) {try{
let recentApi = await ProcessPrizeApiDraw(newestDrawId)
let recentResult = {result: recentApi, id: newestDrawId}
          publish(recentResult, "/recent");}catch(error){console.log(error)}}


try{console.log(args[2]," arg2");
if(args[2] === "prizeapi") {console.log("its prize api");
let prizeApiData = await ProcessPrizeApiDraw(290)
publish(prizeApiData,"/prizeApi290")
}}catch(error){console.log("can't publish prize api",error)}

}
async function updateHolders (chainNumber) {
 let holdersList = await FetchHolders(chainNumber)  
   let holdersListPublished = await publish(holdersList,"/holders" + chainNumber)
console.log(chainNumber + " updated holdersList")
}
async function updatePlayers (chainNumber) {
 let polygonPlayers = await FetchPlayers(chainNumber)  
   let polygonPlayersPublished = await publish(polygonPlayers,"/players" + chainNumber)
console.log(chainNumber + " updated players")
}
async function openApi() {
  // app.listen(port, () => {
  //   console.log(`Example app listening at http://localhost:${port}`)
  // })
  app.use(
    cors({
      origin: "*",
    })
  );
  app.use(compression());
  // lets encrypt
  app.use(express.static(__dirname, { dotfiles: "allow" }));
}

async function publish(json, name) {
  app.get(name, async (req, res) => {
    try {
      res.send(json);
    } catch (err) {
      throw err;
    }
  });
}

async function getDrawTimestamp(drawNumber) {
    try{
        let timestampQuery = "select timestamp from draws where draw_id='" + drawNumber + "'";
        let timestamp = await db.any(timestampQuery)
        // console.log(timestamp)
        return timestamp[0].timestamp
    }catch(error){console.log(error);return null}
}
async function openAddressApi() {
  app.get("/player", async (req, res, next) => {
    // var addressInput = sanitizer.value(req.query.address, 'string');

    if (
      req.query.address.length < 50 &&
      ethers.utils.isAddress(req.query.address)
    ) {
      let address = "\\" + req.query.address.substring(1);
let wins = req.query.wins;   
   // console.log('query for address' + address)
let table = "prizes";
if(wins==="true") {
table = "prizewins"}      
let addressQuery =
        "select network,address,draw_id,claimable_prizes,claimable_picks from " + table + " where address='" +
        address +
        "'";
      let addressPrizes = await db.any(addressQuery);
      res.send(addressPrizes);
    } else {
      next("ERROR - Invalid address");
    }
  });
}

go();
