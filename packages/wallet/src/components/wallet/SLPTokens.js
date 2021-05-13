import { h, Fragment } from "preact";
import { useState, useEffect, useContext } from "preact/hooks";
import { Link, route } from "preact-router";
import axios from "axios";
import { css } from "emotion";
import Img from "react-image-fallback";
import Logo from "../common/Logo";
import Article from "../common/Article";
import Heading from "../common/Heading";
import Button from "../common/Button";
import { SLP_ICONS_URL } from "../../config";
import { getSlpBalances } from "../../utils/slp";
import { getWalletSLPAddr } from "../../utils/wallet";
import Loading from "../common/Loading";
import TokenPage from "./TokenPage";
import { UtxosContext } from "../WithUtxos";
import placeholderImg from "../../assets/placeholder.jpg";

const rowCss = css`
  display: flex;
  flex-direction: row;
  width: 90%;
  height: 60px;
  padding: 15px 10px;
  margin-bottom: 15px;
  cursor: pointer;

  &:hover {
    background: #ae7fff;
    & h4 {
      color: white;
    }
    & h5 {
      color: white;
      background: #6a15fd;
    }
  }
`;

export default function () {
  const { utxoIsFetching, slpBalances, slpAddr } = useContext(UtxosContext);

  return (
    <>
      <header>
        <Link href="/top-up">{`< Back to Topup`}</Link>
      </header>
      <main>
        <Article ariaLabel="Your SLP Tokens">
          <Heading number={2}>SLP Tokens</Heading>
          {utxoIsFetching && <Loading text="Loading your tokens..." />}

          {!utxoIsFetching &&
            slpBalances.filter((x) => x.versionType == "1").length == 0 && (
              <p
                class={css`
                  margin-top: 32px;
                `}
              >
                Your wallet is very empty! 😅
              </p>
            )}

          {!utxoIsFetching &&
            slpBalances
              .filter((x) => x.versionType == "1")
              .map((token) => (
                <div
                  class={rowCss}
                  onClick={() => route(`/token?tokenId=${token.tokenId}`)}
                >
                  <div
                    class={css`
                      align-self: center;
                      margin-right: 16px;
                    `}
                  >
                    <Img
                      src={`${SLP_ICONS_URL}/${token.tokenId}.png`}
                      className={css`
                        max-height: 60px;
                      `}
                      fallbackImage={placeholderImg}
                      initialImage={placeholderImg}
                    />
                  </div>
                  <div>
                    <Heading
                      customCss={css`
                        color: black;
                        cursor: pointer;
                      `}
                      number={4}
                    >
                      {token.name}
                    </Heading>
                    <Heading
                      highlight
                      customCss={css`
                        cursor: pointer;
                      `}
                      number={5}
                    >
                      {`${token.value} ${token.ticker}`}
                    </Heading>
                  </div>
                </div>
              ))}
        </Article>
      </main>
    </>
  );
}
