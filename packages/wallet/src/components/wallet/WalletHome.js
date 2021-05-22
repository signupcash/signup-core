import { h, Fragment } from "preact";
import { useState, useEffect, useContext } from "preact/hooks";
import { css } from "emotion";
import * as Sentry from "@sentry/browser";

import * as wallet from "../../utils/wallet";
import { satsToBch, bchToFiat } from "../../utils/unitUtils";
import RequestSpendToken from "./RequestSpendToken";
import RequestAccess from "./RequestAccess";
import RequestSlpSend from "./RequestSLPSend";
import RequestSLPGenesis from "./RequestSLPGenesis";
import RequestNFTGenesisChild from "./RequestNFTGenesisChild";
import RequestSendContribution from "./RequestSendContribution";
import Logo from "../common/Logo";
import Article from "../common/Article";
import Heading from "../common/Heading";
import Input from "../common/Input";
import Button from "../common/Button";
import Checkbox from "../common/Checkbox";

import { UtxosContext } from "../WithUtxos";

const headerStyle = css``;

const labelStyle = css`
  align-self: start;
  margin-bottom: -14px;
  margin-left: 8px;
`;
const Label = ({ children }) => <label class={labelStyle}>{children}</label>;

export default function ({ clientPayload }) {
  const { reqType } = clientPayload;
  const [balance, setBalance] = useState(0);
  const [balanceInUSD, setBalanceInUSD] = useState(0);
  const [status, setStatus] = useState();

  const { latestSatoshisBalance, utxoIsFetching, bchAddr } = useContext(
    UtxosContext
  );

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

  function handleReload(e) {
    e.preventDefault();
  }

  return (
    <>
      <Article ariaLabel="Your Wallet">
        {reqType === "spend_token" && (
          <RequestSpendToken bchAddr={bchAddr} clientPayload={clientPayload} />
        )}
        
        {reqType === "contribution" && (
          <RequestSendContribution clientPayload={clientPayload} />
        )}

        {reqType === "access" && (
          <RequestAccess bchAddr={bchAddr} clientPayload={clientPayload} />
        )}

        {reqType === "send_slp" && (
          <RequestSlpSend bchAddr={bchAddr} clientPayload={clientPayload} />
        )}

        {reqType === "genesis_slp" && (
          <RequestSLPGenesis bchAddr={bchAddr} clientPayload={clientPayload} />
        )}

        {reqType === "genesis_nft_child" && (
          <RequestNFTGenesisChild
            bchAddr={bchAddr}
            clientPayload={clientPayload}
          />
        )}

        {reqType !== "spend_token" &&
          reqType !== "access" &&
          reqType !== "send_slp" &&
          reqType !== "genesis_slp" &&
          reqType !== "genesis_nft_child" &&
          reqType !== "contribution" && (
            <>
              <Logo slp />

              {utxoIsFetching && (
                <Heading number={5}>Fetching Balance...</Heading>
              )}

              {!utxoIsFetching && (
                <Heading customCss={css(`color: black`)} number={3}>
                  {balance} BCH (${balanceInUSD})
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

              <Heading customCss={css(`margin-top: 32px`)} number={5} highlight>
                Signup is not designed for storing large amount of funds! Use{" "}
                <a
                  href="https://bch.info/en/wallets"
                  target="_blank"
                  rel="noopener noreferer"
                  class={css`
                    color: #815de3;
                  `}
                >
                  alternative wallets
                </a>{" "}
                for that purpose to ensure your safety.
              </Heading>
            </>
          )}
      </Article>
    </>
  );
}
