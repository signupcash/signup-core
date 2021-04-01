import bitbox from "../libs/bitbox";

export function validateConfig(configObject) {
  if (configObject.addr && !bitbox.Address.isCashAddress(configObject.addr)) {
    throw new Error(
      "[SIGNUP ERROR] - addr should be a valid Cash Address value"
    );
  }
}

export function validateReqType(reqType) {
  const acceptedReqTypes = ["access", "spend_token", "contribution"];
  if (!acceptedReqTypes.includes(reqType)) {
    throw new Error("[SIGNUP ERROR] - reqType is wrong");
  }
}
