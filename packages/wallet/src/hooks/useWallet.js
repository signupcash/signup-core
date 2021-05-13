import { useEffect, useState } from "preact/hooks";
import * as wallet from "../utils/wallet";

export default function useWallet() {
  const [walletExist, setUserWalletExist] = useState();
  const [bchAddr, setBchAddr] = useState();
  const [slpAddr, setSlpAddr] = useState();

  useEffect(() => {
    (async () => {
      const doesWalletExist = await wallet.isUserWalletExist();
      const myBchAddr = await wallet.getWalletAddr();
      const mySlpAddr = await wallet.getWalletSLPAddr();

      if (typeof walletExist === "undefined") {
        setUserWalletExist(doesWalletExist);
      }
      if (walletExist && !bchAddr) {
        // fetch the address
        setBchAddr(myBchAddr);
        setSlpAddr(mySlpAddr);
      }
    })();
  });

  console.log("[Signup][Wallet Hook]", bchAddr);

  return { walletExist, bchAddr, slpAddr };
}
