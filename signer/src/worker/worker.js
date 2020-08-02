import "regenerator-runtime/runtime";
import { getWalletAddr, getWalletEntropy } from "../utils/wallet";
import { isInSatoshis, isInBCH, fiatToBCH } from "../utils/unitUtils";
import { sendBchTx } from "../utils/transactions";
import { decodeSpendToken } from "../utils/permission";
import axios from "axios";
import { SIGNUP_TX_BRIDGE } from "../config";

let latestUtxos = [];
let latestSatoshisBalance;

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
  if (latestUtxos.length < 1) throw new Error("No input found!");
  if (isInSatoshis(action.unit) || isInBCH(action.unit)) {
    return sendBchTx(
      action.amount,
      action.unit,
      action.bchAddr,
      latestSatoshisBalance,
      latestUtxos
    );
  } else {
    // convert from currencies
    const amountInBCH = await fiatToBCH(action.amount, action.unit);
    return sendBchTx(
      amountInBCH,
      "BCH",
      action.bchAddr,
      latestSatoshisBalance,
      latestUtxos
    );
  }
}

function listenToBridgeForEvents(sessionId) {
  const sseSource = new EventSource(
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
      console.log("decoded JWT", decodedToken);

      if (!decodedToken.verified) {
        throwTxErrorToApp(sessionId, "Spend Token is not valid!", 103);
        postMessage({
          event: "tx",
          status: "ERROR",
          reason: "Spend Token is not valid!",
        });
        return;
      }
      // TODO check if action.unit & action.amount are not surpassing the budget
      // process the tx here!
      let txResult;

      if (action.type === "P2PKH") {
        try {
          txResult = await processP2PKHTransaction(action);
          console.log("TX Finished, result=>", txResult);
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
  }
  if (data.reqType === "cleanse_utxos") {
    latestUtxos = [];
  }
  if (data.reqType === "connect" && data.sessionId) {
    listenToBridgeForEvents(data.sessionId);
  }
};
