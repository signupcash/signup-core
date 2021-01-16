import { h, Fragment } from "preact";
import { useState, useEffect, useContext } from "preact/hooks";
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
import Tabs from "../common/Tabs";
import { UtxosContext } from "../WithUtxos";
import { satsToBch, bchToFiat } from "../../utils/unitUtils";

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
  } = useContext(UtxosContext);

  const [balance, setBalance] = useState(0);
  const [balanceInUSD, setBalanceInUSD] = useState();
  const [status, setStatus] = useState("LOADING");
  const [reload, setReload] = useState(0);
  const { bchAddr, cashAccount, walletExist } = useWallet();

  useEffect(() => {
    console.log(latestSatoshisBalance);;
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
      <div>
        {!utxoIsFetching && (
          <Heading
            onClick={() => refetchUtxos()}
            customCss={css(`color: black`)}
            number={2}
          >
            {balance} BCH {balanceInUSD && `($${balanceInUSD})`}
          </Heading>
        )}

        {utxoIsFetching && <Heading number={5}>Fetching Balance...</Heading>}
      </div>

      {walletExist && bchAddr && (
        <>
          <QRCode
            value={bchAddr}
            renderAs={"png"}
            size={260}
            includeMargin
            imageSettings={{
              src: bchAddr && bchAddr.includes("bitcoin") ? bchLogo : slpLogo,
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
      <Heading number={2}>Top up with SLP</Heading>
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
        <Tabs
          sections={[
            {
              title: "BCH",
              component: BCHView,
            },
            {
              title: "SLP",
              component: SLPView,
            },
          ]}
        />
      </main>
    </>
  );
}
