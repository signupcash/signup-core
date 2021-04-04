import { h, createContext } from "preact";
import { useEffect, useState } from "preact/hooks";
import { css } from "emotion";
import * as slpjs from "slpjs";
import {
  getWalletSLPAddr,
  getWalletAddr,
  isUserWalletExist,
  getFrozenUtxos,
  freezeUtxo,
  unfreezeUtxo,
  unfreezeUtxos
} from "../utils/wallet";
import { workerCourier } from "../signer";
import { getUtxos } from "../utils/blockchain";
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
      const walletExist = typeof walletAddr !== "undefined";
      setWalletExist(walletExist);

      if (!walletExist) {
        setUtxoIsFetching(false);
        return;
      }

      const walletSlpAddr = await getWalletSLPAddr();

      let [rawUtxos, slpUtxos, slpBatons, slpBalances, frozenUtxos] = await Promise.all([
        getUtxos(walletAddr),
        getSlpUtxos(walletSlpAddr),
        getSlpBatonUtxos(walletSlpAddr),
        getSlpBalances(walletSlpAddr),
        getFrozenUtxos()
      ]).catch((e) => {
        console.log("ERROR with UTXOs", e);
      });

      console.log("Utxos =>", utxos);
      console.log("SLP Utxos => ", slpUtxos);
      console.log("Frozen Utxos => ", frozenUtxos);
      console.log("SLP Balances =>", slpBalances);

      // track which frozen coins are not found in the utxo set by removing from this copy
      const frozenCoinsNotFound = JSON.parse(JSON.stringify(frozenUtxos))
      
      // track which frozen coins are found
      const currentFrozenUtxos = []

      const utxos = rawUtxos.filter(({ txid, vout }) => {
        const frozenCoin = frozenUtxos[txid] && frozenUtxos[txid].find(fu => fu.vout === vout)

        // remove SLP Utxos from normal utxos
        const isSlp = slpUtxos.some((su) => su.txid === txid && su.vout === vout)

        // remove SLP Baton Utxos to avoid burning batons
        const isSlpBaton = slpBatons.some((su) => su.txid === txid && su.vout === vout)

        if (frozenCoin) {
          frozenCoinsNotFound[txid] = frozenCoinsNotFound[txid].filter(fu => fu.vout !== vout)
          currentFrozenUtxos.push(frozenCoin)
        }

        return !frozenCoin && !isSlp && !isSlpBaton
      })

      //unfreeze unfound frozen tokens
      const frozenCoinsWithoutUtxos = [].concat(...Object.values(frozenCoinsNotFound))

      // TODO God willing: don't unfreeze but actually mark as spent, God willing.
      if (frozenCoinsWithoutUtxos.length) {
        await unfreezeUtxos(frozenCoinsWithoutUtxos)
      }

      // calculate satoshis available
      const latestSatoshisBalance = utxos.reduce(
        (acc, c) => acc + c.satoshis,
        0
      );

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
            //TODO God willing: refetch utxos to be sure they exist, God willing.
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
