import { h, Fragment } from "preact";
import { useState, useEffect, useContext, useReducer } from "preact/hooks";
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
import Article from "../common/Article";
import { UtxosContext } from "../WithUtxos";

const permissionCss = css`
  margin: 16px;
  padding: 12px;
  min-height: 350px;
`;

function connectWalletToTxBridge(sessionId) {
  workerCourier("connect", { sessionId });
}

function deepClone(data) {
  try {
    return JSON.parse(JSON.stringify(data));
  } catch (e) {
    console.log("[SIGUP][ERROR]", e);
  }
}

const txReducer = function (state, action) {
  console.log("disptached", action);
  switch (action.type) {
    case "TX_PUSH":
      return [...state, action.value];
    default:
      return state;
  }
};

export default function ({ clientPayload, bchAddr }) {
  // TODO move it to higher level using context
  const [status, setStatus] = useState("WAITING");
  const [balance, setBalance] = useState();
  const [balanceInUSD, setBalanceInUSD] = useState();
  const [accomplishedTxs, dispatchTx] = useReducer(txReducer, []);

  const { refetchUtxos } = useContext(UtxosContext);

  useEffect(() => {
    (async () => {
      if (!bchAddr) return;

      const { balance, balanceInUSD } = await getBalance(bchAddr);
      setBalance(balance);
      setBalanceInUSD(balanceInUSD);
    })();
  }, [bchAddr]);

  function getAccomplishedTxs() {
    return accomplishedTxs;
  }

  useEffect(() => {
    refetchUtxos();
    onWorkerEvent("tx", (eventData) => {
      if (eventData.status === "DONE") {
        const newTx = deepClone(eventData);
        dispatchTx({
          type: "TX_PUSH",
          value: newTx,
        });
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

  const balanceIsLoaded = typeof balanceInUSD !== "undefined";

  return (
    <>
      <div class={permissionCss}>
        {status === "WAITING" && (
          <form onSubmit={handleAllow}>
            {balanceIsLoaded &&
            balanceInUSD < parseMoney(clientPayload.budget).value ? (
              <Heading highlight number={5} alert>
                Your balance is only ${balanceInUSD}, it is not enough to meet
                the required budget requested by the application. Click{" "}
                <a href="/top-up">here</a> to top up your wallet with some BCH.
              </Heading>
            ) : (
              <Heading number={5} highlight>
                Fetching your wallet's balance...
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

      {balanceIsLoaded && <Heading number={3}>Spendings on this app:</Heading>}

      {accomplishedTxs &&
        accomplishedTxs.map((tx, idx) => (
          <Article
            key={idx}
            customCss={css`
              background: #eee;
              width: 90%;
              margin: 16px;
              border: 1px solid black;
            `}
          >
            <Heading number={5}>Transaction: Sent</Heading>
            <p>
              Spent <b>{tx.action.amount}</b> {tx.action.unit} to{" "}
              <b>
                <a
                  href={`https://blockchair.com/bitcoin-cash/address/${tx.action.bchAddr}`}
                  target="_blank"
                  rel="noopener noreferer"
                >
                  {tx.action.bchAddr.slice(0, 16)}...
                </a>
              </b>
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
          </Article>
        ))}
    </>
  );
}
