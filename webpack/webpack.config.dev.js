'use strict';

const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

const defaultConfig = require('./webpack.config');

const ROOT = path.resolve(__dirname, '..');
const PORT = 3000;

module.exports = Object.assign({}, defaultConfig, {
  cache: true,

  devServer: {
    clientLogLevel: 'none',
    compress: true,
    contentBase: './dist',
    host: 'localhost',
    hot: true,
    inline: true,
    lazy: false,
    noInfo: false,
    quiet: false,
    port: PORT,
    stats: {
      colors: true,
      progress: true
    }
  },

  entry: ['react-hot-loader/patch', path.resolve(ROOT, 'DEV_ONLY', 'index.js')],

  module: Object.assign({}, defaultConfig.module, {
    rules: defaultConfig.module.rules.map((rule) => {
      return rule.loader === 'babel-loader'
        ? Object.assign({}, rule, {
          include: rule.include.concat([path.resolve(ROOT, 'DEV_ONLY')]),
          options: {
            plugins: ['react-hot-loader/babel'],
            presets: ['react']
          }
        })
        : rule;
    })
  }),

  output: Object.assign({}, defaultConfig.output, {
    publicPath: `http://localhost:${PORT}/`
  }),

  plugins: [...defaultConfig.plugins, new HtmlWebpackPlugin(), new webpack.HotModuleReplacementPlugin()]
});
