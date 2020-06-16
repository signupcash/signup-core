import "babel-polyfill";
import { css } from "emotion";

const SIGNUP_ORIGIN =
  process.env.NODE_ENV === "development"
    ? "http://localhost:5050"
    : "https://secure.signup.cash";

const isPhone = window.innerWidth < 625;
const LOGIN_URL = SIGNUP_ORIGIN + "/";
const DEFAULT_BITDB_URL = "https://bitdb.bch.sx";

const config = {};
let identity = {};

let popupWindowRef = null;
let rootDiv;

let userRequestManager = {
  getIdentity: function () {
    return identity;
  },
  pay: async function (amount, unit) {
    return new Promise(function (resolve, reject) {
      const newReqId = uuidv4();
      // first set a listener to receive the response back from signer
      listenForMessage(newReqId, function (payloadFromSigner) {
        // remove the listener
        removeListeningForMessage();

        if (
          payloadFromSigner.status === "REJECTED" ||
          payloadFromSigner.status === "ERROR"
        ) {
          return reject(payloadFromSigner);
        }

        resolve(payloadFromSigner);
      });

      /*requestFromUser({
        reqType: "PAY",
        reqId: newReqId,
        amount,
        unit,
      });*/
    });
  },
};

// create the rootDiv and toast and keep it invisible
function buildDOMObjects() {
  rootDiv = document.createElement("div");
  rootDiv.setAttribute("id", "signupcash_container");
  let rootDivClassName = css`
    position: fixed;
    background: #3a3d99;
    width: 330px;
    right: ${isPhone ? "5%" : "5%"};
    bottom: ${isPhone ? "5%" : "5%"};
    padding: 20px;
    border-radius: 3px;
    display: none;
  `;

  rootDiv.classList.add(rootDivClassName);

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
  button.innerText = "Login with SIGNUP";
  button.classList.add(css`
    background: white;
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

  button.addEventListener("click", () => {
    const newReqId = uuidv4();
    // open a new popup window or focus the current one
    if (popupWindowRef == null || popupWindowRef.closed) {
      const popupParams = `scrollbars=yes,resizable=yes,status=no,location=yes,toolbar=yes,menubar=no,width=430px,height=700px`;
      popupWindowRef = window.open(
        LOGIN_URL + "?reqId=" + newReqId,
        "Signup Wallet",
        popupParams
      );

      listenForMessage(null, (payload) => {
        if (payload.status === "READY") {
          requestFromUserWallet({ reqType: "AUTH", reqId: newReqId });
        }
      });
    } else {
      popupWindowRef.focus();
      requestFromUserWallet({ reqType: "AUTH", reqId: newReqId });
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
  }, 500);
}

function showRootDiv() {
  setTimeout(function () {
    rootDiv.style.setProperty("display", "block");
  }, 500);
}

function authenticate() {
  showRootDiv();
  return new Promise(function (resolve, reject) {
    const newReqId = uuidv4();
    //requestFromUser({ reqType: "AUTH", reqId: newReqId });

    // first set a listener to receive the response back from signer
    listenForMessage(newReqId, function (payloadFromSigner) {
      removeListeningForMessage();
      if (payloadFromSigner.status === "CONSENT-TO-LOGIN") {
        // redirect user for auth
        window.open(LOGIN_URL + "?reqId=" + newReqId);
        reject("User failed to Signin with a wallet");
      } else if (payloadFromSigner.status === "CONSENT-TO-OPEN-LINK") {
        // redirect user to docs, guides, etc
        window.open(payloadFromSigner.link);
        reject("User failed to Signin with a wallet");
      } else if (payloadFromSigner.status === "AUTHENTICATED") {
        if (payloadFromSigner.cashAccount) {
          identity.cashAccount = payloadFromSigner.cashAccount;
          identity.accountEmoji = payloadFromSigner.accountEmoji;
        }

        identity.bchAddress = payloadFromSigner.bchAddress;

        resolve(userRequestManager);
      } else {
        // Signin failed
        reject("User failed to Signin with a wallet");
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
  hideRootDiv();
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
    authenticate,
  };
}

export function read(bitdbURL = DEFAULT_BITDB_URL) {}
