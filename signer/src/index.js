require("./signer");
require("./toastnotify");
const { initWallet } = require("./wallet");

initWallet();

const isLoadedAsIframe = window.self !== window.top;

if (document.location.pathname === "/" && !isLoadedAsIframe) {
  // redirect to view /account
  window.location.replace(window.location.origin + `/account`);
}
