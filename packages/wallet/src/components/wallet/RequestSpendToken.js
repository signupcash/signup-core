import { h, Fragment } from "preact";
import { useState, useEffect, useContext, useReducer } from "preact/hooks";
import { css } from "emotion";
import {
  handleMessageBackToClient,
  workerCourier,
  onWorkerEvent,
} from "../../signer";
import { makeSpendToken, makeSessionId } from "../../utils/permission";
import { satsToBch, bchToFiat } from "../../utils/unitUtils";
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
  return JSON.parse(JSON.stringify(data));
}

const txReducer = function (state, action) {
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
  // using this in state so user can change the parameter before accepting it
  const [budget, setBudget] = useState();
  const [balance, setBalance] = useState();
  const [balanceInUSD, setBalanceInUSD] = useState();
  const [accomplishedTxs, dispatchTx] = useReducer(txReducer, []);

  const { refetchUtxos, latestSatoshisBalance } = useContext(UtxosContext);

  useEffect(() => {
    if (!latestSatoshisBalance) return;

    const balance = satsToBch(latestSatoshisBalance);
    setBalance(balance);

    (async () => {
      // getting the fiat value
      const usdBalance = await bchToFiat(balance, "usd");
      setBalanceInUSD(usdBalance);
    })();
  }, [latestSatoshisBalance]);

  useEffect(() => {
    setStatus("WAITING");
  }, [clientPayload.nonce]);

  useEffect(() => {
    setBudget(parseFloat(clientPayload.budget).toFixed(2));
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

  function handleAllow(e) {
    e.preventDefault();
    (async () => {
      const { deadline } = clientPayload;

      const spendToken = await makeSpendToken(budget, deadline);
      const sessionId = makeSessionId();

      handleMessageBackToClient("GRANTED", clientPayload.reqId, {
        spendToken,
        sessionId,
      });

      connectWalletToTxBridge(sessionId);

      setStatus("APPROVED");
    })();
    // focus?
  }

  function handleDeny() {
    handleMessageBackToClient("DENIED", clientPayload.reqId);
    self.close();
  }

  const balanceIsLoaded = typeof balanceInUSD !== "undefined";
  const balanceIsEnough = budget && balanceInUSD >= budget;

  return (
    <>
      <div class={permissionCss}>
        {status === "WAITING" && (
          <form onSubmit={handleAllow}>
            {balanceIsLoaded && !balanceIsEnough && (
              <Heading highlight number={5} alert>
                Your balance is only ${balanceInUSD}, do you want to{" "}
                <a href="/top-up">Top-up</a> your wallet?
              </Heading>
            )}

            {balanceIsLoaded && balanceIsEnough && (
              <Heading number={5} highlight>
                Your balance is ${balanceInUSD}
              </Heading>
            )}

            {!balanceIsLoaded && (
              <Heading number={5} highlight>
                Fetching your current balance...
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
                value={budget}
                width="50px"
                customCss={css`
                  margin: 13px 0 8px;
                  height: 27px;
                  font-size: 15px;
                `}
                onChange={(e) => {
                  e.preventDefault();
                  setBudget(e.target.value);
                }}
              />
              <Heading
                number={4}
                inline
                customCss={css`
                  margin-left: -5px;
                `}
              >
                USD
              </Heading>
            </div>

            <Heading number={4} inline>
              Expires in:
            </Heading>
            <Heading
              number={4}
              inline
              customCss={css`
                color: black;
                margin: 8px 0;
              `}
            >
              1 hour
            </Heading>

            <Button type="submit" disabled={!balanceIsEnough} primary>
              {balanceIsEnough ? `Allow ($${budget})` : `Allow`}
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
              to ${budget}
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
