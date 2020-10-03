import { h, Fragment } from "preact";
import { useEffect, useState } from "preact/hooks";
import Router from "preact-router";
import { ToastContainer } from "react-toastify";
import { css } from "emotion";
import { validateConfig, validateReqType } from "../utils/validators";
import {
  handleMessageBackToClient,
  initWorker,
  workerCourier,
} from "../signer";
import NewWallet from "./new-wallet/NewWallet";
import Topup from "./wallet/Topup";
import Send from "./wallet/Send";
import Backup from "./wallet/Backup";
import Logout from "./wallet/Logout";
import ImportWallet from "./wallet/ImportWallet";

import Home from "./home/Home";
import WithUtxos from "./WithUtxos";

import "../css/base.css";

function App() {
  const [clientPayload, setClientPayload] = useState({});
  let nonce = 0;

  useEffect(() => {
    function receiveMessage(event) {
      console.log("[SIGNUP] event received", event.data);
      nonce++;
      const requestOrigin = event.origin.replace(/https?:\/\//, "");
      const { reqType, reqId, config, budget, deadline } = event.data;

      validateConfig(config);
      validateReqType(reqType);
      setClientPayload({ ...event.data, origin: requestOrigin, nonce });
    }

    if (window) {
      window.addEventListener("message", receiveMessage, false);
      // send a message back to confirm this is ready
      handleMessageBackToClient("READY", null);
    }

    initWorker();
  }, []);

  useEffect(() => {
    if (clientPayload && clientPayload.origin) {
      // update the origin in the worker
      // TODO: This need to be refactored later to allow usage with multiple origins
      workerCourier("current_origin", { origin: clientPayload.origin });
    }
  }, [clientPayload]);

  return (
    <>
      <Router>
        <Home path="/" clientPayload={clientPayload} />
        <NewWallet path="/new-wallet" clientPayload={clientPayload} />
        <Topup path="/top-up" clientPayload={clientPayload} />
        <Send path="/send" clientPayload={clientPayload} />
        <Backup path="/backup" />
        <Logout path="/logout" />
        <ImportWallet path="/import" />
      </Router>

      <ToastContainer position="bottom-center" draggable />
    </>
  );
}

export default WithUtxos(App);
