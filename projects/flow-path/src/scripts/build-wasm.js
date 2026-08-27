const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');

execSync('wasm-pack build lib/flow-path/path-finders/a-star-wasm --target web --release', {
  cwd: projectRoot,
  stdio: 'inherit',
});

const input = path.resolve(
  __dirname,
  '../lib/flow-path/path-finders/a-star-wasm/pkg/a_star_rust_bg.wasm',
);
const output = path.resolve(
  __dirname,
  '../lib/flow-path/path-finders/a-star-wasm/pkg/a_star_rust_bg.wasm-bytes.ts',
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

const dtsFile = path.resolve(
  __dirname,
  '../lib/flow-path/path-finders/a-star-wasm/pkg/a_star_rust.d.ts',
);

if (fs.existsSync(dtsFile)) {
  fs.unlinkSync(dtsFile);
  console.log(`Deleted ${dtsFile}`);
}
