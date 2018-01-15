'use strict';

const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin');
const eslintFriendlyFormatter = require('eslint-friendly-formatter');
const path = require('path');
const ModuleScopePlugin = require('react-dev-utils/ModuleScopePlugin');
const WatchMissingNodeModulesPlugin = require('react-dev-utils/WatchMissingNodeModulesPlugin');
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
    devtoolModuleFilenameTemplate({absoluteResourcePath}) {
      return path.resolve(absoluteResourcePath).replace(/\\/g, '/');
    },
    filename: 'micro-memoize.js',
    library: 'memoize',
    libraryTarget: 'umd',
    path: path.resolve(ROOT, 'dist'),
    pathinfo: true,
    umdNamedDefine: true
  },

  performance: {
    hints: false
  },

  plugins: [
    new webpack.EnvironmentPlugin(['NODE_ENV']),
    new webpack.NamedModulesPlugin(),
    new CaseSensitivePathsPlugin(),
    new WatchMissingNodeModulesPlugin(path.resolve(ROOT, 'node_modules'))
  ],

  resolve: {
    plugins: [new ModuleScopePlugin(path.resolve(ROOT, 'src'))]
  }
};
