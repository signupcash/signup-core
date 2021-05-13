import { h, Fragment } from "preact";
import { useState } from "preact/hooks";
import { css, cx } from "emotion";
import Button from "./Button";

const tabPageCss = css`
  width: 100%;
  height: 600px;
  box-sizing: border-box;
  overflow: hidden;
`;

export default function ({ sections }) {
  const [tabIndex, setTabIndex] = useState(0);

  const tabContainerCss = css`
    display: flex;
    flex-direction: row;
    position: relative;
    width: 200%;
    padding: 0;
    margin: 0;
    transition: left 0.3s ease;
    margin-bottom: 23px;
    left: -${tabIndex * 100}%;
  `;

  return (
    <div>
      <div class={tabContainerCss}>
        {sections.map(({ Component }) => (
          <div class={tabPageCss}>{Component}</div>
        ))}
      </div>
      <div>
        {sections.map(({ title }, idx) => (
          <Button
            inline
            customStyle={css`
              width: 50%;
            `}
            onClick={() => setTabIndex(idx)}
          >
            {title}
          </Button>
        ))}
      </div>
    </div>
  );
}
