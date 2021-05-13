import { h, Fragment } from "preact";
import { useState, useEffect, useContext } from "preact/hooks";
import { Link, route } from "preact-router";
import { Mnemonic } from "bitbox-sdk";
import { css } from "emotion";
import * as Sentry from "@sentry/browser";
import { toast } from "react-toastify";
import Logo from "../common/Logo";
import Article from "../common/Article";
import Heading from "../common/Heading";
import Input from "../common/Input";
import Button from "../common/Button";
import * as wallet from "../../utils/wallet";
import { UtxosContext } from "../WithUtxos";

export default function () {
  const [walletMnemonic, setWalletMnemonic] = useState();
  const [walletExist, setWalletExist] = useState(false);

  const { refetchUtxos } = useContext(UtxosContext);

  useEffect(() => {
    (async () => {
      setWalletExist(await wallet.isUserWalletExist());
    })();
  }, []);

  function handleMnemonicInput(e) {
    setWalletMnemonic(e.target.value.trim());
  }

  function handleImport(e) {
    e.preventDefault();

    if (!walletMnemonic || !wallet.isRecoveryKeyValid(walletMnemonic)) {
      toast.error(
        "Your recovery phrases are not valid. Send us an email to hello@signup.cash for assistant if you need."
      );
      return;
    }

    (async () => {
      // second check to make sure really no wallet exist here!
      const walletExist = await wallet.isUserWalletExist();
      if (walletExist) {
        toast.error("A wallet already exist! You need to logout first.");
        return;
      }

      try {
        await wallet.storeWallet(walletMnemonic);
        await wallet.storeWalletIsVerified();

        refetchUtxos();

        setTimeout(() => {
          route("/", true);
        }, 1000);
      } catch (e) {
        console.log(e);
        toast.error("There is an error while importing your wallet!");
        Sentry.captureException(e);
      }
    })();
  }

  return (
    <>
      <header>
        <Link href="/">{`< Back to Home`}</Link>
      </header>
      <main>
        <form onSubmit={handleImport}>
          <Article ariaLabel="Import Your Wallet">
            <Heading number={2}>Import Your Wallet</Heading>
            {walletExist ? (
              <p>
                You already have an active wallet. If you want to import a new
                one, you have to log out from the previous one. Use the menu on
                the right side to log out and make sure you have a backup before
                doing so. 🔒
              </p>
            ) : (
              <>
                <Input
                  placeholder="here is the place for your recovery phrases"
                  onChange={handleMnemonicInput}
                  value={walletMnemonic}
                />

                <Button type="submit" primary>
                  Import Wallet
                </Button>
              </>
            )}
          </Article>
        </form>
      </main>
    </>
  );
}
