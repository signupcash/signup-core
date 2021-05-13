import { h, Fragment } from "preact";
import { useState } from "preact/hooks";
import { css } from "emotion";
import axios from "axios";
import Logo from "../common/Logo";
import Article from "../common/Article";
import Heading from "../common/Heading";
import Input from "../common/Input";
import Button from "../common/Button";
import Checkbox from "../common/Checkbox";
import ConfirmRecoveryPhrases from "./ConfirmRecoveryPhrases";

const headerStyle = css``;

const labelStyle = css`
  align-self: start;
  margin-bottom: -14px;
  margin-left: 8px;
`;
const Label = ({ children }) => <label class={labelStyle}>{children}</label>;

export default function ({ clientPayload }) {
  const [optinForEmails, setOptinForEmails] = useState(false);
  const [email, setEmail] = useState("");
  const [step, setStep] = useState(1);
  const [isAnonymous, setIsAonymous] = useState(false);

  function handleCreateWallet(e) {
    e.preventDefault();
    if (email && optinForEmails) {
      axios.post("/api/subscribe-email", {
        email,
      });
    }

    setStep(2);
  }

  return (
    <>
      <header class={headerStyle}>
        <Logo />
      </header>
      <main>
        {step === 1 && (
          <form onSubmit={handleCreateWallet}>
            <Article ariaLabel="Create a New Wallet">
              <Heading number={2}>Create a new Wallet</Heading>
              <Checkbox
                checked={isAnonymous}
                onClick={(e) => {
                  e.preventDefault();
                  setIsAonymous(!isAnonymous);
                }}
              >
                Anonymous Wallet?
              </Checkbox>

              {!isAnonymous && (
                <>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    onInput={(e) => {
                      setEmail(e.target.value);
                    }}
                    placeholder="yourname@protonmail.com"
                  />
                </>
              )}

              {isAnonymous && (
                <>
                  <Heading number={5}>
                    Anonymous wallets are made fully on your browser and Signup
                    servers will be uninformed about the registration of this
                    account.
                  </Heading>
                  <Heading highlight number={5}>
                    In this mode we can't send you any future security or
                    product updates
                  </Heading>
                </>
              )}

              {!isAnonymous && (
                <Checkbox
                  onClick={(e) => {
                    e.preventDefault();
                    setOptinForEmails(!optinForEmails);
                  }}
                  checked={optinForEmails}
                >
                  Send me security & product updates
                </Checkbox>
              )}

              <Button type="submit" disabled={!email && !isAnonymous} primary>
                Create Wallet 🤖
              </Button>
            </Article>
          </form>
        )}
        {step === 2 && (
          <ConfirmRecoveryPhrases
            email={email}
            optinForEmails={optinForEmails}
            isAnonymous={isAnonymous}
          />
        )}
      </main>
    </>
  );
}
