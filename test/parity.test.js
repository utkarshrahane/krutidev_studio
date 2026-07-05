// Run with: node test/parity.test.js
// Verifies the JS converter (js/converter/convert.js) produces identical
// output to the Python reference implementation on a batch of real
// paragraphs, so the browser app behaves exactly like the validated backend.
import { convertText } from '../js/converter/convert.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadFixture(name) {
  const path = join(__dirname, 'fixtures', name);
  return JSON.parse(readFileSync(path, 'utf-8'));
}

function run() {
  const cases = loadFixture('parity_cases.json');
  let pass = 0;
  let fail = 0;
  for (const { input, expected } of cases) {
    const actual = convertText(input);
    if (actual === expected) {
      pass++;
    } else {
      fail++;
      console.log('MISMATCH');
      console.log('  input:   ', JSON.stringify(input));
      console.log('  expected:', JSON.stringify(expected));
      console.log('  actual:  ', JSON.stringify(actual));
    }
  }
  console.log(`\n${pass} passed, ${fail} failed (of ${cases.length})`);
  if (fail > 0) process.exit(1);
}

run();
