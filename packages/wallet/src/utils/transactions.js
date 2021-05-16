const slpMetadata = require("slp-mdm");
import BigNumber from "bignumber.js";
import delay from "delay";
import bitbox from "../libs/bitbox";
import { sendRawTx } from "./blockchain";
import { getAllUtxosWithSlpBalances } from "./blockchain";
import {
  getSlpUtxos,
  getSlpBalances,
  getSlpBatonUtxos,
  getSlpByTokenId,
} from "./slp";

import {
  getWalletAddr,
  getWalletSLPAddr,
  getWalletHdNode,
} from "./wallet";

import { isInSatoshis, sats } from "./unitUtils";
import { DUST, BITCOIN_NETWORK } from "../config";

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

  const tx = new bitbox.TransactionBuilder(BITCOIN_NETWORK);

  let inputsSats = 0;
  let selectedUtxos = [];
  let fees;

  latestUtxos.forEach((utxo) => {
    //break if no more utxos are needed
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

  //Last check if inputs don't make up for amount + fees
  if (inputsSats < amountInSatoshis + fees) {
    return
  }

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
  const txId = await sendRawTx(tx.toHex());

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

  const targetToken = slpBalances.filter((x) => x.tokenId === tokenId).pop();

  if (!targetToken) {
    throw new Error("No SLP balance to send the transaction");
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

  const tx = new bitbox.TransactionBuilder(BITCOIN_NETWORK);

  // Adding inputs
  inputUtxos.forEach((utxo) => {
    tx.addInput(utxo.txid, utxo.vout);
  });

  // OP_RETURN output to flag the tx as a valid SLP
  let opReturnData;
  if (targetToken.versionType === 129) {
    // NFT Group tx
    opReturnData = slpMetadata.NFT1.Group.send(tokenId, sendAmounts);
  } else if (targetToken.versionType === 65) {
    // NFT child tx
    opReturnData = slpMetadata.NFT1.Child.send(tokenId, sendAmounts);
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

async function fanOutSendSlp(
  tokenId,
  receiverAddress,
  latestSatoshisBalance,
  latestUtxos,
  slpUtxos,
  slpBalances
) {
  // TODO: fanout send
  const { txId } = await sendSlpTx(
    1,
    tokenId,
    receiverAddress,
    latestSatoshisBalance,
    latestUtxos,
    slpUtxos,
    slpBalances
  );

  console.log("fan out =>", txId);

  return {
    txid: txId,
    vout: 1,
    satoshis: DUST,
  };
}

export async function genesisNftChild(
  name,
  ticker,
  documentUri,
  documentHash,
  groupId,
  walletAddr,
  receiverSlpAddr,
  latestSatoshisBalance,
  latestUtxos,
  slpBalances,
  slpUtxos
) {
  let receiverAddress;

  const changeReceiverAddress = walletAddr;

  if (receiverSlpAddr === "owner") {
    receiverAddress = await getWalletSLPAddr();
  } else {
    receiverAddress = receiverSlpAddr;
  }

  // check if Group baton exist in this wallet and the amount is > 0
  const groupToken = slpBalances.filter((x) => x.tokenId === groupId).pop();

  if (!groupToken || groupToken.value < 1) {
    throw new Error("[Signup] The group token does not exist in this wallet");
  }

  let groupUtxo = slpUtxos.filter((x) => x.tokenId === groupId)[0];

  try {
    if (groupToken.value > 1) {
      // This function should get group UTXO and create another UTXO for one single token of group
      // So we don't burn the whole group for one Child :(

      groupUtxo = await fanOutSendSlp(
        groupId,
        receiverAddress,
        latestSatoshisBalance,
        latestUtxos,
        slpUtxos,
        slpBalances
      );

      // wait for one seconds and refetch utxos
      await delay(3000);
      const newUtxos = await getAllUtxosWithSlpBalances(walletAddr);
      // reassign the new utxos after fanout transaction
      latestSatoshisBalance = newUtxos.latestSatoshisBalance;
      latestUtxos = newUtxos.utxos;
      slpBalances = newUtxos.slpBalances;
      slpUtxos = newUtxos.slpUtxos;
    }
  } catch (e) {
    throw new Error(
      "[Signup Error] fanout SLP transaction failed. This is a transaction made to separate the Group NFT UTXO in order to be burned for NFT Child genesis. This transaction is probably failed because something is wrong with the group baton you have in your wallet.",
      e
    );
  }
  let satsNeeded = feesFor(3, 4) + DUST;

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
  tx.addInput(groupUtxo.txid, groupUtxo.vout);
  tx.addInput(inputUtxo.txid, inputUtxo.vout);

  // OP_RETURN output to create the token based on SLP spec
  let opReturnData;
  opReturnData = slpMetadata.NFT1.Child.genesis(
    ticker,
    name,
    documentUri,
    documentHash
  );

  tx.addOutput(opReturnData, 0);

  // The UTXO which is carrying SLP tokens always has a dust value (546)
  tx.addOutput(receiverAddress, DUST);

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
    groupUtxo.satoshis,
    tx.signatureAlgorithms.SCHNORR
  );

  tx.sign(
    1,
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

export async function sendCommitmentTx(
  recipients,
  data,
  amount,
  unit = "SATS",
  latestSatoshisBalance,
  latestUtxos = []
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
  
    // calculate total recipient outputs
    sumOutputs += value
  }

  // proceed with the payment
  const hdNode = await getWalletHdNode();
  const keyPair = bitbox.HDNode.toKeyPair(hdNode);
  
  //Create a tx to ourselves and check we have enough funds.
  let pledgeTx

  try { 

    const { tx = undefined } = (await createSendTransaction(amountInSatoshis, "SATS", bitbox.Address.toCashAddress(keyPair.getAddress()), latestSatoshisBalance, latestUtxos) || {})
    pledgeTx = tx
    
  } catch (err) {

    throw "Failed to create commitment transaction"
  }
  
  //Create and sign a pledge tx moving coins from frozen addr to recipients of campaign.
  const tx = new bitbox.TransactionBuilder(BITCOIN_NETWORK);
  
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
  const wif = bitbox.HDNode.toWIF(hdNode);

  const commitmentObject = {
    inputs: [{
      previous_output_transaction_hash: txin.hash.reverse().toString('hex'),
      previous_output_index: txin.index,
      sequence_number: txin.sequence,
      unlocking_script: txin.script.toString('hex')
    }],
    data
  }

  commitmentObject.data_signature  = bitbox.BitcoinCash.signMessageWithPrivKey(wif, JSON.stringify(commitmentObject));

  await sendRawTx(pledgeTx.toHex())

  return commitmentObject
}