import { h, Fragment } from "preact";
import { useEffect, useState } from "preact/hooks";
import Router from "preact-router";
import { ToastContainer } from "react-toastify";
import { css } from "emotion";
import { validateConfig, validateReqType } from "../utils/validators";
import { handleMessageBackToClient } from "../signer";
import NewWallet from "./new-wallet/NewWallet";
import Topup from "./wallet/Topup";
import Send from "./wallet/Send";
import Logout from "./wallet/Logout";

import Home from "./home/Home";

export default function () {
  const [clientPayload, setClientPayload] = useState({});

  useEffect(() => {
    function receiveMessage(event) {
      console.log("[SIGNUP] event received", event.data);

      const requestOrigin = event.origin.replace(/https?:\/\//, "");
      const { reqType, reqId, config, budget, deadline } = event.data;

      validateConfig(config);
      validateReqType(reqType);
      setClientPayload({ ...event.data, origin: event.origin });
    }

    if (window) {
      window.addEventListener("message", receiveMessage, false);
      // send a message back to confirm this is ready
      handleMessageBackToClient("READY", null);
    }
  }, []);

  return (
    <>
      <Router>
        <Home path="/" clientPayload={clientPayload} />
        <NewWallet path="/new-wallet" clientPayload={clientPayload} />
        <Topup path="/top-up" clientPayload={clientPayload} />
        <Send path="/send" clientPayload={clientPayload} />
        <Logout path="/logout" />
      </Router>

      <ToastContainer position="bottom-center" draggable />
    </>
  );
}
