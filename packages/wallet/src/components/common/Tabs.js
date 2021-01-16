import { h, Fragment } from "preact";
import { useState } from "preact/hooks";
import { css, cx } from "emotion";
import Button from "./Button";

const tabPageCss = css`
  width: 100%;
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
    transition: left 0.5s;
    left: -${tabIndex * 100}%;
  `;

  return (
    <>
      <div class={tabContainerCss}>
        {sections.map(({ component }) => (
          <div class={tabPageCss}>{component}</div>
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
    </>
  );
}
