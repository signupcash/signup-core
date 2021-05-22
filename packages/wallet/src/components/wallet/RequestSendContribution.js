import { h, Fragment } from "preact";
import { useState, useEffect, useContext, useReducer } from "preact/hooks";
import { css } from "emotion";
import { handleMessageBackToClient } from "../../signer";
import { satsToBch, bchToFiat, sats } from "../../utils/unitUtils";
import { sendCommitmentTx, sendBchTx, feesFor } from "../../utils/transactions"

import Heading from "../common/Heading";
import Button from "../common/Button";
import Article from "../common/Article";
import { UtxosContext } from "../WithUtxos";

import moment from 'moment'
import { BITCOIN_TX_EXPLORER } from '../../config'
const permissionCss = css`
  margin: 16px;
  padding: 12px;
`;

export default function ({ clientPayload }) {
  // TODO move it to higher level using context
  const [status, setStatus] = useState("WAITING");
  // using this in state so user can change the parameter before accepting it
  const [balanceInBch, setBalanceInBch] = useState();
  const [balanceInUSD, setBalanceInUSD] = useState();
  
  const [donationAmountInSatoshis, setDonationAmountInSatoshis] = useState();
  const [donationAmountInBCH, setDonationAmountInBCH] = useState();
  const [donationAmountInUSD, setDonationAmountInUSD] = useState();
  
  const [totalAmountInSatoshis, setTotalAmountInSatoshis] = useState();
  const [totalAmountInBCH, setTotalAmountInBCH] = useState();
  const [totalFeesInSatoshis, setTotalFeesInSatoshis] = useState();

  const { bchAddr, latestSatoshisBalance, utxoIsFetching, refetchUtxos, latestUtxos, frozenUtxos, freezeUtxo } = useContext(UtxosContext);
  const frozenContributions = frozenUtxos.filter(utxo => {
    return utxo.reqType === "contribution"
  })
  const [ canRevokeContributions, setCanRevokeContributions] = useState(false)

  function calculateFeesForAmount(amount) {
    let inputsSats = 0;
    let selectedUtxos = 0;
    let fees;

    latestUtxos.forEach((utxo) => {
      if (selectedUtxos > 0 && inputsSats >= amount) {
        return;
      }

      selectedUtxos++;
      // keeping track of inputs
      inputsSats += utxo.satoshis;
      fees = feesFor(selectedUtxos, 2);
    });

    return fees;
  }

  useEffect(() => {

    let inputsSats = 0;

    for(let i=0; i < latestUtxos.length; i++) {
      const utxo = latestUtxos[i]

      //add utxo and increment count and calculate new total fees
      const inputCount = i + 1;
      const fees = feesFor(inputCount + 1, 2)
      
      inputsSats += utxo.satoshis;

      //break if inputs satisfy amount + fee
      if (inputsSats >= fees) {
        return setCanRevokeContributions(true)
      }
    }

    return setCanRevokeContributions(false)

  }, [latestUtxos])

  useEffect(async () => {

    if (!latestUtxos) return;

    const totalAmountInSatoshis = (await sats(clientPayload.amount, clientPayload.unit))

    setTotalAmountInSatoshis(totalAmountInSatoshis)
    setTotalFeesInSatoshis(calculateFeesForAmount(totalAmountInSatoshis))

    const donationAmountInSatoshis = totalAmountInSatoshis - clientPayload.data.includingFee
    setDonationAmountInSatoshis(donationAmountInSatoshis)

    const donationAmountInBCH = satsToBch(donationAmountInSatoshis);
    setDonationAmountInBCH(donationAmountInBCH);

    const donationAmountInUSD = await bchToFiat(donationAmountInBCH, "usd");
    setDonationAmountInUSD(donationAmountInUSD);

    const totalAmountInBCH = satsToBch(totalAmountInSatoshis);
    setTotalAmountInBCH(totalAmountInBCH);

  }, [latestUtxos, clientPayload.amount, clientPayload.unit, clientPayload.data.includingFee])

  useEffect(async () => {

    if (!latestSatoshisBalance) return;

    const balanceInBch = satsToBch(latestSatoshisBalance);
    const balanceInUSD = await bchToFiat(balanceInBch, "usd");
    setBalanceInBch(balanceInBch || 0);
    setBalanceInUSD(balanceInUSD || 0);

  }, [latestSatoshisBalance]);

  useEffect(() => {
    setStatus("WAITING");
  }, [clientPayload.nonce]);

  function handleAllow(e) {
    e.preventDefault();
    (async () => {

      if (latestSatoshisBalance < totalAmountInSatoshis) {
        return
      }

      const commitmentObject = await sendCommitmentTx(
        clientPayload.recipients, 
        clientPayload.data, 
        clientPayload.amount, 
        clientPayload.unit,
        latestSatoshisBalance,
        latestUtxos
      )

      try {

        await freezeUtxo(
          commitmentObject.inputs[0].previous_output_transaction_hash, 
          commitmentObject.inputs[0].previous_output_index,
          "contribution",
          {
            title: clientPayload.data.title,
            expires: clientPayload.data.expires,
            origin: clientPayload.origin,
            amount: totalAmountInSatoshis,
            unit: "SATS"
          }
        )

      } catch (err) {
        console.log("Failed to freeze coins!")
      }

      const serializedObject = btoa(JSON.stringify(commitmentObject))
      handleMessageBackToClient("CONTRIBUTION_SUCCESS", clientPayload.reqId, { payload: serializedObject });
      setStatus("APPROVED");

    })();
    // focus?
  }

  function handleDeny() {
    handleMessageBackToClient("DENIED", clientPayload.reqId);
    self.close();
  }
  
  async function handleContributionRevocation({ txid, vout, data }) {

    const frozenUtxo = { txid, vout, satoshis: data.amount }

    if (!canRevokeContributions) {
      return
    }

    //Invalidate the utxo
    await sendBchTx(
      data.amount, 
      "SATS", 
      bchAddr, 
      latestSatoshisBalance, 
      //Assuming utxo selection always adds utxos in order. Flag for future-proofing.
      [{ ...frozenUtxo, flag: "require" }, ...latestUtxos]
    )

    await refetchUtxos()
  }

  const balanceIsLoaded = !utxoIsFetching;
  const balanceIsEnough = totalAmountInSatoshis + totalFeesInSatoshis <= latestSatoshisBalance;

  const showBalanceInSats = latestSatoshisBalance < 5000000
  const balanceInUSDStr = !isNaN(balanceInUSD) ? " ($" + balanceInUSD  + ")" : ""
  const balanceStr = (showBalanceInSats ? `${ latestSatoshisBalance || "0" } SATS` : `${ balanceInBch || "0" } BCH`) + balanceInUSDStr

  const showDonationAmountInSats = donationAmountInSatoshis < 5000000
  const donationAmountInUSDStr = !isNaN(donationAmountInUSD) ? " ($" + donationAmountInUSD  + ")" : ""
  const donationAmountStr = (showDonationAmountInSats ? `${ donationAmountInSatoshis || "0" } SATS` : `${ donationAmountInBCH || "0" } BCH`) + donationAmountInUSDStr
  
  const showTotalAmountInSats = totalAmountInSatoshis < 5000000
  const totalAmountStr = showTotalAmountInSats ? 
    `${ totalAmountInSatoshis + totalFeesInSatoshis || "0" } SATS` : 
    `${ totalAmountInBCH || "0" } BCH`
  
  return (
    <>
      <div class={permissionCss}>
        {status === "WAITING" && (
          <form onSubmit={handleAllow}>
            {balanceIsLoaded && !balanceIsEnough && (
              <Heading highlight number={5} alert>
                Your balance is only { balanceStr }, do you want to{" "}
                <a href="/top-up">Top-up</a> your wallet?
              </Heading>
            )}

            {balanceIsLoaded && balanceIsEnough && (
              <Heading number={5} highlight>
                Your balance is { balanceStr }
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
                    text-align: right;
                `}
                >
                {clientPayload.origin}
                </Heading>
            </div>
            { clientPayload.data && clientPayload.data.title && <div class={css`
                  display: flex;
                  flex-direction: row;
                  justify-content: space-between;
              `}>
              <Heading number={4} inline>
                To:
                </Heading>
                <Heading
                number={4}
                inline
                customCss={css`
                    color: black;
                    margin: 8px 0;
                    text-align: right;
                `}
                >
                {clientPayload.data.title}
              </Heading>
            </div> }
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
                    text-align: right;
                `}>{ donationAmountStr }</Heading>
            </div>
            
            { clientPayload.data && clientPayload.data.includingFee && <div class={css`
                display: flex;
                flex-direction: row;
                justify-content: space-between;
            `}>
                <Heading number={4} inline>
                Fee:
                </Heading>
                <Heading
                number={4}
                inline
                customCss={css`
                    color: black;
                    margin: 8px 0;
                    text-align: right;
                `}
                >
                { clientPayload.data.includingFee + totalFeesInSatoshis } SATS
                </Heading>
            </div> }

            { clientPayload.data && clientPayload.data.expires && <div class={css`
                display: flex;
                flex-direction: row;
                justify-content: space-between;
            `}>
                <Heading number={4} inline>
                Expires:
                </Heading>
                <Heading
                number={4}
                inline
                customCss={css`
                    color: black;
                    margin: 8px 0;
                    text-align: right;
                `}
                >
                { moment().to(moment.unix(clientPayload.data.expires)) }
                </Heading>
            </div> }

            <Button type="submit" disabled={!balanceIsEnough} primary>
              {balanceIsEnough ? `Contribute (${ totalAmountStr })` : `Contribute`}
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
              You can now go back to the application. Thank you for your contribution!
            </Heading>
          </>
        )}
      </div>
    
      {balanceIsLoaded && frozenContributions && !!frozenContributions.length && <Heading number={3}>Existing contributions:</Heading>}
      {!balanceIsLoaded && <Heading number={3}>Fetching existing contributions...</Heading>}

      {balanceIsLoaded && frozenContributions &&
        frozenContributions.map((utxo) => (
          <Article
            key={utxo.txid}
            customCss={css`
              width: 90%;
              margin: 16px;
              border: 1px solid black;
            `}
          >
            <Heading number={5}>Transaction: Contribution</Heading>
            <p style="width:100%">
              { utxo.data.origin && <div class={css`
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
                      text-align: right;
                  `}
                  >
                  {utxo.data.origin}
                  </Heading>
              </div> }
              
              { utxo.data.title && <div class={css`
                    display: flex;
                    flex-direction: row;
                    justify-content: space-between;
                `}>
                <Heading number={4} inline>
                  To:
                  </Heading>
                  <Heading
                  number={4}
                  inline
                  customCss={css`
                      color: black;
                      margin: 8px 0;
                      text-align: right;
                  `}
                  >
                  {utxo.data.title}
                </Heading>
              </div> }

              { utxo.data.amount && <div class={css`
                    display: flex;
                    flex-direction: row;
                    justify-content: space-between;
                  `}
                >
                <Heading number={4}>Total spent:</Heading>
                <Heading
                  number={4}
                  inline
                  width="50px"
                  customCss={css`
                      color: black;
                      margin: 8px 0;
                      height: 27px;
                      font-size: 15px;
                      text-align: right;
                  `}>{ utxo.data.amount } { utxo.data.unit }</Heading>
              </div> }

              { utxo.data.expires && <div class={css`
                  display: flex;
                  flex-direction: row;
                  justify-content: space-between;
              `}>
                  <Heading number={4} inline>
                  Expires:
                  </Heading>
                  <Heading
                  number={4}
                  inline
                  customCss={css`
                      color: black;
                      margin: 8px 0;
                      text-align: right;
                  `}
                  >
                  { moment().to(moment.unix(utxo.data.expires)) }
                  </Heading>
              </div> }
              
              <div class={css`
                  display: flex;
                  flex-direction: row;
                  justify-content: space-between;
              `}>
                  <Heading number={4} inline>
                  Tx Id:
                  </Heading>
                  <Heading
                  number={4}
                  inline
                  customCss={css`
                      color: black;
                      margin: 8px 0;
                      text-align: right;
                  `}
                  >
                    <a
                      href={BITCOIN_TX_EXPLORER + `${utxo.txid}`}
                      target="_blank"
                      rel="noopener noreferer"
                    >
                      {utxo.txid.slice(0, 15)}...
                    </a>
                  </Heading>
              </div>
            </p>
            <Button disabled={ !canRevokeContributions } onClick={() => handleContributionRevocation(utxo)} type="button" secondary customStyle={css`
              background: none;
              border: none;
            `}>Revoke</Button>
          </Article>
        ))}

    </>
  );
}
