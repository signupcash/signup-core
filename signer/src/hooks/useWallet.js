import { useEffect, useState } from "preact/hooks";
import * as wallet from "../utils/wallet";

export default function useWallet() {
  const [walletExist, setUserWalletExist] = useState();
  const [bchAddr, setBchAddr] = useState();
  const [cashAccount, setCashAccount] = useState();

  useEffect(() => {
    (async () => {
      const walletExist = await wallet.isUserWalletExist();
      setUserWalletExist(walletExist);

      const myBchAddr = await wallet.getWalletAddr();

      if (walletExist && !bchAddr) {
        // fetch the address & cash accounts
        setBchAddr(myBchAddr);
      }

      if (walletExist && !cashAccount) {
        const { cashAccount } = await wallet.getWalletCashAccount(myBchAddr);
        if (!cashAccount) return;

        setCashAccount(cashAccount);
      }
    })();
  });

  console.log("[Signup][Wallet]", bchAddr, cashAccount);

  return { walletExist, bchAddr, cashAccount };
}
