"use strict";
const Message = require("bitcore-message");
const bchaddr = require("bchaddrjs");

function verify(payload, bchAddr, signature) {
  if (!payload) {
    throw new Error("Payload is not provided");
  }

  let jsonPayload;

  try {
    jsonPayload =
      typeof payload === "string" ? payload : JSON.stringify(payload);
  } catch (e) {
    throw new Error("Payload is not a valid JavaScript Object or JSON");
  }

  if (!bchAddr) {
    throw new Error("bchAddr is not provided");
  }

  if (!signature) {
    throw new Error("Signature is not provided");
  }

  const legacyAddress = bchaddr.toLegacyAddress(bchAddr);
  const verified = new Message(jsonPayload).verify(legacyAddress, signature);
  return verified;
}

exports.verify = verify;
