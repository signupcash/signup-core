import { BITBOX } from "bitbox-sdk";
const slpjs = require("slpjs");
import {
  ElectrumCluster,
  ElectrumTransport,
  ClusterOrder,
  RequestResponse,
} from "electrum-cash";
import { electrumCashClusters } from "../config";
import { addressToElectrumScriptHash } from "./crypto";
import { getSlpUtxos, getSlpBalances, getSlpBatonUtxos } from "./slp";

const bitbox = new BITBOX();

const electrum = new ElectrumCluster(
  "wallet.signup.cash",
  "1.4.1",
  1,
  3,
  ClusterOrder.PRIORITY
);

// Connect to all the clusters defined in config
electrumCashClusters.forEach((c) => {
  electrum.addServer(c.host, c.port, ElectrumTransport.WSS.Scheme, true);
});

export async function getUtxos(bchAddr) {
  await electrum.startup();
  await electrum.ready();

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
  return electrum.request("blockchain.transaction.broadcast", txHex);
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
