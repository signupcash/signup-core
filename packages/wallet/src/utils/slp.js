import axios from "axios";
import { SLPDB_DEFAULT_URL } from "../config";

// Some SLPdb queries are used with adjustment from https://github.com/mainnet-cash/mainnet-js/blob/1706526a94f73968648b68de02dff45283d76637/src/slp/SlpDbTemplates.ts#L286

function executeSlpDbQuery(q) {
  const b64 = btoa(JSON.stringify(q));
  const endpoint = `${SLPDB_DEFAULT_URL}/q/${b64}`;

  return axios.get(endpoint);
}

export async function getSlpByTokenId(tokenId) {
  const q = {
    v: 3,
    q: {
      db: ["t"],
      find: {
        "tokenDetails.tokenIdHex": tokenId,
      },
    },
    project: { tokenDetails: 1, tokenStats: 1, _id: 0 },
    r: {
      f:
        "[ .[] | { ticker: .tokenDetails.symbol, name: .tokenDetails.name, tokenId: .tokenDetails.tokenIdHex, versionType: .tokenDetails.versionType, nftParentId: .nftParentId, decimals: .tokenDetails.decimals, documentUri: .tokenDetails.documentUri, documentHash: .tokenDetails.documentSha256Hex, initialAmount: .tokenDetails.genesisOrMintQuantity } ]",
    },
  };

  const { data } = await executeSlpDbQuery(q);
  return data.t[0];
}

export async function getSlpBalances(slpAddr) {
  const q = {
    v: 3,
    q: {
      db: ["g"],
      aggregate: [
        {
          $match: {
            "graphTxn.outputs.status": "UNSPENT",
            "graphTxn.outputs.address": slpAddr,
          },
        },
        {
          $unwind: "$graphTxn.outputs",
        },
        {
          $match: {
            "graphTxn.outputs.status": "UNSPENT",
            "graphTxn.outputs.address": slpAddr,
          },
        },
        {
          $group: {
            _id: "$tokenDetails.tokenIdHex",
            slpAmount: {
              $sum: "$graphTxn.outputs.slpAmount",
            },
          },
        },
        {
          $sort: {
            slpAmount: -1,
          },
        },
        {
          $lookup: {
            from: "tokens",
            localField: "_id",
            foreignField: "tokenDetails.tokenIdHex",
            as: "token",
          },
        },
      ],
      sort: {
        slpAmount: -1,
      },
    },
    r: {
      f:
        "[ .[] | { value: .slpAmount, ticker: .token[0].tokenDetails.symbol, decimals: .token[0].tokenDetails.decimals, versionType: .token[0].tokenDetails.versionType, documentUri: .token[0].tokenDetails.documentUri, name: .token[0].tokenDetails.name, tokenId: ._id, nftParentId: .token[0].nftParentId  } ]",
    },
  };

  const { data } = await executeSlpDbQuery(q);
  return data.g;
}

export async function getSlpUtxos(slpAddr) {
  const q = {
    v: 3,
    q: {
      db: ["g"],
      aggregate: [
        {
          $unwind: "$graphTxn.outputs",
        },
        {
          $match: {
            "graphTxn.outputs.address": slpAddr,
            "graphTxn.outputs.status": "UNSPENT",
          },
        },
        {
          $project: {
            graphTxn: 1,
          },
        },
        {
          $lookup: {
            from: "tokens",
            localField: "graphTxn.details.tokenIdHex",
            foreignField: "tokenDetails.tokenIdHex",
            as: "token",
          },
        },
      ],
    },
    r: {
      f:
        "[ .[] | { txid: .graphTxn.txid, vout: .graphTxn.outputs.vout, satoshis: .graphTxn.outputs.bchSatoshis, value: .graphTxn.outputs.slpAmount, decimals: .token[0].tokenDetails.decimals, ticker: .token[0].tokenDetails.symbol, tokenId: .graphTxn.details.tokenIdHex } ]",
    },
  };

  const { data } = await executeSlpDbQuery(q);
  return data.g;
}

export async function getSlpBatonUtxos(slpAddr) {
  const q = {
    v: 3,
    q: {
      db: ["g"],
      aggregate: [
        {
          $unwind: "$graphTxn.outputs",
        },
        {
          $match: {
            "graphTxn.outputs.address": slpAddr,
            "graphTxn.outputs.status": "BATON_UNSPENT",
          },
        },
        {
          $project: {
            graphTxn: 1,
          },
        },
        {
          $lookup: {
            from: "tokens",
            localField: "graphTxn.details.tokenIdHex",
            foreignField: "tokenDetails.tokenIdHex",
            as: "token",
          },
        },
      ],
    },
    r: {
      f:
        "[ .[] | { txid: .graphTxn.txid, vout: .graphTxn.outputs.vout, satoshis: .graphTxn.outputs.bchSatoshis, value: .graphTxn.outputs.slpAmount, decimals: .token[0].tokenDetails.decimals, ticker: .token[0].tokenDetails.symbol, tokenId: .graphTxn.details.tokenIdHex } ]",
    },
  };

  const { data } = await executeSlpDbQuery(q);
  return data.g;
}
