import { h, Fragment } from "preact";
import { useState, useEffect, useContext } from "preact/hooks";
import { Link, route } from "preact-router";
import * as Sentry from "@sentry/browser";
import axios from "axios";
import QRCode from "qrcode.react";
import slpLogo from "../../assets/slp-logo-2.png";
import bchLogo from "../../assets/bch-icon-qrcode.png";
import { css } from "emotion";
import Logo from "../common/Logo";
import Article from "../common/Article";
import Heading from "../common/Heading";
import Box from "../common/Box";
import Input from "../common/Input";
import Button from "../common/Button";
import Checkbox from "../common/Checkbox";
import * as wallet from "../../utils/wallet";
import useWallet from "../../hooks/useWallet";
import Tabs from "../common/Tabs";
import { UtxosContext } from "../WithUtxos";
import { satsToBch, bchToFiat } from "../../utils/unitUtils";
import { getSlpBalances } from "../../utils/slp";
import ReloadButton from "../common/ReloadButton";

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

  const {
    latestUtxos,
    latestSatoshisBalance,
    refetchUtxos,
    utxoIsFetching,
    slpBalances,
    bchAddr,
    slpAddr,
  } = useContext(UtxosContext);

  const [balance, setBalance] = useState(0);
  const [balanceInUSD, setBalanceInUSD] = useState();
  const [status, setStatus] = useState("LOADING");
  const [reload, setReload] = useState(0);
  const [numOfTokens, setNumOfTokens] = useState();
  const [numOfNfts, setNumOfNfts] = useState();

  // Fetching the number of SLP tokens and NFTs
  useEffect(() => {
    if (!slpBalances) return;

    const numOfTokens = slpBalances.filter((token) => token.versionType == "1")
      .length;
    const numOfNfts = slpBalances.filter((token) => token.versionType == "65")
      .length;

    setNumOfTokens(numOfTokens);
    setNumOfNfts(numOfNfts);
  }, [slpBalances]);

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

  const BCHView = (
    <Article ariaLabel="Top up Your Wallet">
      <Heading number={2}>Top up with BCH</Heading>
      <QRCode
        value={bchAddr}
        renderAs={"png"}
        size={250}
        includeMargin
        imageSettings={{
          src: bchAddr && bchAddr.includes("bitcoin") ? bchLogo : slpLogo,
          x: null,
          y: null,
          height: 50,
          width: 50,
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

      <div>
        {!utxoIsFetching && (
          <div
            class={css`
              display: flex;
              flex-direction: row;
            `}
          >
            <Heading customCss={css(`color: black`)} number={2}>
              {balance} BCH {balanceInUSD && `($${balanceInUSD})`}
            </Heading>
            <ReloadButton
              customStyle={css`
                margin: 22.5px -20px;
              `}
              onClick={() => refetchUtxos()}
            />
          </div>
        )}

        {utxoIsFetching && <Heading number={5}>Fetching Balance...</Heading>}
      </div>

      <p
        class={css`
          font-size: 0.8em;
        `}
      >
        Signup is a new wallet, make sure to not store large amount of funds
        here just to be safe 🔒
      </p>
    </Article>
  );

  const SLPView = (
    <Article ariaLabel="Your SLP Address">
      <>
        <Heading number={2}>Top up with SLP</Heading>

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
          customCss={css`
            margin-top: 0;
          `}
          ariaLabel="Your SLP Address"
          number={5}
          highlight
        >
          {slpAddr}
        </Heading>

        {!utxoIsFetching && (
          <>
            <div
              class={css`
                display: flex;
                flex-direction: column;
                align-items: center;
              `}
            >
              <ReloadButton onClick={() => refetchUtxos()} />
              <p>Your SLP balances are listed here 👾</p>
            </div>

            <div
              class={css`
                display: flex;
                flex-direction: row;
                margin-bottom: 10px;
              `}
            >
              <Box title="SLP Tokens">
                <Heading
                  customCss={css`
                    color: black;
                  `}
                  number={2}
                  onClick={() => route("/tokens", true)}
                >
                  {numOfTokens}
                </Heading>
              </Box>
              <Box title="NFTs">
                <Heading
                  customCss={css`
                    color: black;
                  `}
                  number={2}
                  onClick={() => route("/NFTs", true)}
                >
                  {numOfNfts}
                </Heading>
              </Box>
            </div>
          </>
        )}

        {utxoIsFetching && <p>Loading your SLPs ...</p>}
      </>
    </Article>
  );

  return (
    <>
      <header class={headerStyle}>
        <Link href="/">{`< Back to Wallet`}</Link>
      </header>
      <main
        class={css`
          overflow: hidden;
        `}
      >
        {bchAddr ? (
          <Tabs
            sections={[
              {
                title: "BCH",
                Component: BCHView,
              },
              {
                title: "SLP",
                Component: SLPView,
              },
            ]}
          />
        ) : (
          <div
            class={css`
              text-align: center;
              color: #7c3aed;
              margin-top: 32px;
            `}
          >
            Opening your wallet ... 🔒
          </div>
        )}
      </main>
    </>
  );
}
