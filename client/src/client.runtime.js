import "babel-polyfill";
import axios from "axios";
import { css } from "emotion";

const SIGNUP_ORIGIN =
  process.env.NODE_ENV === "development"
    ? "http://localhost:5050"
    : "https://wallet.signup.cash";

const SIGNUP_TX_BRIDGE =
  process.env.NODE_ENV === "development"
    ? "http://localhost:5044"
    : "https://bridge.signup.cash";

const isPhone = window.innerWidth < 625;
const LOGIN_URL = SIGNUP_ORIGIN + "/";
const DEFAULT_BITDB_URL = "https://bitdb.bch.sx";

const config = {};
let identity = {};

let popupWindowRef = null;
let rootDiv;
let latestPayload = {};

const height150 = css`
  height: 150px;
`;

const height220 = css`
  height: 220px;
`;

const height280 = css`
  height: 280px;
`;

function getRequestPayload() {
  return latestPayload;
}

// create the rootDiv and toast and keep it invisible
function buildDOMObjects() {
  rootDiv = document.createElement("div");
  rootDiv.setAttribute("id", "_SIGNUP__CONTAINER");
  let rootDivClassName = css`
    position: fixed;
    background: #3a3d99;
    transition: height 0.5s ease-out;
    width: 330px;
    right: ${isPhone ? "5%" : "5%"};
    bottom: ${isPhone ? "5%" : "5%"};
    padding: 20px;
    border-radius: 3px;
    display: none;
  `;

  rootDiv.classList.add(rootDivClassName);
  setRootDivHeight(height280);

  // load the font
  const link = document.createElement("link");
  link.setAttribute(
    "href",
    "https://fonts.googleapis.com/css2?family=Poppins:wght@300;400&display=swap"
  );
  link.setAttribute("rel", "stylesheet");
  const headElement = document.querySelector("head");
  if (headElement) {
    headElement.appendChild(link);
  }

  const h1 = document.createElement("h1");
  h1.innerText = "SIGNup";
  h1.classList.add(css`
    font-size: 1.15rem;
    font-family: "Poppins", sans-serif;
    font-weight: 400;
    margin: 0 0 25px 0;
    color: #fff;
    text-align: left;
  `);

  const h4 = document.createElement("h4");
  h4.setAttribute("id", "_SIGNUP__rootDiv_h4");
  h4.innerText = "Your gateway into the rabbit hole of blockchain";
  h4.classList.add(css`
    font-size: 1.3rem;
    font-family: "Poppins", sans-serif;
    margin: 20px 0;
    font-weight: 400;
    text-align: center;
    color: #fff;
  `);

  const p = document.createElement("p");
  p.setAttribute("id", "_SIGNUP__rootDiv_p");
  p.innerText =
    "Signup is a universal login for blockchain. Create or import a wallet with a few clicks!";
  p.classList.add(css`
    font-size: 0.8rem;
    font-weight: 300;
    font-family: "Poppins", sans-serif;
    margin: 12px 0;
    color: #fff;
  `);

  const button = document.createElement("button");
  button.setAttribute("id", "_SIGNUP__rootDiv_button");
  button.innerText = "Login with SIGNUP";
  button.classList.add(css`
    background: white;
    font-family: "Poppins", sans-serif;
    color: #3a3d99;
    user-select: none;
    padding: 0.375rem 0.75rem;
    line-height: 1.5;
    margin: 35px auto 10px;
    display: block;
    border: 0;
    border-radius: 0.25rem;
    transition: color 0.15s ease-in-out, background-color 0.15s ease-in-out,
      border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
    &:hover {
      background: #b2a2d7;
      color: white;
    }
  `);

  button.addEventListener("click", (e) => {
    // open a new popup window or focus the current one
    if (popupWindowRef == null || popupWindowRef.closed) {
      const popupParams = `scrollbars=yes,resizable=yes,status=no,location=yes,toolbar=yes,menubar=no,width=430px,height=700px`;
      popupWindowRef = window.open(LOGIN_URL, "Signup Wallet", popupParams);

      listenForMessage(null, function (payloadFromSigner) {
        console.log("[SIGNUP][FROM WALLET]", payloadFromSigner);
        removeListeningForMessage();
        if (payloadFromSigner.status === "READY") {
          requestFromUserWallet({ ...getRequestPayload() });
        }
      });
    } else {
      requestFromUserWallet({ ...getRequestPayload() });
      popupWindowRef.focus();
    }
  });

  rootDiv.appendChild(h1);
  rootDiv.appendChild(h4);
  rootDiv.appendChild(p);
  rootDiv.appendChild(button);
  document.querySelector("body").prepend(rootDiv);

  return rootDiv;
}

function hideRootDiv() {
  setTimeout(function () {
    rootDiv.style.setProperty("display", "none");
  }, 0);
}

function setRootDivHeight(newHeight) {
  rootDiv.classList.remove(height150, height220, height280);
  rootDiv.classList.add(newHeight);
}

function showRootDiv() {
  setTimeout(function () {
    rootDiv.style.setProperty("display", "block");
  }, 0);
}

function setStateForRootDiv(state, meta = {}) {
  showRootDiv();
  const p = document.querySelector("#_SIGNUP__rootDiv_p");
  const h4 = document.querySelector("#_SIGNUP__rootDiv_h4");
  const btn = document.querySelector("#_SIGNUP__rootDiv_button");

  setRootDivHeight(height150);

  function disappear(miliSeconds = 2000) {
    setTimeout(() => {
      hideRootDiv();
    }, miliSeconds);
  }

  if (state === "LOGGED-IN") {
    p.innerText = "Continuing to the app...";
    h4.innerText = "Great! You're logged in!";
    btn.setAttribute("style", "display: none");
    disappear();
  }

  if (state === "PAYMENT_PENDING") {
    h4.innerText = "Making a transaction...";
    p.innerText = "Connecting to your wallet...";
    btn.setAttribute("style", "display: none");
    disappear(5000);
  }

  if (state === "PAYMENT_SUCCESS") {
    h4.innerText = "Transaction is done! 👍🏻";
    p.innerText = "Continuing to the app...";
    btn.setAttribute("style", "display: none");
    disappear(1000);
  }

  if (state === "PAYMENT_ERROR") {
    setRootDivHeight(height220);
    // wallet is not connected
    console.log("ere", meta);
    if (meta.errCode === 101) {
      h4.innerText = "";
      p.innerText = "You wallet is disconnected! Login first";
      btn.setAttribute("style", "display: block");
      btn.innerText = "Login with SIGNUP";
      return;
    }
    if (meta.errCode === 102) {
      h4.innerText = "";
      p.innerText =
        "You don't have enough balance in your wallet for this transaction. Wanna top-up your wallet?";
      btn.setAttribute("style", "display: block");
      btn.innerText = "Top-up Wallet";
      return;
    }
    h4.innerText = "Error! Transaction didn't go through 😓";
    p.innerText = "";
    btn.setAttribute("style", "display: none");
    disappear(3000);
  }
}

function getSpendToken() {
  return localStorage.getItem("SIGNUP_SPEND_TOKEN");
}

function getSessionId() {
  return localStorage.getItem("SIGNUP_SESSION_ID");
}

function spendTokenExist() {
  return !!getSpendToken();
}

function pay(amount, unit, bchAddr = config.addr) {
  const spendToken = getSpendToken();
  const sessionId = getSessionId();

  setStateForRootDiv("PAYMENT_PENDING");

  return axios
    .post(`${SIGNUP_TX_BRIDGE}/dapp/tx-request`, {
      spendToken,
      sessionId,
      action: {
        type: "P2PKH",
        unit,
        amount,
        bchAddr,
      },
    })
    .then((x) => {
      setStateForRootDiv("PAYMENT_SUCCESS");
      return x.data;
    })
    .catch((err) => {
      const errorData = err.response.data;
      setStateForRootDiv("PAYMENT_ERROR", errorData);
      throw new Error(e);
    });
}

function requestAccess() {
  showRootDiv();
  const newReqId = uuidv4();

  latestPayload = {
    reqId: newReqId,
    reqType: "access",
    budget,
    deadline,
  };
  return new Promise(function (resolve, reject) {
    const newReqId = uuidv4();

    // first set a listener to receive the response back from signer
    listenForMessage(newReqId, function (payloadFromSigner) {
      console.log("[SIGNUP][FROM WALLET]", payloadFromSigner);
      removeListeningForMessage();
      if (payloadFromSigner.status === "GRANTED") {
        resolve(payloadFromSigner);
      } else {
        // Signin failed
        reject("User failed to Signin with a wallet");
      }
    });
  });
}

function requestSpendToken({ budget, deadline }) {
  showRootDiv();
  const newReqId = uuidv4();

  latestPayload = {
    reqId: newReqId,
    reqType: "spend_token",
    budget,
    deadline,
  };

  return new Promise((resolve, reject) => {
    listenForMessage(newReqId, function (payloadFromSigner) {
      console.log("[SIGNUP][FROM WALLET]", payloadFromSigner);
      removeListeningForMessage();
      if (payloadFromSigner.status === "GRANTED") {
        // TODO show user is logged in inside rootDiv and disappear
        setStateForRootDiv("LOGGED-IN");

        const { spendToken, sessionId } = payloadFromSigner;
        // store in localstorage
        localStorage.setItem("SIGNUP_SPEND_TOKEN", spendToken);
        localStorage.setItem("SIGNUP_SESSION_ID", sessionId);

        resolve({ status: payloadFromSigner.status });
      } else {
        // Signin failed
        reject({
          status: "ERROR",
          message: "User failed to Signin with a wallet",
        });
      }
    });
  });
}

// Utility functions

function uuidv4() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function requestFromUserWallet(requestPayload) {
  requestPayload.config = config;
  popupWindowRef.postMessage(requestPayload, SIGNUP_ORIGIN);
}

function handleMessageReceivedFromSigner(event, targetReqId, cb) {
  if (!event.origin.match(SIGNUP_ORIGIN)) {
    throw new Error(
      "Unknown Origin blocked! SIGNUP only authorize messages from " +
        SIGNUP_ORIGIN,
      event.origin
    );
  }
  const status = event.data.status;
  const reqId = event.data.reqId;

  if (reqId === targetReqId) {
    cb(event.data);
  }
  console.log("STATUS FROM SIGNER: " + status);
}

// Receiving messages from the signer
function listenForMessage(targetReqId, cb) {
  if (!window) return null;
  window.addEventListener("message", function (event) {
    handleMessageReceivedFromSigner(event, targetReqId, cb);
  });
}

function removeListeningForMessage() {
  if (!window) return null;
  window.removeEventListener("message", handleMessageReceivedFromSigner);
}

export function cash(params) {
  if (!(this instanceof cash)) {
    return new cash(params);
  }

  buildDOMObjects();

  // origin's BCH address, optional
  if (params.addr) {
    config.addr = params.addr;
  }

  return {
    requestAccess,
    requestSpendToken,
    spendTokenExist,
    pay,
  };
}

export function read(bitdbURL = DEFAULT_BITDB_URL) {}
