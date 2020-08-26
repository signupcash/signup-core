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

import { isInSatoshis, sats } from "../utils/unitUtils";

const bitboxWithSLP = new slpjs.BitboxNetwork(bitbox);

// perform the transaction right away
export async function sendBchTx(
  amount,
  unit,
  receiverAddress,
  latestSatoshisBalance,
  latestUtxos = []
) {
  const changeReceiverAddress = await getWalletAddr();
  let amountInSatoshis = await sats(amount, unit);

  if (latestSatoshisBalance < amountInSatoshis) {
    // TODO Re-fetch All SLP judged UTXOs
  }

  // BigNumber is used only because SLP.js depends on it
  amountInSatoshis = new BigNumber(amountInSatoshis);
  const sendAmounts = [amountInSatoshis];

  // proceed with the payment
  const hdNode = await getWalletHdNode();
  const fundingWIF = bitbox.HDNode.toWIF(hdNode);

  const inputUtxos = latestUtxos.map((utxo) => ({
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
  return { txId: sendTxId, spent: amountInSatoshis.toNumber() };
}
