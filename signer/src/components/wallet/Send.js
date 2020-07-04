import { h, Fragment } from "preact";
import { useState, useEffect } from "preact/hooks";
import { Link } from "preact-router";
import axios from "axios";
import QRCode from "qrcode.react";
import { css } from "emotion";

import { sats, isCashAddress } from "../../utils/unitUtils";
import { sendBchTx } from "../../utils/transactions";

import slpLogo from "../../assets/slp-logo-2.png";
import bchLogo from "../../assets/bch-icon-qrcode.png";
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

// TODO: calculate it later
const hardCodedTxFee = 500;

export default function ({ clientPayload }) {
  const [balance, setBalance] = useState();
  const [balanceInUSD, setBalanceInUSD] = useState();
  const [status, setStatus] = useState();
  const [canSendTx, setCanSendTx] = useState(false);

  const [shouldSendAll, setShouldSendAll] = useState(false);
  const [targetAddr, setTargetAddr] = useState("");
  const [amountToSend, setAmountToSend] = useState("0");

  const { bchAddr, cashAccount, walletExist } = useWallet();

  async function handleSend(e) {
    e.preventDefault();
    // send the transaction here
    try {
      setStatus("TX PROCESSING");
      await sendBchTx(amountToSend, "BCH", targetAddr);
      setStatus("TX ACCOMPLISHED");
    } catch (e) {
      console.log("[SIGNUP][ERROR]", e);
    }
  }

  function handleAllBalanceCheckbox(e) {
    e.preventDefault();

    if (shouldSendAll) {
      setShouldSendAll(false);
      setAmountToSend(0);
    } else {
      setShouldSendAll(true);
      // deduct 700 sats for tx fee
      setAmountToSend(balance - sats(hardCodedTxFee));
    }
  }

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
    }
  }

  useEffect(() => {
    readBalance();
  }, [bchAddr]);

  useEffect(() => {
    // validate input values before activating the send button
    const addrIsCorrect = isCashAddress(targetAddr);
    const amountIsCorrect = amountToSend + sats(hardCodedTxFee) <= balance;

    setCanSendTx(addrIsCorrect && amountIsCorrect);
  }, [amountToSend, targetAddr]);

  return (
    <>
      <header class={headerStyle}>
        <Link href="/">{`< Back to Wallet`}</Link>
      </header>
      <main>
        <form onSubmit={handleSend}>
          <Article ariaLabel="Receive to Your Wallet">
            <Heading number={2}>Send</Heading>

            <div
              class={css`
                margin-bottom: 16px;
              `}
            >
              {status === "FETCHED" && (
                <Heading number={5}>
                  Balance: {balance} BCH (${balanceInUSD})
                </Heading>
              )}
              {status === "FETCHING" && (
                <Heading number={5}>Fetching Balance...</Heading>
              )}
              {status === "TX PROCESSING" && (
                <Heading number={5}>Sending...</Heading>
              )}
              {status === "TX ACCOMPLISHED" && (
                <Heading number={4}>Transaction is Sent!</Heading>
              )}
            </div>

            <Label>BCH Address</Label>
            <Input
              type="text"
              onInput={(e) => {
                setTargetAddr(e.target.value);
              }}
              placeholder="bitcoincash:qpty0gf3mppl8n9alghxkuwhrpqlgkx3uv2gheqq8p"
            />

            <Label>Amount in BCH</Label>
            <Input
              type="text"
              width="100%"
              value={`${amountToSend}` || "0"}
              onInput={(e) => {
                let { value } = e.target;
                if (typeof value === "string" && value.match(/[^0-9.]/g)) {
                  value = value.replaceAll(/[^0-9.]/g, "");
                }
                setAmountToSend(value);
              }}
              placeholder="0.0005"
            />

            <Checkbox
              checked={shouldSendAll}
              onClick={handleAllBalanceCheckbox}
            >
              All Balance
            </Checkbox>

            <Button
              type="submit"
              disabled={!canSendTx}
              customStyle={css`
                margin-top: 32px;
              `}
              primary
              onClick={() => null}
            >
              Send
            </Button>
          </Article>
        </form>
      </main>
    </>
  );
}
