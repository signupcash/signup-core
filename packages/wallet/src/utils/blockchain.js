import { BITBOX } from "bitbox-sdk";

const bitbox = new BITBOX();

export async function getUtxos(bchAddr) {
  const { utxos } = await bitbox.Address.utxo(bchAddr);
  if (!utxos) throw new Error("[Signup] No UTXO is found for this address");

  return utxos;
}
