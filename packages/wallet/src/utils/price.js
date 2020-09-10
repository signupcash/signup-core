const BITBOX = require("bitbox-sdk").BITBOX;
const bitbox = new BITBOX();

export async function getBCHPrice(currency = "USD") {
  return (await bitbox.Price.current(currency)) / 100;
}
