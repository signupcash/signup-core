import * as slpjs from "slpjs";
import BigNumber from "bignumber.js";

import bitbox from "./libs/bitbox";
import showToast from "./showToast";
import { isUserWalletExist, getWalletAddr, getWalletHdNode } from "./wallet";
import { validateConfig, validateReqType } from "./utils/validators";
import {
  isInSatoshis,
  convertAmountToBCHUnit,
  convertAmountToSatoshiUnits
} from "./utils/unitUtils";
import { notionLinkToBrowserCompatibility } from "./config";

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
      try {
        if (isUserWalletExist()) {
          handleMessageBackToClient("AUTHENTICATED", reqId);
          return;
        }
      } catch (e) {
        console.log("[SIGNUP ERROR]", e);
        // most probably because third party cookies are disable
        showToast(
          "Your browser settings are not allowing you to use Signup.cash platform.",
          "Learn More",
          "Ahh nevermind",
          () =>
            handleMessageBackToClient("CONSENT-TO-OPEN-LINK", reqId, {
              link: notionLinkToBrowserCompatibility
            }),
          () => handleMessageBackToClient("REJECTED", reqId)
        );
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

function handleMessageBackToClient(status, reqId, meta = {}) {
  window.parent.postMessage({ status, reqId, ...meta }, "*");
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

  if (balances.satoshis_available_bch < amountInSatoshis) {
    // early exit because there is not enough bch to spend
    handleMessageBackToClient("ERROR", reqId, {
      message: "Not enough bch available"
    });
    return;
  }

  // TODO proceed with the payment
  const hdNode = getWalletHdNode();
  const fundingWIF = bitbox.HDNode.toWIF(hdNode);

  const sendAmounts = [amountInSatoshis];
  const inputUtxos = balances.nonSlpUtxos.map(utxo => ({
    ...utxo,
    wif: fundingWIF
  }));

  let sendTxId;

  try {
    sendTxId = await bitboxWithSLP.simpleBchSend(
      sendAmounts,
      inputUtxos,
      receiverAddress,
      changeReceiverAddress
    );
    handleMessageBackToClient("ACCOMPLISHED", reqId, { txId: sendTxId });
  } catch (e) {
    console.log("[SIGNUP ERROR]", e);
    handleMessageBackToClient("ERROR", reqId, {
      message: "Transaction failed"
    });
  }
}
