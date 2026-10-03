// Shared test helpers: study folders built inline, either in memory (the same shape the walk returns) or written into a
// temporary folder that is removed after the test. Paths are built with resolve() from forward-slash names, so the
// same test runs on Linux, macOS and Windows.

import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { checkWalk, main, wantedFile } from '../src/index.js';

export async function withFiles(files, fn) {
  const dir = await mkdtemp(resolve(tmpdir(), 'research-repro-check-'));
  try {
    for (const [rel, content] of Object.entries(files)) {
      await mkdir(dirname(resolve(dir, rel)), { recursive: true });
      await writeFile(resolve(dir, rel), content);
    }
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// What the walk would return for these files: { rel: text }. A file the walk would not read keeps only its size.
export function walkOf(files, extra = {}) {
  const folders = new Set();
  const list = Object.entries(files).map(([rel, text]) => {
    const parts = rel.split('/');
    for (let i = 1; i < parts.length; i += 1) folders.add(parts.slice(0, i).join('/'));
    const size = Buffer.byteLength(text);
    return { rel, size, text: wantedFile(rel, size) ? text : null, reason: null };
  });
  list.sort((a, b) => (a.rel < b.rel ? -1 : 1));
  return { files: list, folders: [...folders].sort(), links: [], skipped: [], special: [], ...extra };
}

// The files every tidy study has, so a test can look at one check at a time.
export const TIDY = {
  'README.md': '# Study\n\nHow to run it.\n',
  LICENSE: 'MIT License\n',
  'CITATION.cff': 'cff-version: 1.2.0\nmessage: "Please cite this software using these metadata."\ntitle: "Study"\nauthors:\n  - family-names: Doe\n    given-names: Ann\n'
};

// Checks a study given as { rel: text }.
export function study(files, options = {}) {
  return checkWalk(walkOf(files, options.walk), { folder: 'study', ...options });
}

export const ids = (report) => report.findings.map((f) => f.id);
export const find = (report, id) => report.findings.filter((f) => f.id === id);
// The finding ids without the summary that every report has.
export const problems = (report) => ids(report).filter((id) => id !== 'summary');

// A notebook in nbformat 4 with these cells: [count, source, outputs] for code, or a string for Markdown.
export function notebook(cells, { language = 'python', minor = 4 } = {}) {
  const toLines = (t) => {
    const a = t.split('\n');
    return a.map((l, i) => (i < a.length - 1 ? `${l}\n` : l)).filter((l) => l !== '');
  };
  return `${JSON.stringify({
    cells: cells.map((c) => (typeof c === 'string' ? { cell_type: 'markdown', metadata: {}, source: toLines(c) } : { cell_type: 'code', execution_count: c[0], metadata: {}, outputs: c[2] ?? [], source: toLines(c[1]) })),
    metadata: { kernelspec: { display_name: language, language, name: language }, language_info: { name: language } },
    nbformat: 4,
    nbformat_minor: minor
  }, null, 1)}\n`;
}

export const errorOutput = (ename, evalue) => ({ output_type: 'error', ename, evalue, traceback: [`${ename}: ${evalue}`] });
export const streamOutput = (text) => ({ output_type: 'stream', name: 'stdout', text: [text] });

// Writes the files and runs the command line with these arguments (paths relative to the folder).
export async function run(files, args = [], limits) {
  return withFiles(files, async (dir) => {
    let out = '';
    let err = '';
    const code = await main(args, { out: (t) => { out += t; }, err: (t) => { err += t; } }, limits, dir);
    return { code, out, err };
  });
}

// Runs the command line with exactly these arguments.
export async function cli(argv) {
  let out = '';
  let err = '';
  const code = await main(argv, { out: (t) => { out += t; }, err: (t) => { err += t; } });
  return { code, out, err };
}

// A string from pieces, so that a test file does not hold a whole token that a scanner would take for a real one.
export const pieces = (...parts) => parts.join('');
