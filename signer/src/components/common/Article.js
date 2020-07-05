import { h, Fragment } from "preact";
import { css } from "emotion";

const articleStyle = css`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: left;
  margin-top: 32px;
`;

export default function ({ ariaLabel, id, children }) {
  return (
    <article class={articleStyle} id={id} aria-label={ariaLabel}>
      {children}
    </article>
  );
}
