import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSON_LIMITS, NOTEBOOK_LIMITS, executionProblems, isObject, parseJson, parseNotebook } from '../src/index.js';
import { errorOutput, notebook, streamOutput } from './helpers.js';

test('JSON: the same values as JSON.parse, for every kind of value and escape', () => {
  const text = '{"a": [1, -2.5, 3e2, true, false, null], "b": "x\\n\\"y\\" \\u0041\\/", "c": {}, "d": []}';
  assert.deepEqual(parseJson(text).value, JSON.parse(text));
  assert.equal(parseJson(`${String.fromCharCode(0xfeff)}[1]`).value[0], 1, 'a byte order mark is skipped');
  assert.equal(isObject({}), true);
  assert.equal(isObject([]), false);
  assert.equal(isObject(null), false);
});

test('JSON: the line on which each object and array starts', () => {
  const { value, lines } = parseJson('{\n "cells": [\n  {\n   "x": 1\n  },\n  {"y": [\n 2]}\n ]\n}');
  assert.equal(lines.get(value), 1);
  assert.equal(lines.get(value.cells), 2);
  assert.equal(lines.get(value.cells[0]), 3);
  assert.equal(lines.get(value.cells[1]), 6);
  assert.equal(lines.get(value.cells[1].y), 6);
});

test('JSON: text that is not JSON is an error with its line, and nesting past the limit is refused', () => {
  for (const bad of ['{"a": 1,}', '[1 2]', '{"a" 1}', '"open', '{a: 1}', '[1] x', '', 'nul', '"\\q"', '"\\u12"', `"${String.fromCharCode(1)}"`]) assert.throws(() => parseJson(bad), /not valid JSON at line \d+/, bad);
  assert.throws(() => parseJson('{\n\n"a": }'), /at line 3/);
  assert.throws(() => parseJson(`${'['.repeat(JSON_LIMITS.maxDepth + 1)}${']'.repeat(JSON_LIMITS.maxDepth + 1)}`), /nested more than 64 deep/);
  assert.doesNotThrow(() => parseJson(`${'['.repeat(JSON_LIMITS.maxDepth)}${']'.repeat(JSON_LIMITS.maxDepth)}`));
});

test('JSON: a key named __proto__ is an own key and changes no prototype', () => {
  const { value } = parseJson('{"__proto__": {"polluted": true}, "constructor": 1}');
  assert.equal(Object.getPrototypeOf(value), Object.prototype);
  assert.deepEqual(Object.keys(value), ['__proto__', 'constructor']);
  assert.equal({}.polluted, undefined);
});

test('notebook: cells in order with their lines, sources, counts and outputs, and the kernel language', () => {
  const nb = parseNotebook(notebook(['# Title', [1, 'x = 1\nx', [{ output_type: 'execute_result', execution_count: 1, metadata: {}, data: { 'text/plain': ['1'] } }]], [2, 'print(x)', [streamOutput('1\n')]], [3, 'y', [errorOutput('NameError', "name 'y' is not defined")]]]));
  assert.equal(nb.ok, true);
  assert.equal(nb.language, 'python');
  assert.equal(nb.minor, 4);
  assert.deepEqual(nb.cells.map((c) => [c.index, c.type, c.count]), [[1, 'markdown', null], [2, 'code', 1], [3, 'code', 2], [4, 'code', 3]]);
  assert.equal(nb.cells[1].source, 'x = 1\nx');
  assert.equal(nb.cells[1].sourceArray, true);
  assert.ok(nb.cells[1].line > nb.cells[0].line);
  assert.ok(nb.cells[1].sourceLine > nb.cells[1].line);
  assert.deepEqual(nb.cells[3].outputs.map((o) => [o.type, o.ename, o.evalue]), [['error', 'NameError', "name 'y' is not defined"]]);
  assert.equal(nb.cells[2].outputs[0].text, '1\n');
  assert.equal(nb.cells[1].outputs[0].text, '1');
});

test('notebook: the kernel language from the kernelspec, the language info, or an R kernel name', () => {
  assert.equal(parseNotebook(notebook([], { language: 'R' })).language, 'r');
  assert.equal(parseNotebook('{"nbformat": 4, "nbformat_minor": 2, "metadata": {"kernelspec": {"name": "ir"}}, "cells": []}').language, 'r');
  assert.equal(parseNotebook('{"nbformat": 4, "metadata": {"language_info": {"name": "Julia"}}, "cells": []}').language, 'julia');
  assert.equal(parseNotebook('{"nbformat": 4, "metadata": {}, "cells": []}').language, 'python');
});

test('notebook: a file that is not JSON, not nbformat 4, or has no cells is not read, and the reason is given', () => {
  assert.match(parseNotebook('{ not json').error, /not valid JSON/);
  assert.match(parseNotebook('[1]').error, /not a JSON object/);
  assert.match(parseNotebook('{"nbformat": 3, "worksheets": []}').error, /nbformat 3; only nbformat 4 is read/);
  assert.match(parseNotebook('{"cells": []}').error, /no nbformat key/);
  assert.match(parseNotebook('{"nbformat": 4}').error, /no cells list/);
  const many = `{"nbformat": 4, "cells": [${Array(NOTEBOOK_LIMITS.maxCells + 1).fill('{}').join(',')}]}`;
  assert.match(parseNotebook(many).error, /more than 10,000 cells/);
});

test('notebook: source as one string, cells that are not objects, and odd outputs are read without a crash', () => {
  const nb = parseNotebook('{"nbformat": 4, "cells": [{"cell_type": "code", "execution_count": "3", "source": "a\\nb", "outputs": [5, {"output_type": "display_data", "data": {"image/png": "AAAA"}}]}, 7]}');
  assert.equal(nb.cells[0].source, 'a\nb');
  assert.equal(nb.cells[0].count, null);
  assert.equal(nb.cells[0].countValid, false);
  assert.equal(nb.cells[0].sourceArray, false);
  assert.deepEqual(nb.cells[0].outputs.map((o) => o.type), ['unknown', 'display_data']);
  assert.equal(nb.cells[0].outputs[1].size, 'display_data'.length + 'AAAA'.length);
  assert.equal(nb.cells[1].type, 'unknown');
});

const cells = (counts) => counts.map((c, i) => ({ index: i + 1, type: 'code', source: `x${i}`, count: c, countValid: true, outputs: [] }));

test('execution order: 1, 2, 3 is clean, and a notebook never run is clean', () => {
  assert.deepEqual(executionProblems(cells([1, 2, 3])).problems, []);
  assert.deepEqual(executionProblems(cells([null, null])).problems, []);
  assert.deepEqual(executionProblems(cells([1, 2, null])).problems, [], 'a cell at the end that was not run');
});

test('execution order: a late start, a count that goes back, a gap and a skipped cell in the middle are each named', () => {
  const r = executionProblems(cells([3, 1, null, 7]));
  assert.deepEqual(r.problems.map((p) => [p.cell.index, p.kind]), [[1, 'start'], [2, 'order'], [3, 'skipped'], [4, 'gap']]);
  assert.deepEqual(r.order, [3, 1, null, 7]);
  assert.equal(r.problems[0].text, 'the first run cell (cell 1) has execution count 3, so 2 runs are not in the saved notebook');
  assert.equal(r.problems[1].text, 'cell 2 has execution count 1, after cell 1 with 3');
  assert.equal(executionProblems(cells([2, 3])).problems[0].text, 'the first run cell (cell 1) has execution count 2, so 1 run is not in the saved notebook');
  assert.deepEqual(executionProblems(cells([1, 1])).problems.map((p) => p.kind), ['order']);
});

test('execution order: empty code cells and Markdown cells are left out, and a count that is not a whole number is named', () => {
  const list = [{ index: 1, type: 'markdown', source: '# x', count: null, countValid: true, outputs: [] }, { index: 2, type: 'code', source: '  \n', count: 9, countValid: true, outputs: [] }, ...cells([1, 2]).map((c) => ({ ...c, index: c.index + 2 }))];
  assert.deepEqual(executionProblems(list).problems, []);
  const bad = cells([1, null]);
  bad[1].countValid = false;
  assert.deepEqual(executionProblems(bad).problems.map((p) => p.kind), ['invalid']);
});
