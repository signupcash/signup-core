import { h, Fragment } from "preact";
import { useState } from "preact/hooks";
import { css } from "emotion";

import RequestPermission from "./RequestPermission";

import Logo from "../common/Logo";
import Article from "../common/Article";
import Heading from "../common/Heading";
import Input from "../common/Input";
import Button from "../common/Button";
import Checkbox from "../common/Checkbox";

const headerStyle = css``;

const labelStyle = css`
  align-self: start;
  margin-bottom: -14px;
  margin-left: 8px;
`;
const Label = ({ children }) => <label class={labelStyle}>{children}</label>;

export default function ({ clientPayload }) {
  const { reqType } = clientPayload;

  function handleReload(e) {
    e.preventDefault();
  }

  console.log("[Payload] =>", clientPayload);

  return (
    <>
      <Article ariaLabel="Your Wallet">
        <Heading number={2}>Your Wallet</Heading>

        {reqType === "spend_token" && (
          <RequestPermission clientPayload={clientPayload} />
        )}

        {reqType !== "spend_token" && reqType !== "access" && (
          <>
            <Heading number={5} highlight>
              We are in beta! Make sure to follow us in Twitter{" "}
              <a
                href="https://twitter.com/0xSIGNUP"
                target="_blank"
                rel="noopener noreferer"
              >
                @0xSIGNUP
              </a>{" "}
              for more exciting news.
            </Heading>

            <Button
              customStyle={css`
                margin-top: 24px;
              `}
              type="button"
              primary
              linkTo="/top-up"
            >
              Top up
            </Button>
            <Button type="button" primary linkTo="/send">
              Send
            </Button>
          </>
        )}
      </Article>
    </>
  );
}
