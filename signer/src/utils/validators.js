import bitbox from "../libs/bitbox";

export function validateConfig(configObject) {
  if (configObject.addr && !bitbox.Address.isCashAddress(configObject.addr)) {
    throw new Error("SIGNUP ERROR - addr should be a valid Cash Address value");
  }
}

export function validateBrowser() {
  if (
    navigator &&
    navigator.userAgent &&
    navigator.userAgent.includes("Safari")
  ) {
    throw new Error("Browser is not supported");
  }
}

export function validateReqType(reqType) {
  return ["PAY", "AUTH"].includes(reqType);
}
