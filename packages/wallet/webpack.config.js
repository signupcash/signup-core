const webpack = require("webpack")
const path = require("path");
const TerserPlugin = require("terser-webpack-plugin");

module.exports = {
  entry: {
    signer: "./src/index.js",
    worker: "./src/worker/worker.js",
  },
  node: {
    net: 'empty',
    tls: 'empty'
  },
  resolve: {
    alias: {
      react: "preact/compat",
      "react-dom": "preact/compat",
      // Not necessary unless you consume a module using `createClass`
      "create-react-class": "preact/compat/lib/create-react-class",
      // Not necessary unless you consume a module requiring `react-dom-factories`
      "react-dom-factories": "preact/compat/lib/react-dom-factories",
    },
  },
  mode: process.env.NODE_ENV,
  watch: process.env.NODE_ENV === "development",
  output: {
    path: path.resolve(__dirname, "public/js"),
    filename: "[name].lib.js",
  },
  devtool: "source-map",
  watchOptions: {
    ignored: /node_modules/,
  },
  optimization: {
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          keep_fnames: true,
          safari10: true,
        },
      }),
    ],
  },
  stats: {
    warnings: process.env.NODE_ENV === "development",
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        include: path.resolve(__dirname, "src"),
        exclude: path.resolve(__dirname, "src/worker"),
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env"],
          },
        },
      },
      {
        test: /\.(png|jpe?g|gif)$/i,
        use: [
          {
            loader: "file-loader",
            options: {
              outputPath: "../images",
            },
          },
        ],
      },
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  plugins: [new webpack.DefinePlugin({
    __SIGNUP_NETWORK__: JSON.stringify(process.env.NODE_ENV === "development" ? "testnet" : "mainnet"),
    __SIGNUP_HD_PATH__: JSON.stringify(process.env.SIGNUP_HD_PATH || "m/44'/0'/0'/0/0"),
    __ELECTRUM_SERVERS__: JSON.stringify(process.env.NODE_ENV === "development" ? [
      { host: "testnet.bitcoincash.network", port: 60004 },
      { host: "blackie.c3-soft.com", port: 60004 },
      { host: "electroncash.de", port: 60004 }
    ] : [
      { host: "electroncash.de", port: 60002 },
      { host: "electroncash.dk", port: 50004 },
      { host: "bch.loping.net", port: 50004 },
      { host: "electrum.imaginary.cash", port: 50004 }
    ]),
    __SIGNUP_BLOCKEXPLORER_TX__: JSON.stringify(
      process.env.NODE_ENV === "development" ?
        "https://www.blockchain.com/bch-testnet/tx/" :
        "https://blockchair.com/bitcoin-cash/transaction/")
  })]
};
