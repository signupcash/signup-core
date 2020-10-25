import "regenerator-runtime";
import delay from "delay";
import retry from "p-retry";
import {
  getWalletAddr,
  getWalletEntropy,
  storeSpending,
  getWalletSpendingsBySessionId,
  signPayload,
} from "../utils/wallet";
import {
  isInSatoshis,
  isInBCH,
  fiatToBCH,
  fiatToSats,
  sats,
} from "../utils/unitUtils";
import { sendBchTx } from "../utils/transactions";
import { decodeToken } from "../utils/permission";
import axios from "axios";
import { SIGNUP_TX_BRIDGE } from "../config";

let latestUtxos = [];
let latestSatoshisBalance;
let utxosAreUpdating = false;
let currentOrigin;

async function throwErrorToApp(sessionId, reason, errCode) {
  return await axios.post(`${SIGNUP_TX_BRIDGE}/wallet/response`, {
    sessionId: sessionId,
    success: false,
    reason,
    errCode,
  });
}

async function sendResponseBackToApp(sessionId, result) {
  return await axios.post(`${SIGNUP_TX_BRIDGE}/wallet/response`, {
    sessionId: sessionId,
    success: true,
    result,
  });
}

async function processP2PKHTransaction(action) {
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

  // Retry for connection every 3 seconds
  sseSource.addEventListener("error", (e) => {
    setTimeout(() => {
      listenToBridgeForEvents(sessionId);
    }, 3000);
  });

  sseSource.addEventListener("message", (e) => {
    const messageData = e.data;
    console.log(messageData);
    if (messageData && messageData.success) {
      console.log("[SIGNUP][WORKER] connected to tx-bridge succesfully");
    }
  });

  sseSource.addEventListener("WALLET-RESP", (e) => {
    const messageData = JSON.parse(e.data);
    const { token, action } = messageData;
    if (!messageData || !token || !action) {
      // inform the app that action is failed
      throwErrorToApp(
        sessionId,
        "Invalid parameters for the request. Please check the documentation at https://docs.signup.cash to ensure you use the correct params ",
        100
      );
      return;
    }
    console.log(
      "[SIGNUP][WORKER] performing action %s in TX-BRIDGE",
      action.type
    );

    (async () => {
      // check the validity of the token
      const decodedToken = await decodeToken(token);

      // process the tx here!
      let result;

      if (action.type === "P2PKH") {
        if (!decodedToken.verified) {
          throwErrorToApp(sessionId, "Spend Token is not valid!", 103);
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
          throwErrorToApp(sessionId, "Budget exceed!");
          return;
        } else {
          console.log("Budget is OK!", budgetInSats, pastSpendings);
        }

        try {
          result = await retry(() => processP2PKHTransaction(action), {
            retries: 5,
            onFailedAttempt: async () => {
              console.log("Waiting for UTXOs to be fetched...");
              await delay(1000);
            },
          });
        } catch (e) {
          console.log(e);
          // TODO figure out if it's actually out of balance or rest.bitcoin.com is down
          throwErrorToApp(sessionId, "Not enough balance", 102);
          return;
        }

        // inform the wallet to refetch Utxos
        postMessage({ event: "tx", status: "DONE", result, action });
        await storeSpending(sessionId, result.spent);
      }

      if (action.type === "SIGN") {
        // check if the user is given the permission for signatures or not
        if (!decodedToken.verified) {
          throwErrorToApp(sessionId, "[0] Access Token is not valid!", 104);
          return;
        }

        if (!decodedToken.data.permissions.includes("signature")) {
          throwErrorToApp(sessionId, "[1] Access Token is not valid!", 104);
          return;
        }

        try {
          result = await signPayload(action.data, currentOrigin);
        } catch (e) {
          console.log(e);
          // TODO figure out if it's actually out of balance or rest.bitcoin.com is down
          throwErrorToApp(sessionId, "Error while signing", 100);
          return;
        }
      }

      if (!result) {
        throwErrorToApp(sessionId, "Action Failed");
        return;
      }

      sendResponseBackToApp(sessionId, result);
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

  if (data.reqType === "current_origin") {
    currentOrigin = data.origin;
  }

  if (data.reqType === "connect" && data.sessionId) {
    listenToBridgeForEvents(data.sessionId);
  }
};
