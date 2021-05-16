import { h, Fragment } from "preact";

import { useState, useEffect, useContext, useReducer } from "preact/hooks";
import { Link } from "preact-router";
import { css } from "emotion";
import { toast } from "react-toastify";

import Heading from "../common/Heading";
import Button from "../common/Button";
import Article from "../common/Article";
import TextArea from "../common/TextArea";

import { UtxosContext } from "../WithUtxos";
import { sendCommitmentTx, sendBchTx, feesFor } from "../../utils/transactions"
import { BITCOIN_TX_EXPLORER, DUST } from "../../config"
import { isCashAddress, satsToBch, bchToFiat, sats } from "../../utils/unitUtils";

import moment from 'moment'

const labelStyle = css`
  align-self: start;
  margin-bottom: -14px;
  margin-left: 8px;
`;
const Label = ({ children }) => <label class={labelStyle}>{children}</label>;

export default function () {
  // using this in state so user can change the parameter before accepting it
  const [balanceInBch, setBalanceInBch] = useState();
  const [balanceInUSD, setBalanceInUSD] = useState();
  
  const [totalAmountInSatoshis, setTotalAmountInSatoshis] = useState();
  const [totalAmountInBCH, setTotalAmountInBCH] = useState();
  const [totalAmountInUSD, setTotalAmountInUSD] = useState();

  const { bchAddr, latestSatoshisBalance, utxoIsFetching, refetchUtxos, latestUtxos, frozenUtxos, freezeUtxo } = useContext(UtxosContext);
  const frozenContributions = frozenUtxos.filter(utxo => {
    return utxo.reqType === "contribution"
  })

  const [ unserializedCommitment, setUnserializedCommitment ] = useState("")
  const [ commitmentDetails, setDetails ] = useState(null)
  const [ canRevokeContributions, setCanRevokeContributions] = useState(false)
  const [ serializedPledgedCommitment, setSerializedPledgedCommitment ] = useState("")
  const [ buildingPledgeCommitment, setBuildingPledgeCommitment ] = useState(false)

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

    if (commitmentDetails && latestUtxos) {
      
      const totalAmountInSatoshis = (await sats(commitmentDetails.amount, "SATS"))
      const fees = calculateFeesForAmount(setTotalAmountInSatoshis)

      setTotalAmountInSatoshis(totalAmountInSatoshis + fees)

      const totalAmountInBCH = satsToBch(totalAmountInSatoshis);
      setTotalAmountInBCH(totalAmountInBCH);

      const totalAmountInUSD = await bchToFiat(totalAmountInBCH, "usd");
      setTotalAmountInUSD(totalAmountInUSD);
    }

  }, [latestUtxos, commitmentDetails])

  useEffect(async () => {
    if (!latestSatoshisBalance) return;

    const balanceInBch = satsToBch(latestSatoshisBalance);
    const balanceInUSD = await bchToFiat(balanceInBch, "usd");
    setBalanceInBch(balanceInBch || 0);
    setBalanceInUSD(balanceInUSD || 0);

  }, [latestSatoshisBalance]);

  async function parseCommitment(e) {

    setUnserializedCommitment(e.target.value)
    setDetails(null)

    try {
      
      const { outputs, donation, data, expires } = JSON.parse(Buffer.from(e.target.value, "base64").toString('utf16le'))
      const { amount } = donation

      const isValidOutputs = outputs && outputs.length && !outputs.some(({ value, address }) => {
        return !value || value < DUST || !isCashAddress(address);
      })
      
      const isExpired = typeof expires !== 'undefined' && moment().unix() > Number(expires)

      if (isValidOutputs && Number(amount) && !isExpired) {
        setDetails({ outputs, amount, data })
      }

    } catch (err) {
    }
  }

  async function makeManualContribution(e) {

    e.preventDefault();

    if (latestSatoshisBalance < totalAmountInSatoshis) {
      return
    }

    setBuildingPledgeCommitment(true)

    try {
      const commitmentObject = await sendCommitmentTx(
        commitmentDetails.outputs, 
        commitmentDetails.data, 
        commitmentDetails.amount, 
        "SATS",
        latestSatoshisBalance,
        latestUtxos
      )

      try {

        await freezeUtxo(
          commitmentObject.inputs[0].previous_output_transaction_hash, 
          commitmentObject.inputs[0].previous_output_index,
          "contribution",
          {
            title: "Manual",
            expires: commitmentDetails.expires,
            origin: "Manual",
            amount: commitmentDetails.amount,
            unit: "SATS"
          }
        )

      } catch (err) {
        console.log("Failed to freeze coins!", err)
      }
      
      const serialized = btoa(JSON.stringify(commitmentObject))
      setSerializedPledgedCommitment(serialized)
    
    } catch(err) {
      
      console.log(err)
      toast.error("Failed to build commitment transaction!")

    } finally {
      
      setBuildingPledgeCommitment(false)
    }
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

  function copyPledgeCommitment() {
    navigator.clipboard.writeText(serializedPledgedCommitment)
    toast.info("Copied pledge to clipboard");
  }
  
  const balanceIsLoaded = !utxoIsFetching;
  const balanceIsEnough = totalAmountInSatoshis <= latestSatoshisBalance;
  const showBalanceInSats = latestSatoshisBalance < 5000000
  const balanceInUSDStr = !isNaN(balanceInUSD) ? " ($" + balanceInUSD  + ")" : ""
  const balanceStr = (showBalanceInSats ? `${ latestSatoshisBalance || "0" } SATS` : `${ balanceInBch || "0" } BCH`) + balanceInUSDStr
  const showTotalAmountInSats = totalAmountInSatoshis < 5000000
  const totalAmountStr = showTotalAmountInSats ? 
    `${ totalAmountInSatoshis || "0" } SATS` : 
    `${ totalAmountInBCH || "0" } BCH`
  
  const totalAmountInUSDStr = !isNaN(totalAmountInUSD) ? " ($" + totalAmountInUSD  + ")" : ""

  return (
    <>
      <header>
        <Link href="/">{`< Back to Wallet`}</Link>
      </header>
      <Article>
        <Heading number={2}>Manual Contribution</Heading>
        <form onSubmit={makeManualContribution} style="width:100%">

          { balanceIsLoaded && commitmentDetails && !balanceIsEnough && (
            <Heading highlight number={5} alert>
              Your balance is only { balanceStr }, do you want to{" "}
              <a href="/top-up">Top-up</a> your wallet?
            </Heading>
          )}

          {balanceIsLoaded && (!commitmentDetails || balanceIsEnough) && (
            <Heading number={5} highlight>
              Your balance is { balanceStr }
            </Heading>
          )}

          {!balanceIsLoaded && (
            <Heading number={5} highlight>
              Fetching your current balance...
            </Heading>
          )}
          
          <div style="margin-top:16px">
            <Label>Pledge request <small>(paste)</small></Label>
            <TextArea 
              width="100%" 
              rows="5" 
              value={unserializedCommitment}
              onInput={parseCommitment}
            />
          </div>

          { commitmentDetails ?
              !serializedPledgedCommitment ?
              <Button type="submit" primary disabled={!balanceIsEnough} customStyle={css`margin-top: 16px;`}>
                { buildingPledgeCommitment ? "Building..." : balanceIsEnough ? `Pledge ${ totalAmountStr }${ totalAmountInUSDStr }` : `Pledge`}
              </Button> :
              <Button primary customStyle={css`margin-top: 16px;`} onClick={copyPledgeCommitment}>📋 Copy Pledge Result</Button> :
              <Button type="button" primary disabled customStyle={css`margin-top: 16px;`}>
                  Pledge
              </Button>
          }

          <Button type="button" secondary onClick={(e) => { setDetails(null); setUnserializedCommitment(""); setSerializedPledgedCommitment("") }} disabled={!commitmentDetails || buildingPledgeCommitment}>
              { serializedPledgedCommitment ? "Clear" : "Refuse" }
          </Button>
          
        </form>

        <hr style="display: block;
          width: 100%;
          border: 1px dashed #9b8eb4;
          margin: 48px 0px 24px 0px;"
        ></hr>

        <Heading number={3}>Contribution History</Heading>

        { utxoIsFetching && <Heading number={4}>Fetching contributions...</Heading> }
        { !utxoIsFetching && (!frozenContributions || !frozenContributions.length) && <Heading number={3}>No contributions</Heading> }
        
        { 
          !utxoIsFetching && frozenContributions && frozenContributions.map((utxo) => (
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
          ))
        }
        
      </Article>
    </>
  );
}