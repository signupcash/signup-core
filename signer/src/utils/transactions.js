import * as slpjs from "slpjs";
import BigNumber from "bignumber.js";
import bitbox from "../libs/bitbox";

import {
  isUserWalletExist,
  getWalletAddr,
  getWalletHdNode,
  makeUsername,
  getUserAttemptedCashAccount,
} from "./wallet";

import { isInSatoshis, convertAmountToSatoshiUnits } from "../utils/unitUtils";

const bitboxWithSLP = new slpjs.BitboxNetwork(bitbox);

// perform the transaction right away
export async function sendBchTx(amount, unit, receiverAddress) {
  const changeReceiverAddress = await getWalletAddr();
  let amountInSatoshis = amount;

  if (!isInSatoshis(unit)) {
    amountInSatoshis = convertAmountToSatoshiUnits(amount, unit);
  }

  // BigNumber is used only because SLP.js depends on it
  amountInSatoshis = new BigNumber(amountInSatoshis);
  const sendAmounts = [amountInSatoshis];

  // proceed with the payment
  const hdNode = await getWalletHdNode();
  const fundingWIF = bitbox.HDNode.toWIF(hdNode);

  // Get All SLP judged UTXOs
  let latestBalance = await bitboxWithSLP.getAllSlpBalancesAndUtxos(
    changeReceiverAddress
  );
  const inputUtxos = latestBalance.nonSlpUtxos.map((utxo) => ({
    ...utxo,
    wif: fundingWIF,
  }));

  let sendTxId;

  sendTxId = await bitboxWithSLP.simpleBchSend(
    sendAmounts,
    inputUtxos,
    receiverAddress,
    changeReceiverAddress
  );
  return { txId: sendTxId };
}
