import { h, Fragment } from "preact";
import { WAIFU_NFT_IMAGE_SERVER, WAIFU_GROUP_ID } from "../../config";

export default ({ token, parentId }) => {
  return (
    <>
      {parentId === WAIFU_GROUP_ID ? (
        <img
          class={css`
            width: 150px;
            clip-path: inset(0 12px 0 12px);
          `}
          src={`${WAIFU_NFT_IMAGE_SERVER}/${token.tokenId}.png`}
        />
      ) : (
        <img
          class={css`
            width: 126px;
          `}
          src={token.documentUri}
        />
      )}
    </>
  );
};
