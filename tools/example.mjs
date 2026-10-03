// Runs the README examples, checks that they report what the README shows, and writes the reports of both example
// studies to examples/output. CI runs it and then fails if those files changed, so the example output in the
// repository is always the real output.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { main } from '../src/index.js';

const root = resolve(fileURLToPath(import.meta.url), '..', '..');

// Runs the tool on folders of the repository; the paths shown in the report are relative to the root of the repository.
async function run(argv) {
  let out = '';
  const code = await main(argv, { out: (t) => { out += t; }, err: (t) => process.stderr.write(t) }, undefined, root);
  return { code, out };
}

const problems = [];
function expect(name, result, code, expected, unwanted) {
  const missing = expected.filter((e) => !result.out.includes(e));
  const wrong = unwanted.filter((e) => result.out.includes(e));
  if (result.code !== code || missing.length || wrong.length) {
    problems.push(`${name}: unexpected report (exit code ${result.code}, expected ${code}; missing: ${missing.join(' / ') || 'none'}; should not appear: ${wrong.join(' / ') || 'none'})`);
  }
}

const messyArgs = ['examples/messy-study', '--fail-on', 'warning'];
const messy = await run(messyArgs);
process.stdout.write(messy.out);
expect('messy study', messy, 1, [
  'code: 1 notebook, 1 Python script, 0 R scripts, 0 JavaScript files; languages: Python',
  'findings: 1 error, 8 warning, 2 info',
  'WARNING  no-readme  examples/messy-study folder',
  'WARNING  no-license  examples/messy-study folder',
  'INFO     no-citation  examples/messy-study folder',
  'WARNING  unpinned-dependency  examples/messy-study/requirements.txt 4 requirements  line 1',
  'WARNING  notebook-out-of-order  examples/messy-study/analysis.ipynb cell 2',
  'WARNING  notebook-outputs-with-errors  examples/messy-study/analysis.ipynb cell 5',
  'WARNING  missing-data-file  examples/messy-study/clean_data.py data/raw/responses_v2.csv  line 7',
  'WARNING  absolute-path  examples/messy-study/clean_data.py  line 5',
  'WARNING  no-seed  examples/messy-study/analysis.ipynb cell 3',
  'ERROR    secrets-in-notebook  examples/messy-study/analysis.ipynb cell 5',
  'The saved execution counts in cell order are 3, 1, none, 7.',
  'GATE: FAIL - 1 error, 8 warnings'
], ['GATE: PASS', 'no-environment-spec', 'demo_0f3a']);

process.stdout.write('\n');
const clean = await run(['examples/clean-study', '--fail-on', 'warning']);
process.stdout.write(clean.out);
expect('clean study with --fail-on warning', clean, 0, ['findings: 0 error, 0 warning, 1 info', 'INFO     summary  examples/clean-study folder', 'GATE: PASS (--fail-on warning)'], ['ERROR', 'WARNING ']);

// The README shows both runs as they are printed.
const readme = (await readFile(resolve(root, 'README.md'), 'utf8')).split('\r\n').join('\n');
if (!readme.includes(messy.out)) problems.push('README: the sample output of the messy study differs from a real run');
if (!readme.includes(clean.out)) problems.push('README: the sample output of the clean study differs from a real run');

// The messy study in the other formats, kept as examples of what each one looks like.
await mkdir(resolve(root, 'examples/output'), { recursive: true });
await writeFile(resolve(root, 'examples/output/messy-study.txt'), messy.out);
for (const [format, name] of [['markdown', 'messy-study.md'], ['json', 'messy-study.json'], ['csv', 'messy-study.csv']]) {
  const r = await run([...messyArgs, '--format', format]);
  if (r.code !== 1) problems.push(`${format}: exit code ${r.code}, expected 1`);
  if (r.out.includes('demo_0f3a')) problems.push(`${format}: the key of the example is shown unmasked`);
  await writeFile(resolve(root, 'examples/output', name), r.out);
}
await writeFile(resolve(root, 'examples/output/clean-study.txt'), clean.out);

if (problems.length) {
  for (const p of problems) console.error(`example: ${p}`);
  process.exit(1);
}
