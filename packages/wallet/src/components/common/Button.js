import { h, Fragment } from "preact";
import { Link } from "preact-router";
import { css, cx } from "emotion";

export default function ({
  type,
  primary,
  secondary,
  green,
  alert,
  linkTo,
  onClick,
  disabled,
  inline,
  customStyle,
  children,
}) {
  const isPrimary = primary || !secondary;
  const isSecondary = secondary;

  function getBgColor() {
    if (disabled) {

      if (isSecondary) {
        return "#b6b6b6"
      }

      return "#aa91ee";
    }

    if (alert) {
      return "#f74476";
    }

    if (green) {
      return "#28d9a7";
    }

    if (isPrimary) {
      return "#7c3aed";
    }

    return "lightgray";
  }

  function getHoverBgColor() {
    if (disabled) {

      if (isSecondary) {
        return "#b6b6b6"
      }
      
      return "#aa91ee";
    }
    
    if (alert) {
      return "#c41a4a";
    }
    
    if (green) {
      return "#28d9a7";
    }
    
    if (isPrimary) {
      return "#815de3";
    }

    return "gray";
  }

  const buttonStyle = css`
    background: ${getBgColor()};
    color: ${isPrimary || disabled ? "white" : "black"};
    user-select: none;
    width: 100%;
    font-family: Poppins, sans-serif;
    padding: 0.6rem 1.2rem;
    line-height: 1.5rem;
    margin: 8px auto;
    text-decoration: none;
    box-sizing: border-box;
    text-align: center;
    display: ${inline ? "inline-block" : "block"};
    border: 0.1rem solid;
    font-size: 16px;
    font-weight: 400;
    cursor: ${disabled ? "default" : "pointer"};
    transition: color 0.1s ease-in-out, background-color 0.1s ease-in-out,
      border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
    &:hover {
      background: ${getHoverBgColor()};
    }
  `;

  return (
    <>
      {linkTo && linkTo.includes("https") && (
        <a
          href={linkTo}
          target="_blank"
          rel="noopener noreferrer"
          class={cx(buttonStyle, customStyle)}
        >
          {children}
        </a>
      )}

      {linkTo && !linkTo.includes("https") && (
        <Link href={linkTo} class={cx(buttonStyle, customStyle)}>
          {children}
        </Link>
      )}

      {!linkTo && (
        <button
          disabled={disabled}
          type={type || "button"}
          onClick={disabled ? () => null : onClick}
          class={cx(buttonStyle, customStyle)}
        >
          {children}
        </button>
      )}
    </>
  );
}
