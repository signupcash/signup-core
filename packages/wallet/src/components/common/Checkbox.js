import { h, Fragment } from "preact";
import { css } from "emotion";

const checkmarkStyle = css`
  position: absolute;
  top: 0;
  left: 0;
  height: 25px;
  width: 25px;
  background-color: #eee;
  margin-left: -33px;
  &:after {
    content: "";
    position: absolute;
    display: none;
  }
`;

const containerStyle = css`
  display: block;
  align-content: left;
  position: relative;
  cursor: pointer;
  font-size: 16px;
  align-self: start;
  margin: 12px 35px;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;

  & input {
    position: absolute;
    opacity: 0;
    cursor: pointer;
    height: 0;
    width: 0;
  }

  &:hover input {
    background-color: #ccc;
  }

  & input:checked ~ #checkbox:after {
    display: block;
  }

  & #checkbox:after {
    left: 9px;
    top: 5px;
    width: 5px;
    height: 10px;
    border: solid white;
    border-width: 0 4px 4px 0;
    border-color: #7c3aed;
    -webkit-transform: rotate(45deg);
    -ms-transform: rotate(45deg);
    transform: rotate(45deg);
  }
`;

export default function ({ onClick, checked, disabled, children }) {
  return (
    <label class={containerStyle} onClick={onClick}>
      {children}
      <input type="checkbox" disabled={disabled} checked={checked} />
      <span class={checkmarkStyle} id="checkbox"></span>
    </label>
  );
}
