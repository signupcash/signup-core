import * as slpjs from "slpjs";
import BigNumber from "bignumber.js";
import bitbox from "../libs/bitbox";
const slpMetadata = require("slp-mdm");
import { sendRawTx } from "./blockchain";

import {
  isUserWalletExist,
  getWalletAddr,
  getWalletSLPAddr,
  getWalletHdNode,
  makeUsername,
  getUserAttemptedCashAccount,
} from "./wallet";

import { isInSatoshis, sats } from "./unitUtils";
import { DUST } from "../config";
import { getSlpByTokenId, getSlpBalances } from "./slp";

const bitboxWithSLP = new slpjs.BitboxNetwork(bitbox);

export function feesFor(inputNum, outputNum) {
  return bitbox.BitcoinCash.getByteCount(
    { P2PKH: inputNum },
    { P2PKH: outputNum }
  );
}

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

  // proceed with the payment
  const hdNode = await getWalletHdNode();
  const keyPair = bitbox.HDNode.toKeyPair(hdNode);

  const tx = new bitbox.TransactionBuilder("mainnet");

  let inputsSats = 0;
  let selectedUtxos = [];
  let fees;

  latestUtxos.forEach((utxo) => {
    if (selectedUtxos.length > 0 && inputsSats >= amountInSatoshis + fees) {
      return;
    }

    tx.addInput(utxo.txid, utxo.vout);

    // only need the satoshis here to sign in the end
    selectedUtxos.push(utxo.satoshis);
    // keeping track of inputs
    inputsSats += utxo.satoshis;
    fees = feesFor(selectedUtxos.length, 2);
  });

  const changeAmount = inputsSats - amountInSatoshis - fees;

  tx.addOutput(receiverAddress, amountInSatoshis);

  if (changeAmount > DUST) {
    tx.addOutput(changeReceiverAddress, changeAmount);
  }

  tx.setLockTime(0);

  selectedUtxos.forEach((sats, idx) => {
    tx.sign(
      idx,
      keyPair,
      undefined,
      tx.hashTypes.SIGHASH_ALL,
      sats,
      tx.signatureAlgorithms.SCHNORR
    );
  });

  const builtTx = tx.build();
  const txHex = builtTx.toHex();

  // Broadcast transation to the network
  const txId = await sendRawTx(txHex);

  return { txId, spent: amountInSatoshis + fees };
}

export async function sendSlpTx(
  amount,
  tokenId,
  receiverAddress,
  latestSatoshisBalance,
  latestUtxos,
  slpUtxos,
  slpBalances
) {
  const changeReceiverAddress = await getWalletSLPAddr();
  const fees = feesFor(4, 4);

  const targetToken = slpBalances.filter((x) => x.tokenId === tokenId).pop();

  if (!targetToken) {
    throw new Error("[Signup] No SLP balance to send the transaction");
  }

  let sendAmounts = [
    new BigNumber(parseFloat(amount)).times(10 ** targetToken.decimals),
  ];

  if (targetToken.value > amount) {
    sendAmounts.push(
      new BigNumber(targetToken.value - amount).times(
        10 ** targetToken.decimals
      )
    );
  }

  // Preparing UTXOs
  let inputUtxos = slpUtxos.filter((x) => x.tokenId === tokenId);
  // Adding some non slp UTXOs for fees
  const feeUtxo = latestUtxos.filter((x) => x.satoshis >= fees)[0];
  inputUtxos = inputUtxos.concat(feeUtxo);

  // Proceed with the payment
  const hdNode = await getWalletHdNode();
  const keyPair = bitbox.HDNode.toKeyPair(hdNode);
  const tx = new bitbox.TransactionBuilder("mainnet");

  // Adding inputs
  inputUtxos.forEach((utxo) => {
    tx.addInput(utxo.txid, utxo.vout);
  });

  // OP_RETURN output to flag the tx as a valid SLP
  let opReturnData;
  if (targetToken.versionType === 65) {
    // NFT child tx
    opReturnData = slpMetadata.NFT1.Child.send(tokenId, [
      new BigNumber(1).times(10 ** targetToken.decimals),
    ]);
  } else if (targetToken.versionType === 1) {
    // SLP type 1 tx
    opReturnData = slpMetadata.TokenType1.send(tokenId, sendAmounts);
  }

  tx.addOutput(opReturnData, 0);

  // The UTXO which is carrying SLP tokens always has a dust value (546)
  tx.addOutput(receiverAddress, DUST);

  if (targetToken.value > amount) {
    // add utxo for sending SLP change back
    tx.addOutput(changeReceiverAddress, DUST);
  }

  const changeAmount = feeUtxo.satoshis - DUST - fees;

  if (changeAmount > DUST) {
    tx.addOutput(changeReceiverAddress, changeAmount);
  }

  tx.setLockTime(0);

  inputUtxos.forEach((utxo, idx) => {
    tx.sign(
      idx,
      keyPair,
      undefined,
      tx.hashTypes.SIGHASH_ALL,
      utxo.satoshis,
      tx.signatureAlgorithms.SCHNORR
    );
  });

  const builtTx = tx.build();
  const txHex = builtTx.toHex();

  // Broadcast transation to the network
  const txId = await sendRawTx(txHex);

  return { txId };
}

// Can be used for genesis token type 1 and NFT group
export async function genesisSlp(
  name,
  ticker,
  documentUri,
  documentHash,
  quantity,
  decimals,
  keepBaton,
  latestSatoshisBalance,
  latestUtxos,
  type
) {
  const changeReceiverAddress = await getWalletAddr();
  const receiverAddress = await getWalletSLPAddr();
  let satsNeeded = feesFor(3, 4) + DUST;
  if (keepBaton) {
    satsNeeded += DUST;
  }

  // Adding UTXOs for fees
  const inputUtxo = latestUtxos.filter((x) => x.satoshis >= satsNeeded)[0];

  if (!inputUtxo) {
    throw new Error("No BCH found to pay for the fees");
  }

  // Proceed with the payment
  const hdNode = await getWalletHdNode();
  const keyPair = bitbox.HDNode.toKeyPair(hdNode);
  const tx = new bitbox.TransactionBuilder("mainnet");

  // Adding inputs
  tx.addInput(inputUtxo.txid, inputUtxo.vout);

  // OP_RETURN output to create the token based on SLP spec
  let opReturnData;

  if (type === "GENESIS_NFT_GROUP") {
    opReturnData = slpMetadata.NFT1.Group.genesis(
      ticker,
      name,
      documentUri,
      documentHash,
      decimals,
      // mintBatonVout will always be 2 according to SLP spec
      keepBaton ? 2 : null,
      new BigNumber(quantity)
    );
  } else if (type === "GENESIS_TYPE1") {
    opReturnData = slpMetadata.TokenType1.genesis(
      ticker,
      name,
      documentUri,
      documentHash,
      decimals,
      // mintBatonVout will always be 2 according to SLP spec
      keepBaton ? 2 : null,
      new BigNumber(quantity)
    );
  }

  tx.addOutput(opReturnData, 0);

  // The UTXO which is carrying SLP tokens always has a dust value (546)
  tx.addOutput(receiverAddress, DUST);

  if (keepBaton) {
    // this utxo will be reserved for baton
    tx.addOutput(receiverAddress, DUST);
  }

  const changeAmount = inputUtxo.satoshis - satsNeeded;

  if (changeAmount > DUST) {
    tx.addOutput(changeReceiverAddress, changeAmount);
  }

  tx.setLockTime(0);

  tx.sign(
    0,
    keyPair,
    undefined,
    tx.hashTypes.SIGHASH_ALL,
    inputUtxo.satoshis,
    tx.signatureAlgorithms.SCHNORR
  );

  const builtTx = tx.build();
  const txHex = builtTx.toHex();

  // Broadcast transation to the network
  const txId = await sendRawTx(txHex);

  return { txId };
}
