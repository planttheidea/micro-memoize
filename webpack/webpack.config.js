

const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');
const webpack = require('webpack');

const ROOT = path.resolve(__dirname, '..');

module.exports = {
  devServer: {
    contentBase: './dist',
    inline: true,
    port: 3000,
    stats: {
      assets: false,
      chunks: true,
      chunkModules: false,
      colors: true,
      hash: false,
      timings: true,
      version: false,
    },
  },

  devtool: '#source-map',

  entry: path.join(ROOT, 'DEV_ONLY', 'index.ts'),

  mode: 'development',

  module: {
    rules: [
      {
        enforce: 'pre',
        include: [path.resolve(ROOT, 'src')],
        loader: 'eslint-loader',
        test: /\.ts$/,
      },
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

  plugins: [new webpack.EnvironmentPlugin(['NODE_ENV']), new HtmlWebpackPlugin()],

  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
};
