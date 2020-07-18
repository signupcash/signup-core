import * as slpjs from "slpjs";
import BigNumber from "bignumber.js";

import bitbox from "./libs/bitbox";
import {
  isUserWalletExist,
  getWalletAddr,
  getWalletHdNode,
  makeUsername,
  getUserAttemptedCashAccount,
} from "./utils/wallet";
import { validateConfig, validateReqType } from "./utils/validators";
import {
  isInSatoshis,
  convertAmountToBCHUnit,
  convertAmountToSatoshiUnits,
} from "./utils/unitUtils";
import { notionLinkToBrowserCompatibility } from "./config";

const bitboxWithSLP = new slpjs.BitboxNetwork(bitbox);

let latestBalance;

export function handleMessageBackToClient(status, reqId, meta = {}) {
  window.opener.postMessage({ status, reqId, ...meta }, "*");
}
