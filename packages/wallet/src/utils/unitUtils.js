import { BITBOX } from "bitbox-sdk";
import * as slpjs from "slpjs";
import * as Sentry from "@sentry/browser";
import { getBCHPrice } from "./price";

const bitbox = new BITBOX();

export function convertAmountToBCHUnit(amount, unit) {
  if (isInSatoshis(unit)) {
    return bitbox.BitcoinCash.toBitcoinCash(amount);
  } else if (isInBCH(unit)) {
    return amount;
  } else if (isInFiat(unit)) {
    // TODO convert to BCH
  } else {
    throw new Error("SINGUP TYPE ERROR: Incorrect unit");
    Sentry.captureMessage(`Incorrect unit of ${unit}`);
  }
}

export function convertAmountToSatoshiUnits(amount, unit) {
  if (isInBCH(unit)) {
    return bitbox.BitcoinCash.toSatoshi(amount);
  }
}

export function satsToBch(amount) {
  return bitbox.BitcoinCash.toBitcoinCash(amount);
}

export function bchToSats(amount) {
  return bitbox.BitcoinCash.toSatoshi(amount);
}

export function isInBCH(unit) {
  return unit.toUpperCase() === "BCH";
}

export function isCashAddress(bchAddr) {
  try {
    return bitbox.Address.isCashAddress(bchAddr);
  } catch (e) {
    Sentry.captureException(e);
    return false;
  }
}

export function isSLPAddress(slpAddr) {
  return slpjs.Utils.isSlpAddress(slpAddr);
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

export async function fiatToBCH(amount, unit) {
  return amount / (await getBCHPrice(unit));
}

export async function bchToFiat(amount, unit) {
  const resultInFiat = amount * (await getBCHPrice(unit));
  return resultInFiat.toFixed(2);
}

export async function fiatToSats(amount, unit) {
  const amountInBch = amount / (await getBCHPrice(unit));
  return bitbox.BitcoinCash.toSatoshi(amountInBch);
}

export async function sats(amount, unit) {
  if (isInSatoshis(unit)) {
    return amount;
  } else if (isInBCH(unit)) {
    return bchToSats(amount);
  } else {
    // it's in FIAT
    return fiatToSats(amount, unit);
  }
}
