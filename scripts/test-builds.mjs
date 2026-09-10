import { spawnSync } from 'node:child_process';

for (const [label, command] of [
  ['ESM', ['dist/esm/main.js', '--quickstart', 'invalid']],
  ['CommonJS', ['dist/cjs/main.js', '--quickstart', 'invalid']],
]) {
  const result = spawnSync(process.execPath, command, { encoding: 'utf8' });
  const output = `${result.stdout}${result.stderr}`;
  if (result.status !== 1 || !output.includes('Unknown quickstart')) {
    throw new Error(`${label} build smoke test failed:\n${output}`);
  }
}

console.log('ESM and CommonJS builds passed smoke tests.');
