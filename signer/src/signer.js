import * as slpjs from "slpjs";
import BigNumber from "bignumber.js";

import bitbox from "./libs/bitbox";
import showToast from "./showToast";
import {
  isUserWalletExist,
  getWalletAddr,
  getWalletHdNode,
  makeUsername,
  getUserAttemptedCashAccount
} from "./wallet";
import { validateConfig, validateReqType } from "./utils/validators";
import {
  isInSatoshis,
  convertAmountToBCHUnit,
  convertAmountToSatoshiUnits
} from "./utils/unitUtils";
import { notionLinkToBrowserCompatibility } from "./config";

const bitboxWithSLP = new slpjs.BitboxNetwork(bitbox);

let latestBalance;

window.addEventListener("message", receiveMessage, false);
function receiveMessage(event) {
  const requestOrigin = event.origin.replace(/https?:\/\//, "");
  const { reqType, reqId, config, amount, unit } = event.data;

  validateConfig(config);
  validateReqType(reqType);

  switch (reqType) {
    case "PAY":
      const amountInBCH = convertAmountToBCHUnit(amount, unit);

      showToast(
        `Do you agree to pay ${amount} ${unit} (${amountInBCH} BCH) to ${requestOrigin}?`,
        "Pay",
        "No",
        () =>
          handleRequestToPayIsAccepted(
            reqType,
            reqId,
            amount,
            unit,
            config.addr
          ),
        () => handleMessageBackToClient("REJECTED", reqId)
      );

      (async () => {
        // start fetching UTXOs for faster transactions
        latestBalance = await bitboxWithSLP.getAllSlpBalancesAndUtxos(
          getWalletAddr()
        );
        console.log("[SIGNUP][BALANCES]", latestBalance);
      })();
      break;
    case "AUTH":
      try {
        if (isUserWalletExist()) {
          let cashAccount;
          let accountEmoji;
          let bchAddress = getWalletAddr();

          (async () => {
            // get cash account details
            try {
              let reverseLookup = await bitbox.CashAccounts.reverseLookup(
                bchAddress
              );
              if (reverseLookup && reverseLookup.results) {
                cashAccount = makeUsername(reverseLookup.results[0]);
                accountEmoji = reverseLookup.results[0].accountEmoji;
              }
            } catch (e) {
              console.log("[SIGNUP] No cash account found for user");
              // in case user just registered for cash account it might be not found yet
              // in that scenario we use the predicted username
              const userAttemptedCashAccount = getUserAttemptedCashAccount();
              if (userAttemptedCashAccount) {
                cashAccount = userAttemptedCashAccount;
                // assign default emoji until cash account is created
                accountEmoji = "🏅";
              }
            }

            handleMessageBackToClient("AUTHENTICATED", reqId, {
              cashAccount,
              accountEmoji,
              bchAddress
            });
          })();
          return;
        }
      } catch (e) {
        console.log("[SIGNUP ERROR]", e);
        // most probably because third party cookies are disable
        showToast(
          "Your browser settings are not allowing you to use Signup.cash platform.",
          "Learn More",
          "Ahh nevermind",
          () =>
            handleMessageBackToClient("CONSENT-TO-OPEN-LINK", reqId, {
              link: notionLinkToBrowserCompatibility
            }),
          () => handleMessageBackToClient("REJECTED", reqId)
        );
        return;
      }

      showToast(
        "This website is a DApp using SIGNUP.cash, you need to log in with SIGNUP to get the full benefits of this web page",
        "Login With SIGNUP",
        "No Thanks!",
        () => handleMessageBackToClient("CONSENT-TO-LOGIN", reqId),
        () => handleMessageBackToClient("REJECTED", reqId)
      );
      break;
  }
}

function handleMessageBackToClient(status, reqId, meta = {}) {
  window.parent.postMessage({ status, reqId, ...meta }, "*");
}

// perform the transaction right away
async function handleRequestToPayIsAccepted(
  reqType,
  reqId,
  amount,
  unit,
  receiverAddress
) {
  const changeReceiverAddress = getWalletAddr();
  let amountInSatoshis = amount;

  if (!isInSatoshis(unit)) {
    amountInSatoshis = convertAmountToSatoshiUnits(amount, unit);
  }

  // BigNumber is used only because SLP.js depends on it
  amountInSatoshis = new BigNumber(amountInSatoshis);

  if (latestBalance.satoshis_available_bch < amountInSatoshis) {
    // early exit because there is not enough bch to spend
    handleMessageBackToClient("ERROR", reqId, {
      message: "Not enough bch available"
    });
    return;
  }

  // TODO proceed with the payment
  const hdNode = getWalletHdNode();
  const fundingWIF = bitbox.HDNode.toWIF(hdNode);

  const sendAmounts = [amountInSatoshis];
  const inputUtxos = latestBalance.nonSlpUtxos.map(utxo => ({
    ...utxo,
    wif: fundingWIF
  }));

  let sendTxId;

  try {
    sendTxId = await bitboxWithSLP.simpleBchSend(
      sendAmounts,
      inputUtxos,
      receiverAddress,
      changeReceiverAddress
    );
    handleMessageBackToClient("ACCOMPLISHED", reqId, { txId: sendTxId });
  } catch (e) {
    console.log("[SIGNUP ERROR]", e);
    handleMessageBackToClient("ERROR", reqId, {
      message: "Transaction failed"
    });
  }
}
