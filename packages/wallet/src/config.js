// retrieved from https://gitlab.com/cash-accounts/website/-/blob/master/www/js/index.js#L78
export const heightModifier = 563620;
export const DUST = 546;

export const isDevEnv = process.env.NODE_ENV === "development";

export const SIGNUP_TX_BRIDGE = isDevEnv
  ? "http://localhost:5044"
  : "https://bridge.signup.cash";

export const SLPDB_DEFAULT_URL = "https://slpdb.fountainhead.cash";
export const SLP_ICONS_URL = "https://icons.fountainhead.cash/64/";

export const SLP_EXPLORER = "https://simpleledger.info";
export const BITCOIN_COM_EXPLORER = "https://explorer.bitcoin.com/bch";

// Waifu is a specific popular NFT group in SLP ecosystem serving their images using:
// this URL + txid +.png
export const WAIFU_NFT_IMAGE_SERVER = "https://icons.waifufaucet.com/128/";
export const WAIFU_GROUP_ID =
  "a2987562a405648a6c5622ed6c205fca6169faa8afeb96a994b48010bd186a66";

export const electrumCashClusters = [
  {
    host: "electroncash.de",
    port: 60002,
  },
  {
    host: "electroncash.dk",
    port: 50004,
  },
  {
    host: "bch.loping.net",
    port: 50004,
  },
];
