import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FINDINGS, safeText, meetsThreshold, runRules, buildModel, wantedFile, codeKind } from '../src/index.js';
import { TIDY, errorOutput, find, ids, notebook, pieces, problems, streamOutput, study, walkOf } from './helpers.js';

const PINNED = { 'requirements.txt': 'pandas==2.1.4\n' };

test('a tidy study with pinned requirements, a clean notebook and a seed has only the summary', () => {
  const r = study({ ...TIDY, ...PINNED, 'analysis.ipynb': notebook([[1, 'import pandas as pd\nnp.random.seed(3)\nx = np.random.rand(2)']]), 'data/a.csv': 'x\n1\n' });
  assert.deepEqual(ids(r), ['summary']);
  assert.equal(r.gate.pass, true);
});

test('summary: what was read, the languages, the dependencies, the data paths and the seeds', () => {
  const r = study({ ...TIDY, ...PINNED, 'a.py': 'import random\nrandom.seed(1)\nx = pd.read_csv("data/a.csv")\n', 'b.R': 'x <- 1\n', 'data/a.csv': 'x\n' });
  const s = find(r, 'summary')[0];
  assert.equal(s.severity, 'info');
  assert.equal(s.where, 'folder');
  assert.equal(s.line, 0);
  assert.match(s.message, /^Read 5 of 7 files in 2 folders: 0 notebooks \(0 code cells\), 1 Python script, 1 R script\. Languages: Python and R\. Dependencies: requirements\.txt 1 requirement \(1 pinned\)\. The code reads 1 relative data path; random numbers are drawn on 0 lines and a seed is set on 1 line\.$/);
});

test('no-readme, no-license and no-citation: each file at the top of the folder, in any case, and only there', () => {
  const r = study({ ...PINNED, 'docs/README.md': 'x', 'sub/LICENSE': 'x', 'sub/CITATION.cff': 'x' });
  assert.deepEqual(problems(r), ['no-readme', 'no-license', 'no-citation']);
  assert.equal(find(r, 'no-readme')[0].severity, 'warning');
  assert.equal(find(r, 'no-citation')[0].severity, 'info');
  const ok = study({ ...PINNED, 'readme.rst': 'x', 'LICENCE.txt': 'x', 'CITATION.cff': TIDY['CITATION.cff'] });
  assert.deepEqual(problems(ok), []);
  assert.deepEqual(problems(study({ ...PINNED, README: 'x', COPYING: 'x', 'CITATION.cff': TIDY['CITATION.cff'] })), []);
});

test('citation-invalid: a missing key, an empty value, no authors, a bad version, and the wrong capitalization', () => {
  const missing = study({ ...TIDY, 'CITATION.cff': 'cff-version: 1.2.0\ntitle: x\n' });
  assert.deepEqual(problems(missing), ['citation-invalid']);
  assert.match(find(missing, 'citation-invalid')[0].message, /the required key authors is missing and the required key message is missing/);
  const empty = study({ ...TIDY, 'CITATION.cff': 'cff-version: 1.2\nmessage: ""\ntitle: x\nauthors: []\n' });
  const m = find(empty, 'citation-invalid')[0];
  assert.match(m.message, /authors lists no author/);
  assert.match(m.message, /message has no value/);
  assert.match(m.message, /cff-version is "1\.2", not a version such as 1\.2\.0/);
  assert.equal(m.line, 1);
  const lower = study({ 'README.md': 'x', LICENSE: 'x', 'citation.cff': TIDY['CITATION.cff'] });
  assert.deepEqual(problems(lower), ['citation-invalid']);
  assert.match(find(lower, 'citation-invalid')[0].message, /must be named CITATION\.cff/);
});

test('no-environment-spec: Python, R and JavaScript code each need their own file, and any one of the accepted files is enough', () => {
  const r = study({ ...TIDY, 'a.py': 'x = 1\n', 'b.R': 'x <- 1\n', 'c.js': 'let x = 1;\n' });
  assert.deepEqual(find(r, 'no-environment-spec').map((f) => f.where), ['Python', 'R', 'JavaScript']);
  assert.equal(r.gate.pass, false);
  assert.match(find(r, 'no-environment-spec')[0].message, /The folder holds Python code \(a\.py\) but no file that says which packages and versions it needs\. The tool looked for requirements\*\.txt, pyproject\.toml/);
  for (const file of ['requirements-dev.txt', 'pyproject.toml', 'environment.yml', 'Pipfile', 'setup.py', 'uv.lock', 'sub/requirements.txt']) {
    assert.deepEqual(find(study({ ...TIDY, 'a.py': 'x = 1\n', [file]: '' }), 'no-environment-spec'), [], file);
  }
  assert.deepEqual(find(study({ ...TIDY, 'b.R': 'x <- 1\n', 'renv.lock': '{}' }), 'no-environment-spec'), []);
  assert.deepEqual(find(study({ ...TIDY, 'b.Rmd': 'x', DESCRIPTION: 'Package: x\n' }), 'no-environment-spec'), []);
  assert.deepEqual(find(study({ ...TIDY, 'c.mjs': 'x', 'package.json': '{}' }), 'no-environment-spec'), []);
});

test('no-environment-spec: a notebook counts as code in the language of its kernel', () => {
  const py = study({ ...TIDY, 'a.ipynb': notebook([[1, 'x = 1']]) });
  assert.deepEqual(find(py, 'no-environment-spec').map((f) => f.where), ['Python']);
  const r = study({ ...TIDY, 'a.ipynb': notebook([[1, 'x <- 1']], { language: 'R' }) });
  assert.deepEqual(find(r, 'no-environment-spec').map((f) => f.where), ['R']);
  const julia = study({ ...TIDY, 'a.ipynb': notebook([[1, 'x = 1']], { language: 'julia' }) });
  assert.deepEqual(find(julia, 'no-environment-spec'), []);
  assert.ok(julia.notes.some((n) => /notebooks with a julia kernel were checked for their order and outputs/.test(n)));
});

test('unpinned-dependency: one finding per requirements file that names every loose requirement, at the line of the first', () => {
  const r = study({ ...TIDY, 'requirements.txt': '# deps\npandas==2.1.4\nnumpy>=1.21\nscipy\ngit+https://example.test/r.git@main\n', 'a.py': 'x=1\n' });
  const f = find(r, 'unpinned-dependency');
  assert.equal(f.length, 1);
  assert.equal(f[0].line, 3);
  assert.equal(f[0].where, '3 requirements');
  assert.match(f[0].message, /^3 of 4 requirements in requirements\.txt are not pinned to one version: numpy \(>=1\.21\), scipy \(no version\) and git\+https:\/\/example\.test\/r\.git@main \(no commit\)\./);
});

test('unpinned-dependency: a lock file, a pin in a constraints file, or a pinned included file make it pass', () => {
  assert.deepEqual(find(study({ ...TIDY, 'requirements.txt': 'pandas\n', 'poetry.lock': '' }), 'unpinned-dependency'), []);
  assert.deepEqual(find(study({ ...TIDY, 'requirements.txt': 'Pandas\n-c constraints.txt\n', 'constraints.txt': 'pandas==2.1.4\n' }), 'unpinned-dependency'), []);
  const inc = study({ ...TIDY, 'requirements.txt': '-r base/common.txt\nnumpy==1.26.4\n', 'base/common.txt': 'scipy\n' });
  const f = find(inc, 'unpinned-dependency');
  assert.deepEqual(f.map((x) => x.file), ['study/base/common.txt']);
  assert.ok(inc.folder.environmentFiles.includes('base/common.txt'));
});

test('unpinned-dependency: an include outside the folder or missing from it is named in a note, and an absolute include is a finding', () => {
  const r = study({ ...TIDY, 'requirements.txt': '-r ../shared.txt\n-r missing.txt\n-r /home/ann/reqs.txt\npandas==2.1.4\n' });
  assert.ok(r.notes.some((n) => n === 'requirements.txt line 1 includes ../shared.txt, which is outside the folder; it was not read'));
  assert.ok(r.notes.some((n) => n === 'requirements.txt line 2 includes missing.txt, which is not in the folder'));
  assert.deepEqual(find(r, 'absolute-path').map((f) => [f.file, f.line]), [['study/requirements.txt', 3]]);
});

test('unpinned-dependency: environment.yml entries without a version, but not pip itself', () => {
  const r = study({ ...TIDY, 'environment.yml': 'dependencies:\n  - python=3.11\n  - numpy\n  - pip\n  - pip:\n    - rich\n' });
  const f = find(r, 'unpinned-dependency');
  assert.equal(f.length, 1);
  assert.match(f[0].message, /^2 of 4 dependencies in environment\.yml are not pinned to one version: numpy and rich\./);
  assert.equal(f[0].line, 3);
  assert.deepEqual(find(study({ ...TIDY, 'environment.yml': 'dependencies:\n  - numpy\n', 'conda-lock.yml': '' }), 'unpinned-dependency'), []);
});

test('no-lock-file: pyproject.toml, Pipfile and package.json with dependencies and no lock; a fully pinned requirements file also counts for pyproject', () => {
  const r = study({ ...TIDY, 'pyproject.toml': '[project]\ndependencies = ["pandas>=2"]\n', Pipfile: '[packages]\npandas = "*"\n', 'package.json': '{"dependencies": {"a": "^1.0.0"}}' });
  assert.deepEqual(find(r, 'no-lock-file').map((f) => [f.file, f.line]), [['study/Pipfile', 2], ['study/package.json', 1], ['study/pyproject.toml', 2]]);
  assert.deepEqual(find(study({ ...TIDY, 'pyproject.toml': '[project]\ndependencies = ["pandas>=2"]\n', 'requirements.txt': 'pandas==2.1.4\n' }), 'no-lock-file'), []);
  assert.deepEqual(find(study({ ...TIDY, 'pyproject.toml': '[project]\ndependencies = ["pandas>=2"]\n', 'uv.lock': '' }), 'no-lock-file'), []);
  assert.deepEqual(find(study({ ...TIDY, Pipfile: '[packages]\npandas = "*"\n', 'Pipfile.lock': '{}' }), 'no-lock-file'), []);
  assert.deepEqual(find(study({ ...TIDY, 'package.json': '{"dependencies": {"a": "1"}}', 'yarn.lock': '' }), 'no-lock-file'), []);
  assert.deepEqual(find(study({ ...TIDY, 'pyproject.toml': '[project]\nname = "x"\n', 'package.json': '{"name": "x"}' }), 'no-lock-file'), []);
});

test('no-lock-file: a package.json that is not JSON is named in a note, not passed over', () => {
  const r = study({ ...TIDY, 'package.json': '{ not json' });
  assert.ok(r.notes.some((n) => /^package\.json could not be read: not valid JSON at line 1/.test(n)));
});

test('notebook-out-of-order: the problems, the saved counts in cell order and the line of the first problem cell', () => {
  const text = notebook(['# t', [3, 'a = 1'], [1, 'b = 2'], [null, 'c = 3'], [7, 'd = 4']]);
  const r = study({ ...TIDY, ...PINNED, 'nb.ipynb': text });
  const f = find(r, 'notebook-out-of-order')[0];
  assert.equal(f.where, 'cell 2');
  assert.equal(text.split('\n')[f.line - 1].trim(), '{');
  assert.match(f.message, /the first run cell \(cell 2\) has execution count 3, so 2 runs are not in the saved notebook; cell 3 has execution count 1, after cell 2 with 3; cell 4 was not run, but cells before and after it were; the execution count jumps from 1 \(cell 3\) to 7 \(cell 5\)\. The saved execution counts in cell order are 3, 1, none, 7\./);
  assert.deepEqual(find(study({ ...TIDY, ...PINNED, 'nb.ipynb': notebook([[1, 'a'], [2, 'b']]) }), 'notebook-out-of-order'), []);
});

test('notebook-outputs-with-errors: every cell with a saved error, with the error name and value', () => {
  const r = study({ ...TIDY, ...PINNED, 'nb.ipynb': notebook([[1, 'a'], [2, 'b', [errorOutput('KeyError', "'wage'")]], [3, 'c', [streamOutput('ok\n'), errorOutput('ValueError', 'bad')]]]) });
  const f = find(r, 'notebook-outputs-with-errors');
  assert.equal(f.length, 1);
  assert.equal(f[0].where, 'cell 2');
  assert.match(f[0].message, /^2 cells of the notebook have a saved error: cell 2 \(KeyError: 'wage'\) and cell 3 \(ValueError: bad\)\./);
});

test('notebook-unreadable: a notebook that is not JSON or not nbformat 4, or that was too large to read', () => {
  const r = study({ ...TIDY, ...PINNED, 'a.ipynb': '{ broken', 'b.ipynb': '{"nbformat": 3}' });
  assert.deepEqual(find(r, 'notebook-unreadable').map((f) => f.file), ['study/a.ipynb', 'study/b.ipynb']);
  const big = walkOf({ ...TIDY, ...PINNED, 'c.ipynb': '{}' });
  big.files.find((f) => f.rel === 'c.ipynb').text = null;
  big.files.find((f) => f.rel === 'c.ipynb').reason = '20,000,000 bytes is over the 16 MB limit';
  const m = buildModel(big);
  const { findings } = runRules(m, { folder: 'study' });
  assert.match(findings.find((f) => f.id === 'notebook-unreadable').message, /not read: 20,000,000 bytes is over the 16 MB limit/);
});

test('notebook-large-outputs: cells whose saved outputs pass the limit, which --max-output changes', () => {
  const nb = notebook([[1, 'a', [streamOutput('x'.repeat(3000))]], [2, 'b', [streamOutput('y')]]]);
  const r = study({ ...TIDY, ...PINNED, 'nb.ipynb': nb }, { maxOutput: 1024 });
  const f = find(r, 'notebook-large-outputs');
  assert.equal(f.length, 1);
  assert.equal(f[0].severity, 'info');
  assert.match(f[0].message, /^1 cell of the notebook holds saved outputs over 1 KB: cell 1 \(3,0\d\d characters\)\./);
  assert.deepEqual(find(study({ ...TIDY, ...PINNED, 'nb.ipynb': nb }), 'notebook-large-outputs'), []);
});

test('missing-data-file: a relative path read by a script or a notebook that is not in the folder', () => {
  const r = study({ ...TIDY, ...PINNED, 'src/load.py': 'import pandas as pd\nx = pd.read_csv("data/raw.csv")\ny = np.load("../data/arr.npy")\nz = open("../../up.txt")\n', 'nb.ipynb': notebook([[1, 'df = pd.read_parquet("data/b.parquet")']]), 'data/arr.npy': 'x' });
  const f = find(r, 'missing-data-file');
  assert.deepEqual(f.map((x) => [x.file, x.where, x.line]), [['study/nb.ipynb', 'data/b.parquet', f[0].line], ['study/src/load.py', 'data/raw.csv', 2], ['study/src/load.py', '../../up.txt', 4]]);
  assert.match(f[1].message, /^pd\.read_csv\("data\/raw\.csv"\) at line 2 reads src\/data\/raw\.csv, which is not in the folder and is not named in a README or data document\.$/);
  assert.match(f[2].message, /reads a path outside the folder of the study/);
  assert.equal(f[0].line, notebook([[1, 'df = pd.read_parquet("data/b.parquet")']]).split('\n').findIndex((l) => l.includes('read_parquet')) + 1);
});

test('missing-data-file: a file the code writes, a path named in a README, a path relative to the root, and R reads', () => {
  const files = { ...PINNED, LICENSE: 'x', 'CITATION.cff': TIDY['CITATION.cff'], 'README.md': '## Data\nGet data/secret.csv from the team.\n', 'a.py': 'df.to_csv("out/r.csv")\nx = pd.read_csv("out/r.csv")\nwith open("log.txt", "w") as f:\n    pass\ny = open("log.txt")\nz = pd.read_csv("data/secret.csv")\n', 'src/b.py': 'q = pd.read_csv("data/here.csv")\n', 'data/here.csv': 'x', 'c.R': 'd <- read.csv("data/gone.csv")\nsource("helpers.R")\n', 'renv.lock': '{}' };
  const r = study(files);
  assert.deepEqual(find(r, 'missing-data-file').map((f) => f.where), ['data/gone.csv', 'helpers.R']);
  assert.ok(r.notes.some((n) => n === '1 data path that the code reads is not in the folder but is named in a README or data document, so it was not reported: data/secret.csv (README.md)'));
});

test('missing-data-file: strings that are not paths, f-strings, URLs and calls that do not read a file are left alone', () => {
  const r = study({ ...TIDY, ...PINNED, 'a.py': 'print("data/x.csv")\nx = pd.read_csv(f"data/{name}.csv")\ny = pd.read_csv("https://example.test/a.csv")\nz = df.rename(columns="a.csv")\nw = pd.read_csv(path, sep="data/x.csv")\n' });
  assert.deepEqual(find(r, 'missing-data-file'), []);
});

test('absolute-path: in scripts, notebooks and requirements, once per file and path, with its kind', () => {
  const r = study({ ...TIDY, 'requirements.txt': 'pkg @ file:///home/ann/pkg\n/home/ann/wheels/a-1.0-py3-none-any.whl\n', 'a.py': 'A = "C:\\\\Users\\\\ann\\\\data.csv"\nB = r"D:\\study\\x.csv"\nC = "/Users/ann/x.csv"\nD = "/Users/ann/x.csv"\n', 'nb.ipynb': notebook([[1, 'p = "~/data/x.csv"']]) });
  const f = find(r, 'absolute-path');
  assert.deepEqual(f.map((x) => [x.file, x.line]), [['study/a.py', 1], ['study/a.py', 2], ['study/a.py', 3], ['study/nb.ipynb', f[3].line], ['study/requirements.txt', 1], ['study/requirements.txt', 2]]);
  assert.match(f[0].message, /^"C:\\Users\\ann\\data\.csv" is a path on a Windows drive\./);
  assert.match(f[3].message, /is a path in the home folder\./);
  assert.equal(r.findings.filter((x) => x.id === 'unpinned-dependency').length, 0, 'a direct reference is not a loose requirement');
});

test('no-seed: random draws with no seed anywhere in the folder, listing the first ones', () => {
  const r = study({ ...TIDY, ...PINNED, 'a.py': 'import random\nrandom.shuffle(x)\n', 'nb.ipynb': notebook([[1, 'v = np.random.normal(0, 1, 5)']]) });
  const f = find(r, 'no-seed');
  assert.equal(f.length, 1);
  assert.equal(f[0].file, 'study/a.py');
  assert.equal(f[0].line, 2);
  assert.match(f[0].message, /^The code draws random numbers \(a\.py line 2: random\.shuffle\(x\) and nb\.ipynb cell 1: v = np\.random\.normal\(0, 1, 5\)\) and no seed is set anywhere in the folder\./);
});

test('no-seed: a seed in any file of the folder, or random_state on the call, is enough; a generator made without a seed is not', () => {
  assert.deepEqual(find(study({ ...TIDY, ...PINNED, 'a.py': 'random.shuffle(x)\n', 'b.py': 'random.seed(5)\n' }), 'no-seed'), []);
  assert.deepEqual(find(study({ ...TIDY, ...PINNED, 'a.py': 'train_test_split(X, y, random_state=3)\n' }), 'no-seed'), []);
  assert.deepEqual(find(study({ ...TIDY, 'renv.lock': '{}', 'a.R': 'set.seed(9)\nx <- rnorm(5)\n' }), 'no-seed'), []);
  const gen = study({ ...TIDY, ...PINNED, 'a.py': 'np.random.seed(1)\nrng = np.random.default_rng()\n' });
  const f = find(gen, 'no-seed');
  assert.equal(f.length, 1);
  assert.equal(f[0].line, 2);
  assert.match(f[0].message, /makes a random generator with no seed/);
});

test('secrets-in-notebook: keys in code and in saved outputs, masked, as errors', () => {
  const aws = pieces('AK', 'IA', 'Z7Q4XW2M9KTR3BVN');
  const r = study({ ...TIDY, ...PINNED, 'nb.ipynb': notebook([[1, pieces('tok', 'en = "abcd1234efgh5678"')], [2, 'print(cfg)', [streamOutput(`key: ${aws}\n`)]]]), 'a.py': pieces('api_', 'key = "zz99yy88xx77ww66"\n') });
  const f = find(r, 'secrets-in-notebook');
  assert.deepEqual(f.map((x) => [x.file, x.where.replace(/^line \d+$/, 'line')]), [['study/a.py', 'line'], ['study/nb.ipynb', 'cell 1'], ['study/nb.ipynb', 'cell 2 output']]);
  assert.equal(f[0].severity, 'error');
  assert.match(f[2].message, /^An AWS access key id is written in the saved output: AKIA\.\.\. \(20 characters\)\./);
  const all = JSON.stringify(r);
  assert.ok(!all.includes(aws));
  assert.ok(!all.includes('abcd1234efgh5678'));
  assert.ok(!all.includes('zz99yy88xx77ww66'));
});

test('secrets-in-notebook: a key in a saved error message is masked in the error finding too', () => {
  const aws = pieces('AK', 'IA', 'Z7Q4XW2M9KTR3BVN');
  const r = study({ ...TIDY, ...PINNED, 'nb.ipynb': notebook([[1, 'go()', [errorOutput('AuthError', `bad key ${aws}`)]]]) });
  assert.ok(!JSON.stringify(r).includes(aws));
  assert.match(find(r, 'notebook-outputs-with-errors')[0].message, /AuthError: bad key AKIA\.\.\. \(20 characters\)/);
});

test('findings of one kind are capped, counted in the totals and the gate, and named in a note', () => {
  const files = { ...TIDY, ...PINNED };
  for (let i = 0; i < 5; i += 1) files[`s${i}.py`] = `A = "/home/ann/f${i}.csv"\n`;
  const r = study(files, { limits: { maxListedPerFinding: 3 } });
  assert.equal(find(r, 'absolute-path').length, 3);
  assert.equal(r.counts.warning, 5);
  assert.ok(r.notes.includes('2 more findings of absolute-path are counted but not listed'));
  assert.match(r.areas.find((a) => a.id === 'data').detail, /absolute-path x5/);
});

test('notes: links not followed, folders skipped, files not read, entries that are not files, and a folder with no code', () => {
  const r = study({ ...TIDY }, { walk: { links: ['data/raw'], skipped: ['.git', 'node_modules'], special: [{ rel: 'fifo', reason: 'not a regular file or folder' }] } });
  assert.ok(r.notes.includes('1 symbolic link was not followed: data/raw'));
  assert.ok(r.notes.includes('2 folders of tools or caches were not entered: .git and node_modules'));
  assert.ok(r.notes.includes('1 entry is not a regular file or folder, or could not be read: fifo (not a regular file or folder)'));
  assert.ok(r.notes.includes('the folder holds no Python, R or JavaScript code; only the files at its top were checked'));
  const w = walkOf({ ...TIDY, ...PINNED, 'a.py': 'x' });
  Object.assign(w.files.find((f) => f.rel === 'a.py'), { text: null, reason: 'holds binary data' });
  assert.ok(runRules(buildModel(w), {}).notes.includes('1 file was not read: a.py (holds binary data)'));
});

test('a link counts as a name in the folder, so a path through it is not reported missing', () => {
  const r = study({ ...TIDY, ...PINNED, 'a.py': 'x = pd.read_csv("data/raw/a.csv")\n' }, { walk: { links: ['data/raw/a.csv'] } });
  assert.deepEqual(find(r, 'missing-data-file'), []);
});

test('areas: each area shows the worst severity it holds, and the gate counts errors, or warnings with --fail-on warning', () => {
  const r = study({ 'a.py': 'x = 1\n' }, { failOn: 'warning' });
  assert.deepEqual(r.areas.map((a) => [a.id, a.result]), [['folder', 'warn'], ['environment', 'fail'], ['notebooks', 'pass'], ['data', 'pass'], ['randomness', 'pass'], ['secrets', 'pass']]);
  assert.deepEqual(r.gate, { failOn: 'warning', pass: false, reason: '1 error, 2 warnings' });
  assert.equal(meetsThreshold('info', 'warning'), false);
  assert.equal(meetsThreshold('warning', 'warning'), true);
  assert.equal(meetsThreshold('warning', 'error'), false);
});

test('order: findings are grouped by area in report order, then by check, file and line', () => {
  const r = study({ 'a.py': 'random.shuffle(x)\nA = "/home/ann/x"\n' });
  const areaOrder = r.findings.map((f) => f.area);
  assert.deepEqual(areaOrder, [...areaOrder].sort((a, b) => ['folder', 'environment', 'notebooks', 'data', 'randomness', 'secrets'].indexOf(a) - ['folder', 'environment', 'notebooks', 'data', 'randomness', 'secrets'].indexOf(b)));
  assert.equal(r.findings[0].id, 'summary');
  assert.equal(FINDINGS[0].id, 'summary');
});

test('the files the walk reads, and the kind of each code file', () => {
  for (const f of ['a.py', 'b.R', 'c.r', 'd.Rmd', 'e.ipynb', 'requirements.txt', 'requirements-dev.in', 'pyproject.toml', 'environment.yml', 'Pipfile', 'package.json', 'CITATION.cff', 'README.md', 'docs/DATA.md', 'small.txt']) assert.equal(wantedFile(f, 10), true, f);
  for (const f of ['data.csv', 'image.png', 'x.js', 'uv.lock']) assert.equal(wantedFile(f, 10), false, f);
  assert.equal(wantedFile('big.txt', 5 * 1024 * 1024), false);
  assert.deepEqual(['a.py', 'b.R', 'c.ipynb', 'd.ts', 'e.csv'].map(codeKind), ['python', 'r', 'notebook', 'javascript', null]);
});

test('safeText removes control, line separator and direction characters and caps the length', () => {
  assert.equal(safeText(`a${String.fromCharCode(27)}[31mb${String.fromCharCode(0x202e)}c${String.fromCharCode(0x2028)}d`), 'a [31mb c d');
  assert.equal(safeText('x'.repeat(50), 10), 'xxxxxxx...');
});
