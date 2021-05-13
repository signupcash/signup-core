import { h, Fragment } from "preact";
import { useState, useEffect, useContext } from "preact/hooks";
import { Link } from "preact-router";
import * as Sentry from "@sentry/browser";
import delay from "delay";
import retry from "p-retry";
import axios from "axios";
import QRCode from "qrcode.react";
import { css } from "emotion";
import { toast } from "react-toastify";
import { UtxosContext } from "../WithUtxos";
import {
  sats,
  isCashAddress,
  satsToBch,
  bchToSats,
  bchToFiat,
} from "../../utils/unitUtils";
import { sendBchTx, feesFor } from "../../utils/transactions";
import { DUST } from "../../config";
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
import { debounce } from "../../utils/helpers";

const headerStyle = css``;

const labelStyle = css`
  align-self: start;
  margin-bottom: -14px;
  margin-left: 8px;
`;
const Label = ({ children }) => <label class={labelStyle}>{children}</label>;

export default function ({ clientPayload }) {
  const [status, setStatus] = useState("DEFAULT");
  const [canSendTx, setCanSendTx] = useState(false);
  const [balance, setBalance] = useState(0);
  const [balanceInUSD, setBalanceInUSD] = useState();
  const [shouldSendAll, setShouldSendAll] = useState(false);
  const [targetAddr, setTargetAddr] = useState("");
  const [amountToSend, setAmountToSend] = useState(0);

  const {
    latestUtxos,
    latestSatoshisBalance,
    refetchUtxos,
    utxoIsFetching,
  } = useContext(UtxosContext);

  useEffect(() => {
    if (!latestSatoshisBalance) return;

    const balance = satsToBch(latestSatoshisBalance);
    setBalance(balance);

    (async () => {
      // getting the fiat value
      const usdBalance = await bchToFiat(balance, "usd");
      setBalanceInUSD(usdBalance);
    })();
  }, [latestSatoshisBalance]);

  const [bchAddr, setBchAddr] = useState();

  function calculateFeesForAmount(amount) {
    let inputsSats = 0;
    let selectedUtxos = 0;
    let fees;

    latestUtxos.forEach((utxo) => {
      if (selectedUtxos > 0 && inputsSats >= amount) {
        return;
      }

      selectedUtxos++;
      // keeping track of inputs
      inputsSats += utxo.satoshis;
      fees = feesFor(selectedUtxos, 2);
    });

    return fees;
  }

  async function handleSend(e) {
    e.preventDefault();
    try {
      setStatus("TX PROCESSING");

      await retry(
        () =>
          sendBchTx(
            amountToSend,
            "BCH",
            targetAddr,
            latestSatoshisBalance,
            latestUtxos
          ),
        {
          retries: 5,
          onFailedAttempt: async () => {
            refetchUtxos();
            console.log("Waiting for UTXOs to be fetched...");
            await delay(1000);
          },
        }
      );

      setStatus("TX ACCOMPLISHED");
      // reset the amount
      setAmountToSend("0");
      setShouldSendAll(false);
      toast.success("Cool! Your money is sent successfully! 🍾");
      // refetch UTXOs for future transactions
      await delay(2500);
      refetchUtxos();
    } catch (e) {
      console.log("[SIGNUP][ERROR]", e);
      setStatus("ERROR");
      toast.error(e.error);
      Sentry.captureException(e);
    }
  }

  function handleAllBalanceCheckbox(e) {
    e.preventDefault();

    if (shouldSendAll) {
      setShouldSendAll(false);
      setAmountToSend("0");
    } else {
      setShouldSendAll(true);
      // deduct tx fee
      const satsToSend =
        bchToSats(balance) - calculateFeesForAmount(bchToSats(balance)) - 1;
      if (satsToSend <= DUST) {
        toast.info("Your balance is too little to be sent! Maybe Top-up more?");
        setAmountToSend("0");
      } else {
        setAmountToSend(`${satsToBch(satsToSend)}`);
      }
    }
  }

  useEffect(() => {
    refetchUtxos();
  }, [bchAddr]);

  useEffect(() => {
    setShouldSendAll(false);
  }, [amountToSend]);

  useEffect(() => {
    // validate input values before activating the send button
    const addrIsCorrect = isCashAddress(targetAddr);

    if (!addrIsCorrect && targetAddr) {
      toast.error("Target address is not a valid BCH address");
    }

    if (!latestUtxos.length) return;

    // check if the amount + fee is lesser or equal to the balance
    const amountIsCorrect =
      parseFloat(amountToSend) +
        satsToBch(calculateFeesForAmount(amountToSend)) <=
      balance;

    setCanSendTx(
      addrIsCorrect && amountIsCorrect && bchToSats(amountToSend) > DUST
    );
  }, [amountToSend, targetAddr]);

  useEffect(() => {
    (async () => {
      const myBchAddr = await wallet.getWalletAddr();
      setBchAddr(myBchAddr);
    })();
  }, []);

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
              {!utxoIsFetching &&
                (status === "DEFAULT" || status === "TX ACCOMPLISHED") && (
                  <Heading number={4}>
                    {balance} BCH (${balanceInUSD})
                  </Heading>
                )}
              {utxoIsFetching && (
                <Heading number={4}>Fetching Balance...</Heading>
              )}
              {status === "TX PROCESSING" && (
                <Heading number={4}>Sending... give us a second 🥶</Heading>
              )}

              {status === "ERROR" && (
                <Heading number={4}>
                  Something went wrong! Please report this issue to us so we can
                  fix it 😥
                </Heading>
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
