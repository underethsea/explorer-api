const fetch = require("node-fetch")
// import fetch from "node-fetch";

// stETH pool thank you LLAMA <3
const URL =
  "https://yields.llama.fi/chart/747c1d2a-c668-4682-b9f9-296708a3dd90";

// LLAMA FTW
const getStethAprData = async () => {
  try {
    let data = await fetch(URL);
    data = await data.json();

    data = data.data; // cool cool cool
    data.sort(function (a, b) {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
    return data;
  } catch (error) {
    console.log("could not fetch ", error);
    return null;
  }
};

const GetStethApy = async () => {
  let data = await getStethAprData();
  console.log(data);
  let counter = 0;
  let totalApy = 0;
  for (let x = 0; x < 30; x++) {
    counter++;
    totalApy += data[x].apy;
  }
  console.log("now apy: ", data[0].apy);
  console.log("30d apy: ", (totalApy / counter).toFixed(2));
  return {day: data[0].apy,month: (totalApy / counter).toFixed(2)}
}

module.exports.GetLidoApy = GetStethApy
