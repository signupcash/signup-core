import { h, Fragment } from "preact";
import { useState, useEffect, useContext, useReducer } from "preact/hooks";
import { Link } from "preact-router";
import { css } from "emotion";

import Heading from "../common/Heading";
import Button from "../common/Button";
import Article from "../common/Article";
import { UtxosContext } from "../WithUtxos";

import moment from 'moment'

const permissionCss = css`
  margin: 16px;
  padding: 12px;
`;

export default function () {

  const { utxoIsFetching, frozenUtxos, unfreezeUtxo } = useContext(UtxosContext);
  const frozenContributions = frozenUtxos.filter(utxo => {
    return utxo.reqType === "contribution"
  })

  async function handleContributionRevocation({ txid, vout }) {
    //TODO God willing: specifically for flipstarters, spend the contribution so it's not used later (not locked)
    //TODO God willing: in general just remove from frozen coins, God willing, so it shows in balance.
    await unfreezeUtxo(txid, vout)
  }

  return (
    <>
      <header>
        <Link href="/">{`< Back to Wallet`}</Link>
      </header>
      <Article>
        <Heading number={2}>Contribution History</Heading>

        { utxoIsFetching && <Heading number={3}>Fetching contributions...</Heading> }
        { !utxoIsFetching && (!frozenContributions || !frozenContributions.length) && <Heading number={3}>No contributions</Heading> }
        
        {frozenContributions &&
          frozenContributions.map(({ txid, vout, data }) => (
            <Article
              key={txid}
              customCss={css`
                width: 90%;
                margin: 16px;
                border: 1px solid black;
              `}
            >
              <Heading number={5}>Transaction: Contribution</Heading>
              <p style="width:100%">
                { data.origin && <div class={css`
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
                    {data.origin}
                    </Heading>
                </div> }
                
                { data.title && <div class={css`
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
                    {data.title}
                  </Heading>
                </div> }

                { data.amount && <div class={css`
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
                    `}>{ data.amount } { data.unit }</Heading>
                </div> }

                { data.expires && <div class={css`
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
                    { moment().to(moment.unix(data.expires)) }
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
                        href={__SIGNUP_BLOCKEXPLORER_TX__ + `${txid}`}
                        target="_blank"
                        rel="noopener noreferer"
                      >
                        {txid.slice(0, 15)}...
                      </a>
                    </Heading>
                </div>
              </p>
              <Button onClick={() => handleContributionRevocation({ txid, vout })} type="button" secondary customStyle={css`
                background: none;
                border: none;
              `}>Revoke</Button>
            </Article>
          ))}
      </Article>
    </>
  );
}