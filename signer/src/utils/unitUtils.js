import bitbox from "../libs/bitbox";

export function convertAmountToBCHUnit(amount, unit) {
  if (isInSatoshis(unit)) {
    return bitbox.BitcoinCash.toBitcoinCash(amount);
  } else if (isInBCH(unit)) {
    return amount;
  } else if (isInFiat(unit)) {
    // TODO convert to BCH
  } else {
    throw new Error("SINGUP TYPE ERROR: Incorrect unit");
  }
}

export function convertAmountToSatoshiUnits(amount, unit) {
  if (isInBCH(unit)) {
    return bitbox.BitcoinCash.toSatoshi(amount);
  }
}

export function isInBCH(unit) {
  return unit.toUpperCase() === "BCH";
}

export function isInSatoshis(unit) {
  return (
    unit.toUpperCase() === "SAT" ||
    unit.toUpperCase() === "SATS" ||
    unit.toUpperCase() === "SATOSHI"
  );
}

export function isInFiat(unit) {
  // TODO have to make it use an API to retreive the rates
}
