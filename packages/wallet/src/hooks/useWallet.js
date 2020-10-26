import { useEffect, useState } from "preact/hooks";
import * as wallet from "../utils/wallet";

export default function useWallet() {
  const [walletExist, setUserWalletExist] = useState();
  const [bchAddr, setBchAddr] = useState();
  const [cashAccount, setCashAccount] = useState();

  useEffect(() => {
    (async () => {
      const doesWalletExist = await wallet.isUserWalletExist();
      const myBchAddr = await wallet.getWalletAddr();

      if (walletExist && !cashAccount) {
        const { cashAccount } = await wallet.getWalletCashAccount(myBchAddr);
        setCashAccount(cashAccount);
      }

      if (typeof walletExist === "undefined") {
        setUserWalletExist(doesWalletExist);
      }
      if (walletExist && !bchAddr) {
        // fetch the address & cash accounts
        setBchAddr(myBchAddr);
      }
    })();
  });

  console.log("[Signup][Wallet Hook]", bchAddr, cashAccount);

  return { walletExist, bchAddr, cashAccount };
}
