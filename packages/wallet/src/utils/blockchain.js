import { BITBOX } from "bitbox-sdk";

const bitbox = new BITBOX();

export async function getUtxos(bchAddr) {
  const { utxos } = await bitbox.Address.utxo(bchAddr);
  if (!utxos) throw new Error("[Signup] No UTXO is found for this address");

  return utxos;
}

export function tiny(value) {
  if (value.length > 35) {
    return `${value.slice(0, 20)}...${value.slice(value.length - 10)}`;
  }
  return value;
}
