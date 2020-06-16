import { h, Fragment } from "preact";
import { css } from "emotion";

const inputStyle = css`
  color: #3a3d99;
  width: 100%;
  font-family: Poppins, sans-serif;
  padding: 0.9rem 1.2rem;
  line-height: 1.5rem;
  margin: 16px;
  box-sizing: border-box;
  text-align: left;
  display: block;
  border: 2px solid #3a3d99;
  box-shadow: none;
  font-size: 16px;
  font-weight: 400;
  border-radius: 0.12rem;
  transition: color 0.1s ease-in-out, background-color 0.1s ease-in-out,
    border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
  &:hover {
    background: #f7e9ff;
  }
`;

export default function ({ type, onInput, value, placeholder, children }) {
  return (
    <input
      class={inputStyle}
      type={type}
      value={value}
      onInput={onInput}
      placeholder={placeholder}
    />
  );
}
