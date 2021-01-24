import { h, Fragment } from "preact";
import { css } from "emotion";

export default function ({ text }) {
  return (
    <p
      class={css`
        font-size: 0.8em;
        text-align: center;
        color: #7c3aed;
        margin-top: 32px;
      `}
    >
      {text}
    </p>
  );
}
