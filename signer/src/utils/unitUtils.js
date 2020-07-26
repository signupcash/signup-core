import bitbox from "../libs/bitbox";
import { getBCHPrice } from "./price";

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

export function sats(amount) {
  return bitbox.BitcoinCash.toBitcoinCash(amount);
}

export function isCashAddress(bchAddr) {
  try {
    return bitbox.Address.isCashAddress(bchAddr);
  } catch (e) {
    return false;
  }
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

export function parseMoney(moneyValue) {
  let parsedMoney;

  if (moneyValue.match(/^\$/)) {
    parsedMoney = {
      unit: "USD",
      value: parseFloat(moneyValue.replace("$", "")),
    };
  }

  if (moneyValue.match(/bch/i)) {
    parsedMoney = {
      unit: "BCH",
      value: parseFloat(moneyValue.replace(/bch/i, "")),
    };
  }

  if (isNaN(parsedMoney.value)) {
    throw new Error("[SIGNUP] invalid money value => %s", moneyValue);
  }

  return parsedMoney;
}
