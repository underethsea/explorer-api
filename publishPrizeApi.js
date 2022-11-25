const express = require("express");
const cors = require("cors");
const http = require("http");
const https = require("https");
const fs = require("fs");

const { ProcessPrizeApiDraw } = require("./processPrizeApiDraw.js")

const rateLimit = require("express-rate-limit");
var compression = require("compression");



const app = express();
const currentDraw = 372
// use previous calculations (json files) to rebuild API
// const useStaticFiles = true  // NEED IMPLEMENTATION

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

// Starting both http & https servers
const httpServer = http.createServer(app);
const httpsServer = https.createServer(credentials, app);

httpServer.listen(80, () => {
  console.log("HTTP Server running on port 80");
});

httpsServer.listen(443, () => {
  console.log("HTTPS Server running on port 443");
});

async function go(){
    app.use(limiter);

  try {
    await openApi();
  } catch (e) {
    console.log("express error:", e);

  }
  for (let x = 290; x <= currentDraw; x++) {
    let result = await ProcessPrizeApiDraw(x);
   
    let drawString = "/prizeAPI" + x

    publish(result.result,drawString)

  }


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
        console.log("published ",name)
      } catch (err) {
        throw err;
      }
    });
  }
  go()
