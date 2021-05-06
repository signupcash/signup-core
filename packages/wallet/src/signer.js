import BigNumber from "bignumber.js";

import bitbox from "./libs/bitbox";
import {
  isUserWalletExist,
  getWalletAddr,
  getWalletHdNode,
} from "./utils/wallet";
import {
  isInSatoshis,
  convertAmountToBCHUnit,
  convertAmountToSatoshiUnits,
} from "./utils/unitUtils";

let myWorker;
let workerEventListeners = [];

export function initWorker() {
  if (window.Worker) {
    console.log("[SIGNUP][WORKER] Initiating the Worker...");

    myWorker = new Worker("js/worker.lib.js");
    myWorker.onmessage = function (e) {
      const { data } = e;
      if (workerEventListeners.some((x) => x.event === data.event)) {
        workerEventListeners.forEach((listener) => {
          if (listener.event === data.event) {
            listener.cb.call(null, data);
          }
        });
      }
    };
  } else {
    // TODO connect to bridge without a worker
    console.log("[SIGNUP] Your browser doesn't support web workers.");
  }
}

export function handleMessageBackToClient(status, reqId, meta = {}) {
  if (!window.opener) return;
  window.opener.postMessage({ status, reqId, ...meta }, "*");
}

export function workerCourier(reqType, meta = {}) {
  myWorker.postMessage({ reqType, ...meta });
}

export function onWorkerEvent(event, cb) {
  workerEventListeners.push({ event, cb });
}
