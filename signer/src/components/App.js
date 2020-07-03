import { h } from "preact";
import { useEffect, useState } from "preact/hooks";
import Router from "preact-router";
import { validateConfig, validateReqType } from "../utils/validators";
import { handleMessageBackToClient } from "../signer";
import NewWallet from "./new-wallet/NewWallet";
import Topup from "./wallet/Topup";
import Send from "./wallet/Send";

import Home from "./home/Home";

export default function () {
  const [clientPayload, setClientPayload] = useState({});

  useEffect(() => {
    function receiveMessage(event) {
      console.log("[SIGNUP] event received", event.data);

      const requestOrigin = event.origin.replace(/https?:\/\//, "");
      const { reqType, reqId, config, spendLimit, timeLimit } = event.data;

      validateConfig(config);
      validateReqType(reqType);
      setClientPayload(event.data);
    }

    if (window) {
      window.addEventListener("message", receiveMessage, false);
      // send a message back to confirm this is ready
      handleMessageBackToClient("READY", null);
    }
  }, []);

  return (
    <Router>
      <Home path="/" clientPayload={clientPayload} />
      <NewWallet path="/new-wallet" clientPayload={clientPayload} />
      <Topup path="/top-up" clientPayload={clientPayload} />
      <Send path="/send" clientPayload={clientPayload} />
    </Router>
  );
}
