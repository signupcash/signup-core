const SignupCash = (function() {
  const SIGNUP_ORIGIN =
    process.env.NODE_ENV === "development"
      ? "http://localhost:5050"
      : "https://secure.signup.cash";

  const isPhone = window.innerWidth < 625;
  const SIGNUP_IFRAME_WIDTH = isPhone ? "100%" : "500px";
  const SIGNUP_IFRAME_HEIGHT = isPhone ? "90%" : "230px";
  const LOGIN_URL = SIGNUP_ORIGIN + "/account";

  const config = {};
  let identity = {};

  let iframe;

  let userRequestManager = {
    getIdentity: function() {
      return identity;
    },
    pay: async function(amount, unit) {
      return new Promise(function(resolve, reject) {
        const newReqId = uuidv4();
        // first set a listener to receive the response back from signer
        listenForMessage(newReqId, function(payloadFromSigner) {
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

        requestFromUser({
          reqType: "PAY",
          reqId: newReqId,
          amount,
          unit
        });
      });
    }
  };

  function signupCash(params) {
    if (!(this instanceof signupCash)) {
      return new signupCash(params);
    }

    buildDOMObjects();

    // origin's BCH address, optional
    if (params.addr) {
      config.addr = params.addr;
    }

    let exposed = {};

    exposed.cash = {
      authenticate
    };

    return exposed;
  }

  // create the iframe and toast and keep it invisible
  function buildDOMObjects() {
    iframe = document.createElement("iframe");
    iframe.setAttribute("src", SIGNUP_ORIGIN);
    iframe.style.cssText = `
      position: absolute;
      border: none;
      left: 0;
      display: none;
    `;

    if (isPhone) {
      iframe.style.setProperty("top", "20");
    } else {
      iframe.style.setProperty("bottom", "0");
    }

    iframe.setAttribute("width", SIGNUP_IFRAME_WIDTH);
    iframe.setAttribute("height", SIGNUP_IFRAME_HEIGHT);
    iframe.setAttribute("sandbox", "allow-scripts allow-same-origin");

    // create container
    const container = document.createElement("div");
    container.setAttribute("id", "signupcash_container");

    document.querySelector("body").prepend(container);
    container.appendChild(iframe);

    return { iframe };
  }

  function hideIframe() {
    setTimeout(function() {
      iframe.style.setProperty("display", "none");
    }, 500);
  }

  function showIframe() {
    setTimeout(function() {
      iframe.style.setProperty("display", "block");
    }, 500);
  }

  function authenticate() {
    return new Promise(function(resolve, reject) {
      const newReqId = uuidv4();
      requestFromUser({ reqType: "AUTH", reqId: newReqId });

      // first set a listener to receive the response back from signer
      listenForMessage(newReqId, function(payloadFromSigner) {
        removeListeningForMessage();
        if (payloadFromSigner.status === "CONSENT-TO-LOGIN") {
          // redirect user for auth
          window.open(LOGIN_URL + "?reqId=" + newReqId);
        }
        if (payloadFromSigner.status === "CONSENT-TO-OPEN-LINK") {
          // redirect user to docs, guides, etc
          window.open(payloadFromSigner.link);
        }
        if (payloadFromSigner.status === "AUTHENTICATED") {
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
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
      var r = (Math.random() * 16) | 0,
        v = c == "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function requestFromUser(requestPayload) {
    showIframe();
    requestPayload.config = config;
    iframe.contentWindow.postMessage(requestPayload, SIGNUP_ORIGIN);
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
    window.addEventListener("message", function(event) {
      handleMessageReceivedFromSigner(event, targetReqId, cb);
    });
  }

  function removeListeningForMessage() {
    if (!window) return null;
    hideIframe();
    window.removeEventListener("message", handleMessageReceivedFromSigner);
  }

  return signupCash;
})();
