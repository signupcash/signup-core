import { h, Fragment } from "preact";
import { useState, useEffect } from "preact/hooks";
import { Link } from "preact-router";
import { css } from "emotion";
import { toast } from "react-toastify";
import * as Sentry from "@sentry/browser";
import { deleteWallet } from "../../utils/wallet";
import Logo from "../common/Logo";
import Article from "../common/Article";
import Heading from "../common/Heading";
import Button from "../common/Button";

import "../../css/ReactToastify.css";

export default function () {
  const [isLoggedOut, setIsLoggedOut] = useState(false);

  async function handleLogout(e) {
    e.preventDefault();
    try {
      await deleteWallet();
      setIsLoggedOut(true);
    } catch (e) {
      toast.error(
        "Some error happened! This is strange but you're still not logged in. Please contact us at hello@signup.cash for help"
      );
      Sentry.captureException(e);
    }
  }

  return (
    <>
      <header>
        {!isLoggedOut && <Link href="/">{`< Back to Wallet`}</Link>}
      </header>
      <main>
        {isLoggedOut ? (
          <Article ariaLabel="Logout Form Your Wallet">
            <Heading number={2}>All good! 😇</Heading>
            <p
              class={css`
                padding: 16px;
              `}
            >
              You are logged out. You can safely close this window.
            </p>
          </Article>
        ) : (
          <form onSubmit={(e) => handleLogout(e)}>
            <Article ariaLabel="Logout Form Your Wallet">
              <Heading number={2}>Logging out</Heading>
              <p
                class={css`
                  padding: 16px;
                `}
              >
                Are you sure you want to log out? If you don't have your
                recovery key <b>you will lose access to your funds!</b>
              </p>

              <Button type="submit" alert>
                😎 Yes I'm sure
              </Button>
            </Article>
          </form>
        )}
      </main>
    </>
  );
}
