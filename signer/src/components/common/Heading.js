import { h, Fragment } from "preact";
import { css } from "emotion";

export default function ({ number, highlight, size, ariaLabel, children }) {
  const headerStyle = css`
    color: ${highlight ? "black" : "#3a3d99"};
    margin: ${number > 3 ? "8px" : "16px"};
    padding: 6px 12px;
    background: ${highlight ? "#f7e9ff" : "white"};
    font-weight: ${number > 4 ? 400 : 500};
    transition: color 0.15s ease-in-out;
    ${size && `font-size: ${size};`}
  `;

  return (
    <>
      {number == 1 && (
        <h1 aria-label={ariaLabel} class={headerStyle}>
          {children}
        </h1>
      )}
      {number == 2 && (
        <h2 aria-label={ariaLabel} class={headerStyle}>
          {children}
        </h2>
      )}
      {number == 3 && (
        <h3 aria-label={ariaLabel} class={headerStyle}>
          {children}
        </h3>
      )}
      {number == 4 && (
        <h4 aria-label={ariaLabel} class={headerStyle}>
          {children}
        </h4>
      )}
      {number == 5 && (
        <h5 aria-label={ariaLabel} class={headerStyle}>
          {children}
        </h5>
      )}
    </>
  );
}
