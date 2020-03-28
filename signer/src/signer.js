import * as slpjs from "slpjs";
import BigNumber from "bignumber.js";

import bitbox from "./libs/bitbox";
import showToast from "./showToast";
import { isUserWalletExist, getWalletAddr, getWalletHdNode } from "./wallet";
import {
  validateConfig,
  validateReqType,
  validateBrowser
} from "./utils/validators";
import {
  isInSatoshis,
  convertAmountToBCHUnit,
  convertAmountToSatoshiUnits
} from "./utils/unitUtils";

const bitboxWithSLP = new slpjs.BitboxNetwork(bitbox);

window.addEventListener("message", receiveMessage, false);
function receiveMessage(event) {
  const requestOrigin = event.origin.replace(/https?:\/\//, "");
  const { reqType, reqId, config, amount, unit } = event.data;

  validateConfig(config);
  validateReqType(reqType);

  switch (reqType) {
    case "PAY":
      const amountInBCH = convertAmountToBCHUnit(amount, unit);

      // pay
      showToast(
        `Do you agree to pay ${amount} ${unit} (${amountInBCH} BCH) to ${requestOrigin}?`,
        "Pay",
        "No",
        () =>
          handleRequestToPayIsAccepted(
            reqType,
            reqId,
            amount,
            unit,
            config.addr
          ),
        () => handleMessageBackToClient("REJECTED", reqId)
      );
      break;
    case "AUTH":
      // pay
      if (isUserWalletExist()) {
        handleMessageBackToClient("AUTHENTICATED", reqId);
        return;
      }

      try {
        validateBrowser();
      } catch (e) {
        showToast(
          "This website is a DApp with blockchain functionalities. Unfortunately at the moment Safari browsers are not supported because of limitations enforced by Apple. Please use another browser to navigate this DApp for the meantime. Thank you",
          "I understand",
          "",
          () => null,
          () => handleMessageBackToClient("REJECTED", reqId)
        );
        console.log(e);
        return;
      }

      showToast(
        "This website is a DApp using SIGNUP.cash, you need to log in with SIGNUP to get the full benefits of this web page",
        "Login With SIGNUP",
        "No Thanks!",
        () => handleMessageBackToClient("CONSENT-TO-LOGIN", reqId),
        () => handleMessageBackToClient("REJECTED", reqId)
      );
      break;
  }
}

function handleMessageBackToClient(status, reqId) {
  window.parent.postMessage({ status, reqId }, "*");
}

// perform the transaction right away
async function handleRequestToPayIsAccepted(
  reqType,
  reqId,
  amount,
  unit,
  receiverAddress
) {
  const changeReceiverAddress = getWalletAddr();
  let amountInSatoshis = amount;

  if (!isInSatoshis(unit)) {
    amountInSatoshis = convertAmountToSatoshiUnits(amount, unit);
  }

  // BigNumber is used only because SLP.js depends on it
  amountInSatoshis = new BigNumber(amountInSatoshis);

  const balances = await bitboxWithSLP.getAllSlpBalancesAndUtxos(
    getWalletAddr()
  );
  console.log(balances);
  // TODO proceed with the payment
  const hdNode = getWalletHdNode();
  const fundingWIF = bitbox.HDNode.toWIF(hdNode);

  const sendAmounts = [amountInSatoshis];
  const inputUtxos = balances.nonSlpUtxos.map(utxo => ({
    ...utxo,
    wif: fundingWIF
  }));

  let sendTxId;

  sendTxId = await bitboxWithSLP.simpleBchSend(
    sendAmounts,
    inputUtxos,
    receiverAddress,
    changeReceiverAddress
  );
  console.log("SEND txn complete:", sendTxId);
}
