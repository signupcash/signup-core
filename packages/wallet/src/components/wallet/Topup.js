import { h, Fragment } from "preact";
import { useState, useEffect } from "preact/hooks";
import { Link } from "preact-router";
import * as Sentry from "@sentry/browser";
import axios from "axios";
import QRCode from "qrcode.react";
import slpLogo from "../../assets/slp-logo-2.png";
import bchLogo from "../../assets/bch-icon-qrcode.png";
import { css } from "emotion";
import Logo from "../common/Logo";
import Article from "../common/Article";
import Heading from "../common/Heading";
import Input from "../common/Input";
import Button from "../common/Button";
import Checkbox from "../common/Checkbox";
import * as wallet from "../../utils/wallet";
import useWallet from "../../hooks/useWallet";

const headerStyle = css``;

const labelStyle = css`
  align-self: start;
  margin-bottom: -14px;
  margin-left: 8px;
`;
const Label = ({ children }) => <label class={labelStyle}>{children}</label>;

export default function ({ clientPayload }) {
  function handleReload(e) {
    e.preventDefault();
  }

  const [balance, setBalance] = useState();
  const [balanceInUSD, setBalanceInUSD] = useState();
  const [status, setStatus] = useState("LOADING");
  const [reload, setReload] = useState(0);
  const { bchAddr, cashAccount, walletExist } = useWallet();

  async function readBalance() {
    if (!bchAddr) return;
    setStatus("FETCHING");

    try {
      const { balance, balanceInUSD } = await wallet.getBalance(bchAddr);

      setBalance(balance);
      setBalanceInUSD(balanceInUSD);
      setStatus("FETCHED");
    } catch (e) {
      console.log("[SIGNUP Error]", e);
      setStatus("ERROR");
      Sentry.captureException(e);
    }
  }

  useEffect(() => {
    if (status === "FETCHED" || status == "ERROR") return;
    readBalance();
  }, [bchAddr]);

  useEffect(() => {
    readBalance();
  }, [reload]);

  return (
    <>
      <header class={headerStyle}>
        <Link href="/">{`< Back to Wallet`}</Link>
      </header>
      <main>
        <form onSubmit={handleReload}>
          <Article ariaLabel="Top up Your Wallet">
            <Heading number={2}>Top up with BCH</Heading>
            {status === "LOADING" && <p>Loading ...</p>}
            {walletExist && bchAddr && (
              <>
                <QRCode
                  value={bchAddr}
                  renderAs={"png"}
                  size={260}
                  includeMargin
                  imageSettings={{
                    src:
                      bchAddr && bchAddr.includes("bitcoin")
                        ? bchLogo
                        : slpLogo,
                    x: null,
                    y: null,
                    height: 60,
                    width: 60,
                    excavate: false,
                  }}
                />
                <Heading
                  size="12px"
                  ariaLabel="Your Bitcoin Cash Address"
                  number={5}
                  highlight
                >
                  {bchAddr}
                </Heading>
              </>
            )}
            <div
              class={css`
                margin-bottom: 16px;
              `}
            >
              {status === "FETCHED" && (
                <Label>
                  Balance: {balance} BCH (${balanceInUSD})
                </Label>
              )}
              {status === "FETCHING" && (
                <Heading number={5}>Fetching Balance...</Heading>
              )}
            </div>

            {status === "FETCHED" && (
              <Button
                type="submit"
                primary
                onClick={() => setReload(reload + 1)}
              >
                Reload Balance
              </Button>
            )}
            <p
              class={css`
                font-size: 0.9em;
              `}
            >
              Signup is a new wallet, make sure to not store large amount of
              funds here just to be safe 🔒
            </p>
          </Article>
        </form>
      </main>
    </>
  );
}
