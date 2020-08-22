import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { BitboxNetwork } from "slpjs";

export function makeSpendToken(budget, deadline, entropy) {
  // TODO avoid using deadline for now, keep it to 1 hour hard coded
  return jwt.sign(
    {
      data: {
        budget,
      },
    },
    entropy,
    {
      expiresIn: "1h",
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
