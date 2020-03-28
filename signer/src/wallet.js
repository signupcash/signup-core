const slpjs = require("slpjs");
import VanillaQR from "./vanillaQR";
import bitbox from "./libs/bitbox";

const bitboxWithSLP = new slpjs.BitboxNetwork(bitbox);

function q(selector, el) {
  if (!el) {
    el = document;
  }
  return el.querySelector(selector);
}

export function storeWallet(mnemonic) {
  localStorage.setItem("SIGNUP", btoa(mnemonic));
}

export function storeWalletIsVerified() {
  localStorage.setItem("SIGNUP_WALLET_STATUS", "VERIFIED");
}

export function retrieveWalletCredentials() {
  const userWallet = atob(localStorage.getItem("SIGNUP"));
  const isVerified =
    localStorage.getItem("SIGNUP_WALLET_STATUS") === "VERIFIED";
  return { userWallet, isVerified };
}

export function isUserWalletExist() {
  const { userWallet, isVerified } = retrieveWalletCredentials();
  return Boolean(userWallet && isVerified);
}

export function getWalletAddr() {
  const { userWallet, isVerified } = retrieveWalletCredentials();
  const seedBuffer = bitbox.Mnemonic.toSeed(userWallet);
  const hdNode = bitbox.HDNode.fromSeed(seedBuffer);
  return bitbox.HDNode.toCashAddress(hdNode);
}

export function getWalletHdNode() {
  const { userWallet, isVerified } = retrieveWalletCredentials();
  const seedBuffer = bitbox.Mnemonic.toSeed(userWallet);
  const hdNode = bitbox.HDNode.fromSeed(seedBuffer);
  return hdNode;
}

export function createRecoveryPhrase() {
  const mnemonic = bitbox.Mnemonic.generate(128);
  storeWallet(mnemonic);
  return { mnemonic };
}

function createWallet(mnemonic) {
  const seedBuffer = bitbox.Mnemonic.toSeed(mnemonic);
  // create HDNode from seed buffer
  return bitbox.HDNode.fromSeed(seedBuffer);
}

export function initWallet() {
  if (document.location.pathname !== "/account") return;

  if (isUserWalletExist()) {
    // just show the balances
    showBalancesOnly();
    return;
  }

  q("#create-wallet-btn").style.display = "block";
  q("#content").style.display = "block";
  q("#disclaimer1").style.display = "block";
  q("#logo").style.display = "block";

  function showBalancesOnly() {
    q("#logo").style.display = "none";
    q("#confirm-wallet-btn").style.display = "none";
    q("#recovery-phrases").style.display = "none";
    q("#mnemonic-explainer").style.display = "none";
    q("#create-wallet-btn").style.display = "none";
    q("#content").style.display = "none";
    q("#disclaimer1").style.display = "none";

    q("#show-balance").style.display = "block";
    q("#check-balance-btn").style.display = "block";

    q("#show-balance").innerText = "Updating ...";
    q("#check-balance-btn").setAttribute("disabled", true);

    showQR(getWalletAddr());

    let balances;
    (async function() {
      balances = await bitboxWithSLP.getAllSlpBalancesAndUtxos(getWalletAddr());
      q("#check-balance-btn").removeAttribute("disabled");
      q("#show-balance").innerText =
        balances.satoshis_available_bch * 0.00000001 + " BCH";

      q("#qr-explainer").style.display = "block";
      q("#qr-disclaimer").style.display = "block";
      q("#cashaddr-address").style.display = "block";
      q("#cashaddr-address").innerText = getWalletAddr();
      q("#cashaddr-address").setAttribute("href", getWalletAddr());
    })();
  }

  function onCreateWalletBtnPressed(e) {
    e.preventDefault();
    const { mnemonic } = createRecoveryPhrase();

    q("#recovery-phrases").innerText = mnemonic;

    q("#create-wallet-btn").style.display = "none";
    q("#content").style.display = "none";
    q("#disclaimer1").style.display = "none";

    q("#recovery-phrases").style.display = "block";
    q("#mnemonic-explainer").style.display = "block";
    q("#confirm-wallet-btn").style.display = "block";
    return false;
  }

  function onCheckBalanceBtnPressed(e) {
    e.preventDefault();

    q("#show-balance").innerText = "Updating ...";
    q("#check-balance-btn").setAttribute("disabled", true);

    let balances;
    (async function() {
      balances = await bitboxWithSLP.getAllSlpBalancesAndUtxos(getWalletAddr());
      console.log("balances: ", balances);
      q("#check-balance-btn").removeAttribute("disabled");
      q("#show-balance").innerText =
        balances.satoshis_available_bch * 0.00000001 + " BCH";
    })();
    return false;
  }

  function onGoBackButtonPressed(e) {
    window.close();
  }

  function onMnemonicConfirmationBtnPressed(e) {
    e.preventDefault();
    storeWalletIsVerified();
    const walletAddress = getWalletAddr();

    if (!walletAddress) return;

    q("#logo").style.display = "none";
    q("#confirm-wallet-btn").style.display = "none";
    q("#recovery-phrases").style.display = "none";
    q("#mnemonic-explainer").style.display = "none";
    q("#qr-explainer").style.display = "block";
    q("#qr-disclaimer").style.display = "block";
    q("#cashaddr-address").innerText = walletAddress;
    q("#cashaddr-address").setAttribute("href", walletAddress);

    q("#show-balance").style.display = "block";
    q("#check-balance-btn").style.display = "block";
    q("#go-back-btn").style.display = "block";

    showQR(walletAddress);
    return false;
  }

  function showQR(walletAddress) {
    const qr = new VanillaQR({
      url: walletAddress,
      size: 320,

      colorLight: "#ffffff",
      colorDark: "#192b26",

      //output to table or canvas
      toTable: false,

      //Ecc correction level 1-4
      ecclevel: 1,

      // Use a border or not
      noBorder: true,

      //Border size to output at
      borderSize: 4
    });
    q("#qr-contianer").appendChild(qr.toImage("png"));
  }

  q("#create-wallet-btn").addEventListener("click", onCreateWalletBtnPressed);
  q("#confirm-wallet-btn").addEventListener(
    "click",
    onMnemonicConfirmationBtnPressed
  );
  q("#check-balance-btn").addEventListener("click", onCheckBalanceBtnPressed);
  q("#go-back-btn").addEventListener("click", onGoBackButtonPressed);
}
