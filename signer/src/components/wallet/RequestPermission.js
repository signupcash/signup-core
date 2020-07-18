import { h, Fragment } from "preact";
import { useState } from "preact/hooks";
import { css } from "emotion";
import jwt from "jsonwebtoken";
import { handleMessageBackToClient } from "../../signer";
import { getWalletEntropy } from "../../utils/wallet";
import Heading from "../common/Heading";
import Input from "../common/Input";
import Button from "../common/Button";
import Checkbox from "../common/Checkbox";

const permissionCss = css`
  margin: 16px;
  border: 2px solid #815de3;
  padding: 12px;
  min-height: 200px;
`;

export default function ({ clientPayload }) {
  async function handleAllow(e) {
    e.preventDefault();
    // TODO generate sepnd token and send it back to the applicaiton
    const walletEntropy = await getWalletEntropy();
    const slicedEntropy = walletEntropy.slice(0, 32);

    const spendToken = jwt.sign(
      {
        data: {
          budget: clientPayload.budget,
        },
      },
      slicedEntropy,
      {
        expiresIn: clientPayload.deadline,
      },
      (err, spendToken) => {
        if (err) {
          console.log(err);
          // TODO show user an alert
          return;
        }
        handleMessageBackToClient("GRANTED", clientPayload.reqId, {
          spendToken,
        });
        console.log("granted");
        self.close();
      }
    );
  }

  function handleDeny() {
    handleMessageBackToClient("DENIED", clientPayload.reqId);
  }

  return (
    <div class={permissionCss}>
      <form onSubmit={handleAllow}>
        <Heading number={5}>
          Request for permission to spend from your wallet
        </Heading>
        <Heading number={4} inline>
          From:
        </Heading>
        <Heading
          number={4}
          inline
          customCss={css`
            color: black;
            margin: 8px 0;
          `}
        >
          {clientPayload.origin}
        </Heading>
        <div
          class={css`
            display: flex;
            flex-direction: row;
          `}
        >
          <Heading number={4}>Budget:</Heading>
          <Input
            small
            value={clientPayload.budget}
            width="80px"
            customCss={css`
              margin: 8px 0;
            `}
          />
        </div>

        <Button type="submit" primary>
          Allow
        </Button>
        <Button onClick={handleDeny} type="button" secondary>
          Deny
        </Button>
      </form>
    </div>
  );
}
