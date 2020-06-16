const slpjs = require("slpjs");
import localforage from "localforage";
import VanillaQR from "../utils/vanillaQR";
import bitbox from "../libs/bitbox";

const bitboxWithSLP = new slpjs.BitboxNetwork(bitbox);

export function storeWallet(mnemonic) {
  return localforage.setItem("SIGNUP_WALLET", btoa(mnemonic));
}

export function retrieveWallet() {
  return localforage.getItem("wallet");
}
