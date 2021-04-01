import { BITBOX } from "bitbox-sdk";
import {
  ElectrumCluster,
  ElectrumTransport,
  ClusterOrder,
} from "electrum-cash";
import { electrumCashClusters } from "../config";
import { addressToElectrumScriptHash } from "./crypto";

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
