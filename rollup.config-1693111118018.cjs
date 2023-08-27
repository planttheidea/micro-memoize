'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var typescript = require('@rollup/plugin-typescript');
var terser = require('@rollup/plugin-terser');
var localTypescript = require('typescript');
var pkg = require('./package.json');

const UMD_CONFIG = {
  input: 'src/index.ts',
  output: {
    exports: 'default',
    file: pkg.browser,
    format: 'umd',
    name: pkg.name,
    sourcemap: true,
    sourcemapPathTransform(sourcePath) {
      const [, sourceFile] = sourcePath.split('/src/');

      return `../src/${sourceFile}`;
    },
  },
  plugins: [typescript({ typescript: localTypescript })],
};

const FORMATTED_CONFIG = {
  ...UMD_CONFIG,
  output: [
    {
      ...UMD_CONFIG.output,
      file: pkg.main,
      format: 'cjs',
    },
    {
      ...UMD_CONFIG.output,
      file: pkg.module,
      format: 'es',
    },
  ],
};

const MINIFIED_CONFIG = {
  ...UMD_CONFIG,
  output: {
    ...UMD_CONFIG.output,
    file: pkg.browser.replace('.js', '.min.js'),
    sourcemap: false,
  },
  plugins: [...UMD_CONFIG.plugins, terser()],
};

var rollup_config = [UMD_CONFIG, FORMATTED_CONFIG, MINIFIED_CONFIG];

exports.default = rollup_config;
