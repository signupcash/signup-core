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
            width={"260px"}
            right
            pageWrapId="body-wrap"
          >
            {cashAccount && <Heading number={5}>{cashAccount}</Heading>}
            <a href="/">Home</a>

            <a href="/send">Topup</a>
            <a href="/top-up">Send</a>
            <a href="/logout">Logout</a>
          </Menu>
        )}
      </header>
      <main>
        {typeof walletExist === "undefined" && <div>Loading</div>}
        {walletExist === false && (
          <Authenticate clientPayload={clientPayload} />
        )}

        {walletExist === true && <WalletHome clientPayload={clientPayload} />}
      </main>
    </>
  );
}
