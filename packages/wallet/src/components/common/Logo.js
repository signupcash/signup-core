import { h } from "preact";
import { css, cx } from "emotion";

export default function ({ block }) {
  let logoContainer = css`
    margin: 16px 0;
  `;
  let logoStyle = css`
    font-size: 1.45rem;
    font-family: "Poppins", sans-serif;
    font-weight: 500;
    color: #7c3aed;
    text-align: left;
    text-decoration: none;
  `;

  if (block) {
    logoContainer = css`
      display: flex;
      width: 170px;
      height: 150px;
      background: #7c3aed;
      justify-content: center;
      user-select: none;
      margin: 32px;
    `;
    logoStyle = cx(
      logoStyle,
      css`
        color: white;
        text-align: center;
        font-size: 40px;
        font-weight: 500;
        align-self: center;
        margin: 0;
      `
    );
  }
  return (
    <span class={logoContainer} aria-label="SIGNUP Logo">
      <span class={logoStyle}>SIGN</span>
      <span
        class={cx(
          logoStyle,
          css`
            font-size: ${block ? "35px" : "1.32rem"};
            margin: ${block ? "5px 1px 0" : "1px"}1px;
            font-weight: 500;
          `
        )}
      >
        up
      </span>
    </span>
  );
}
