import { h, Fragment } from "preact";
import { useState, useEffect, useContext } from "preact/hooks";
import { css } from "emotion";
import { slide as Menu } from "react-burger-menu";
import menuStyles from "../wallet/menuStyles";
import Heading from "../common/Heading";
import Authenticate from "./Authenticate";
import * as wallet from "../../utils/wallet";
import WalletHome from "../wallet/WalletHome";
import useWallet from "../../hooks/useWallet";
import defaultProfilePicture from "../../assets/profile.png";
import { UtxosContext } from "../WithUtxos";

const headerStyle = css`
  min-height: 40px;
`;

export default function ({ clientPayload }) {
  const { refetchUtxos, utxoIsFetching, walletExist, bchAddr } = useContext(
    UtxosContext
  );

  return (
    <>
      <header class={headerStyle}>
        {walletExist && (
          <Menu
            styles={menuStyles}
            width={"200px"}
            right
            pageWrapId="body-wrap"
          >
            <a href="/">Home</a>
            <a href="/top-up">Topup</a>
            <a href="/send">Send</a>
            <a href="/tokens">Tokens</a>
            <a href="/NFTs">NFTs</a>
            <a href="/contributions">Contributions</a>
            <a href="/backup">Backup</a>
            <a href="/logout">Logout</a>
            <span
              class={css`
                position: absolute;
                bottom: 40px;
                text-align: center;
                font-size: 13px;
              `}
            >
              Support: hello@signup.cash
            </span>
          </Menu>
        )}
      </header>
      <main>
        {typeof walletExist === "undefined" && (
          <div
            class={css`
              text-align: center;
              color: #7c3aed;
            `}
          >
            Opening your wallet ... 🔒
          </div>
        )}
        {walletExist === false && (
          <Authenticate clientPayload={clientPayload} />
        )}

        {walletExist === true && (
          <WalletHome bchAddr={bchAddr} clientPayload={clientPayload} />
        )}
      </main>
    </>
  );
}
