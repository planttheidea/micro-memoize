const fs = require('fs');
const path = require('path');

const pkg = require('../package.json');

const BASE_PATH = path.resolve(__dirname, '..');
const SOURCE_ENTRY = path.join(BASE_PATH, pkg.main);
const SOURCE_TYPES = path.join(BASE_PATH, 'index.d.ts');
const DESTINATION = 'cjs';
const DESTINATION_ENTRY = path.join(BASE_PATH, DESTINATION, 'index.cjs');
const DESTINATION_TYPES = path.join(BASE_PATH, DESTINATION, 'index.d.cts');

function getFilename(filename) {
  return filename.replace(`${BASE_PATH}/`, '');
}

try {
  if (!fs.existsSync(path.join(BASE_PATH, DESTINATION))) {
    fs.mkdirSync(path.join(BASE_PATH, DESTINATION));
  }

  fs.copyFileSync(SOURCE_ENTRY, DESTINATION_ENTRY);

  const contents = fs
    .readFileSync(DESTINATION_ENTRY, { encoding: 'utf8' })
    .replace(/\/\/# sourceMappingURL=(.*)/, (match, value) =>
      match.replace(value, 'index.cjs.map'),
    );

  fs.writeFileSync(DESTINATION_ENTRY, contents, { encoding: 'utf8' });

  console.log(
    `Copied ${getFilename(SOURCE_ENTRY)} to ${getFilename(DESTINATION_ENTRY)}`,
  );

  const types = fs
    .readFileSync(SOURCE_TYPES, { encoding: 'utf8' })
    .replace(
      /export default function memoize/,
      () => 'declare function memoize',
    )
    .concat('\n\nexport = memoize;');

  fs.writeFileSync(DESTINATION_TYPES, types, { encoding: 'utf8' });

  console.log(
    `Copied ${getFilename(SOURCE_TYPES)} to ${getFilename(DESTINATION_TYPES)}`,
  );
} catch (error) {
  console.error(error);

  process.exit(1);
}
