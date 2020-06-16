import { h, Fragment } from "preact";
import { useState, useEffect } from "preact/hooks";
import { css } from "emotion";
import Logo from "../common/Logo";
import Authenticate from "./Authenticate";
import * as wallet from "../../utils/wallet";
import WalletHome from "../wallet/WalletHome";
import useWallet from "../../hooks/useWallet";
import defaultProfilePicture from "../../assets/profile.png";

const headerStyle = css``;

export default function ({ clientPayload }) {
  const { bchAddr, cashAccount, walletExist } = useWallet();

  return (
    <>
      <header class={headerStyle}>
        <div
          class={css`
            font-size: 15px;
            color: #3a3d99;
            font-weight: 400;
            display: flex;
            flex-direction: row-reverse;
          `}
        >
          <img
            class={css`
              width: 50px;
              height: 50px;
            `}
            src={defaultProfilePicture}
          />
          <span
            class={css`
              margin: 15px 8px;
            `}
          >
            {cashAccount && `${cashAccount}`}
          </span>
        </div>
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
