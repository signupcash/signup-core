const slpjs = require("slpjs");
const BITBOX = require("bitbox-sdk").BITBOX;
const bitbox = new BITBOX();

const bitboxWithSLP = new slpjs.BitboxNetwork(bitbox);

import axios from "axios";
import localforage from "localforage";
import VanillaQR from "./vanillaQR";
import { heightModifier, isDevEnv } from "../config";

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
    balance = (balance * 0.00000001).toFixed(8);
    balanceInUSD = (230 * balance).toFixed(2);
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

  if (isDevEnv) {
    console.log("[SIGNUP] getWalletCredentials =>", userWallet, isVerified);
  } else {
    console.log("[SIGNUP] Is wallet verified =>", isVerified);
  }

  try {
    const seedBuffer = bitbox.Mnemonic.toSeed(userWallet);
    const hdNode = bitbox.HDNode.fromSeed(seedBuffer);
    bchAddr = bitbox.HDNode.toCashAddress(hdNode);
  } catch (e) {
    console.log("[SIGNUP][ERROR] =>", e);
  }
  return bchAddr;
}

export async function getWalletHdNode() {
  const { userWallet, isVerified } = await retrieveWalletCredentials();
  const seedBuffer = bitbox.Mnemonic.toSeed(userWallet);
  const hdNode = bitbox.HDNode.fromSeed(seedBuffer);
  return hdNode;
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
    console.log("[SIGNUP] No cash account found for user");
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

export function initWallet() {
  if (document.location.pathname !== "/account") return;

  isUserWalletExist().then(async (exist) => {
    if (!exist) {
      console.log("doest exist");
      q("#create-wallet-btn").style.display = "block";
      q("#content").style.display = "block";
      q("#disclaimer1").style.display = "block";
      q("#logo").style.display = "block";
      q("#cashaccount-container").style.display = "flex";
      return;
    }

    // just show the balances
    showBalancesOnly();
    // load cash account
    const walletAddress = await getWalletAddr();
    try {
      const cashAccountLookup = await bitbox.CashAccounts.reverseLookup(
        walletAddress
      );
      if (cashAccountLookup && cashAccountLookup.results) {
        // update the UI
        const {
          accountEmoji,
          accountNumber,
          nameText,
          accountCollisionLength,
        } = cashAccountLookup.results[0];

        if (nameText && accountCollisionLength === 0) {
          // show the cash account user
          let username = makeUsername(cashAccountLookup.results[0]);
          q(
            "#cashaccount-user"
          ).innerHTML = `Your Cash Account Username: <b>${username}</b>`;
          q("#cashaccount-user").style.display = "block";
        }
      }
    } catch (e) {
      console.log(e);
    }
  });

  async function showBalancesOnly() {
    const walletAddr = await getWalletAddr();
    q("#logo").style.display = "none";
    q("#confirm-wallet-btn").style.display = "none";
    q("#recovery-phrases").style.display = "none";
    q("#mnemonic-explainer").style.display = "none";
    q("#create-wallet-btn").style.display = "none";
    q("#content").style.display = "none";
    q("#disclaimer1").style.display = "none";

    q("#show-balance").style.display = "block";
    q("#check-balance-btn").style.display = "block";

    q("#show-balance").innerHTML = "<b>Updating ...</b>";
    q("#check-balance-btn").setAttribute("disabled", true);

    showQR(walletAddr);

    let balances;
    balances = await bitboxWithSLP.getAllSlpBalancesAndUtxos(walletAddr);
    q("#check-balance-btn").removeAttribute("disabled");
    q("#show-balance").innerHTML = `Balance: <b>${(
      balances.satoshis_available_bch * 0.00000001
    ).toFixed(8)} BCH</b>`;

    q("#qr-explainer").style.display = "block";
    q("#qr-disclaimer").style.display = "block";
    q("#cashaddr-address").style.display = "block";
    q("#cashaddr-address").innerText = walletAddr;
    q("#cashaddr-address").setAttribute("href", walletAddr);
  }

  function onCreateWalletBtnPressed(e) {
    e.preventDefault();
    const { mnemonic } = createRecoveryPhrase();

    q("#recovery-phrases").innerText = mnemonic;

    q("#create-wallet-btn").style.display = "none";
    q("#cashaccount-container").style.display = "none";
    q("#content").style.display = "none";
    q("#disclaimer1").style.display = "none";

    q("#recovery-phrases").style.display = "block";
    q("#mnemonic-explainer").style.display = "block";
    q("#confirm-wallet-btn").style.display = "block";
    return false;
  }

  function onCheckBalanceBtnPressed(e) {
    e.preventDefault();

    q("#show-balance").innerHTML = "<b>Updating ...</b>";
    q("#check-balance-btn").setAttribute("disabled", true);

    let balances;

    (async function () {
      const walletAddress = await getWalletAddr();

      balances = await bitboxWithSLP.getAllSlpBalancesAndUtxos(walletAddress);
      console.log("balances: ", balances);

      q("#check-balance-btn").removeAttribute("disabled");
      q("#show-balance").innerHTML = `Balance: <b>${(
        balances.satoshis_available_bch * 0.00000001
      ).toFixed(8)} BCH</b>`;
    })();
    return false;
  }

  function onGoBackButtonPressed(e) {
    window.close();
  }

  async function onMnemonicConfirmationBtnPressed(e) {
    e.preventDefault();
    await storeWalletIsVerified();
    let cashAccountResult;

    const walletAddress = await getWalletAddr();

    if (!walletAddress) return;

    q("#logo").style.display = "none";
    q("#confirm-wallet-btn").style.display = "none";
    q("#recovery-phrases").style.display = "none";
    q("#mnemonic-explainer").style.display = "none";
    q("#qr-explainer").style.display = "block";
    q("#qr-disclaimer").style.display = "block";
    q("#cashaddr-address").innerText = walletAddress;
    q("#cashaddr-address").setAttribute("href", walletAddress);

    q("#show-balance").style.display = "block";
    q("#check-balance-btn").style.display = "block";
    q("#go-back-btn").style.display = "block";

    showQR(walletAddress);

    // create cash account
    try {
      cashAccountResult = await createCashAccount();
    } catch (e) {
      console.log("[SIGNUP ERROR] cash account cannot be created", e);
    }
    return false;
  }

  function showQR(walletAddress) {
    const qr = new VanillaQR({
      url: walletAddress,
      size: 320,

      colorLight: "#ffffff",
      colorDark: "#192b26",

      //output to table or canvas
      toTable: false,

      //Ecc correction level 1-4
      ecclevel: 1,

      // Use a border or not
      noBorder: true,

      //Border size to output at
      borderSize: 4,
    });
    q("#qr-contianer").appendChild(qr.toImage("png"));
  }

  q("#create-wallet-btn").addEventListener("click", onCreateWalletBtnPressed);
  q("#confirm-wallet-btn").addEventListener(
    "click",
    onMnemonicConfirmationBtnPressed
  );
  q("#check-balance-btn").addEventListener("click", onCheckBalanceBtnPressed);
  q("#go-back-btn").addEventListener("click", onGoBackButtonPressed);
}
