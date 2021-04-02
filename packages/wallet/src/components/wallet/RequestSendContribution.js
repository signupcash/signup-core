import { h, Fragment } from "preact";
import { useState, useEffect, useContext, useReducer } from "preact/hooks";
import { css } from "emotion";
import {
  handleMessageBackToClient,
  onWorkerEvent,
} from "../../signer";
import { satsToBch, bchToFiat, sats } from "../../utils/unitUtils";
import { sendCommitmentTx } from "../../utils/transactions"

import Heading from "../common/Heading";
import Button from "../common/Button";
import Article from "../common/Article";
import { UtxosContext } from "../WithUtxos";

const permissionCss = css`
  margin: 16px;
  padding: 12px;
  min-height: 350px;
`;

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

export default function ({ clientPayload }) {
  // TODO move it to higher level using context
  const [status, setStatus] = useState("WAITING");
  // using this in state so user can change the parameter before accepting it
  const [balance, setBalance] = useState();
  const [balanceInUSD, setBalanceInUSD] = useState();
  const [accomplishedTxs, dispatchTx] = useReducer(txReducer, []);
  const [amountInSatoshis, setAmountInSatoshis] = useState();

  const { refetchUtxos, latestSatoshisBalance, utxoIsFetching, latestUtxos } = useContext(UtxosContext);
  
  useEffect(async () => {
    setAmountInSatoshis(await sats(clientPayload.amount, clientPayload.unit))
  }, [clientPayload.amount, clientPayload.unit])

  useEffect(async () => {
    if (!latestSatoshisBalance) return;

    const balance = satsToBch(latestSatoshisBalance);
    const balanceInUSD = await bchToFiat(balance, "usd");
    setBalance(balance);
    setBalanceInUSD(balanceInUSD);

  }, [latestSatoshisBalance]);
    
  useEffect(() => {
    setStatus("WAITING");
  }, [clientPayload.nonce]);

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

  function handleAllow(e) {
    e.preventDefault();
    (async () => {
      const commitmentObject = await sendCommitmentTx(
        clientPayload.recipients, 
        clientPayload.data, 
        clientPayload.amount, 
        clientPayload.unit,
        latestSatoshisBalance,
        latestUtxos
      )

      handleMessageBackToClient("CONTRIBUTION_SUCCESS", clientPayload.reqId, { payload: commitmentObject });
      setStatus("APPROVED");

    })();
    // focus?
  }

  function handleDeny() {
    handleMessageBackToClient("DENIED", clientPayload.reqId);
    self.close();
  }

  const balanceIsLoaded = !utxoIsFetching || !!latestSatoshisBalance;
  const balanceIsEnough = amountInSatoshis <= latestSatoshisBalance;

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
              Confirm the details of your commitment
            </Heading>
            <div class={css`
                display: flex;
                flex-direction: row;
                justify-content: space-between;
            `}>
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
            </div>
            <div
              class={css`
                display: flex;
                flex-direction: row;
                justify-content: space-between;
              `}
            >
              <Heading number={4}>Requesting:</Heading>
              <Heading
                number={4}
                inline
                width="50px"
                customCss={css`
                    color: black;
                    margin: 8px 0;
                    height: 27px;
                    font-size: 15px;
                `}>{ amountInSatoshis } SATS { balanceInUSD && `($${balanceInUSD})` }</Heading>
            </div>
            
            <div class={css`
                display: flex;
                flex-direction: row;
                justify-content: space-between;
            `}>
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
            </div>

            <Button type="submit" disabled={!balanceIsEnough} primary>
              {balanceIsEnough ? `Contribute (${amountInSatoshis} SATS)` : `Contribute`}
            </Button>
            <Button onClick={handleDeny} type="button" secondary>
              Refuse
            </Button>
          </form>
        )}

        {status === "APPROVED" && (
          <>
            <Heading number={4}>Successfully contibuted!</Heading>
            <Heading number={5} highlight>
              You can now go back to the application. Please keep this window
              open to allow {clientPayload.origin} to spend from your wallet up
              to {amountInSatoshis} SATS
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

      {balanceIsLoaded && accomplishedTxs && !!accomplishedTxs.length && <Heading number={3}>Existing contributions:</Heading>}

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
