const pgp = require("pg-promise")(/* initialization options */);
const dotenv = require("dotenv")
dotenv.config()

const cn = {
  host: "localhost", // server name or IP address;
  port: 5432,
  database: process.env.DATABASE,
  user: process.env.USER,
  password: process.env.PASSWORD,
};
const db = pgp(cn);
let draws = 78
async function getCurrentDraw() {
let queryDrawNumber = "SELECT max(draw_id) FROM draws";
let currentDrawNumber = await db.any(queryDrawNumber);
// console.log("current draw number",currentDrawNumber)
    return currentDrawNumber
}
async function go() {
     draws = await getCurrentDraw()
console.log(draws[0].max);
}

go()
