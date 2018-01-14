'use strict';

const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const defaultConfig = require('./webpack.config');

const ROOT = path.resolve(__dirname, '..');
const PORT = 3000;

module.exports = Object.assign({}, defaultConfig, {
  cache: true,

  devServer: {
    contentBase: './dist',
    host: 'localhost',
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

  entry: [path.resolve(ROOT, 'DEV_ONLY', 'App.js')],

  module: Object.assign({}, defaultConfig.module, {
    rules: defaultConfig.module.rules.map((rule) => {
      return rule.loader === 'babel-loader'
        ? Object.assign({}, rule, {
          include: rule.include.concat([path.resolve(ROOT, 'DEV_ONLY')]),
          options: {
            presets: ['react']
          }
        })
        : rule;
    })
  }),

  output: Object.assign({}, defaultConfig.output, {
    publicPath: `http://localhost:${PORT}/`
  }),

  plugins: defaultConfig.plugins.concat([new HtmlWebpackPlugin()])
});
