import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FINDINGS, USAGE, VERSION, checkFolder, csvCell, displayPath, fileError, grouped, listText, main, mdCell, parseArgs, parseSize, plural, readBounded, sizeText, toCsv, toJson, toMarkdown, toText } from '../src/index.js';
import { TIDY, cli, notebook, run, study, withFiles } from './helpers.js';

const root = resolve(fileURLToPath(import.meta.url), '..', '..');
const read = (rel) => readFile(resolve(root, rel), 'utf8');

// Runs the tool on folders of the repository, with the root of the repository as the base for relative paths.
async function inRoot(argv) {
  let o = '';
  let err = '';
  const code = await main(argv, { out: (t) => { o += t; }, err: (t) => { err += t; } }, undefined, root);
  return { code, out: o, err };
}

const messyFiles = { 'a.py': 'import random\nrandom.shuffle(x)\nP = "/home/ann/x.csv"\n' };

test('text report: the folder, code, environment and limits lines, the areas, each finding with its quotation and fix, and the gate', () => {
  const o = toText(study(messyFiles));
  const lines = o.split('\n');
  assert.equal(lines[0], 'research-repro-check: study');
  assert.equal(lines[1], 'folder: 1 file in 1 folder, 1 read, 0 not read, 0 links not followed, 0 folders skipped');
  assert.equal(lines[2], 'code: 0 notebooks, 1 Python script, 0 R scripts, 0 JavaScript files; languages: Python');
  assert.equal(lines[3], 'environment: none; lock files: none');
  assert.equal(lines[4], 'limits: outputs over 100 KB per cell');
  assert.equal(lines[5], 'areas:');
  assert.match(o, /^ {2}Environment {5}fail {2}no-environment-spec x1$/m);
  assert.match(o, /^ {2}Secrets {9}pass {2}no finding$/m);
  assert.match(o, /^findings: 1 error, 4 warning, 2 info$/m);
  assert.match(o, /^ {2}ERROR {4}no-environment-spec {2}study Python$/m);
  assert.match(o, /^ {2}WARNING {2}absolute-path {2}study\/a\.py {2}line 3$/m);
  assert.match(o, /^ {2}WARNING {2}no-seed {2}study\/a\.py {2}line 2$/m);
  assert.match(o, /^ {11}basis: "In order for research to be reproducible, the computational environment that it was conducted in must be captured in such a way that others can replicate it\." \(Summary, https:\/\/book\.the-turing-way\.org\/reproducible-research\/renv\/\)$/m);
  assert.match(o, /^ {11}fix: Write the packages the code imports/m);
  assert.match(o, /\nGATE: FAIL - 1 error\n$/);
});

test('text report: no findings and notes are said before the gate', () => {
  const r = study({ ...TIDY });
  r.findings = [];
  r.counts = { error: 0, warning: 0, info: 0 };
  const o = toText(r);
  assert.match(o, /^findings: 0 error, 0 warning, 0 info\n\nno findings$/m);
  assert.match(o, /\nnote: the folder holds no Python, R or JavaScript code; only the files at its top were checked\n\nGATE: PASS \(--fail-on error\)\n$/);
});

test('markdown report: the summary line, the area table, a table per area, the notes as a list and the gate in bold', () => {
  const o = toMarkdown(study(messyFiles));
  assert.match(o, /^## research-repro-check: 1 error, 4 warning, 2 info$/m);
  assert.match(o, /^Folder: `study`\. Files: 1 file in 1 folder/m);
  assert.match(o, /^\| Area \| Result \| Detail \|$/m);
  assert.match(o, /^\| Environment \| \*\*fail\*\* \| no-environment-spec x1 \|$/m);
  assert.match(o, /^### Data and paths$/m);
  assert.match(o, /^\| Severity \| Check \| Where \| Message \| Basis \| Fix \|$/m);
  assert.match(o, /\*\*Gate failed:\*\* 1 error\./);
  assert.match(toMarkdown(study({ ...TIDY })), /\*\*Gate passed\*\* \(--fail-on error\)\./);
  assert.equal(mdCell('x\r\ny'), 'x y');
  assert.equal(mdCell('\\'), '\\\\');
  assert.equal(mdCell('random_state'), 'random\\_state');
});

test('json report: the whole report, with the folder, the areas, every finding with its basis, the notes and the gate', () => {
  const r = JSON.parse(toJson(study(messyFiles, { version: '9.9.9' })));
  assert.deepEqual(Object.keys(r), ['tool', 'version', 'folder', 'areas', 'findings', 'notes', 'counts', 'gate']);
  assert.equal(r.tool, 'research-repro-check');
  assert.equal(r.version, '9.9.9');
  assert.deepEqual(r.folder, { path: 'study', files: 1, folders: 1, read: 1, notRead: 0, links: 0, skippedFolders: 0, notebooks: 0, pythonScripts: 1, rScripts: 0, javascriptFiles: 0, languages: ['Python'], environmentFiles: [], lockFiles: [], requirements: [], maxOutput: '100 KB' });
  assert.deepEqual(r.areas.map((a) => a.id), ['folder', 'environment', 'notebooks', 'data', 'randomness', 'secrets']);
  assert.deepEqual(Object.keys(r.findings[0]), ['id', 'severity', 'area', 'file', 'where', 'line', 'subject', 'message', 'fix', 'basis', 'source']);
  assert.deepEqual(Object.keys(r.findings[0].basis[0]), ['text', 'section', 'source']);
  assert.deepEqual(r.gate, { failOn: 'error', pass: false, reason: '1 error' });
});

test('csv report: RFC 4180, one row per finding, CRLF line ends, quotes doubled, and a leading quote on a cell a spreadsheet would run', () => {
  const o = toCsv(study(messyFiles));
  const lines = o.split('\r\n');
  assert.equal(lines[0], 'severity,area,id,file,where,line,subject,message,basis,source,fix');
  assert.equal(lines.at(-1), '');
  assert.ok(lines[1].startsWith('info,folder,summary,study,folder,0,summary,'));
  assert.equal(csvCell('+1'), "'+1");
  assert.equal(csvCell('-1'), "'-1");
  assert.equal(csvCell('@a'), "'@a");
  assert.equal(csvCell('=SUM(A1)'), "'=SUM(A1)");
  assert.equal(csvCell('a,b'), '"a,b"');
  assert.equal(csvCell('say "hi"'), '"say ""hi"""');
  assert.equal(csvCell(null), '');
  assert.equal(csvCell('plain'), 'plain');
});

test('the usage text lists every check, the options and the exit codes', () => {
  for (const f of FINDINGS) assert.ok(USAGE.includes(f.id), f.id);
  assert.match(USAGE, /Exit codes: 0 no finding at the --fail-on level, 1 such a finding, 2 usage or input error\./);
  for (const o of ['--format <name>', '--fail-on <level>', '--max-output <size>']) assert.ok(USAGE.includes(o), o);
  assert.match(USAGE, /info never fails the run/);
  assert.match(USAGE, /never runs the code, never follows a symbolic link/);
});

test('arguments: every option, and the errors for a missing value, an unknown option, two folders, a URL and standard input', () => {
  assert.deepEqual(parseArgs(['x', '--format', 'json', '--fail-on', 'warning', '--max-output', '3K']), { folder: 'x', format: 'json', failOn: 'warning', maxOutput: 3072, help: false, version: false });
  for (const [argv, message] of [[['--format'], /--format needs a value/], [['x', '--bad'], /unknown argument --bad/], [['a', 'b'], /give one folder/], [[], /give the path of the study folder/], [['https://example.test/repo'], /never fetches a URL/], [['-'], /standard input is not supported/], [['x', '--format', 'xml'], /unknown format xml/], [['x', '--fail-on', 'info'], /--fail-on takes error or warning, not info/], [['x', '--max-output', 'big'], /--max-output takes a size/], [['x', '--max-output', '0'], /--max-output takes a size/]]) {
    assert.throws(() => parseArgs(argv), message, argv.join(' '));
  }
});

test('sizes and lists as the reports write them', () => {
  assert.equal(parseSize('100K'), 102400);
  assert.equal(parseSize('1m'), 1048576);
  assert.equal(parseSize('0x400'), 1024);
  assert.equal(parseSize('512'), 512);
  assert.equal(parseSize('1.5M'), null);
  assert.equal(parseSize('9999999999M'), null);
  assert.equal(sizeText(102400), '100 KB');
  assert.equal(sizeText(1048576), '1 MB');
  assert.equal(sizeText(1000), '1,000 bytes');
  assert.equal(grouped(1234567), '1,234,567');
  assert.equal(listText(['a']), 'a');
  assert.equal(listText(['a', 'b']), 'a and b');
  assert.equal(listText(['a', 'b', 'c']), 'a, b and c');
  assert.equal(listText(['a', 'b', 'c', 'd', 'e'], 3), 'a, b, c and 2 more');
  assert.equal(plural(1, 'file'), '1 file');
  assert.equal(plural(2, 'entry', 'entries'), '2 entries');
});

test('exit code 0: a folder with no finding at the level, and --help and --version', async () => {
  assert.equal((await run({ ...TIDY, 'requirements.txt': 'pandas==2.1.4\n', 'a.py': 'x = 1\n' }, ['.', '--fail-on', 'warning'])).code, 0);
  const help = await cli(['--help']);
  assert.equal(help.code, 0);
  assert.equal(help.out, USAGE);
  const version = await cli(['--version']);
  assert.equal(version.code, 0);
  assert.equal(version.out, `${VERSION}\n`);
  assert.equal(VERSION, JSON.parse(await read('package.json')).version);
});

test('exit code 1: an error fails the default gate, a warning fails only --fail-on warning, and info never fails', async () => {
  assert.equal((await run({ 'a.py': 'x = 1\n' }, ['.'])).code, 1);
  const warn = { ...TIDY, 'requirements.txt': 'pandas\n' };
  assert.equal((await run(warn, ['.'])).code, 0);
  assert.equal((await run(warn, ['.', '--fail-on', 'warning'])).code, 1);
  const info = { 'README.md': 'x', LICENSE: 'x' };
  const r = await run(info, ['.', '--fail-on', 'warning']);
  assert.equal(r.code, 0);
  assert.match(r.out, /INFO {5}no-citation/);
});

test('exit code 2: a folder that does not exist, a file in place of a folder, and a bad argument, with the reason on standard error', async () => {
  const missing = await run({}, ['nope']);
  assert.equal(missing.code, 2);
  assert.equal(missing.err, 'research-repro-check: nope: no such folder\n');
  const file = await run({ 'a.txt': 'x' }, ['a.txt']);
  assert.equal(file.code, 2);
  assert.match(file.err, /a\.txt: not a folder; give the folder of the study/);
  const bad = await run({}, ['--fail-on']);
  assert.equal(bad.code, 2);
  assert.match(bad.err, /--fail-on needs a value/);
  assert.match(bad.err, /Usage: research-repro-check/);
});

test('every format of the command line, and paths relative to the folder it runs in with forward slashes', async () => {
  const files = { 'study/a.py': 'P = "/home/ann/x"\n' };
  for (const [format, pattern] of [['text', /study\/a\.py {2}line 1/], ['markdown', /study\/a\.py {2}line 1/], ['json', /"file": "study\/a\.py"/], ['csv', /,study\/a\.py,/]]) {
    const r = await run(files, ['study', '--format', format]);
    assert.equal(r.code, 1, format);
    assert.match(r.out, pattern, format);
  }
});

test('files: a path shown relative with forward slashes, or absolute outside the base; a bounded read; an error with its reason', async () => {
  assert.equal(displayPath(resolve('/base/sub/a.txt'), resolve('/base')), 'sub/a.txt');
  assert.equal(displayPath(resolve('/base'), resolve('/base')), '.');
  assert.ok(!displayPath(resolve('/other/a.txt'), resolve('/base')).startsWith('..'));
  assert.deepEqual([fileError('x', 'gone').message, fileError('x', 'gone').reason], ['x: gone', 'gone']);
  await withFiles({ 'a.txt': 'hello', 'big.txt': 'x'.repeat(100) }, async (dir) => {
    assert.equal((await readBounded(resolve(dir, 'a.txt'))).toString(), 'hello');
    await assert.rejects(readBounded(resolve(dir, 'big.txt'), 10), /100 bytes is over the 10 byte limit/);
    await assert.rejects(readBounded(resolve(dir, 'none.txt')), /no such file/);
    await assert.rejects(readBounded(dir), /not a regular file|cannot be read/);
  });
});

test('the example studies: the messy one fails as the README shows, the clean one passes at --fail-on warning', async () => {
  const messy = await inRoot(['examples/messy-study', '--fail-on', 'warning']);
  assert.equal(messy.code, 1);
  assert.match(messy.out, /^findings: 1 error, 8 warning, 2 info$/m);
  for (const id of ['no-readme', 'no-license', 'no-citation', 'unpinned-dependency', 'notebook-out-of-order', 'notebook-outputs-with-errors', 'missing-data-file', 'absolute-path', 'no-seed', 'secrets-in-notebook']) assert.match(messy.out, new RegExp(` ${id} `), id);
  const clean = await inRoot(['examples/clean-study', '--fail-on', 'warning']);
  assert.equal(clean.code, 0);
  assert.match(clean.out, /^findings: 0 error, 0 warning, 1 info$/m);
});

test('the example output in the repository is what the tool prints now', async () => {
  const messy = await inRoot(['examples/messy-study', '--fail-on', 'warning']);
  assert.equal(await read('examples/output/messy-study.txt'), messy.out);
  assert.equal(await read('examples/output/clean-study.txt'), (await inRoot(['examples/clean-study', '--fail-on', 'warning'])).out);
  for (const [format, file] of [['markdown', 'messy-study.md'], ['json', 'messy-study.json'], ['csv', 'messy-study.csv']]) {
    assert.equal(await read(`examples/output/${file}`), (await inRoot(['examples/messy-study', '--fail-on', 'warning', '--format', format])).out, file);
  }
  assert.deepEqual((await readdir(resolve(root, 'examples/output'))).sort(), ['clean-study.txt', 'messy-study.csv', 'messy-study.json', 'messy-study.md', 'messy-study.txt']);
});

test('the example studies give the same report with CRLF line ends as with LF', async () => {
  const files = {};
  const walkDir = async (rel) => {
    for (const e of await readdir(resolve(root, 'examples/messy-study', rel), { withFileTypes: true })) {
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) await walkDir(r);
      else files[r] = await read(`examples/messy-study/${r}`);
    }
  };
  await walkDir('');
  assert.ok(Object.values(files).every((t) => !t.includes('\r')), 'the example files are stored with LF');
  const crlf = Object.fromEntries(Object.entries(files).map(([k, v]) => [k, v.split('\n').join('\r\n')]));
  const a = await run(files, ['.', '--format', 'json']);
  const b = await run(crlf, ['.', '--format', 'json']);
  const strip = (o) => JSON.parse(o).findings.map((f) => [f.id, f.file, f.line, f.where]);
  assert.deepEqual(strip(b.out), strip(a.out));
});

test('checkFolder: the report of a folder on disk, with links to the base and a version', async () => {
  await withFiles({ ...TIDY, 'requirements.txt': 'pandas==2.1.4\n', 'nb.ipynb': notebook([[1, 'x = 1']]) }, async (dir) => {
    const r = await checkFolder('.', { base: dir, version: '1.2.3' });
    assert.equal(r.version, '1.2.3');
    assert.equal(r.folder.path, '.');
    assert.equal(r.folder.notebooks, 1);
    assert.deepEqual(r.findings.map((f) => f.id), ['summary']);
  });
});
