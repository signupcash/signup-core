import { h, createContext } from "preact";
import { useEffect, useState } from "preact/hooks";
import * as slpjs from "slpjs";
import { getWalletAddr } from "../utils/wallet";
import { workerCourier } from "../signer";

const BITBOX = require("bitbox-sdk").BITBOX;

const bitbox = new BITBOX();
const bitboxWithSLP = new slpjs.BitboxNetwork(bitbox);

export const UtxosContext = createContext({});

const WithUtxos = (Component) => {
  function WithUtxosComp(props) {
    const [utxoIsFetching, setUtxoIsFetching] = useState(false);
    const [latestUtxos, setLatestUtxos] = useState([]);
    const [latestSatoshisBalance, setLatestSatoshisBalance] = useState();

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
      let balancesAndUtxos;
      // Re-fetch All SLP judged UTXOs

      balancesAndUtxos = await bitboxWithSLP.getAllSlpBalancesAndUtxos(
        walletAddr
      );

      console.log(balancesAndUtxos);

      if (balancesAndUtxos) {
        setLatestSatoshisBalance(balancesAndUtxos.satoshis_available_bch);
        setLatestUtxos(balancesAndUtxos.nonSlpUtxos);
        setUtxoIsFetching(false);
        // update data in the web worker
        workerCourier("update", {
          latestSatoshisBalance: balancesAndUtxos.satoshis_available_bch,
          latestUtxos: balancesAndUtxos.nonSlpUtxos,
        });
      }
    }

    return (
      <UtxosContext.Provider
        value={{
          latestUtxos,
          latestSatoshisBalance,
          refetchUtxos,
          utxoIsFetching,
        }}
      >
        {<Component {...props} />}
      </UtxosContext.Provider>
    );
  }
  return WithUtxosComp;
};

export default WithUtxos;
