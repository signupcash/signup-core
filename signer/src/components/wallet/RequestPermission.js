import { h, Fragment } from "preact";
import { useState, useEffect, useContext } from "preact/hooks";
import { css } from "emotion";
import {
  handleMessageBackToClient,
  workerCourier,
  onWorkerEvent,
} from "../../signer";
import { makeSpendToken, makeSessionId } from "../../utils/permission";
import { parseMoney } from "../../utils/unitUtils";
import { getWalletEntropy, getBalance } from "../../utils/wallet";
import Heading from "../common/Heading";
import Input from "../common/Input";
import Button from "../common/Button";
import Checkbox from "../common/Checkbox";
import { UtxosContext } from "../WithUtxos";

const permissionCss = css`
  margin: 16px;
  border: 2px solid #815de3;
  padding: 12px;
  min-height: 200px;
`;

function connectWalletToTxBridge(sessionId) {
  workerCourier("connect", { sessionId });
}

export default function ({ clientPayload, bchAddr }) {
  const [status, setStatus] = useState("WAITING");
  const [balance, setBalance] = useState();
  const [balanceInUSD, setBalanceInUSD] = useState();
  const [accomplishedTxs, setAccomplishedTxs] = useState([]);

  const { refetchUtxos } = useContext(UtxosContext);

  useEffect(() => {
    (async () => {
      if (!bchAddr) return;

      const { balance, balanceInUSD } = await getBalance(bchAddr);
      setBalance(balance);
      setBalanceInUSD(balanceInUSD);
    })();
  }, [bchAddr]);

  useEffect(() => {
    refetchUtxos();
    onWorkerEvent("tx", (eventData) => {
      if (eventData.status === "DONE") {
        setAccomplishedTxs([...accomplishedTxs, eventData]);
        refetchUtxos();
      }
    });
  }, []);

  async function handleAllow(e) {
    e.preventDefault();
    // generate sepnd token and send it to the dapp and tx bridge
    const walletEntropy = await getWalletEntropy();
    const slicedEntropy = walletEntropy.slice(0, 32);

    const { budget, deadline } = clientPayload;

    const spendToken = makeSpendToken(budget, deadline, slicedEntropy);
    const sessionId = makeSessionId();

    handleMessageBackToClient("GRANTED", clientPayload.reqId, {
      spendToken,
      sessionId,
    });

    connectWalletToTxBridge(sessionId);

    setStatus("APPROVED");

    // focus?
  }

  function handleDeny() {
    handleMessageBackToClient("DENIED", clientPayload.reqId);
    self.close();
  }

  return (
    <>
      <div class={permissionCss}>
        {status === "WAITING" && (
          <form onSubmit={handleAllow}>
            {typeof balanceInUSD !== "undefined" &&
              balanceInUSD < parseMoney(clientPayload.budget).value && (
                <Heading highlight number={4} alert>
                  Your balance is only ${balanceInUSD}, it is not enough to meet
                  the required budget requested by the application. Click{" "}
                  <a href="/top-up">here</a> to top up your wallet with some
                  BCH.
                </Heading>
              )}
            <Heading number={5}>
              Request for permission to spend from your wallet
            </Heading>
            <Heading number={4} inline>
              From:
            </Heading>
            <Heading
              number={4}
              inline
              customCss={css`
                color: black;
                margin: 8px 0;
              `}
            >
              {clientPayload.origin}
            </Heading>
            <div
              class={css`
                display: flex;
                flex-direction: row;
              `}
            >
              <Heading number={4}>Budget:</Heading>
              <Input
                small
                value={clientPayload.budget}
                width="80px"
                customCss={css`
                  margin: 8px 0;
                `}
              />
            </div>

            <Button type="submit" primary>
              Allow
            </Button>
            <Button onClick={handleDeny} type="button" secondary>
              Deny
            </Button>
          </form>
        )}

        {status === "APPROVED" && (
          <>
            <Heading number={4}>Access Granted</Heading>
            <Heading number={5} highlight>
              You can now go back to the application. Please keep this window
              open to allow {clientPayload.origin} to spend from your wallet up
              to {clientPayload.budget}
            </Heading>
            <p
              class={css`
                margin: 32px 16px;
              `}
            >
              Or simply revert back your permission by clicking the button below
            </p>
            <Button>Revert Back Permission</Button>
          </>
        )}
      </div>

      {accomplishedTxs.map((tx) => (
        <div
          class={css`
            background: #eee;
            padding: 16px;
            width: 100%;
            padding: 16px;
          `}
        >
          <Heading number={5}>Transaction: Done</Heading>
          <p>
            Spent {tx.action.amount} {tx.action.unit} to {tx.action.bchAddr}
          </p>
          <p>
            Tx Id:{" "}
            <a
              href={`https://blockchair.com/bitcoin-cash/transaction/${tx.txResult.txId}`}
              target="_blank"
              rel="noopener noreferer"
            >
              {tx.txResult.txId.slice(0, 15)}...
            </a>
          </p>
        </div>
      ))}
    </>
  );
}
