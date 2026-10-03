import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, symlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { LIMITS, isBinary, main, parseJson, parseNotebook, parseRequirement, scanSource, toCsv, toMarkdown, toText, walkFolder, wantedFile } from '../src/index.js';
import { TIDY, find, notebook, run, study, withFiles } from './helpers.js';

// Hostile input: a study folder that tries to exhaust the memory or the time, to lead the tool out of the folder or
// round in a loop, to make it run code, to rewrite the terminal, to break a table or to change how objects behave.
// Each test also checks the time, because a pattern that grows with the input is a failure even when the answer is
// right.

const LIMIT = { timeout: 30000 };
const fast = async (fn, ms = 4000) => {
  const start = Date.now();
  const result = await fn();
  assert.ok(Date.now() - start < ms, `took ${Date.now() - start} ms`);
  return result;
};
const quiet = { out: () => {}, err: () => {} };

test('hostile: a file to read that is over the size limit is not read and is named; a data file of any size is only listed', LIMIT, async () => {
  await withFiles({ ...TIDY, 'requirements.txt': 'pandas==2.1.4\n' }, async (dir) => {
    await writeFile(resolve(dir, 'big.py'), Buffer.alloc(2560, 0x20));
    await writeFile(resolve(dir, 'big.csv'), Buffer.alloc(4096, 0x41));
    let out = '';
    const code = await fast(() => main(['.', '--format', 'json'], { out: (t) => { out += t; }, err: () => {} }, { ...LIMITS, maxFileBytes: 1024 }, dir));
    assert.equal(code, 0);
    const r = JSON.parse(out);
    assert.ok(r.notes.some((n) => /1 file was not read: big\.py \(2,560 bytes is over the 1,024 byte limit\)/.test(n)));
    assert.equal(r.folder.files, 6);
  });
});

test('hostile: a notebook over the size limit is a finding, not a pass', LIMIT, async () => {
  await withFiles({ ...TIDY, 'requirements.txt': 'pandas==2.1.4\n', 'nb.ipynb': notebook([[1, `x = "${'a'.repeat(3000)}"`]]) }, async (dir) => {
    let out = '';
    await main(['.'], { out: (t) => { out += t; }, err: () => {} }, { ...LIMITS, maxFileBytes: 1024 }, dir);
    assert.match(out, /WARNING {2}notebook-unreadable {2}nb\.ipynb notebook {2}line 1/);
    assert.match(out, /not read: \d[\d,]* bytes is over the 1,024 byte limit/);
  });
});

test('hostile: more entries, deeper folders or more bytes to read than the limits refuse the folder with exit code 2', LIMIT, async () => {
  await withFiles({ 'a/b/c/d/e.py': 'x', 'f.py': 'x', 'g.py': 'x' }, async (dir) => {
    let err = '';
    const e = { out: () => {}, err: (t) => { err += t; } };
    assert.equal(await main(['.'], e, { ...LIMITS, maxEntries: 3 }, dir), 2);
    assert.match(err, /holds more than 3 files and folders/);
    err = '';
    assert.equal(await main(['.'], e, { ...LIMITS, maxDepth: 2 }, dir), 2);
    assert.match(err, /has folders nested more than 2 deep/);
    err = '';
    assert.equal(await main(['.'], e, { ...LIMITS, maxTotalBytes: 2 }, dir), 2);
    assert.match(err, /the files to read hold more than 2 byte/);
  });
});

test('hostile: a binary file with a code name is not read as code', LIMIT, async () => {
  await withFiles({ ...TIDY }, async (dir) => {
    await writeFile(resolve(dir, 'a.py'), Buffer.from([0x70, 0x00, 0x01, 0xff]));
    const w = await walkFolder(dir, wantedFile);
    assert.equal(w.files.find((f) => f.rel === 'a.py').reason, 'holds binary data');
    assert.equal(isBinary(Buffer.from('plain text')), false);
  });
});

test('hostile: very long lines and long near misses run in one pass, and long lines are counted, not scanned', LIMIT, async () => {
  const long = `x = "${'/home/a/'.repeat(800)}"`;
  const near = `${'read_csv('.repeat(400)}"a.csv"`;
  const spaces = `token${' '.repeat(3000)}=`;
  const r = await fast(() => study({ ...TIDY, 'requirements.txt': 'pandas==2.1.4\n', 'a.py': [long, near, spaces, `${'('.repeat(4000)}`, `${'"'.repeat(4000)}`, `${"'''".repeat(1300)}`].join('\n') }));
  assert.ok(r.notes.some((n) => /lines? of code longer than 4,096 characters (?:was|were) not scanned/.test(n)));
  await fast(() => scanSource(`${'"a" '.repeat(1000)}\n`.repeat(200), 'python'));
  await fast(() => parseRequirement(`a${' '.repeat(1800)}>=1`));
  await fast(() => parseJson(`"${'\\n'.repeat(400000)}"`));
});

test('hostile: a notebook with deep nesting, a huge cell count or broken JSON is reported, never a crash or a stack overflow', LIMIT, async () => {
  const deep = `{"nbformat": 4, "cells": [${'['.repeat(100000)}${']'.repeat(100000)}]}`;
  const nb = await fast(() => parseNotebook(deep));
  assert.equal(nb.ok, false);
  assert.match(nb.error, /nested more than 64 deep/);
  const r = study({ ...TIDY, 'requirements.txt': 'pandas==2.1.4\n', 'a.ipynb': deep, 'b.ipynb': '{"nbformat": 4, "cells": [', 'c.ipynb': '' });
  assert.equal(find(r, 'notebook-unreadable').length, 3);
});

test('hostile: thousands of findings of one kind are capped at 200 and counted', LIMIT, async () => {
  const lines = Array.from({ length: 3000 }, (_, i) => `p${i} = "/home/ann/f${i}.csv"`).join('\n');
  const r = await fast(() => study({ ...TIDY, 'requirements.txt': 'pandas==2.1.4\n', 'a.py': lines }), 8000);
  assert.equal(find(r, 'absolute-path').length, 200);
  assert.equal(r.counts.warning, 3000);
  assert.ok(r.notes.includes('2,800 more findings of absolute-path are counted but not listed'));
});

test('hostile: names and text made of control, direction and line separator characters are cleaned in every format', LIMIT, () => {
  const bad = ['x', String.fromCharCode(27), '[31m', String.fromCharCode(0x202e), 'y', String.fromCharCode(0x2028), 'z', String.fromCharCode(0x85)].join('');
  const r = study({ ...TIDY, 'requirements.txt': 'pandas==2.1.4\n', [`${bad}.py`]: `p = "/home/ann/${bad}"\nq = pd.read_csv("data/${bad}.csv")\n`, 'nb.ipynb': notebook([[2, 'x', [{ output_type: 'error', ename: bad, evalue: bad, traceback: [] }]]]) });
  assert.ok(find(r, 'absolute-path').length >= 1);
  assert.ok(find(r, 'notebook-outputs-with-errors').length === 1);
  for (const o of [toText(r), toMarkdown(r), toCsv(r), JSON.stringify(r)]) {
    for (const code of [27, 0x202e, 0x2028, 0x85]) assert.ok(!o.includes(String.fromCharCode(code)), `character ${code}`);
  }
});

test('hostile: file and key names such as __proto__, constructor and toString are only names', LIMIT, () => {
  const r = study({ ...TIDY, __proto__: 'x', 'constructor.py': 'x = 1\n', 'toString/requirements.txt': 'hasOwnProperty==1.0\n', 'CITATION.cff': 'cff-version: 1.2.0\n__proto__: x\nmessage: m\ntitle: t\nauthors:\n  - name: a\n' });
  assert.equal({}.polluted, undefined);
  assert.equal(Object.getPrototypeOf({}), Object.prototype);
  assert.equal(r.folder.pythonScripts, 1);
  assert.deepEqual(find(r, 'citation-invalid'), []);
  const nb = parseNotebook('{"nbformat": 4, "cells": [], "metadata": {"__proto__": {"x": 1}}}');
  assert.equal(nb.ok, true);
});

test('hostile: a file name or a value that starts with = or holds markup cannot run in a spreadsheet or break a Markdown table', LIMIT, () => {
  const evil = '=HYPERLINK("x","y")|a<script>[click](https://evil.example.test)`x`';
  const r = study({ ...TIDY, 'requirements.txt': 'pandas==2.1.4\n', 'a.py': `p = "/home/ann/${evil}"\n` });
  const md = toMarkdown(r);
  assert.ok(!md.includes('<script>'));
  assert.ok(!md.includes('[click]('));
  for (const row of md.split('\n').filter((l) => l.startsWith('| warning |'))) assert.equal(row.replace(/\\\|/g, '').split('|').length, 8, row.slice(0, 80));
  const csv = toCsv(r);
  assert.ok(!/(^|,)=HYPERLINK/m.test(csv));
});

test('hostile: the code of the study is never run, even when it would write a file or exit', LIMIT, async () => {
  const marker = 'ran-the-code.txt';
  await withFiles({ ...TIDY, 'requirements.txt': 'pandas==2.1.4\n', 'a.py': `open("${marker}", "w").write("x")\nimport sys\nsys.exit(3)\n`, 'nb.ipynb': notebook([[1, `open("${marker}", "w")`]]), 'setup.py': `open("${marker}", "w")\n`, 'b.R': `writeLines("x", "${marker}")\nquit(status = 3)\n` }, async (dir) => {
    const code = await main(['.'], quiet, undefined, dir);
    assert.ok(code === 0 || code === 1);
    const w = await walkFolder(dir, () => false);
    assert.ok(!w.files.some((f) => f.rel === marker));
  });
});

test('hostile: an argument that is a URL, a very long path, or a path with control characters is refused or reported cleanly', LIMIT, async () => {
  const url = await run({}, ['https://example.test/study']);
  assert.equal(url.code, 2);
  assert.match(url.err, /never fetches a URL/);
  const long = await run({}, [`${'a'.repeat(5000)}`]);
  assert.equal(long.code, 2);
  assert.ok(long.err.length < 8000);
  const control = await run({}, [`x${String.fromCharCode(27)}[31mfolder`]);
  assert.equal(control.code, 2);
  assert.ok(!control.err.includes(String.fromCharCode(27)));
});

test('hostile: a symbolic link to a folder outside, a link to a file, and a link loop are listed and never followed', LIMIT, async (t) => {
  if (process.platform === 'win32') {
    t.skip('creating a symbolic link needs a privilege on Windows');
    return;
  }
  await withFiles({ 'outside/secret.py': 'TOKEN = 1\n', 'study/README.md': 'x', 'study/a.py': 'x = pd.read_csv("data/linked.csv")\n' }, async (dir) => {
    await symlink(resolve(dir, 'outside'), resolve(dir, 'study/escape'));
    await mkdir(resolve(dir, 'study/data'));
    await symlink(resolve(dir, 'outside/secret.py'), resolve(dir, 'study/data/linked.csv'));
    await symlink(resolve(dir, 'study'), resolve(dir, 'study/loop'));
    let out = '';
    const code = await fast(() => main(['study', '--format', 'json'], { out: (x) => { out += x; }, err: () => {} }, undefined, dir));
    assert.equal(code, 1);
    const r = JSON.parse(out);
    assert.equal(r.folder.links, 3);
    assert.ok(r.notes.some((n) => /3 symbolic links were not followed: data\/linked\.csv, escape and loop/.test(n)));
    assert.equal(r.folder.pythonScripts, 1, 'the script outside the folder was not read');
    assert.ok(!r.findings.some((f) => f.id === 'missing-data-file'));
  });
});

test('hostile: the folder given as an argument may itself be a link, because the person named it', LIMIT, async (t) => {
  if (process.platform === 'win32') {
    t.skip('creating a symbolic link needs a privilege on Windows');
    return;
  }
  await withFiles({ 'real/README.md': 'x' }, async (dir) => {
    await symlink(resolve(dir, 'real'), resolve(dir, 'named'));
    assert.equal(await main(['named'], quiet, undefined, dir), 0);
  });
});

test('hostile: a pipe or a device inside the folder is listed and never opened', LIMIT, async (t) => {
  if (process.platform === 'win32') {
    t.skip('there is no device file to link to on Windows');
    return;
  }
  await withFiles({ 'README.md': 'x' }, async (dir) => {
    await symlink('/dev/null', resolve(dir, 'requirements.txt'));
    let out = '';
    const code = await fast(() => main(['.', '--format', 'json'], { out: (x) => { out += x; }, err: () => {} }, undefined, dir));
    assert.equal(code, 0);
    assert.equal(JSON.parse(out).folder.links, 1);
  });
});

test('hostile: a file name with control characters is cleaned in the report, where the system allows such a name', LIMIT, async (t) => {
  if (process.platform === 'win32') {
    t.skip('Windows does not allow a control character in a file name');
    return;
  }
  const name = `evil${String.fromCharCode(27)}[31m.py`;
  let r;
  try {
    r = await run({ [name]: 'P = "/home/ann/x"\n' }, ['.']);
  } catch (error) {
    if (!['EINVAL', 'EILSEQ', 'ENOENT', 'EPERM', 'EACCES'].includes(error.code)) throw error;
    t.skip(`this file system does not allow the name (${error.code})`);
    return;
  }
  assert.equal(r.code, 1);
  assert.ok(!r.out.includes(String.fromCharCode(27)));
});

test('hostile: Windows paths with backslashes are found in code as text on every system, and never opened', LIMIT, () => {
  const r = study({ ...TIDY, 'requirements.txt': 'pandas==2.1.4\n', 'a.py': 'p = r"C:\\Users\\ann\\data.csv"\nq = pd.read_csv("data\\\\raw.csv")\n' });
  assert.deepEqual(find(r, 'absolute-path').map((f) => f.line), [1]);
  assert.deepEqual(find(r, 'missing-data-file').map((f) => f.where), ['data/raw.csv']);
});
