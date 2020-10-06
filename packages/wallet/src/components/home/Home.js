import { h, Fragment } from "preact";
import { useState, useEffect } from "preact/hooks";
import { css } from "emotion";
import { slide as Menu } from "react-burger-menu";
import menuStyles from "../wallet/menuStyles";
import Logo from "../common/Logo";
import Heading from "../common/Heading";
import Authenticate from "./Authenticate";
import * as wallet from "../../utils/wallet";
import WalletHome from "../wallet/WalletHome";
import useWallet from "../../hooks/useWallet";
import defaultProfilePicture from "../../assets/profile.png";

const headerStyle = css`
  min-height: 40px;
`;

export default function ({ clientPayload }) {
  const { bchAddr, cashAccount, walletExist } = useWallet();

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
            {cashAccount && (
              <Heading
                highlight
                customCss={css`
                  font-size: 12px;
                  margin: 0;
                `}
                number={5}
              >
                {cashAccount}
              </Heading>
            )}
            <a href="/">Home</a>
            <a href="/top-up">Topup</a>
            <a href="/send">Send</a>
            <a href="/backup">Backup</a>
            <a href="/logout">Logout</a>
            <span
              class={css`
                position: absolute;
                bottom: 40px;
                right: 10px;
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
        {typeof walletExist === "undefined" && <div>Loading</div>}
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
