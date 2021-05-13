import { h, Fragment } from "preact";
import { useState, useEffect, useContext } from "preact/hooks";
import { Link, route } from "preact-router";
import * as Sentry from "@sentry/browser";
import Img from "react-image-fallback";
import delay from "delay";
import retry from "p-retry";
import axios from "axios";
import { css } from "emotion";
import { toast } from "react-toastify";
import { UtxosContext } from "../WithUtxos";
import {
  sats,
  isCashAddress,
  isSLPAddress,
  satsToBch,
  bchToSats,
} from "../../utils/unitUtils";
import { feesFor, sendBchTx } from "../../utils/transactions";
import {
  DUST,
  SLP_ICONS_URL,
  WAIFU_GROUP_ID,
  WAIFU_NFT_IMAGE_SERVER,
  SLP_EXPLORER,
  BITCOIN_COM_EXPLORER,
} from "../../config";
import Article from "../common/Article";
import Heading from "../common/Heading";
import Input from "../common/Input";
import Button from "../common/Button";
import Box from "../common/Box";
import Checkbox from "../common/Checkbox";
import * as wallet from "../../utils/wallet";
import useWallet from "../../hooks/useWallet";
import { getSlpByTokenId, getSlpBalances } from "../../utils/slp";
import Loading from "../common/Loading";
import NFTImage from "./NFTImage";
import { sendSlpTx } from "../../utils/transactions";
import { countDecimals, formatDocumentUri } from "../../utils/helpers";
import placeholderImg from "../../assets/placeholder.jpg";

const headerStyle = css``;

const labelStyle = css`
  align-self: start;
  margin-bottom: -14px;
  margin-left: 8px;
`;
const Label = ({ children }) => <label class={labelStyle}>{children}</label>;

export default function ({ tokenId }) {
  const [status, setStatus] = useState("INITIAL");
  const [targetAddr, setTargetAddr] = useState("");
  const [isSendingSlp, setIsSendingSlp] = useState(false);
  const [amountToSend, setAmountToSend] = useState(0);
  const [canSendTx, setCanSendTx] = useState(false);
  const [token, setToken] = useState();
  const [nftGroup, setNftGroup] = useState({});
  // we incriminate it for every refecth
  const [refetchCurrentToken, setRefetchCurrentToken] = useState(0);
  const [txInProcess, setTxInProcess] = useState();
  const [accomplishedTxId, setAccomplishedTxId] = useState();

  const {
    latestUtxos,
    slpUtxos,
    slpBalances,
    latestSatoshisBalance,
    refetchUtxos,
    utxoIsFetching,
    slpAddr,
  } = useContext(UtxosContext);

  useEffect(() => {
    // load token metadata and balances
    (async () => {
      if (!slpBalances) return;

      slpBalances.forEach((token) => {
        if (token.tokenId === tokenId) {
          setToken(token);
          if (token.versionType === 65) {
            // amount to send for NFTs is always 1
            setAmountToSend(1);
          }
        }
      });
    })();
  }, [refetchCurrentToken, slpBalances]);

  // Here we fetch the group after the token is loaded
  useEffect(() => {
    if (!token) return;
    (async () => {
      const tokenGroupData = await getSlpByTokenId(token.nftParentId);

      if (tokenGroupData && tokenGroupData.tokenId) {
        setNftGroup(tokenGroupData);
      }
    })();
  }, [token]);

  function handleSend(e) {
    e.preventDefault();

    // check for fees
    if (latestSatoshisBalance < feesFor(3, 4)) {
      toast.error(
        `You need to have some BCH in your wallet to send transactions`
      );
      return;
    }

    // Check if user is sending correct amount
    if (amountToSend > token.value) {
      toast.error(`You have only a balance of ${token.value} ${token.ticker}`);
      return;
    }

    if (countDecimals(amountToSend) > token.decimals) {
      toast.error(
        `The token your are trying to send only accept ${token.decimals} decimals`
      );
      return;
    }

    // TODO check if user has bch to pay the fee

    setTxInProcess(true);

    (async () => {
      const { txId } = await sendSlpTx(
        amountToSend,
        token.tokenId,
        targetAddr,
        latestSatoshisBalance,
        latestUtxos,
        slpUtxos,
        slpBalances
      );
      setIsSendingSlp(false);
      setTxInProcess(false);
      setAccomplishedTxId(txId);
      // 1 seconds delay to avoid race conditions
      setTimeout(() => {
        refetchUtxos();
        // reload current page
        setRefetchCurrentToken(refetchCurrentToken + 1);
      }, 1000);
    })();
  }

  const isNft = token && token.versionType === 65;

  return (
    <>
      <header class={headerStyle}>
        {!token && <Link href="/">{`< Back to Wallet`}</Link>}
        {token && isNft && <Link href="/NFTs">{`< Back to NFTs`}</Link>}
        {token && !isNft && <Link href="/tokens">{`< Back to Tokens`}</Link>}
      </header>
      <main>
        <form onSubmit={handleSend}>
          <Article ariaLabel="Your SLP">
            {!token && <Loading text="Fetching token metadata..." />}
            {token && (
              <>
                {isNft ? (
                  <NFTImage token={token} parentId={token.nftParentId} />
                ) : (
                  <Img
                    src={`${SLP_ICONS_URL}/${token.tokenId}.png`}
                    className={css`
                      max-width: 120px;
                    `}
                    fallbackImage={placeholderImg}
                    initialImage={placeholderImg}
                  />
                )}

                <Heading
                  customCss={css`
                    margin-bottom: 0;
                    padding-bottom: 0;
                  `}
                  number={2}
                >
                  {token.name}
                </Heading>
                <p
                  class={css`
                    & a {
                      font-size: 0.8em;
                      color: #8e6bee;
                    }
                  `}
                >
                  {formatDocumentUri(token.documentUri)}
                </p>

                {!txInProcess && !accomplishedTxId && (
                  <Button
                    onClick={() => setIsSendingSlp(!isSendingSlp)}
                    alert={isSendingSlp}
                    customCss={css`
                      margin-bottom: 16px;
                    `}
                  >
                    {isSendingSlp ? "Cancel Sending" : "Send"}
                  </Button>
                )}

                {isSendingSlp && !txInProcess && (
                  <>
                    <Label>SLP Address</Label>
                    <Input
                      type="text"
                      onInput={(e) => {
                        setTargetAddr(e.target.value);
                      }}
                      placeholder="simpleledger:qrmgyfu5552ufd8s4ukkjqylm4lcwa2qfcmlljytt3"
                    />

                    {!isNft && (
                      <>
                        <Label>Amount in SLP</Label>
                        <Input
                          type="text"
                          width="100%"
                          value={amountToSend}
                          onInput={(e) => {
                            let { value } = e.target;
                            setAmountToSend(value);
                          }}
                          placeholder="1"
                        />
                        <a
                          href="#"
                          class={css`
                            font-size: 0.8em;
                            align-self: start;
                            margin-top: -10px;
                          `}
                          onClick={() => setAmountToSend(token.value)}
                        >
                          Send All
                        </a>
                      </>
                    )}

                    <Button
                      type="submit"
                      disabled={
                        !amountToSend ||
                        !isSLPAddress(targetAddr) ||
                        utxoIsFetching
                      }
                      customStyle={css`
                        margin-top: 32px;
                      `}
                      primary
                    >
                      Send
                    </Button>
                  </>
                )}

                {txInProcess && (
                  <Loading text="Sending SLP transaction 🤞🏼 ..." />
                )}

                {accomplishedTxId && (
                  <p>
                    <Heading number={4}>SLP Transaction is done!</Heading>
                    <Button
                      green
                      linkTo={`${BITCOIN_COM_EXPLORER}/tx/${accomplishedTxId}`}
                    >
                      View it on block explorer
                    </Button>
                  </p>
                )}

                {!isSendingSlp && !accomplishedTxId && (
                  <>
                    <div
                      class={css`
                        display: flex;
                        flex-direction: row;
                        margin-bottom: 10px;
                      `}
                    >
                      <Box
                        class={css`
                          font-size: 0.8em;
                        `}
                        title="Balance"
                      >
                        {token.value}
                      </Box>
                      <Box
                        class={css`
                          font-size: 0.8em;
                        `}
                        title="Ticker"
                      >
                        <a
                          href={`${SLP_EXPLORER}/#token/${token.tokenId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {token.ticker}
                        </a>
                      </Box>
                    </div>
                  </>
                )}

                {isNft && !isSendingSlp && !accomplishedTxId && (
                  <div
                    class={css`
                      display: flex;
                      flex-direction: row;
                      margin-bottom: 10px;
                    `}
                  >
                    <Box title="Group">
                      <p
                        class={css`
                          font-size: 0.8em;
                        `}
                      >
                        {(nftGroup.name && (
                          <a
                            href={`${SLP_EXPLORER}/#token/${nftGroup.tokenId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {nftGroup.name}
                          </a>
                        )) ||
                          "[loading ...]"}
                      </p>
                    </Box>
                    <Box title="Group Document URI">
                      <p
                        class={css`
                          font-size: 0.8em;
                        `}
                      >
                        {formatDocumentUri(nftGroup.documentUri)}
                      </p>
                    </Box>
                  </div>
                )}
              </>
            )}
          </Article>
        </form>
      </main>
    </>
  );
}
