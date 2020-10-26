import { h, Fragment } from "preact";
import { useState, useEffect } from "preact/hooks";
import { css } from "emotion";
import * as Sentry from "@sentry/browser";

import * as wallet from "../../utils/wallet";

import RequestSpendToken from "./RequestSpendToken";
import RequestAccess from "./RequestAccess";

import Logo from "../common/Logo";
import Article from "../common/Article";
import Heading from "../common/Heading";
import Input from "../common/Input";
import Button from "../common/Button";
import Checkbox from "../common/Checkbox";

const headerStyle = css``;

const labelStyle = css`
  align-self: start;
  margin-bottom: -14px;
  margin-left: 8px;
`;
const Label = ({ children }) => <label class={labelStyle}>{children}</label>;

export default function ({ clientPayload, bchAddr }) {
  const { reqType } = clientPayload;
  const [balance, setBalance] = useState();
  const [balanceInUSD, setBalanceInUSD] = useState();
  const [status, setStatus] = useState();

  useEffect(() => {
    readBalance();
  }, [bchAddr]);

  async function readBalance() {
    if (!bchAddr) return;
    setStatus("FETCHING");

    try {
      const { balance, balanceInUSD } = await wallet.getBalance(bchAddr);

      setBalance(balance);
      setBalanceInUSD(balanceInUSD);
      setStatus("FETCHED");
    } catch (e) {
      setStatus("BALANCE_ERROR");
      Sentry.captureException(e);
    }
  }

  function handleReload(e) {
    e.preventDefault();
  }

  return (
    <>
      <Article ariaLabel="Your Wallet">
        <Heading number={2}>Your Wallet</Heading>

        {reqType === "spend_token" && (
          <RequestSpendToken bchAddr={bchAddr} clientPayload={clientPayload} />
        )}

        {reqType === "access" && (
          <RequestAccess bchAddr={bchAddr} clientPayload={clientPayload} />
        )}

        {reqType !== "spend_token" && reqType !== "access" && (
          <>
            <Heading number={5} highlight>
              We are in beta! Make sure to follow us in Twitter{" "}
              <a
                href="https://twitter.com/signupwallet"
                target="_blank"
                rel="noopener noreferer"
              >
                @signupwallet
              </a>{" "}
              for more exciting news.
            </Heading>

            {status === "FETCHED" && (
              <Heading number={4}>
                Balance: {balance} BCH (${balanceInUSD})
              </Heading>
            )}
            {status === "FETCHING" && (
              <Heading number={4}>Fetching Balance...</Heading>
            )}
            {status === "BALANCE_ERROR" && (
              <Heading number={4}>
                There was a problem while fetching your balance.{" "}
                <a href="#" onClick={readBalance}>
                  Retry
                </a>
              </Heading>
            )}

            <Button
              customStyle={css`
                margin-top: 24px;
              `}
              type="button"
              primary
              linkTo="/top-up"
            >
              Top up
            </Button>
            <Button type="button" primary linkTo="/send">
              Send
            </Button>
          </>
        )}
      </Article>
    </>
  );
}
