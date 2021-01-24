import { h, Fragment } from "preact";
import { css, cx } from "emotion";
import Heading from "./Heading";

const boxCss = css`
  text-align: center;
  width: 200px;
  margin-top: 8px;
  &:hover {
    background: #f1dfff;
  }
`;

export default function ({ ariaLabel, children, customCss, title }) {
  return (
    <div class={cx(boxCss, customCss)} aria-label={ariaLabel}>
      <Heading number={5}>{title}</Heading>
      {children}
    </div>
  );
}
