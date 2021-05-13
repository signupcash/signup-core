import { h, Fragment } from "preact";
import { css, cx } from "emotion";

export default function ({
  number,
  highlight,
  alert,
  customCss,
  inline,
  size,
  ariaLabel,
  onClick,
  children,
}) {
  const headerStyle = cx(
    css`
      color: ${highlight ? "black" : "#7c3aed"};
      margin: ${number > 3 ? "8px" : "16px"};
      padding: 6px 12px;
      background: ${highlight
        ? alert
          ? "#ffd0e2"
          : "#f7e9ff"
        : "transparent"};
      font-weight: ${number > 4 ? 400 : 500};
      cursor: ${typeof onClick === "function" ? "pointer" : "auto"};
      transition: color 0.15s ease-in-out;
      ${inline && "display: inline-block;"}
      ${size && `font-size: ${size};`}
    `,
    customCss
  );

  return (
    <>
      {number == 1 && (
        <h1 onClick={onClick} aria-label={ariaLabel} class={headerStyle}>
          {children}
        </h1>
      )}
      {number == 2 && (
        <h2 onClick={onClick} aria-label={ariaLabel} class={headerStyle}>
          {children}
        </h2>
      )}
      {number == 3 && (
        <h3 onClick={onClick} aria-label={ariaLabel} class={headerStyle}>
          {children}
        </h3>
      )}
      {number == 4 && (
        <h4 onClick={onClick} aria-label={ariaLabel} class={headerStyle}>
          {children}
        </h4>
      )}
      {number == 5 && (
        <h5 onClick={onClick} aria-label={ariaLabel} class={headerStyle}>
          {children}
        </h5>
      )}
    </>
  );
}
