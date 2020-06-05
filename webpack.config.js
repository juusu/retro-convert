const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const path = require('path');

module.exports = {
  entry: './src/index-web.js',
  devtool: "source-map",
  module: {
    rules: [
        { test: /\.js$/, exclude: /node_modules/, loader: "babel-loader" },
        { test: /\.(html|ttf)$/i, loader: "file-loader", options: { name: '[name].[ext]' }}
    ]
  },
  resolve: {
    alias: {
      'vue$': 'vue/dist/vue.esm.js' // 'vue/dist/vue.common.js' for webpack 1
    }
  },
  plugins: [
    new CleanWebpackPlugin()
  ]
};