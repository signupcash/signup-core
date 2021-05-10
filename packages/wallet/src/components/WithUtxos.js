import { h, createContext } from "preact";
import { useEffect, useState } from "preact/hooks";
import { css } from "emotion";
import * as slpjs from "slpjs";
import {
  getWalletSLPAddr,
  getWalletAddr,
  isUserWalletExist,
} from "../utils/wallet";
import { workerCourier } from "../signer";
import { getAllUtxosWithSlpBalances } from "../utils/blockchain";
import { getSlpUtxos, getSlpBalances, getSlpBatonUtxos } from "../utils/slp";

const BITBOX = require("bitbox-sdk").BITBOX;

const bitbox = new BITBOX();

export const UtxosContext = createContext({});

const WithUtxos = (Component) => {
  function WithUtxosComp(props) {
    const [utxoIsFetching, setUtxoIsFetching] = useState(true);
    const [latestUtxos, setLatestUtxos] = useState([]);
    const [latestSatoshisBalance, setLatestSatoshisBalance] = useState();
    const [slpUtxos, setSlpUtxos] = useState({});
    const [slpBalances, setSlpBalances] = useState([]);
    const [bchAddr, setBchAddr] = useState();
    const [slpAddr, setSlpAddr] = useState();
    const [walletExist, setWalletExist] = useState();

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
      const walletExist = typeof walletAddr !== "undefined";
      setWalletExist(walletExist);

      if (!walletExist) {
        setUtxoIsFetching(false);
        return;
      }

      const walletSlpAddr = slpjs.Utils.toSlpAddress(walletAddr);

      const {
        utxos,
        slpUtxos,
        slpBalances,
        slpBatons,
        latestSatoshisBalance,
      } = await getAllUtxosWithSlpBalances(walletAddr);

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
          walletExist,
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
