import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import localTypescript from 'typescript';

import pkg from './package.json';

const UMD_CONFIG = {
  input: 'src-next/index.ts',
  output: {
    exports: 'default',
    file: pkg.browser.replace('dist', 'dist-next'),
    format: 'umd',
    name: pkg.name,
    sourcemap: true,
    sourcemapPathTransform(sourcePath) {
      const [, sourceFile] = sourcePath.split('/src/');

      return `../src-next/${sourceFile}`;
    },
  },
  plugins: [typescript({ typescript: localTypescript })],
};

const FORMATTED_CONFIG = {
  ...UMD_CONFIG,
  output: [
    {
      ...UMD_CONFIG.output,
      file: pkg.main.replace('dist', 'dist-next'),
      format: 'cjs',
    },
    {
      ...UMD_CONFIG.output,
      file: pkg.module.replace('dist', 'dist-next'),
      format: 'es',
    },
  ],
};

const MINIFIED_CONFIG = {
  ...UMD_CONFIG,
  output: {
    ...UMD_CONFIG.output,
    file: pkg.browser.replace('dist', 'dist-next').replace('.js', '.min.js'),
    sourcemap: false,
  },
  plugins: [...UMD_CONFIG.plugins, terser()],
};

export default [UMD_CONFIG, FORMATTED_CONFIG, MINIFIED_CONFIG];
