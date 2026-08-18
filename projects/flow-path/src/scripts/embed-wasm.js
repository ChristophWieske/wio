// scripts/embed-wasm.js
const fs = require('fs');
const path = require('path');

const input = path.resolve(
  __dirname,
  '../lib/flow-path/path-finders/a-star-wasm/pkg/a_star_rust_bg.wasm',
);
const output = path.resolve(
  __dirname,
  '../lib/flow-path/path-finders/a-star-wasm/pkg/a_star_rust_bg.wasm.ts',
);

const bytes = fs.readFileSync(input);

const arr = Array.from(bytes, (b) => `0x${b.toString(16).padStart(2, '0')}`);

const content = `const wasmBytes = new Uint8Array([
  ${arr.join(', ')}
]);

export default wasmBytes;
`;

fs.writeFileSync(output, content, 'utf8');
console.log(`Embedded WASM written to ${output}`);
