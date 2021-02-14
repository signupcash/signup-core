import { h, createContext } from "preact";
import { useEffect, useState } from "preact/hooks";
import { css } from "emotion";
import * as slpjs from "slpjs";
import { getWalletSLPAddr, getWalletAddr } from "../utils/wallet";
import { workerCourier } from "../signer";
import { getUtxos } from "../utils/blockchain";
import { getSlpUtxos, getSlpBalances } from "../utils/slp";

const BITBOX = require("bitbox-sdk").BITBOX;

const bitbox = new BITBOX();

export const UtxosContext = createContext({});

const WithUtxos = (Component) => {
  function WithUtxosComp(props) {
    const [utxoIsFetching, setUtxoIsFetching] = useState(true);
    const [latestUtxos, setLatestUtxos] = useState([]);
    const [latestSatoshisBalance, setLatestSatoshisBalance] = useState();
    const [slpUtxos, setSlpUtxos] = useState({});
    const [slpBalances, setSlpBalances] = useState();
    const [bchAddr, setBchAddr] = useState();
    const [slpAddr, setSlpAddr] = useState();

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

      let [utxos, slpUtxos, slpBalances] = await Promise.all([
        getUtxos(walletAddr),
        getSlpUtxos(walletSlpAddr),
        getSlpBalances(walletSlpAddr),
      ]).catch((e) => {
        console.log("ERROR with UTXOs", e);
      });

      console.log("Utxos =>", utxos);
      console.log("SLP Utxos => ", slpUtxos);
      console.log("SLP Balances =>", slpBalances);

      // remove SLP Utxos from normal utxos
      utxos = utxos.filter(
        (u) => !slpUtxos.some((su) => su.txid === u.txid && su.vout === u.vout)
      );

      // calculate satoshis available
      const latestSatoshisBalance = utxos.reduce(
        (acc, c) => acc + c.satoshis,
        0
      );

      if (utxos) {
        setLatestSatoshisBalance(latestSatoshisBalance);
        setLatestUtxos(utxos);
        setSlpUtxos(slpUtxos);
        setSlpBalances(slpBalances);
        setBchAddr(walletAddr);
        setSlpAddr(walletSlpAddr);

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
          slpBalances,
          bchAddr,
          slpAddr,
        }}
      >
        {<Component {...props} />}
      </UtxosContext.Provider>
    );
  }
  return WithUtxosComp;
};

export default WithUtxos;
