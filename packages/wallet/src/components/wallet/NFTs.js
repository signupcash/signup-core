import { h, Fragment } from "preact";
import { useState, useEffect } from "preact/hooks";
import { Link } from "preact-router";
import axios from "axios";
import { css } from "emotion";
import Logo from "../common/Logo";
import Article from "../common/Article";
import Heading from "../common/Heading";
import Button from "../common/Button";
import { SLP_ICONS_URL, WAIFU_NFT_IMAGE_SERVER } from "../../config";
import { getSlpBalances } from "../../utils/slp";
import { getWaletSLPAddr } from "../../utils/wallet";

export default function () {
  const [slpBalances, setSlpBalances] = useState([]);

  useEffect(() => {
    (async () => {
      const slpAddr = await getWaletSLPAddr();
      if (!slpAddr) return;

      const { data } = await getSlpBalances(slpAddr);
      // g is for Graph collection of SLP db
      setSlpBalances(data.g);
    })();
  }, []);

  return (
    <>
      <header>
        <Link href="/top-up">{`< Back to Topup`}</Link>
      </header>
      <main>
        <Article ariaLabel="Your NFTs">
          <Heading number={2}>NFTs 👾</Heading>
          {slpBalances
            .filter((x) => x.versionType == "65")
            .map((token) => (
              <div
                class={css`
                  display: flex;
                  flex-direction: row;
                  width: 90%;
                  padding: 15px 10px;
                  margin-bottom: 15px;

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
                `}
              >
                <div
                  class={css`
                    align-self: center;
                    margin-right: 16px;
                  `}
                >
                  <img
                    class={css`
                      width: 150px;
                      clip-path: inset(0 12px 0 12px);
                    `}
                    src={`${WAIFU_NFT_IMAGE_SERVER}/${token.tokenId}.png`}
                  />
                </div>
                <div>
                  <Heading
                    customCss={css`
                      color: black;
                    `}
                    number={4}
                  >
                    {token.name}
                  </Heading>
                  <Heading highlight number={5}>
                    {`${token.ticker}`}
                  </Heading>
                </div>
              </div>
            ))}
        </Article>
      </main>
    </>
  );
}
