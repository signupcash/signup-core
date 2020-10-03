import { h, Fragment } from "preact";
import { useState, useEffect } from "preact/hooks";
import { Link } from "preact-router";
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
import RecoveryPhrases from "../new-wallet/RecoveryPhrases";

export default function () {
  const [status, setStatus] = useState("QR_SCAN");
  const [walletMnemonic, setWalletMnemonic] = useState();

  useEffect(() => {
    (async () => {
      const { userWallet } = await wallet.retrieveWalletCredentials();
      if (userWallet) {
        setWalletMnemonic(userWallet);
      }
    })();
  }, []);

  return (
    <>
      <header>
        <Link href="/">{`< Back to Wallet`}</Link>
      </header>
      <main>
        <Article ariaLabel="Backup Your Wallet">
          <Heading number={2}>Backup Your Wallet</Heading>
          {walletMnemonic && status === "QR_SCAN" && (
            <>
              <p>
                Use your Bitcoin.com wallet, go to import and tap on the QR icon
                and scan the image below.
              </p>
              <QRCode
                value={walletMnemonic}
                renderAs={"png"}
                size={260}
                includeMargin
              />
            </>
          )}

          {status === "QR_SCAN" && (
            <>
              <p
                class={css`
                  margin-top: 32px;
                `}
              >
                Interested to use a different wallet or a paper?
              </p>
              <Button
                type="submit"
                primary
                onClick={() => setStatus("RECOVERY_PHRASES")}
              >
                Show me the Recovery Phrases
              </Button>
            </>
          )}

          {status === "RECOVERY_PHRASES" && (
            <>
              <RecoveryPhrases words={walletMnemonic.split(" ")} />
              <p
                class={css`
                  font-size: 11px;
                `}
              >
                We use a derivation key of m/44'/0'/0'/0/0 You will need this
                value if you are importing your phrases into other wallets.
              </p>
              <p
                class={css`
                  margin-top: 32px;
                `}
              >
                Want to scan a QR code to backup your private key in Bitcoin.com
                wallet?
              </p>
              <Button
                type="submit"
                primary
                onClick={() => setStatus("QR_SCAN")}
              >
                Show me the QR Code
              </Button>
            </>
          )}
        </Article>
      </main>
    </>
  );
}
