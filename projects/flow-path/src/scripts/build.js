const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const dtsFile = path.resolve(
  __dirname,
  '../lib/flow-path/path-finders/a-star-wasm/pkg/a_star_rust.d.ts',
);
const dtsBak = dtsFile + '.bak';

const renamed = fs.existsSync(dtsFile);
if (renamed) {
  fs.renameSync(dtsFile, dtsBak);
  console.log('Temporarily renamed a_star_rust.d.ts -> a_star_rust.d.ts.bak');
}

try {
  execSync('ng build flow-path', { stdio: 'inherit' });
} finally {
  if (renamed) {
    fs.renameSync(dtsBak, dtsFile);
    console.log('Restored a_star_rust.d.ts');
  }
}
