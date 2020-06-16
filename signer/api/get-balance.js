import axios from "axios";

export async function (req, res) {
  const { data } = await axios.post(
    `https://bchd.fountainhead.cash/v1/GetAddressUnspentOutputs`,
    {
      address: req.query.bchAddr,
      include_mempool: true,
    },
    {
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
      },
    }
  );

  const utxos = data.outputs;

  let balance = 0;
  let balanceInUSD = 0;

  if (!Array.isArray(utxos)) {
    res.status(500).send("Error while fetching balance");
    return;
  }

  balance = utxos.reduce((acc, current) => acc + current.value, 0);

  if (balance > 0) {
    balance = (balance * 0.00000001).toFixed(8);
    balanceInUSD = (230 * balance).toFixed(2);
  }

  res.status(200).send({ balance, balanceInUSD });
}
