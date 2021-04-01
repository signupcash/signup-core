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
  freezeCoinsInTx
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

async function createSendTransaction(
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

  const tx = new bitbox.TransactionBuilder(__SIGNUP_NETWORK__);

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
  const spent = amountInSatoshis + fees

  return { tx: builtTx, spent }
}

// perform the transaction right away
export async function sendBchTx(
  amount,
  unit,
  receiverAddress,
  latestSatoshisBalance,
  latestUtxos = []
) {

  const { tx, spent } = await createSendTransaction(amount, unit, receiverAddress, latestSatoshisBalance, latestUtxos)
  const txId = sendRawTx(tx.toHex());

  return { txId, spent }
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

  const balances = await getSlpBalances(changeReceiverAddress);
  const targetToken = balances.filter((x) => x.tokenId === tokenId).pop();

  if (!targetToken) {
    throw new Error("[Signup] No balance to send the transaction");
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

  const tx = new bitbox.TransactionBuilder(__SIGNUP_NETWORK__);

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

export async function sendCommitmentTx(
  recipients,
  data,
  amount,
  unit = "SATS",
  latestSatoshisBalance,
  latestUtxos = [],
  //expires,
  //checkExpired = true
) {
  
  //check donation exists and amount in donation exists
  if (!amount) {
    throw "Donation amount is missing"
  }

  try {
    amount = parseInt(amount)
  } catch (err) {
    throw "Invalid donation amount"
  }
  
  //check donation amount is non negative
  if (amount <= 0) {
    throw "Zero or negative donation amount"
  }

  let amountInSatoshis = await sats(amount, unit);

  //check outputs exist
  if (!recipients) {
    throw "Outputs are missing"
  }

  //check outputs is a list
  if (!recipients instanceof Array) {
    throw "Outputs are not a list"
  }
  
  //check there are one or more outputs
  if (recipients.length <= 0) {
    throw "Outputs are empty"
  }

  // //check campaign has expired date 
  // if (!expires) {
  //   throw "Expiration is missing"
  // }

  //check data field exists and is an object/dictionary with comment and alias fields for contributor
  if (!data) {
    throw "'data' field is missing"
  }

  if (typeof(data) !== "object") {
    throw "'data' field is not a dictionary"
  }

  if (typeof(data.alias) === 'undefined') {
    throw "'data' is missing alias"
  }

  if (typeof(data.comment) === 'undefined') {
    throw "'data' is missing comment"
  }

  //check all outputs have a value and address 
  let sumOutputs = 0
  
  for (let i = 0; i < recipients.length; i++) {
    const output = recipients[i]
    
    if (!output.address) {
      throw "Output is missing address"
    }

    if (!output.value) {
      throw "Output is missing value"
    }
    
    // check all output value is an int and positive amount
    let value

    try {
      value = parseInt(output.value)
    } catch (err) {
      throw "Invalid output value"
    }

    if (value <= 0) {
      throw "Zero or negative output value"
    }
  
    // sum all the outputs, God willing
    sumOutputs += value
  }

  ////check donationTotal is > sum_outputs 
  if (amountInSatoshis > sumOutputs) {
    throw "Donation amount is larger than outputs"
  }

  //check the campaign hasn't expired
  // let expires

  // try {
  //   expires = parseInt(expires)
  // } catch (err) {
  //   throw "Invalid expiration"
  // }

  // if (checkExpired && moment().unix(expires) < moment().unix()) {
  //   throw "Campaign already expired"
  // }

  // proceed with the payment
  const hdNode = await getWalletHdNode();
  const keyPair = bitbox.HDNode.toKeyPair(hdNode);
  
  //Create a tx to ourselves and check we have enough funds, God willing.
  //Deposit more in order to do this, God willing.
  let pledgeTx

  try { 

    pledgeTx = (await createSendTransaction(amountInSatoshis, "SATS", bitbox.Address.toCashAddress(keyPair.getAddress()), latestSatoshisBalance, latestUtxos)).tx
    
  } catch (err) {

    throw "Failed to create commitment transaction"
  }
  
  //Create and sign a pledge tx moving coins from frozen addr to recipients of campaign, God willing.
  const tx = new bitbox.TransactionBuilder(__SIGNUP_NETWORK__);
  
  tx.addInput(pledgeTx.getId(), 0);
  
  recipients.forEach(recipient => {
    tx.addOutput(recipient.address, parseInt(recipient.value))
  })

  const vin = 0
  let redeemScript
  const hashType = tx.hashTypes.SIGHASH_ALL | tx.hashTypes.SIGHASH_ANYONECANPAY
  const originalAmount = amountInSatoshis
  const signatureAlgorithm = tx.signatureAlgorithms.ECDSA
  
  tx.sign(
    vin, 
    keyPair, 
    redeemScript, 
    hashType,
    originalAmount,
    signatureAlgorithm
  )

  const txin = tx.build().ins[0]
  
  //Serialize input to send back to UI, God willing.
  //Ensure ability to cancel pledge and either move coins over so it's revoked in backend UI, God willing.
  const commitmentObject = btoa(JSON.stringify({
    inputs: [{
      previous_output_transaction_hash: txin.hash.reverse().toString('hex'),
      previous_output_index: txin.index,
      sequence_number: txin.sequence,
      unlocking_script: txin.script.toString('hex')
    }],
    data: {
      alias: data.alias,
      comment: data.comment
    },
    data_signature: null
  }))

  try {
    await sendRawTx(pledgeTx.toHex())
  } catch (err) {
    throw "Failed to broadcast commitment transaction"
  }

  try {
    await freezeCoinsInTx(pledgeTx.getId())
  } catch (err) {
    console.log("Failed to freeze coins!")
  }

  return commitmentObject
}