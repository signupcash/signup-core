import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import * as Sentry from "@sentry/browser";
import { getWalletEntropy } from "./wallet";

export async function makeSpendToken(budget, deadline) {
  // generate sepnd token and send it to the dapp and tx bridge
  const walletEntropy = await getWalletEntropy();
  const tokenEntropy = walletEntropy.slice(0, 32);

  // avoid using deadline for now, keep it to 1 hour hard coded
  return jwt.sign(
    {
      data: {
        budget,
      },
    },
    tokenEntropy,
    {
      expiresIn: "1h",
    }
  );
}

export async function makeAccessToken(permissions) {
  // generate sepnd token and send it to the dapp and tx bridge
  const walletEntropy = await getWalletEntropy();
  const tokenEntropy = walletEntropy.slice(0, 32);

  // avoid using deadline for now, keep it to 1 hour hard coded
  return jwt.sign(
    {
      data: {
        permissions,
      },
    },
    tokenEntropy,
    {
      expiresIn: "1h",
    }
  );
}

export function makeSessionId() {
  return uuidv4();
}

export async function decodeToken(token) {
  const walletEntropy = await getWalletEntropy();
  const tokenEntropy = walletEntropy.slice(0, 32);

  try {
    const decodedToken = jwt.verify(token, tokenEntropy);
    return {
      verified: true,
      ...decodedToken,
    };
  } catch (e) {
    console.log("Invalid Token =>", e);
    return {
      verified: false,
    };
    Sentry.captureException(e);
  }
}
