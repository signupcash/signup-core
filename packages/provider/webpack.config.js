const path = require("path");
const { WebpackPluginServe } = require('webpack-plugin-serve')

const isDevEnv = process.env.NODE_ENV === "development"
const serveApp = isDevEnv && process.env.FORCE_SERVE_APP === "true" && process.env.FORCE_SERVE_APP !== "false"

const serveEntry = serveApp ? { serve: "webpack-plugin-serve/client" } : {}
const servePlugins = serveApp ? [new WebpackPluginServe({ port: 5000, static: "./" })] : []

module.exports = {
  entry: {
    client: "./src/provider.js",
    ...serveEntry
  },
  mode: process.env.NODE_ENV,
  watch: isDevEnv,
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "provider.js",
    library: "Signup",
    libraryTarget: "umd",
  },
  devtool: "source-map",
  watchOptions: {
    ignored: /node_modules/,
  },
  stats: {
    warnings: isDevEnv,
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        include: path.resolve(__dirname, "src"),
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env"],
          },
        },
      },
    ],
  },
  plugins: [
    ...servePlugins
  ]
};
