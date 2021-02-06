import { h, createContext } from "preact";
import { useEffect, useState } from "preact/hooks";
import { css } from "emotion";
import * as slpjs from "slpjs";
import { getWalletSLPAddr, getWalletAddr } from "../utils/wallet";
import { workerCourier } from "../signer";
import { getUtxos } from "../utils/blockchain";
import { getSlpUtxos } from "../utils/slp";

const BITBOX = require("bitbox-sdk").BITBOX;

const bitbox = new BITBOX();

export const UtxosContext = createContext({});

const WithUtxos = (Component) => {
  function WithUtxosComp(props) {
    const [utxoIsFetching, setUtxoIsFetching] = useState(false);
    const [latestUtxos, setLatestUtxos] = useState([]);
    const [latestSatoshisBalance, setLatestSatoshisBalance] = useState();
    const [slpUtxos, setSlpUtxos] = useState({});

    useEffect(() => {
      refetchUtxos();
    }, []);

    function cleanseCurrentUtxos() {
      setLatestUtxos([]);
      workerCourier("cleanse_utxos");
    }

    async function refetchUtxos() {
      cleanseCurrentUtxos();
      setUtxoIsFetching(true);

      const walletAddr = await getWalletAddr();
      const walletSlpAddr = await getWalletSLPAddr();

      let utxos;
      let slpUtxos;

      try {
        // Fetch normal UTXOs
        utxos = await getUtxos(walletAddr);
        // Fetch SLP UTXOs
        slpUtxos = await getSlpUtxos(walletSlpAddr);
      } catch (e) {
        console.log("ERROR with UTXOs");
      }

      // remove SLP Utxos from normal utxos
      utxos = utxos.filter(
        (u) => !slpUtxos.some((su) => su.txid === u.txid && su.vout === u.vout)
      );

      console.log("Utxos =>", utxos);
      console.log("SLP Utxos => ", slpUtxos);

      // calculate satoshis available
      const latestSatoshisBalance = utxos.reduce(
        (acc, c) => acc + c.satoshis,
        0
      );

      if (utxos) {
        setLatestSatoshisBalance(latestSatoshisBalance);
        setLatestUtxos(utxos);
        setSlpUtxos(slpUtxos);

        setUtxoIsFetching(false);
        // update data in the web worker
        workerCourier("update", {
          latestSatoshisBalance: latestSatoshisBalance,
          latestUtxos: utxos,
          slpUtxos: slpUtxos,
        });
      }
    }

    return (
      <UtxosContext.Provider
        value={{
          latestUtxos,
          slpUtxos,
          latestSatoshisBalance,
          refetchUtxos,
          utxoIsFetching,
        }}
      >
        {<Component {...props} />}
        {utxoIsFetching && (
          <div
            class={css`
              position: absolute;
              bottom: 30px;
              left: 0;
              width: 100vw;
              padding: 3px;
              font-size: 12px;
              opacity: 0.6;
            `}
          >
            <div
              class={css`
                max-width: 400px;
                margin: 0 auto;
                background: #797979;
                text-align: center;
                color: white;
              `}
            >
              Fetching UTXOs ....
            </div>
          </div>
        )}
      </UtxosContext.Provider>
    );
  }
  return WithUtxosComp;
};

export default WithUtxos;
