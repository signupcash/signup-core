import * as slpjs from "slpjs";
import BigNumber from "bignumber.js";

import bitbox from "./libs/bitbox";
import {
  isUserWalletExist,
  getWalletAddr,
  getWalletHdNode,
  makeUsername,
  getUserAttemptedCashAccount,
} from "./utils/wallet";
import { validateConfig, validateReqType } from "./utils/validators";
import {
  isInSatoshis,
  convertAmountToBCHUnit,
  convertAmountToSatoshiUnits,
} from "./utils/unitUtils";
import { notionLinkToBrowserCompatibility } from "./config";

const bitboxWithSLP = new slpjs.BitboxNetwork(bitbox);

let latestBalance;

export function handleMessageBackToClient(status, reqId, meta = {}) {
  window.opener.postMessage({ status, reqId, ...meta }, "*");
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

  if (latestBalance.satoshis_available_bch < amountInSatoshis) {
    // early exit because there is not enough bch to spend
    handleMessageBackToClient("ERROR", reqId, {
      message: "Not enough bch available",
    });
    return;
  }

  // TODO proceed with the payment
  const hdNode = getWalletHdNode();
  const fundingWIF = bitbox.HDNode.toWIF(hdNode);

  const sendAmounts = [amountInSatoshis];
  const inputUtxos = latestBalance.nonSlpUtxos.map((utxo) => ({
    ...utxo,
    wif: fundingWIF,
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
      message: "Transaction failed",
    });
  }
}
