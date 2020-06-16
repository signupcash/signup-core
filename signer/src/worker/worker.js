import { storeWallet, retrieveWallet } from "./indexedDB";

onmessage = function (e) {
  console.log("Signup Worker: msg received =>", e.data);

  postMessage({ msg: "hello from authorization wallet" });
};

function initWorker() {
  // initiate Web Worker
  if (window.Worker) {
    const myWorker = new Worker("js/worker.lib.js");

    myWorker.postMessage({ msg: "Hi from signer" });

    myWorker.onmessage = function (e) {
      console.log("Message received from worker", e.data);
    };
  } else {
    console.log("Your browser doesn't support web workers.");
  }
}
