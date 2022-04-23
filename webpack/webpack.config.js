const ESLintWebpackPlugin = require('eslint-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');
const webpack = require('webpack');

const ROOT = path.resolve(__dirname, '..');

module.exports = {
  devServer: {
    port: 3000,
  },

  devtool: 'source-map',

  entry: path.join(ROOT, 'DEV_ONLY', 'index.ts'),

  mode: 'development',

  module: {
    rules: [
      {
        include: [path.resolve(ROOT, 'src'), /DEV_ONLY/],
        loader: 'ts-loader',
        test: /\.ts$/,
      },
    ],
  },

  output: {
    filename: 'micro-memoize.js',
    library: 'microMemoize',
    libraryTarget: 'umd',
    path: path.resolve(ROOT, 'dist'),
    umdNamedDefine: true,
  },

  plugins: [
    new webpack.EnvironmentPlugin(['NODE_ENV']),
    new HtmlWebpackPlugin(),
    new ESLintWebpackPlugin(),
  ],

  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
};
