import { h, createContext } from "preact";
import { useEffect, useState } from "preact/hooks";
import { css } from "emotion";
import * as slpjs from "slpjs";
import {
  getWalletSLPAddr,
  getWalletAddr,
  isUserWalletExist,
  freezeUtxo,
  unfreezeUtxo,
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
    const [frozenUtxos, setFrozenUtxos] = useState([]);
    
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
      const walletExist = !!walletAddr;
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
        currentFrozenUtxos,
        latestSatoshisBalance,
      } = await getAllUtxosWithSlpBalances(walletAddr);

      if (utxos) {
        setLatestSatoshisBalance(latestSatoshisBalance);
        setLatestUtxos(utxos);
        setFrozenUtxos(currentFrozenUtxos);
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
          frozenUtxos,
          freezeUtxo: async (txid, vout, reqType, data) => {
            //TODO God willing: refetch utxos to be sure they exist.
              // implications may be that can't freeze coins for unbroadcasted tx's
            const frozenUtxos = await freezeUtxo(txid, vout, reqType, data)
            setFrozenUtxos([].concat(...Object.values(frozenUtxos)))
          },
          unfreezeUtxo: async (txid, vout) => {
            await unfreezeUtxo(txid, vout)
            await refetchUtxos()
          }
        }}
      >
        {<Component {...props} />}
      </UtxosContext.Provider>
    );
  }
  return WithUtxosComp;
};

export default WithUtxos;
