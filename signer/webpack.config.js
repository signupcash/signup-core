const path = require("path");

module.exports = {
  entry: ["babel-polyfill", "./src/index.js"],
  mode: "development",
  output: {
    path: path.resolve(__dirname, "public/js"),
    filename: "signer.lib.js"
  },
  devtool: "source-map",
  watchOptions: {
    ignored: /node_modules/
  },
  stats: {
    warnings: false
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env"]
          }
        }
      }
    ]
  }
};
