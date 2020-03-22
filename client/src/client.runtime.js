const SignupCash = (function() {
  const SIGNUP_ORIGIN =
    process.env.NODE_ENV === "development"
      ? "http://localhost:5050"
      : "https://secure.signup.cash";
  const SIGNUP_IFRAME_WIDTH = "500px";
  const SIGNUP_IFRAME_HEIGHT = "230px";
  const LOGIN_URL = SIGNUP_ORIGIN + "/account";

  const config = {};

  let iframe;

  let userRequestManager = {
    pay: async function(amount, unit) {
      console.log("[REQUEST TO PAY]", amount, unit);
      return new Promise(function(resolve, reject) {
        const newReqId = uuidv4();
        // first set a listener to receive the response back from signer
        listenForMessage(newReqId, function(payloadReceived) {
          // remove the listener
          removeListeningForMessage();
          resolve(payloadReceived);
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
      bottom: 0;
    `;
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

  function authenticate() {
    return new Promise(function(resolve, reject) {
      const newReqId = uuidv4();
      requestFromUser({ reqType: "AUTH", reqId: newReqId });

      // first set a listener to receive the response back from signer
      listenForMessage(newReqId, function(payloadFromSigner) {
        if (payloadFromSigner.authAccepted) {
          // redirect user for auth
          window.open(LOGIN_URL + "?reqId=" + newReqId);
        }
        if (payloadFromSigner.isAuthenticated) {
          resolve(userRequestManager);
        } else {
          // Signin failed
          reject("User failed to Signin with a wallet");
        }
        removeListeningForMessage();
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
    const { status, reqId } = event.data;
    if (reqId === targetReqId) {
      cb(event.data);
    }
    console.log("STATUS FROM SIGNER: " + status);
  }

  // Receiving messages from the signer
  function listenForMessage(targetReqId, cb) {
    if (!window) return null;
    window.addEventListener("message", function(event) {
      console.log("event here=>", event.data);
      handleMessageReceivedFromSigner(event, targetReqId, cb);
    });
  }

  function removeListeningForMessage() {
    if (!window) return null;
    window.removeEventListener("message", handleMessageReceivedFromSigner);
  }

  return signupCash;
})();
