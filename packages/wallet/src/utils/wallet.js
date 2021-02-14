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
  const userWallet = atob(await localforage.getItem("SIGNUP_WALLET"));
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

  const seedBuffer = bitbox.Mnemonic.toSeed(userWallet);
  const hdNode = bitbox.HDNode.fromSeed(seedBuffer);

  const path = bitbox.HDNode.derivePath(hdNode, "m/44'/0'/0'/0/0");
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
  const hdNode = bitbox.HDNode.fromSeed(seedBuffer);
  return bitbox.HDNode.derivePath(hdNode, "m/44'/0'/0'/0/0");
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

export function makeUsername(cashAccountPayload) {
  return `${cashAccountPayload.nameText}#${cashAccountPayload.accountNumber}`;
}

export async function getUserAttemptedCashAccount() {
  let username;
  try {
    const predictedUsername = await localforage.getItem(
      "SIGNUP_PREDICTED_CASH_ACCOUNT"
    );
    if (predictedUsername) {
      username = predictedUsername;
    }
  } catch (e) {
    Sentry.captureMessage("Localforage not supported in the browser");
    Sentry.captureException(e);
  }
  return username;
}

export async function getWalletCashAccount(bchAddress) {
  let cashAccount;
  let accountEmoji;

  // get cash account details
  try {
    let reverseLookup = await bitbox.CashAccounts.reverseLookup(bchAddress);
    if (reverseLookup && reverseLookup.results) {
      cashAccount = makeUsername(reverseLookup.results[0]);
      accountEmoji = reverseLookup.results[0].accountEmoji;
    }
  } catch (e) {
    Sentry.captureException(e);
    // in case user just registered for cash account it might be not found yet
    // in that scenario we use the predicted username
    const userAttemptedCashAccount = await getUserAttemptedCashAccount();
    if (userAttemptedCashAccount) {
      cashAccount = userAttemptedCashAccount;
      // assign default emoji until cash account is created
      accountEmoji = "🏅";
    }
  }
  return { cashAccount, accountEmoji };
}

export async function createCashAccount(chosenUsername) {
  if (!chosenUsername) return Promise.reject("No username is chosen by user");

  // remove spaces
  chosenUsername = chosenUsername.replace(/\s/g, "");
  const blockHeight = await bitbox.Blockchain.getBlockCount();
  const predictedAccountNumber = blockHeight - heightModifier + 1;

  const walletAddress = await getWalletAddr();
  const bchAddress = walletAddress.replace("bitcoincash:", "");

  // store
  try {
    await localforage.setItem(
      "SIGNUP_PREDICTED_CASH_ACCOUNT",
      `${chosenUsername}#${predictedAccountNumber}`
    );
  } catch (e) {
    console.log("[Error] Storing in indexDB", e);
    Sentry.captureException(e);
  }

  return fetch("https://api.cashaccount.info/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: chosenUsername,
      payments: [bchAddress],
    }),
  }).then((res) => res.json());
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
