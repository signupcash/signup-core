import { h } from "preact";
import { css } from "emotion";
import Logo from "../common/Logo";
import Button from "../common/Button";
import Heading from "../common/Heading";
import Article from "../common/Article";

const buttonGroups = css`
  display: flex;
  flex-direction: row;
  align-items: center;
`;

export default function () {
  return (
    <Article ariaLabel="Register New Wallet">
      <Heading number={2}>Login once, use everywhere!</Heading>
      <Logo block />
      <p>
        Signup is a universal non-custodial <b>Bitcoin Cash</b> authorization
        platform. In order to use Signup, you need to create or import a wallet.
      </p>

      <Button linkTo={"/new-wallet"} primary>
        Create a new wallet
      </Button>
      <Button secondary>Import an existing wallet</Button>

      <Heading number={4}>Free the market, free the world.</Heading>
    </Article>
  );
}
