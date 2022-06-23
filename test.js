const CheckPrizeApi = require("./checkPrizeApi.js")

async function go(){
let prizeApi = await CheckPrizeApi(213);
  console.log(prizeApi)
}
go()
