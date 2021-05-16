const path = require("path");
const TerserPlugin = require("terser-webpack-plugin");
const { WebpackPluginServe } = require('webpack-plugin-serve')

const isDevEnv = process.env.NODE_ENV === "development"
const serveApp = isDevEnv && process.env.FORCE_SERVE_APP === "true" && process.env.FORCE_SERVE_APP !== "false"

const serveEntry = serveApp ? { serve: "webpack-plugin-serve/client" } : {}
const servePlugins = isDevEnv ? [new WebpackPluginServe({ port: 5050, static: "./public", historyFallback: true })] : []

module.exports = {
  entry: {
    signer: "./src/index.js",
    worker: "./src/worker/worker.js",
    ...serveEntry
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
  watch: isDevEnv,
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
  node: {
    tls: "mock",
    net: "mock",
  },
  stats: {
    warnings: isDevEnv,
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
  plugins: [
    ...servePlugins
  ]
};
