'use strict';

const eslintFriendlyFormatter = require('eslint-friendly-formatter');
const path = require('path');
const webpack = require('webpack');

const ROOT = path.resolve(__dirname, '..');

module.exports = {
  devtool: '#source-map',

  entry: [path.resolve(ROOT, 'src', 'index.js')],

  module: {
    rules: [
      {
        enforce: 'pre',
        include: [path.resolve(ROOT, 'src')],
        loader: 'eslint-loader',
        options: {
          configFile: '.eslintrc',
          failOnError: true,
          failOnWarning: false,
          fix: true,
          formatter: eslintFriendlyFormatter
        },
        test: /\.js$/
      },
      {
        include: [path.resolve(ROOT, 'src')],
        loader: 'babel-loader',
        test: /\.js$/
      }
    ]
  },

  output: {
    filename: 'micro-memoize.js',
    library: 'memoize',
    libraryTarget: 'umd',
    path: path.resolve(ROOT, 'dist'),
    umdNamedDefine: true
  },

  plugins: [new webpack.EnvironmentPlugin(['NODE_ENV'])]
};
