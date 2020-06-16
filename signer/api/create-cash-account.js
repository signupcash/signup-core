const BitcoreCash = require("bitcore-lib-cash");
const base58check = require("base58check");
import axios from "axios";

const config = {
  port: 8585,
  database: "./database.db",
  storage: 2,
  reverse: true,
  metadata: false,
  register: true,
};

const protocol = {
  identifierHex: "01010101",
  blockModifier: 563620,
  nameRegexp: /[a-zA-Z0-9_]{1,99}/,
  hashRegexp: /[0-9]{1,10}/,
  payloadTypes: {
    1: { name: "Key Hash", length: 20 },
    2: { name: "Script Hash", length: 20 },
    3: { name: "Payment Code", length: 80 },
    4: { name: "Stealth Keys", length: 66 },

    129: { name: "Key Hash (Token Aware)", length: 20 },
    130: { name: "Script Hash (Token Aware)", length: 20 },
    131: { name: "Payment Code (Token Aware)", length: 80 },
    132: { name: "Stealth Keys (Token Aware)", length: 66 },
  },
};

const walletConfig = {
  fundingAddress: "bitcoincash:qrsf8rjprpczaddcgmzfj92ghanrcpcfvsc5h5ue4f",
  privateKeyWIF: "L4mgV896KHPfozQZC4HqtiqfDpa9DqeemBvrGiWJt8wqinqs2Lh8",
};

async function getUtxos(bchAddr) {
  return axios
    .get(`https://insomnia.fountainhead.cash/v1/address/utxos/${bchAddr}`)
    .then((res) => res.data);
}

module.exports = async function (req, res) {
  if (!config.register) {
    // Return a 501 Not Implemented
    return res
      .status(501)
      .json({ error: "The registration feature is disable on this service." });
  }

  let paymentData;
  let paymentType;
  let registrationScript = new BitcoreCash.Script();

  // Start by adding the OP_RETURN.
  registrationScript.add(BitcoreCash.Opcode.OP_RETURN);

  // Add the protocol identifier.
  registrationScript.add(Buffer.from(protocol.identifierHex, "hex"));

  // Verify that the name matches the (/^[a-zA-Z0-9_]{1,99}$/) requirements.
  if (!protocol.nameRegexp.test(req.body.name)) {
    // Return a 400 Bad Request error..
    return res.status(400).json({ error: "Account name is not valid." });
  }

  // Add the requested alias string.
  registrationScript.add(Buffer.from(req.body.name, "utf8"));

  // Verify that the request has some payment data.
  if (!req.body.payments) {
    // Return a 400 Bad Request error..
    return res.status(400).json({ error: "No payment data was supplied." });
  }

  for (let index in req.body.payments) {
    // Reset to prevent bleed-over from earlier loops.
    paymentType = false;
    paymentData = false;

    try {
      // Try parsing legacy in order to support BIP47 payloads.
      const b58 = base58check.decode(req.body.payments[index]);

      // Set up constants to identify BIP47 payloads.
      const bip47prefix = "47";
      const bip47length = 80;

      // Verify that the payload is a BIP47 paycode.
      if (
        b58.prefix.toString("hex") === bip47prefix &&
        b58.data.length == bip47length
      ) {
        // Mark the payment as a Payment Code (03).
        paymentType = Buffer.from("03", "hex");
        paymentData = b58.data;
      }
    } catch (err) {
      let decodedAddress;
      // Try parsin cashaddr instead.
      try {
        // Add network if omitted.
        if (req.body.payments[index].indexOf(":") == -1) {
          req.body.payments[index] = "bitcoincash:" + req.body.payments[index];
        }

        // If network is bitcoincash..
        if (req.body.payments[index].startsWith("bitcoincash:")) {
          // Decode the payment data as if it was a CashAddr address.
          decodedAddress = BitcoreCash.Address._decodeCashAddress(
            req.body.payments[index]
          );

          // If the decoded type is a key hash..
          if (decodedAddress.type == "pubkeyhash") {
            // Mark the payment as a Key Hash (01).
            paymentType = Buffer.from("01", "hex");
            paymentData = decodedAddress.hashBuffer;
          }
          // If the decoded type is a script hash..
          else if (decodedAddress.type == "scripthash") {
            // Mark the payment as a Script Hash (02).
            paymentType = Buffer.from("02", "hex");
            paymentData = decodedAddress.hashBuffer;
          }
        }
      } catch (error) {
        // Return a 500 Internal server error..
        return res
          .status(500)
          .json({ error: "Service unable to parse payment data." });
      }
    }

    if (paymentType && paymentData) {
      registrationScript.add(Buffer.concat([paymentType, paymentData]), "hex");
    } else {
      // Return a 500 Internal server error..
      return res
        .status(500)
        .json({ error: "Service unable to understand payment data." });
    }
  }

  // Get UTXOs to pay for the transaction
  let { fundingAddress } = walletConfig;
  let inputs = await getUtxos(fundingAddress);
  console.log("[utxos received]", inputs);

  // If we couldn't get any unspent outputs (= node has no funds)
  if (inputs.length == 0) {
    // Return a 402 Payment Required error..
    return res.status(402).json({
      error:
        "Service has no funds to pay for registration. You can help others by sending some funds to the service.",
      address: fundingAddress,
    });
  }

  // Create a transaction from the inputs and set the fees to just over 1sat/b.
  let transaction = new BitcoreCash.Transaction().from(inputs).feePerKb(1001);

  // Add the registration output to the transaction.
  transaction.addOutput(
    new BitcoreCash.Transaction.Output({
      script: registrationScript,
      satoshis: 0,
    })
  );

  // Get a change address.
  let changeAddress = fundingAddress;

  // Add the change address to the transaction so that all non-fee funds goes back to the node.
  transaction.change(changeAddress);

  // Sign and then broadcast the transaction.
  let signedTransaction = transaction.sign(walletConfig.privateKey);
  console.log("[message is signed]", signedTransaction);

  try {
    // Broadcast the transaction.
    // let sentTransaction = await req.app.locals.rpc(
    //   "sendrawtransaction",
    //   signedTransaction.hex
    // );
    // // Notify the server admin that a lookup request has been received.
    // req.app.locals.debug.server(
    //   "Account " + req.body.name + " registered for " + req.ip
    // );
    // req.app.locals.debug.object({
    //   txid: sentTransaction,
    //   hex: signedTransaction.hex,
    // });
    // // Return the TXID to the caller.
    // return res
    //   .status(200)
    //   .json({ txid: sentTransaction, hex: signedTransaction.hex });
  } catch (error) {
    // Failed to broadcast transaction.
    return res.status(500).json({
      error: "Service failed to broadcast registration.",
      details: error,
    });
  }
};
