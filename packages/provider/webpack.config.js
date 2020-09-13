const path = require("path");

module.exports = {
  entry: {
    client: "./src/provider.js",
  },
  mode: process.env.NODE_ENV,
  watch: process.env.NODE_ENV === "development",
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
    warnings: process.env.NODE_ENV === "development",
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
};
