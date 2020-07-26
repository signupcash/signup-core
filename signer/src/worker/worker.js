import "regenerator-runtime/runtime";
import { getWalletAddr, getWalletEntropy } from "../utils/wallet";
import { isInSatoshis, isInBCH, fiatToBCH } from "../utils/unitUtils";
import { sendBchTx } from "../utils/transactions";
import { decodeSpendToken } from "../utils/permission";
import axios from "axios";
import { SIGNUP_TX_BRIDGE } from "../config";

async function throwTxErrorToApp(sessionId, reason) {
  return await axios.post(`${SIGNUP_TX_BRIDGE}/wallet/tx-response`, {
    sessionId: sessionId,
    success: false,
    reason,
  });
}

async function sendTxResponseBackToApp(sessionId, txResult) {
  return await axios.post(`${SIGNUP_TX_BRIDGE}/wallet/tx-response`, {
    sessionId: sessionId,
    success: true,
    txResult,
  });
}

onmessage = function ({ data }) {
  console.log("Signup Worker: msg received =>", data);
  if (data.reqType === "connect" && data.sessionId) {
    console.log("Connecting to the Bridge...");

    const sseSource = new EventSource(
      `${SIGNUP_TX_BRIDGE}/wallet/connect/${data.sessionId}`
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
        throwTxErrorToApp(data.sessionId, "invalid parameters");
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
          throwTxErrorToApp(data.sessionId, decodedToken.reason);
          return;
        }
        // TODO check if action.unit & action.amount are not surpassing the budget
        // TODO process the tx here!
        let txResult;

        if (isInSatoshis(action.unit) || isInBCH(action.unit)) {
          txResult = await sendBchTx(
            action.amount,
            action.unit,
            action.bchAddr
          );
        } else {
          // convert from currencies
          const amountInBCH = await fiatToBCH(action.amount, action.unit);
          txResult = await sendBchTx(amountInBCH, "BCH", action.bchAddr);
        }
        try {
          sendTxResponseBackToApp(data.sessionId, txResult);
        } catch (e) {
          console.log(e);
        }
      })();
    });
  }
  //postMessage({ msg: "hello from authorization wallet" });
};
