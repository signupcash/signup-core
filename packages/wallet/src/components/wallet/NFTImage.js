import { h, Fragment } from "preact";
import { css } from "emotion";
import Img from "react-image-fallback";
import {
  WAIFU_NFT_IMAGE_SERVER,
  WAIFU_GROUP_ID,
  ZOMBIE_GROUP_ID,
  ZOMBIE_NFT_IMAGE_SERVER,
  HONK_NFT_IMAGE_SERVER,
  HONK_GROUP_ID,
} from "../../config";
import placeholderImg from "../../assets/placeholder.jpg";

export default ({ token, parentId }) => {
  return (
    <>
      {parentId === WAIFU_GROUP_ID ? (
        <Img
          fallbackImage={placeholderImg}
          initialImage={placeholderImg}
          class={css`
            width: 150px;
            clip-path: inset(0 12px 0 12px);
          `}
          src={`${WAIFU_NFT_IMAGE_SERVER}/${token.tokenId}.png`}
        />
      ) : parentId === ZOMBIE_GROUP_ID ? (
        <Img
          fallbackImage={placeholderImg}
          initialImage={placeholderImg}
          class={css`
            width: 150px;
          `}
          src={`${ZOMBIE_NFT_IMAGE_SERVER}/${token.tokenId}.png`}
        />
      ) : parentId === HONK_GROUP_ID ? (
        <Img
          fallbackImage={placeholderImg}
          initialImage={placeholderImg}
          class={css`
            width: 150px;
          `}
          src={`${HONK_NFT_IMAGE_SERVER}/${token.tokenId}.png`}
        />
      ) : (
        <Img
          fallbackImage={placeholderImg}
          initialImage={placeholderImg}
          class={css`
            width: 126px;
          `}
          src={token.documentUri}
        />
      )}
    </>
  );
};
