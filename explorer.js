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

dotenv.config();
// var sanitizer = require('sanitize');

const app = express();

// What to do when our maximum request rate is breached
// const limitReached = ((req,res) => {
//  log.warn({ ip: req.ip }, ‘Rate limiter triggered’)
//  renderError(req, res) // Your function to render an error page
// })

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
 skip: function (request, response) { return allowList.includes(request.ip)}
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
  database: "pooltogether",
  user: "pooltogether",
  password: process.env.PASSWORD,
};
const db = pgp(cn);
let draws = 80;
async function getCurrentDraw() {
  let queryDrawNumber = "SELECT max(draw_id) FROM draws";
  let currentDrawNumber = await db.any(queryDrawNumber);
  // console.log("current draw number",currentDrawNumber)
  return currentDrawNumber;
}

let drawName = "";
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

async function go() {
  app.use(limiter);

  let drawCurrent = await getCurrentDraw();
  draws = drawCurrent[0].max;
  console.log("current draw ", draws);
  draws = parseInt(draws);
  try {
    await openApi();
  } catch (e) {
    console.log("express error:", e);
  }
  for (x = 0; x <= draws; x++) {
    try {
      query =
        "SELECT network,address,claimable_prizes,dropped_prizes,normalized_balance,average_balance FROM prizes WHERE draw_id='" +
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
        averageBalance = parseFloat(row.average_balance) / 1e6;

        if (row.dropped_prizes !== null) {
          totalDropped = 0;
          dropping = [];
          for (dropped of row.dropped_prizes) {
            dropDecimal = parseFloat(dropped) / 10000000 / 10000000;
            totalDropped += dropDecimal; // 14 decimal, why i dunno
            drawDropped += dropDecimal;
            dropping.push(dropDecimal.toFixed());
          }
        }
        normalizeBalance = row.normalized_balance;

        if (row.claimable_prizes !== null && row.claimable_prizes.length > 0) {
          totalClaimable = 0;
          winning = [];
          for (claimable of row.claimable_prizes) {
            claimDecimal = parseFloat(claimable) / 10000000 / 10000000; // 14 decimal, why i dunno
            totalClaimable += claimDecimal;
            drawClaimable += claimDecimal;
            winning.push(claimDecimal.toFixed());
          }

          user = {
            n: network, // eth=1 poly=3 avax=4
            a: "0x" + row.address.toString("hex"), // user address
            c: winning, // array of prizes claimable
            u: dropping, // array of prizes unclaimable
            // b: normalizeBalance, // normalized balance
            w: totalClaimable.toFixed(), // sum of prizes claimable
            d: totalDropped.toFixed(), // sum of prizes dropped
            g: averageBalance, // users average balance
          };
          userLucky = {
            n: network,
            d: x, // draw
            a: "0x" + row.address.toString("hex"),
            w: totalClaimable.toFixed(),
            g: averageBalance, // users average balance
            o: totalClaimable - averageBalance,
            r: totalClaimable / averageBalance,
          };

          drawJson.push(user);
          luckiest.push(userLucky);
        } else {
          // no wins for user
          user = {
            a: "0x" + row.address.toString("hex"),
            b: normalizeBalance,
          };
        }
      }
      console.log("draw ", x, " players total", total);

      drawJson.sort(function (a, b) {
        return a.w - b.w;
      });
      drawJson.reverse();
      drawName = "/draw" + x;
      publish(drawJson, drawName);
      if (x === draws) {
        let recentDraw = {};
        recentDraw.result = drawJson;
        recentDraw.id = draws;
        publish(recentDraw, "/recent");
        console.log("published recent ", draws);
      }
      fs.writeFileSync("./draws/draw" + x + ".json", JSON.stringify(drawJson));
      console.log(
        "winners",
        drawJson.length,
        " claimable: ",
        drawClaimable,
        " dropped: ",
        drawDropped,
        " total ",
        drawClaimable + drawDropped
      );
      drawJson = [];
      total = 0;
      drawClaimable = 0;
      drawDropped = 0;
    } catch (e) {
      console.log("errors", e);
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
  luckiest.sort(function (a, b) {
    return a.r - b.r;
  });
  luckiest.reverse();
  publish(luckiest.slice(0, 20), "/luckiestR");
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
async function openAddressApi() {
  app.get("/player", async (req, res,next) => {
    // var addressInput = sanitizer.value(req.query.address, 'string');

    if (req.query.address.length < 50 && ethers.utils.isAddress(req.query.address)) {
      let address = "\\" + req.query.address.substring(1);
      // console.log('query for address' + address)
      let addressQuery =
        "select network,address,draw_id,claimable_prizes from prizes where address='" +
        address +
        "'";
      let addressPrizes = await db.any(addressQuery);
      res.send(addressPrizes);
    }else {next("ERROR - Invalid address")}
  });
}

go();
