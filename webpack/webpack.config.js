'use strict';

const path = require('path');
const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin');
const eslintFriendlyFormatter = require('eslint-friendly-formatter');
const FlowBabelWebpackPlugin = require('flow-babel-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ModuleScopePlugin = require('react-dev-utils/ModuleScopePlugin');
const webpack = require('webpack');

const ROOT = path.resolve(__dirname, '..');
const PORT = 3000;

module.exports = {
  cache: true,

  devServer: {
    clientLogLevel: 'none',
    compress: true,
    contentBase: './dist',
    host: 'localhost',
    inline: true,
    lazy: false,
    noInfo: false,
    port: PORT,
    quiet: false,
    stats: {
      colors: true,
      progress: true,
    },
  },

  devtool: '#source-map',

  entry: [path.resolve(ROOT, 'DEV_ONLY', 'index.js')],

  mode: 'development',

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
          formatter: eslintFriendlyFormatter,
        },
        test: /\.js$/,
      },
      {
        include: [path.resolve(ROOT, 'src'), path.resolve(ROOT, 'DEV_ONLY')],
        loader: 'babel-loader',
        options: {
          plugins: ['react-hot-loader/babel'],
          presets: ['@babel/preset-react'],
        },
        test: /\.js$/,
      },
    ],
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
    publicPath: `http://localhost:${PORT}/`,
    umdNamedDefine: true,
  },

  plugins: [
    new webpack.EnvironmentPlugin(['NODE_ENV']),
    new webpack.NamedModulesPlugin(),
    new CaseSensitivePathsPlugin(),
    new HtmlWebpackPlugin(),
    new webpack.HotModuleReplacementPlugin(),
    new FlowBabelWebpackPlugin(),
  ],

  resolve: {
    plugins: [new ModuleScopePlugin(path.resolve(ROOT, 'src'))],
  },
};
