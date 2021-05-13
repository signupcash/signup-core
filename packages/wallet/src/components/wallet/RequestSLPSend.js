import { h, Fragment } from "preact";
import { useState, useEffect, useContext, useReducer } from "preact/hooks";
import { css } from "emotion";
import QRCode from "qrcode.react";
import { toast } from "react-toastify";
import * as Sentry from "@sentry/browser";
import {
  handleMessageBackToClient,
  workerCourier,
  onWorkerEvent,
} from "../../signer";
import { makeAccessToken, makeSessionId } from "../../utils/permission";
import { getWalletAddr, getWalletCashAccount } from "../../utils/wallet";
import Heading from "../common/Heading";
import Input from "../common/Input";
import Button from "../common/Button";
import Checkbox from "../common/Checkbox";
import Loading from "../common/Loading";
import Article from "../common/Article";
import { UtxosContext } from "../WithUtxos";
import { sendSlpTx, feesFor } from "../../utils/transactions";
import slpLogo from "../../assets/slp-logo-2.png";
import bchLogo from "../../assets/bch-icon-qrcode.png";
import { getSlpByTokenId } from "../../utils/slp";
import { satsToBch } from "../../utils/unitUtils";
import { tiny } from "../../utils/helpers";
import { SLP_EXPLORER } from "../../config";

const Row = ({ children }) => (
  <div
    class={css`
      display: flex;
      flex-direction: row;
    `}
  >
    {children}
  </div>
);

export default function ({ clientPayload }) {
  // TODO move it to higher level using context
  const [status, setStatus] = useState("PENDING");
  const [tokenName, setTokenName] = useState();
  const {
    slpUtxos,
    slpBalances,
    latestSatoshisBalance,
    latestUtxos,
    utxoIsFetching,
    refetchUtxos,
    slpAddr,
    bchAddr,
  } = useContext(UtxosContext);

  useEffect(() => {
    if (utxoIsFetching) return;
    // reject the request if there are not enough balance
    const requestedToken = slpBalances.filter(
      (token) => token.tokenId === clientPayload.action.tokenId
    )[0];

    if (!requestedToken || requestedToken.value < clientPayload.action.amount) {
      // Not enough slp tokens to send
      setStatus("NOT_ENOUGH_SLP");
    } else if (latestSatoshisBalance < feesFor(4, 4)) {
      // Not enough BCH to pay for fees
      setStatus("NOT_ENOUGH_BCH");
    } else {
      setStatus("WAITING");
    }

    (async () => {
      if (tokenName) return;

      const token = await getSlpByTokenId(clientPayload.action.tokenId);
      setTokenName(token.ticker);
    })();
  }, [slpBalances]);

  useEffect(() => {
    setStatus("PENDING");
  }, [clientPayload.nonce]);

  useEffect(() => {
    if (utxoIsFetching) return;
    setStatus("WAITING");
  }, [utxoIsFetching]);

  function handleAllow(e) {
    setStatus("PROCESSING");
    e.preventDefault();
    (async () => {
      const {
        slpAddr: receiverSlpAddr,
        tokenId,
        amount,
      } = clientPayload.action;

      try {
        const { txId } = await sendSlpTx(
          amount,
          tokenId,
          receiverSlpAddr,
          latestSatoshisBalance,
          latestUtxos,
          slpUtxos,
          slpBalances
        );

        handleMessageBackToClient("GRANTED", clientPayload.reqId, {
          txResult: { txId },
          action: clientPayload.action,
        });

        self.close();
      } catch (e) {
        console.log(e);
        Sentry.captureException(e);
        toast.error(e.message);
      }
    })();
  }

  function handleDeny() {
    handleMessageBackToClient("DENIED", clientPayload.reqId);
    self.close();
  }

  return (
    <>
      {utxoIsFetching && <Loading text="Opening your wallet ... 🔒" />}

      {status === "PROCESSING" && (
        <Loading text="Processing your transaction ..." />
      )}

      {status === "WAITING" && !utxoIsFetching && (
        <form onSubmit={handleAllow}>
          <Heading number={3}>SLP Transaction Request</Heading>
          <p
            class={css`
              font-size: 14px;
              margin: 16px;
            `}
          >
            Please confirm if you agree with this transaction:
          </p>

          <Row>
            <Heading number={4} inline>
              Token:
            </Heading>
            <Heading
              number={4}
              inline
              customCss={css`
                color: black;
                margin: 8px 0;
              `}
            >
              {tokenName}
            </Heading>
          </Row>

          <Row>
            <Heading number={4} inline>
              Amount:
            </Heading>
            <Heading
              number={4}
              inline
              customCss={css`
                color: black;
                margin: 8px 0;
              `}
            >
              {clientPayload.action.amount}
            </Heading>
          </Row>

          <Row>
            <Heading number={4} inline>
              To:
            </Heading>
            <Heading
              number={5}
              inline
              customCss={css`
                color: black;
                margin: 8px 0;
              `}
            >
              <a
                href={`${SLP_EXPLORER}/#address/${clientPayload.action.slpAddr}`}
                target="_blank"
                rel="noreferer noopener"
              >
                {tiny(clientPayload.action.slpAddr)}
              </a>
            </Heading>
          </Row>

          <Row>
            <Heading number={4} inline>
              Request From:
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
          </Row>

          <Button type="submit" primary>
            Allow
          </Button>
          <Button onClick={handleDeny} type="button" secondary>
            Deny
          </Button>
        </form>
      )}

      {status === "NOT_ENOUGH_BCH" && !utxoIsFetching && (
        <>
          <Heading number={2}>Not Enough BCH</Heading>
          <Heading number={5}>
            You need to have at least {satsToBch(feesFor(4, 4))} BCH to pay for
            the fees on this transaction. If you want to proceed, send enough
            BCH to this address:
          </Heading>
          <QRCode
            value={bchAddr}
            renderAs={"png"}
            size={250}
            includeMargin
            imageSettings={{
              src: bchAddr && bchLogo,
              x: null,
              y: null,
              height: 50,
              width: 50,
              excavate: false,
            }}
          />
          <Heading
            size="12px"
            ariaLabel="Your BCH Address"
            number={5}
            highlight
          >
            {bchAddr}
          </Heading>
          <p>Click on the button below after you sent the required amount:</p>
          <Button onClick={() => refetchUtxos()}>Check Again</Button>
          <Button alert onClick={handleDeny}>
            Cancel
          </Button>
        </>
      )}

      {status === "NOT_ENOUGH_SLP" && !utxoIsFetching && (
        <>
          <Heading number={2}>Not Enough SLP</Heading>
          <Heading number={5}>
            You need to have {clientPayload.action.amount} {tokenName} to
            complete this transaction. If you want to proceed, send enough{" "}
            {tokenName} to this address:
          </Heading>
          <QRCode
            value={slpAddr}
            renderAs={"png"}
            size={250}
            includeMargin
            imageSettings={{
              src: slpAddr && slpLogo,
              x: null,
              y: null,
              height: 50,
              width: 50,
              excavate: false,
            }}
          />
          <Heading
            size="12px"
            ariaLabel="Your SLP Address"
            number={5}
            highlight
          >
            {slpAddr}
          </Heading>
          <p>Click on the button below after you sent the required amount:</p>
          <Button onClick={() => refetchUtxos()}>Check Again</Button>
          <Button alert onClick={handleDeny}>
            Cancel
          </Button>
        </>
      )}
    </>
  );
}
