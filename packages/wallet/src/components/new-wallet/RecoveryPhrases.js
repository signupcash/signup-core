import { h, Fragment } from "preact";
import { css } from "emotion";
import Heading from "../common/Heading";

const divStyle = css`
  display: block;
  width: 100%;
  margin-bottom: 32px;
`;

const wordStyle = css`
  padding: 8px;
  background: #f7e9ff;
  float: left;
  margin: 8px;
  font-weight: 500;
  font-size: 16px;
`;

export default function ({ words }) {
  return (
    <div class={divStyle}>
      {words.map((word, idx) => (
        <span aria-label={`Phrase Number ${idx + 1}`} class={wordStyle}>
          {`${word} `}
        </span>
      ))}
    </div>
  );
}
