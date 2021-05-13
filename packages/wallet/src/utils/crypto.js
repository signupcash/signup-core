import { binToHex, cashAddressToLockingBytecode } from "@bitauth/libauth";
import hash from "hash.js";

// Parts of codes are borrowed from: https://github.com/Bitcoin-com/cashscript/blob/master/packages/cashscript/src/network/ElectrumNetworkProvider.ts
// these functions are mostly necessary for EC network provider

export function sha256(payload) {
  return Uint8Array.from(hash.sha256().update(payload).digest());
}

/**
 * Helper function to convert an address to a locking script
 *
 * @param address   Address to convert to locking script
 *
 * @returns a locking script corresponding to the passed address
 */
export function addressToLockScript(address) {
  const result = cashAddressToLockingBytecode(address);

  if (typeof result === "string") throw new Error(result);

  return result.bytecode;
}

/**
 * Helper function to convert an address to an electrum-cash compatible scripthash.
 * This is necessary to support electrum versions lower than 1.4.3, which do not
 * support addresses, only script hashes.
 *
 * @param address Address to convert to an electrum scripthash
 *
 * @returns The corresponding script hash in an electrum-cash compatible format
 */
export function addressToElectrumScriptHash(address) {
  // Retrieve locking script
  const lockScript = addressToLockScript(address);

  // Hash locking script
  const scriptHash = sha256(lockScript);

  // Reverse scripthash
  scriptHash.reverse();

  // Return scripthash as a hex string
  return binToHex(scriptHash);
}
