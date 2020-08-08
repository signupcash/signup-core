const slpjs = require("slpjs");
const BITBOX = require("bitbox-sdk").BITBOX;
const bitbox = new BITBOX();

const bitboxWithSLP = new slpjs.BitboxNetwork(bitbox);

import axios from "axios";
import localforage from "localforage";
import VanillaQR from "./vanillaQR";
import { heightModifier, isDevEnv } from "../config";
import { getBCHPrice } from "./price";

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

export async function deleteWallet(mnemonic) {
  await localforage.removeItem("SIGNUP_WALLET");
  await localforage.removeItem("SIGNUP_WALLET_STATUS");
  await localforage.removeItem("SIGNUP_PREDICTED_CASH_ACCOUNT");
}

export async function getBalance(bchAddr) {
  const { data } = await axios.post(
    `https://bchd.fountainhead.cash/v1/GetAddressUnspentOutputs`,
    {
      address: bchAddr,
      include_mempool: true,
    },
    {
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
      },
    }
  );

  const utxos = data.outputs;

  let balance = 0;
  let balanceInUSD = 0;

  if (!utxos) {
    return { balance, balanceInUSD };
  }

  balance = utxos.reduce((acc, current) => acc + parseInt(current.value), 0);

  if (balance > 0) {
    const bchPriceInUSD = await getBCHPrice();
    balance = bitbox.BitcoinCash.toBitcoinCash(balance);
    balanceInUSD = (bchPriceInUSD * balance).toFixed(2);
  }

  return { balance, balanceInUSD };
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

  try {
    const seedBuffer = bitbox.Mnemonic.toSeed(userWallet);
    const hdNode = bitbox.HDNode.fromSeed(seedBuffer);

    const path = bitbox.HDNode.derivePath(hdNode, "m/44'/0'/0'/0/0");
    const legacyAddr = path.keyPair.getAddress();
    bchAddr = bitbox.Address.toCashAddress(legacyAddr);
  } catch (e) {
    console.log("[SIGNUP][ERROR] =>", e);
  }
  return bchAddr;
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

function createWallet(mnemonic) {
  const seedBuffer = bitbox.Mnemonic.toSeed(mnemonic);
  // create HDNode from seed buffer
  return bitbox.HDNode.fromSeed(seedBuffer);
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
    // do nothing probably third party cookie is not allowed in the browser
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
    console.log("[SIGNUP] No cash account found for user", e);
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
  console.log("[SIGNUP][Creating Cash Account]", chosenUsername);
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
