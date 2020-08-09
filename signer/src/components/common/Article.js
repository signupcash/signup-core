import { h, Fragment } from "preact";
import { css, cx } from "emotion";

const articleCss = css`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: left;
  margin-top: 32px;
`;

export default function ({ ariaLabel, id, children, customCss }) {
  return (
    <article class={cx(articleCss, customCss)} id={id} aria-label={ariaLabel}>
      {children}
    </article>
  );
}
