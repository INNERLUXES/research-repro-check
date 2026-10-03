// Jupyter notebooks in nbformat 4. The reader takes the cells in order with the line where each starts in the file, the
// source of each cell, the execution count of each code cell and its outputs. It never runs a cell and never starts a
// kernel. The checks then read the saved execution counts and outputs.

import { isObject, parseJson } from './json.js';

export const NOTEBOOK_LIMITS = { maxCells: 10000, maxOutputsPerCell: 1000 };

const joinSource = (s) => (Array.isArray(s) ? s.filter((x) => typeof x === 'string').join('') : typeof s === 'string' ? s : '');

// The number of characters of text in a value: the size that an output takes in the saved file, near enough.
function textSize(value, depth = 0) {
  if (typeof value === 'string') return value.length;
  if (depth > 20 || value === null || typeof value !== 'object') return 0;
  let n = 0;
  for (const v of Array.isArray(value) ? value : Object.values(value)) n += textSize(v, depth + 1);
  return n;
}

// Terminal colour codes that Jupyter keeps in tracebacks.
const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]{0,40}[A-Za-z]`, 'g');

function readOutput(o, lines) {
  if (!isObject(o)) return { type: 'unknown', line: 0, text: '', size: 0 };
  const type = typeof o.output_type === 'string' ? o.output_type : 'unknown';
  let text = '';
  if (type === 'stream') text = joinSource(o.text);
  else if (type === 'execute_result' || type === 'display_data') text = isObject(o.data) ? joinSource(o.data['text/plain']) : '';
  else if (type === 'error') text = [o.ename, o.evalue, ...(Array.isArray(o.traceback) ? o.traceback : [])].filter((x) => typeof x === 'string').join('\n').replace(ANSI, '');
  return {
    type,
    line: lines.get(o) ?? 0,
    text,
    size: textSize(o),
    ename: typeof o.ename === 'string' ? o.ename : '',
    evalue: typeof o.evalue === 'string' ? o.evalue.replace(ANSI, '') : ''
  };
}

// The kernel language of a notebook, from its metadata, in lower case; python when the metadata does not say.
function kernelLanguage(meta) {
  if (!isObject(meta)) return 'python';
  const ks = isObject(meta.kernelspec) ? meta.kernelspec : {};
  const li = isObject(meta.language_info) ? meta.language_info : {};
  const lang = typeof ks.language === 'string' ? ks.language : typeof li.name === 'string' ? li.name : typeof ks.name === 'string' ? (ks.name === 'ir' ? 'r' : ks.name.replace(/[0-9.]+$/, '')) : 'python';
  return lang.toLowerCase().slice(0, 40);
}

// Reads a notebook. Returns { ok: false, error } for a file that is not JSON or not nbformat 4, else the cells.
export function parseNotebook(text, limits = NOTEBOOK_LIMITS) {
  let parsed;
  try {
    parsed = parseJson(text);
  } catch (error) {
    return { ok: false, error: error.message };
  }
  const { value: nb, lines } = parsed;
  if (!isObject(nb)) return { ok: false, error: 'the file is JSON, but not a JSON object' };
  if (nb.nbformat !== 4) return { ok: false, error: nb.nbformat === undefined ? 'it has no nbformat key' : `it is nbformat ${String(nb.nbformat).slice(0, 20)}; only nbformat 4 is read` };
  if (!Array.isArray(nb.cells)) return { ok: false, error: 'it has no cells list' };
  if (nb.cells.length > limits.maxCells) return { ok: false, error: `it has more than ${limits.maxCells.toLocaleString('en-US')} cells` };
  const cells = [];
  nb.cells.forEach((c, i) => {
    if (!isObject(c)) {
      cells.push({ index: i + 1, type: 'unknown', line: 0, sourceLine: 0, sourceArray: false, source: '', count: null, countValid: true, outputs: [] });
      return;
    }
    const type = typeof c.cell_type === 'string' ? c.cell_type : 'unknown';
    const count = c.execution_count;
    const outputs = type === 'code' && Array.isArray(c.outputs) ? c.outputs.slice(0, limits.maxOutputsPerCell).map((o) => readOutput(o, lines)) : [];
    cells.push({
      index: i + 1,
      type,
      line: lines.get(c) ?? 0,
      // Jupyter writes a source list one string per line, so line k of the source is on the line after the [ plus k.
      sourceLine: Array.isArray(c.source) ? (lines.get(c.source) ?? 0) + 1 : lines.get(c) ?? 0,
      sourceArray: Array.isArray(c.source),
      source: joinSource(c.source),
      count: Number.isInteger(count) ? count : null,
      countValid: count === undefined || count === null || Number.isInteger(count),
      outputs
    });
  });
  return { ok: true, minor: Number.isInteger(nb.nbformat_minor) ? nb.nbformat_minor : null, language: kernelLanguage(nb.metadata), cells };
}

// What the saved execution counts show about the order the code cells were run in. Cells with no code are left out. A
// notebook that was run from top to bottom in a fresh kernel has the counts 1, 2, 3 and so on with no gap.
export function executionProblems(cells) {
  const code = cells.filter((c) => c.type === 'code' && c.source.trim() !== '');
  const problems = [];
  for (const c of code) if (!c.countValid) problems.push({ cell: c, kind: 'invalid', text: `cell ${c.index} has an execution count that is neither a whole number nor null` });
  const executed = code.filter((c) => c.count !== null);
  if (!executed.length) return { problems, order: code.map(() => null), code: code.length, executed: 0 };
  const first = executed[0];
  if (first.count !== 1) problems.push({ cell: first, kind: 'start', text: `the first run cell (cell ${first.index}) has execution count ${first.count}, so ${first.count - 1} ${first.count - 1 === 1 ? 'run is' : 'runs are'} not in the saved notebook` });
  const lastIndex = executed.at(-1).index;
  let prev = null;
  for (const c of code) {
    if (c.count === null) {
      if (prev && c.index < lastIndex) problems.push({ cell: c, kind: 'skipped', text: `cell ${c.index} was not run, but cells before and after it were` });
      continue;
    }
    if (prev) {
      if (c.count <= prev.count) problems.push({ cell: c, kind: 'order', text: `cell ${c.index} has execution count ${c.count}, after cell ${prev.index} with ${prev.count}` });
      else if (c.count > prev.count + 1) problems.push({ cell: c, kind: 'gap', text: `the execution count jumps from ${prev.count} (cell ${prev.index}) to ${c.count} (cell ${c.index})` });
    }
    prev = c;
  }
  problems.sort((a, b) => a.cell.index - b.cell.index);
  return { problems, order: code.map((c) => c.count), code: code.length, executed: executed.length };
}
