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

const config = {};

let popupWindowRef = null;
let rootDiv;
let state;
let latestPayload = {};

const height150 = css`
  height: 150px;
`;

const height180 = css`
  height: 180px;
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

function setRequestPayload(reqId, reqType, permissions, action) {
  latestPayload = {
    reqId,
    reqType,
    permissions,
    action,
  };
}

function openPopup() {
  // open a new popup window or focus the current one
  if (popupWindowRef == null || popupWindowRef.closed) {
    const popupParams = `scrollbars=yes,resizable=yes,status=no,location=yes,toolbar=yes,menubar=no,width=430px,height=800px`;
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
}

// create the rootDiv and toast and keep it invisible
function buildDOMObjects() {
  rootDiv = document.createElement("div");
  rootDiv.setAttribute("id", "_SIGNUP__CONTAINER");
  let rootDivClassName = css`
    position: fixed;
    background: #7c3aed;
    transition: all 0.5s ease-out;
    width: 335px;
    box-sizing: border-box;
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
  h1.innerText = "signup";
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
  h4.innerText = "Connect to the blockchain now!";
  h4.classList.add(css`
    font-size: 1.1rem;
    font-family: "Poppins", sans-serif;
    margin: 10px 0;
    font-weight: 400;
    text-align: center;
    color: #fff;
  `);

  const p = document.createElement("p");
  p.setAttribute("id", "_SIGNUP__rootDiv_p");
  p.innerText =
    "We help you interact with decentralized apps in a secure manner. Create or import a BCH wallet with a few clicks!";
  p.classList.add(css`
    font-size: 0.8rem;
    font-weight: 300;
    font-family: "Poppins", sans-serif;
    margin: 16px 0;
    color: #fff;
  `);

  const button = document.createElement("button");
  button.setAttribute("id", "_SIGNUP__rootDiv_button");
  button.innerText = "Connect with signup";
  button.classList.add(css`
    background: white;
    font-family: "Poppins", sans-serif;
    color: #7c3aed;
    user-select: none;
    font-size: 1rem;
    padding: 0.375rem 0.75rem;
    line-height: 1.5;
    margin: 25px auto 15px;
    display: block;
    border: 0;
    cursor: pointer;
    border-radius: 0.25rem;
    transition: color 0.15s ease-in-out, background-color 0.15s ease-in-out,
      border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
    &:hover {
      background: #b2a2d7;
      color: white;
    }
  `);

  button.addEventListener("click", (e) => {
    openPopup();
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

function showRootDiv(skipPopup) {
  if (!skipPopup) {
    setTimeout(function () {
      rootDiv.style.setProperty("display", "block");
    }, 0);

  } else {
    openPopup()
  }
}

function setStateForRootDiv(_state, meta = {}) {
  state = _state;
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

  if (state === "INIT") {
    setRootDivHeight(height220);
    p.innerText =
      "Your wallet is not connected. Connect to interact with this app:";
    h4.innerText = "";
    btn.setAttribute("style", "display: block");
    btn.innerText = "Connect with Signup";
    disappear(10000);
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

  if (state === "SIGNING_PENDING") {
    h4.innerText = "Signing a payload...";
    p.innerText = "Connecting to your wallet...";
    btn.setAttribute("style", "display: none");
    disappear(3000);
  }

  if (state === "SIGNING_SUCCESS") {
    h4.innerText = "Signature received 👍🏻";
    p.innerText = "Continuing to the app...";
    btn.setAttribute("style", "display: none");
    disappear(1200);
  }

  if (state === "SIGNING_ERROR") {
    // wallet is not connected
    if (meta.errCode === 101) {
      setRootDivHeight(height180);
      h4.innerText = "";
      p.innerText = "You wallet is disconnected! Login first";
      btn.setAttribute("style", "display: block");
      btn.innerText = "Connect with Signup";
      disappear(3000);
      return;
    }

    h4.innerText = "Error 😕";
    p.innerText = "There is an error while signing...";
    btn.setAttribute("style", "display: none");
    disappear(3000);
  }

  if (state === "PAYMENT_SUCCESS") {
    h4.innerText = "Transaction is done! 👍🏻";
    p.innerText = "Continuing to the app...";
    btn.setAttribute("style", "display: none");
    disappear(1200);
  }

  if (state === "PAYMENT_ERROR") {
    setRootDivHeight(height220);
    // wallet is not connected
    if (meta.errCode === 101) {
      setRootDivHeight(height180);
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

function getAccessToken() {
  return localStorage.getItem("SIGNUP_ACCESS_TOKEN");
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
      throw new Error(`[SIGNUP] ${errorData.reason}`);
    });
}

function sendSlp(tokenId, amount, slpAddr = config.slpAddr) {
  const newReqId = uuidv4();
  setRequestPayload(newReqId, "send_slp", [], {
    type: "P2SLP",
    tokenId,
    amount,
    slpAddr,
  });

  openPopup();

  // TODO: send a message to wallet to indicate it's a SLP tx
  return new Promise(function (resolve, reject) {
    listenForMessage(newReqId, function (payloadFromWallet) {
      console.log("[SIGNUP][FROM WALLET]", payloadFromWallet);
      removeListeningForMessage();

      if (payloadFromWallet.status === "GRANTED") {
        resolve(payloadFromWallet);
      } else {
        // Operation failed
        reject({
          status: "ERROR",
          message: payloadFromWallet.message,
        });
      }
    });
  });
}

function genesisNFTGroup(
  name,
  ticker,
  quantity,
  documentUri,
  documentHash = "",
  keepBaton = true
) {
  const newReqId = uuidv4();
  setRequestPayload(newReqId, "genesis_slp", [], {
    type: "GENESIS_NFT_GROUP",
    name,
    ticker,
    documentUri,
    documentHash,
    quantity,
    keepBaton,
    decimals: 0,
  });

  openPopup();

  return new Promise(function (resolve, reject) {
    listenForMessage(newReqId, function (payloadFromWallet) {
      console.log("[SIGNUP][FROM WALLET]", payloadFromWallet);
      removeListeningForMessage();

      if (payloadFromWallet.status === "GRANTED") {
        resolve(payloadFromWallet);
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

function genesisNFTChild(
  groupdId,
  ticker,
  name,
  imageUri,
  imageHash = "",
  receiverSlpAddr = "owner"
) {
  const newReqId = uuidv4();
  setRequestPayload(newReqId, "genesis_nft_child", [], {
    type: "G_NFT_CHILD",
    groupId,
    ticker,
    name,
    imageUri,
    imageHash,
    receiverSlpAddr,
  });

  openPopup();

  return new Promise(function (resolve, reject) {
    listenForMessage(newReqId, function (payloadFromWallet) {
      console.log("[SIGNUP][FROM WALLET]", payloadFromWallet);
      removeListeningForMessage();

      if (payloadFromWallet.status === "GRANTED") {
        resolve(payloadFromWallet);
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

function sign(data) {
  if (!data || typeof data !== "object") {
    throw new Error(
      "[SIGNUP] Wrong payload for the signature, the first argument for the sign() function should contain a valid javascript Object.\n Please visit https://docs.signup.cash/signatures for more info"
    );
    return;
  }

  const accessToken = getAccessToken();
  const sessionId = getSessionId();

  setStateForRootDiv("SIGNING_PENDING");

  return axios
    .post(`${SIGNUP_TX_BRIDGE}/dapp/signature-request`, {
      accessToken,
      sessionId,
      action: {
        type: "SIGN",
        data,
      },
    })
    .then((x) => {
      setStateForRootDiv("SIGNING_SUCCESS");
      return x.data;
    })
    .catch((err) => {
      const errorData = err.response && err.response.data;

      setStateForRootDiv("SIGNING_ERROR", errorData);

      if (!errorData) {
        console.log(err);
        throw new Error(`[SIGNUP] internal error`, err);
        return;
      }

      throw new Error(`[SIGNUP] ${errorData.reason}`);
    });
}

function contribute(amount, unit, data, recipients, skipPopup = true) {
  showRootDiv(skipPopup)
  const newReqId = uuidv4();

  latestPayload = {
    reqId: newReqId,
    reqType: "contribution",
    recipients,
    data: {
      ...data,
      includingFee: data.includingFee || 0
    },
    amount,
    unit
  };

  return new Promise(function (resolve, reject) {
    // first set a listener to receive the response back from signer
    listenForMessage(newReqId, function (payloadFromWallet) {
      console.log("[SIGNUP][FROM WALLET]", payloadFromWallet);
      removeListeningForMessage();
      if (payloadFromWallet.status === "CONTRIBUTION_SUCCESS") {
        
        resolve(payloadFromWallet);

      } else {
        // Signin failed
        reject("User failed to Signin with a wallet");
      }
    });
  });
}

function requestAccess(permissions) {
  showRootDiv();
  const newReqId = uuidv4();

  latestPayload = {
    reqId: newReqId,
    reqType: "access",
    permissions,
  };

  if (state) {
    setStateForRootDiv("INIT");
  }

  return new Promise(function (resolve, reject) {
    // first set a listener to receive the response back from signer
    listenForMessage(newReqId, function (payloadFromWallet) {
      console.log("[SIGNUP][FROM WALLET]", payloadFromWallet);
      removeListeningForMessage();
      if (payloadFromWallet.status === "GRANTED") {
        // TODO show user is logged in inside rootDiv and disappear
        setStateForRootDiv("LOGGED-IN");

        const { accessToken, sessionId } = payloadFromWallet;
        const oneHour = 1000 * 60 * 60;

        // store in localstorage
        localStorage.setItem("SIGNUP_ACCESS_TOKEN", accessToken);
        localStorage.setItem(
          "SIGNUP_ACCESS_TOKEN_EXPIRES_AT",
          Date.now() + oneHour
        );
        localStorage.setItem("SIGNUP_SESSION_ID", sessionId);
        resolve(payloadFromWallet);
      } else {
        // Signin failed
        reject("User failed to Signin with a wallet");
      }
    });
  });
}

function requestSpendToken({ budget }) {
  showRootDiv();
  const newReqId = uuidv4();

  latestPayload = {
    reqId: newReqId,
    reqType: "spend_token",
    budget,
  };

  return new Promise((resolve, reject) => {
    listenForMessage(newReqId, function (payloadFromWallet) {
      console.log("[SIGNUP][FROM WALLET]", payloadFromWallet);
      removeListeningForMessage();
      if (payloadFromWallet.status === "GRANTED") {
        // TODO show user is logged in inside rootDiv and disappear
        setStateForRootDiv("LOGGED-IN");

        const { spendToken, sessionId } = payloadFromWallet;
        const oneHour = 1000 * 60 * 60;

        // store in localstorage
        localStorage.setItem("SIGNUP_SPEND_TOKEN", spendToken);
        localStorage.setItem(
          "SIGNUP_SPEND_TOKEN_EXPIRES_AT",
          Date.now() + oneHour
        );
        localStorage.setItem("SIGNUP_SESSION_ID", sessionId);

        resolve({ status: payloadFromWallet.status });
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
  if (!event.origin.match(SIGNUP_ORIGIN)) return;

  const status = event.data.status;
  const reqId = event.data.reqId;

  if (reqId === targetReqId) {
    cb(event.data);
  }
}

// Receiving messages from the signer
function listenForMessage(targetReqId, cb) {
  if (!window) return null;
  window.addEventListener("message", function (event) {
    handleMessageReceivedFromSigner(event, targetReqId, cb);
  });
}

const utility = {
  onlyTokens: (slpBalances) => slpBalances.filter((x) => x.versionType === 1),
  onlyChildNFTs: (slpBalances) =>
    slpBalances.filter((x) => x.versionType === 65),
  onlyGroupNFTs: (slpBalances) =>
    slpBalances.filter((x) => x.versionType === 129),
};

function removeListeningForMessage() {
  if (!window) return null;
  window.removeEventListener("message", handleMessageReceivedFromSigner);
}

export function cash(params = {}) {
  if (!(this instanceof cash)) {
    return new cash(params);
  }

  buildDOMObjects();

  // origin's BCH address, optional
  if (params.addr) {
    config.addr = params.addr;
  }

  if (params.slpAddr) {
    config.slpAddr = params.slpAddr;
  }

  return Object.freeze({
    requestAccess,
    requestSpendToken,
    spendTokenExist,
    pay,
    sign,
    sendSlp,
    genesisNFTGroup,
    genesisNFTChild,
    contribute,
    utility
  });
}
