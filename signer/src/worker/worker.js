import "regenerator-runtime/runtime";
import delay from "delay";
import retry from "p-retry";
import {
  getWalletAddr,
  getWalletEntropy,
  storeSpending,
  getWalletSpendingsBySessionId,
} from "../utils/wallet";
import {
  isInSatoshis,
  isInBCH,
  fiatToBCH,
  fiatToSats,
  sats,
} from "../utils/unitUtils";
import { sendBchTx } from "../utils/transactions";
import { decodeSpendToken } from "../utils/permission";
import axios from "axios";
import { SIGNUP_TX_BRIDGE } from "../config";

let latestUtxos = [];
let latestSatoshisBalance;
let utxosAreUpdating = false;

async function throwTxErrorToApp(sessionId, reason, errCode) {
  return await axios.post(`${SIGNUP_TX_BRIDGE}/wallet/tx-response`, {
    sessionId: sessionId,
    success: false,
    reason,
    errCode,
  });
}

async function sendTxResponseBackToApp(sessionId, txResult) {
  return await axios.post(`${SIGNUP_TX_BRIDGE}/wallet/tx-response`, {
    sessionId: sessionId,
    success: true,
    txResult,
  });
}

async function processP2PKHTransaction(action) {
  console.log("processP2PKHTransaction()", latestUtxos, latestSatoshisBalance);
  if (utxosAreUpdating) throw new Error("Utxos are not fetched yet!");
  if (latestUtxos.length < 1) throw new Error("No input found!");
  return sendBchTx(
    action.amount,
    action.unit,
    action.bchAddr,
    latestSatoshisBalance,
    latestUtxos
  );
}

function listenToBridgeForEvents(sessionId) {
  let sseSource = new EventSource(
    `${SIGNUP_TX_BRIDGE}/wallet/connect/${sessionId}`
  );

  sseSource.addEventListener("message", (e) => {
    const messageData = e.data;
    console.log(messageData);
    if (messageData && messageData.success) {
      console.log("[SIGNUP][WORKER] connected to tx-bridge succesfully");
    }
  });

  sseSource.addEventListener("WALLET-TX", (e) => {
    const messageData = JSON.parse(e.data);
    const { spendToken, action } = messageData;
    if (!messageData || !spendToken || !action) {
      // inform the app that action is failed
      throwTxErrorToApp(sessionId, "invalid parameters", 100);
      return;
    }
    console.log(
      "[SIGNUP][WORKER] performing action %s in TX-BRIDGE",
      action.type
    );
    console.log("action => ", action);

    (async () => {
      // check the validity of spend token
      const walletEntropy = await getWalletEntropy();
      const slicedEntropy = walletEntropy.slice(0, 32);
      const decodedToken = decodeSpendToken(spendToken, slicedEntropy);

      if (!decodedToken.verified) {
        throwTxErrorToApp(sessionId, "Spend Token is not valid!", 103);
        postMessage({
          event: "tx",
          status: "ERROR",
          reason: "Spend Token is not valid!",
        });
        return;
      }
      // check if action.unit & action.amount are not surpassing the budget
      const pastSpendings = await getWalletSpendingsBySessionId(sessionId);

      const currentSpending = await sats(action.amount, action.unit);

      // budget is always in USD for now
      const budgetInSats = await fiatToSats(decodedToken.data.budget, "usd");
      if (budgetInSats < pastSpendings + currentSpending) {
        throwTxErrorToApp(sessionId, "Budget exceed!");
        return;
      } else {
        console.log("Budget is OK!", budgetInSats, pastSpendings);
      }

      // process the tx here!
      let txResult;

      if (action.type === "P2PKH") {
        try {
          txResult = await retry(() => processP2PKHTransaction(action), {
            retries: 5,
            onFailedAttempt: async () => {
              console.log("Waiting for UTXOs to be fetched...");
              await delay(1000);
            },
          });
        } catch (e) {
          console.log(e);
          throwTxErrorToApp(sessionId, "Not enough balance", 102);
          return;
        }
      }

      if (!txResult) {
        throwTxErrorToApp(sessionId, "Transaction Failed");
        return;
      }

      try {
        sendTxResponseBackToApp(sessionId, txResult);
        // inform the wallet to refetch Utxos
        postMessage({ event: "tx", status: "DONE", txResult, action });
        await storeSpending(sessionId, txResult.spent);
      } catch (e) {
        console.log(e);
      }
    })();
  });
}

onmessage = function ({ data }) {
  console.log("Signup Worker: msg received =>", data);
  if (data.reqType === "update") {
    // update balance and UTXOs in memory
    latestUtxos = [...data.latestUtxos];
    latestSatoshisBalance = data.latestSatoshisBalance;
    utxosAreUpdating = false;
  }
  if (data.reqType === "cleanse_utxos") {
    latestUtxos = [];
    utxosAreUpdating = true;
  }
  if (data.reqType === "connect" && data.sessionId) {
    listenToBridgeForEvents(data.sessionId);
  }
};
