import typescript from '@rollup/plugin-typescript';
import fs from 'fs';
import path from 'path';
import tsc from 'typescript';
import { fileURLToPath } from 'url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

export const PACKAGE_JSON = JSON.parse(
  fs.readFileSync(path.resolve(ROOT, 'package.json')),
);

const external = [
  ...Object.keys(PACKAGE_JSON.dependencies || {}),
  ...Object.keys(PACKAGE_JSON.peerDependencies || {}),
];
const globals = external.reduce((globals, name) => {
  globals[name] = name;

  return globals;
}, {});

export const BASE_CONFIG = {
  external,
  input: path.resolve(ROOT, 'src', 'index.ts'),
  output: {
    exports: 'named',
    globals,
    name: 'fast-equals',
    sourcemap: false,
  },
  plugins: [
    typescript({
      inlineSources: false,
      sourceMap: false,
      tsconfig: path.resolve(ROOT, 'build', 'tsconfig', 'base.json'),
      typescript: tsc,
    }),
  ],
};
