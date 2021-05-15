// retrieved from https://gitlab.com/cash-accounts/website/-/blob/master/www/js/index.js#L78
export const heightModifier = 563620;
export const DUST = 546;

export const isDevEnv = process.env.NODE_ENV === "development";

const defaultHdPath = "m/44'/0'/0'/0/0"
export const BITCOIN_NETWORK = isDevEnv ? (process.env.BITCOIN_NETWORK || "testnet") : "mainnet"
export const WALLET_HD_PATH = (isDevEnv && process.env.WALLET_HD_PATH) || defaultHdPath

export const SIGNUP_TX_BRIDGE = isDevEnv
  ? "http://localhost:5044"
  : "https://bridge.signup.cash";

export const SLPDB_DEFAULT_URL = "https://slpdb.fountainhead.cash";
export const SLP_ICONS_URL = "https://icons.fountainhead.cash/64/";

export const SLP_EXPLORER = "https://simpleledger.info";
export const BITCOIN_COM_EXPLORER = "https://explorer.bitcoin.com/bch";

const TESTNET_TX_EXPLORER = "https://www.blockchain.com/bch-testnet/tx/" 
const MAINNET_TX_EXPLORER = "https://blockchair.com/bitcoin-cash/transaction/"
export const BITCOIN_TX_EXPLORER = isDevEnv ? TESTNET_TX_EXPLORER : MAINNET_TX_EXPLORER

// Waifu is a specific popular NFT group in SLP ecosystem serving their images using:
// this URL + txid +.png
export const WAIFU_NFT_IMAGE_SERVER = "https://icons.waifufaucet.com/128/";
export const WAIFU_GROUP_ID =
  "a2987562a405648a6c5622ed6c205fca6169faa8afeb96a994b48010bd186a66";

export const HONK_NFT_IMAGE_SERVER =
  "https://sedonatv.github.io/honk_official/128/";
export const HONK_GROUP_ID =
  "50161e5da6bee803507a1136c4dbbe46c3262fbbe6e3767cf7ec3715dc1fab72";

export const ZOMBIE_NFT_IMAGE_SERVER =
  "https://nfticons.herokuapp.com/original";
export const ZOMBIE_GROUP_ID =
  "de6339df4ea6ff1b999c3c16b16764f3f749817d8a160a1cac29a1171f7ad639";


export const electrumCashClusters = BITCOIN_NETWORK === "mainnet" ? [
  {
    host: "electroncash.de",
    port: 60002,
  },
  {
    host: "electroncash.dk",
    port: 50004,
  },
  {
    host: "electrum.imaginary.cash",
    port: 50004,
  },
] : [
  { host: "testnet.bitcoincash.network", port: 60004 },
  { host: "blackie.c3-soft.com", port: 60004 },
  { host: "electroncash.de", port: 60004 }
];