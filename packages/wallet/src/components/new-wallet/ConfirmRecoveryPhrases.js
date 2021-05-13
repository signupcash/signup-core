import { h, Fragment } from "preact";
import { useState, useEffect, useContext } from "preact/hooks";
import { route } from "preact-router";
import { css } from "emotion";
import Logo from "../common/Logo";
import Article from "../common/Article";
import Heading from "../common/Heading";
import Input from "../common/Input";
import Button from "../common/Button";
import Checkbox from "../common/Checkbox";
import RecoveryPhrases from "./RecoveryPhrases";
import * as wallet from "../../utils/wallet";
import { UtxosContext } from "../WithUtxos";

const labelStyle = css`
  align-self: start;
  margin-bottom: -14px;
  margin-left: 8px;
`;
const Label = ({ children }) => <label class={labelStyle}>{children}</label>;

export default function ({ email, optinForEmails, isAnonymous }) {
  const { refetchUtxos } = useContext(UtxosContext);

  async function handleStoreWallet(e) {
    e.preventDefault();
    await wallet.storeWalletIsVerified();
    refetchUtxos();
    setTimeout(() => {
      route("/", true);
    }, 1000);
  }

  const [recoveryPhrases, setRecoveryPhrases] = useState([]);

  useEffect(() => {
    // generate the wallet here
    (async () => {
      const { mnemonic } = wallet.createRecoveryPhrase();
      setRecoveryPhrases(mnemonic.split(" "));
    })();
  }, []);

  return (
    <form onSubmit={handleStoreWallet}>
      <Article ariaLabel="Confirm Recovery Key">
        <Heading number={3}>Backup Recovery Phrases 🔒</Heading>
        <p
          class={css`
            font-size: 14px;
            font-weight: 300;
          `}
        >
          This is your recovery phrases, please write them down on a paper and
          keep them safely. You might lose access to your wallet if you don't
          have these phrases.
        </p>

        <Heading number="4">Write these on a paper</Heading>

        <RecoveryPhrases words={recoveryPhrases} />
        <Button type="submit" primary>
          I wrote it down
        </Button>
      </Article>
    </form>
  );
}
