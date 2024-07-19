const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const Dotenv = require('dotenv-webpack');

module.exports = {
  entry: './index.ts',
  mode: 'development',
  watch: false,
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/i,
        include: path.resolve(__dirname, ''),
        use: ['style-loader', 'css-loader', 'postcss-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  plugins: [
    new Dotenv({
      path: './.env', // Path to .env file (this is the default)
      systemvars: true, // Load system environment variables
      ignoreStub: true, // Avoid stubbing process.env
    }),
    new HtmlWebpackPlugin({
      title: 'Level Design Tool',
      filename: 'index.html',
      template: 'index.html'
    }),
    new MiniCssExtractPlugin({ filename: "style.css" })
  ],
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  devServer: {
    static: './',
    port: 3000,
    open: true,
    hot: true,
    compress: true,
    historyApiFallback: true,
  },
  cache: false,
};