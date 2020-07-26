import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

export function makeSpendToken(budget, deadline, entropy) {
  return jwt.sign(
    {
      data: {
        budget,
      },
    },
    entropy,
    {
      expiresIn: deadline,
    }
  );
}

export function makeSessionId() {
  return uuidv4();
}

export function decodeSpendToken(token, entropy) {
  try {
    const decodedToken = jwt.verify(token, entropy);
    return {
      verified: true,
      ...decodedToken,
    };
  } catch (e) {
    console.log("Invalid Spend Token =>", e);
    return {
      verified: false,
    };
  }
}
