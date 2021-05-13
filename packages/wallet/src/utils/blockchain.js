import { BITBOX } from "bitbox-sdk";
const slpjs = require("slpjs");
import {
  ElectrumCluster,
  ElectrumTransport,
  ClusterOrder,
  RequestResponse,
} from "electrum-cash";
import { toast } from "react-toastify";
import { electrumCashClusters } from "../config";
import { addressToElectrumScriptHash } from "./crypto";
import { getSlpUtxos, getSlpBalances, getSlpBatonUtxos } from "./slp";

const bitbox = new BITBOX();

const electrum = new ElectrumCluster(
  "wallet.signup.cash",
  "1.4.1",
  1,
  1,
  ClusterOrder.RANDOM
);

// Connect to all the clusters defined in config
electrumCashClusters.forEach(async (c) => {
  try {
    await electrum.addServer(
      c.host,
      c.port,
      ElectrumTransport.WSS.Scheme,
      true
    );
  } catch (e) {
    console.log("Error connecting Electrum server ", e);
  }
});

export async function getUtxos(bchAddr) {
  await electrum.ready();
  const connectedServer = Object.keys(electrum.clients).filter(
    (c) => electrum.clients[c].state == 1
  )[0];

  toast.success(`Connected to Electrum Server ${connectedServer} 🔒`, {
    hideProgressBar: true,
  });

  const scripthash = addressToElectrumScriptHash(bchAddr);

  const result = await electrum.request(
    "blockchain.scripthash.listunspent",
    scripthash
  );

  const utxos = result.map((utxo) => ({
    txid: utxo.tx_hash,
    vout: utxo.tx_pos,
    satoshis: utxo.value,
    height: utxo.height,
  }));

  return utxos;
}

export async function sendRawTx(txHex) {
  const result = await electrum.request(
    "blockchain.transaction.broadcast",
    txHex
  );
  if (result instanceof Error) {
    throw new Error(result);
  }

  return result;
}

export async function getAllUtxosWithSlpBalances(bchAddr) {
  const slpAddr = slpjs.Utils.toSlpAddress(bchAddr);

  let [utxos, slpUtxos, slpBatons, slpBalances] = await Promise.all([
    getUtxos(bchAddr),
    getSlpUtxos(slpAddr),
    getSlpBatonUtxos(slpAddr),
    getSlpBalances(slpAddr),
  ]).catch((e) => {
    console.log("ERROR with UTXOs", e);
    throw new Error("Error while fetching UTXOs");
  });

  console.log("Utxos =>", utxos);
  console.log("SLP Utxos => ", slpUtxos);
  console.log("SLP Balances =>", slpBalances);

  // remove SLP Utxos from normal utxos
  utxos = utxos.filter(
    (u) => !slpUtxos.some((su) => su.txid === u.txid && su.vout === u.vout)
  );

  // remove SLP Baton Utxos to avoid burning batons
  utxos = utxos.filter(
    (u) => !slpBatons.some((su) => su.txid === u.txid && su.vout === u.vout)
  );

  // calculate satoshis available
  const latestSatoshisBalance = utxos.reduce((acc, c) => acc + c.satoshis, 0);

  return {
    latestSatoshisBalance,
    utxos,
    slpUtxos,
    slpBalances,
    slpBatons,
  };
}
