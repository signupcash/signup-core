const slpjs = require("slpjs");
const BITBOX = require("bitbox-sdk").BITBOX;
const bitbox = new BITBOX();

const bitboxWithSLP = new slpjs.BitboxNetwork(bitbox);

import * as Sentry from "@sentry/browser";
import axios from "axios";
import localforage from "localforage";
import VanillaQR from "./vanillaQR";
import { heightModifier, isDevEnv } from "../config";
import { getBCHPrice } from "./price";
import { memoize } from "./helpers";
import { BITCOIN_NETWORK, WALLET_HD_PATH } from '../config'
function q(selector, el) {
  if (!el) {
    el = document;
  }
  return el.querySelector(selector);
}

export async function storeWallet(mnemonic) {
  await localforage.setItem("SIGNUP_WALLET", btoa(mnemonic));
}

export async function storeWalletIsVerified() {
  await localforage.setItem("SIGNUP_WALLET_STATUS", "VERIFIED");
}

export function isRecoveryKeyValid(mnemonic) {
  return (
    bitbox.Mnemonic.validate(mnemonic, bitbox.Mnemonic.wordLists().english) ===
    "Valid mnemonic"
  );
}

export async function deleteWallet(mnemonic) {
  await localforage.removeItem("SIGNUP_WALLET");
  await localforage.removeItem("SIGNUP_WALLET_STATUS");
  await localforage.removeItem("SIGNUP_PREDICTED_CASH_ACCOUNT");
}

export async function retrieveWalletCredentials() {
  let userWallet;

  const userWalletInBase64 = await localforage.getItem("SIGNUP_WALLET");
  if (userWalletInBase64) {
    userWallet = atob(userWalletInBase64);
  }

  const walletStatus = await localforage.getItem("SIGNUP_WALLET_STATUS");
  const isVerified = walletStatus === "VERIFIED";
  return { userWallet, isVerified };
}

export async function isUserWalletExist() {
  const { userWallet, isVerified } = await retrieveWalletCredentials();
  return Boolean(userWallet && isVerified);
}

export async function getWalletAddr() {
  const { userWallet, isVerified } = await retrieveWalletCredentials();

  let bchAddr;
  if (!userWallet || !isVerified) return;

  const seedBuffer = bitbox.Mnemonic.toSeed(userWallet);
  const hdNode = bitbox.HDNode.fromSeed(seedBuffer, BITCOIN_NETWORK);

  const path = bitbox.HDNode.derivePath(hdNode, WALLET_HD_PATH);
  const legacyAddr = path.keyPair.getAddress();
  bchAddr = bitbox.Address.toCashAddress(legacyAddr);

  return bchAddr;
}

export async function getWalletSLPAddr() {
  const bchAddr = await getWalletAddr();
  return slpjs.Utils.toSlpAddress(bchAddr);
}

export async function getWalletHdNode() {
  const { userWallet, isVerified } = await retrieveWalletCredentials();
  const seedBuffer = bitbox.Mnemonic.toSeed(userWallet);
  const hdNode = bitbox.HDNode.fromSeed(seedBuffer, BITCOIN_NETWORK);
  return bitbox.HDNode.derivePath(hdNode, WALLET_HD_PATH);
}

export async function getWalletEntropy() {
  const { userWallet } = await retrieveWalletCredentials();
  return bitbox.Mnemonic.toEntropy(userWallet);
}

export function createRecoveryPhrase() {
  const mnemonic = bitbox.Mnemonic.generate(128);
  storeWallet(mnemonic);
  return { mnemonic };
}

// Get an object and sign a standard Signup Signature Payload
export async function signPayload(data, requestedBy) {
  if (typeof data !== "object") {
    throw new Error("data should be a valid object");
  }

  if (!requestedBy) {
    throw new Error("requestedBy is not specified");
  }

  const payload = {
    signedBy: "Signup.cash",
    requestedBy,
    data,
    timestamp: Date.now(),
  };

  const walletHdNode = await getWalletHdNode();

  const wif = bitbox.HDNode.toWIF(walletHdNode);
  const signature = bitbox.BitcoinCash.signMessageWithPrivKey(
    wif,
    JSON.stringify(payload)
  );

  const legacyAddr = walletHdNode.keyPair.getAddress();
  const bchAddr = bitbox.Address.toCashAddress(legacyAddr);

  return {
    signature,
    payload,
    bchAddr,
  };
}

export async function storeSpending(sessionId, amountInSats) {
  try {
    let spendings = await localforage.getItem("SIGNUP_SPENDINGS");
    if (spendings) {
      spendings = JSON.parse(spendings);
    } else {
      spendings = {};
    }

    const pastSpendings = spendings[sessionId]
      ? parseInt(spendings[sessionId].spent)
      : 0;

    spendings[sessionId] = {
      spent: pastSpendings + amountInSats,
      lastUsed: Date.now(),
    };
    await localforage.setItem("SIGNUP_SPENDINGS", JSON.stringify(spendings));
    return Promise.resolve();
  } catch (e) {
    console.log(e);
    return Promise.reject("[SIGNUP] Failed to store spending");
    Sentry.captureException(e);
  }
}

export async function getWalletSpendingsBySessionId(sessionId) {
  try {
    let spendings = await localforage.getItem("SIGNUP_SPENDINGS");
    spendings = JSON.parse(spendings);
    return (spendings[sessionId] && spendings[sessionId].spent) || 0;
  } catch (e) {
    console.log(e);
    Sentry.captureException(e);
    return 0;
  }
}

export async function getFrozenUtxos() {
  
  try {

    const frozenUtxos = await localforage.getItem("SIGNUP_LOCKED_UTXOS")
    return frozenUtxos ? JSON.parse(frozenUtxos) : {};
    
  } catch (e) {
    console.log(e);
    Sentry.captureException(e);
    return {};
  }
}

export async function freezeUtxo(txid, vout, reqType, data) {
  
  try {
    
    return await freezeUtxos([{ txid, vout }], reqType, data)

  } catch (e) {
    console.log(e);
    Sentry.captureException(e);
    
    return {};
  }
}

export async function freezeUtxos(utxos, reqType, data) {
  
  let lockedUtxos = {}

  try {
    
    lockedUtxos = await getFrozenUtxos();

    utxos.forEach(({ txid, vout }) => {
      //Remove any duplicates before adding again
      const lockedUtxosForTx = (lockedUtxos[txid] || []).filter(outpoint => outpoint.vout !== vout)
      lockedUtxos[txid] = [...lockedUtxosForTx, { txid, vout, reqType, data }]
    })

    await localforage.setItem("SIGNUP_LOCKED_UTXOS", JSON.stringify(lockedUtxos));

    return lockedUtxos

  } catch (e) {

    console.log(e);
    Sentry.captureException(e);

    return lockedUtxos;
  }
}

export async function unfreezeUtxo(txid, vout) {
  
  try {
    
    return await unfreezeUtxos([{ txid, vout }])

  } catch (e) {

    console.log(e);
    Sentry.captureException(e);

    return {};
  }
}

export async function unfreezeUtxos(utxos) {
  
  let lockedUtxos = {}

  try {
    
    lockedUtxos = await getFrozenUtxos();

    utxos.forEach(({ txid, vout }) => {
      //Remove from txid
      const lockedUtxosForTx = (lockedUtxos[txid] || []).filter(outpoint => outpoint.vout !== vout)

      if (!lockedUtxosForTx.length) {
        delete lockedUtxos[txid]
      } else {
        lockedUtxos[txid] = lockedUtxosForTx
      }
    })

    await localforage.setItem("SIGNUP_LOCKED_UTXOS", JSON.stringify(lockedUtxos));

    return lockedUtxos

  } catch (e) {
    console.log(e);
    Sentry.captureException(e);
    
    return lockedUtxos;
  }
}