// retrieved from https://gitlab.com/cash-accounts/website/-/blob/master/www/js/index.js#L78
export const heightModifier = 563620;

export const isDevEnv = process.env.NODE_ENV === "development";

export const SIGNUP_TX_BRIDGE = isDevEnv
  ? "http://localhost:5044"
  : "https://bridge.signup.cash";
