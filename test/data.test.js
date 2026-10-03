import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { CFF_REQUIRED, DATA_EXTENSIONS, ENV_FILES, FACTS, FINDINGS, LOCK_FILES, READERS, SOURCES, WRITERS, factPage, source } from '../src/index.js';

// These tests read the saved pages again and compare them with src/data.js: every sentence that a finding or a
// document quotes.

const text = async (id) => readFile(new URL(`../research/sources/${source(id).file}`, import.meta.url), 'utf8');
// Text compared without line breaks or runs of white space.
const flat = (t) => t.replace(/\s+/g, ' ').trim();
const has = (page, needle) => flat(page).includes(flat(needle));
// The words of a tool that wrote a text, built from pieces so that this file does not hold them.
const WRITTEN = new RegExp(`\\b(?:${['A', 'I'].join('')}|${['cha', 't'].join('')}|${['clau', 'de'].join('')}|${['anthro', 'pic'].join('')}|${['ope', 'nai'].join('')}|${['gene', 'rated'].join('')}|${['assis', 'tants?'].join('')}|${['g', 'pt'].join('')}|${['l', 'lms?'].join('')})\\b`, 'i');
const YEAR = /\b(?:19|20)\d{2}\b/;

test('sources: every saved page has its address on the first line, as listed in src/data.js, and holds text', async () => {
  for (const s of SOURCES) {
    const page = await text(s.id);
    assert.equal(page.split('\n')[0], `Source: ${s.url}`, s.file);
    assert.ok(page.length > 800, `${s.file} holds the page text`);
    assert.match(s.url, /^https:\/\/[a-z.-]+\/[A-Za-z0-9/._-]+$/);
  }
  assert.equal(SOURCES.length, new Set(SOURCES.map((s) => s.url)).size);
  assert.equal(SOURCES.length, new Set(SOURCES.map((s) => s.file)).size);
  assert.equal(SOURCES.length, new Set(SOURCES.map((s) => s.id)).size);
});

test('sources: every file in research/sources is listed in src/data.js, and the other way round', async () => {
  const files = (await readdir(new URL('../research/sources/', import.meta.url))).sort();
  assert.deepEqual(files, SOURCES.map((s) => s.file).sort());
});

test('sources: The Turing Way, the packaging specifications, pip, nbformat and the citation file guide', () => {
  const hosts = SOURCES.map((s) => new URL(s.url).host).sort();
  assert.deepEqual([...new Set(hosts)], ['book.the-turing-way.org', 'github.com', 'nbformat.readthedocs.io', 'packaging.python.org', 'pip.pypa.io']);
  assert.equal(hosts.filter((h) => h === 'book.the-turing-way.org').length, 4);
  assert.ok(SOURCES.some((s) => s.url.endsWith('/dependency-specifiers/')));
  assert.ok(SOURCES.some((s) => s.url.endsWith('/version-specifiers/')));
});

test('sources: no saved page holds a year, a mention of a tool that wrote it, a control byte, a carriage return or a character that is not ASCII', async () => {
  for (const s of SOURCES) {
    const page = await text(s.id);
    assert.doesNotMatch(page, YEAR, s.file);
    assert.doesNotMatch(page, WRITTEN, s.file);
    assert.doesNotMatch(page, new RegExp(`[${String.fromCharCode(1)}-${String.fromCharCode(8)}]`), s.file);
    assert.ok(!page.includes('\r'), s.file);
    assert.ok([...page].every((c) => c.charCodeAt(0) < 128), s.file);
  }
});

test('the saved pages show what the readers rely on: the PEP 508 grammar, the PEP 440 operators, the pip line rules, execution_count and the required keys of CITATION.cff', async () => {
  const pep508 = await text('pep508');
  assert.ok(has(pep508, "version_cmp = wsp* '<=' | '<' | '!=' | '===' | '==' | '>=' | '>' | '~='"));
  assert.ok(has(pep508, 'name_req = name wsp* extras? wsp* versionspec? wsp* quoted_marker?'));
  assert.ok(has(pep508, 'url_req = name wsp* extras? wsp* urlspec (wsp+ quoted_marker?)?'));
  const pep440 = await text('pep440');
  assert.ok(has(pep440, '===: Arbitrary equality clause.'));
  assert.ok(has(pep440, '== 3.1.*: any version that starts with 3.1.'), 'a trailing .* is a prefix match, not a pin');
  const pip = await text('pip-requirements');
  assert.ok(has(pip, '-r, --requirement'));
  assert.ok(has(pip, '-c, --constraint'));
  assert.ok(has(pip, 'Whitespace followed by a # causes the # and the remainder of the line to be treated as a comment.'));
  const nb = await text('nbformat');
  assert.ok(has(nb, '"execution_count": 1, # integer or null'));
  assert.ok(has(nb, "'output_type': 'error',"));
  const cff = await text('cff');
  for (const k of CFF_REQUIRED) assert.ok(has(cff, `### ${k}`), k);
  assert.equal((cff.match(/- required: true/g) ?? []).length, CFF_REQUIRED.length);
});

test('facts: every quoted sentence is on its saved page, word for word, with no year and no mention of a tool that wrote it', async () => {
  for (const [key, fact] of Object.entries(FACTS)) {
    assert.ok(SOURCES.some((s) => s.id === fact.source), key);
    assert.ok(has(await text(fact.source), fact.text), `${key}: "${fact.text}"`);
    assert.ok(has(await text(fact.source), fact.section), `${key}: the section ${fact.section} is on the page`);
    assert.doesNotMatch(fact.text, YEAR, key);
    assert.doesNotMatch(fact.text, WRITTEN, key);
    assert.ok(fact.text.length <= 260, `${key} is short`);
    assert.equal(factPage(key), source(fact.source).url);
  }
});

test('facts: every finding quotes sentences of src/data.js, and every source page is quoted at least once', () => {
  for (const f of FINDINGS) {
    assert.ok(['error', 'warning', 'info'].includes(f.severity), f.id);
    assert.match(f.id, /^[a-z]+(?:-[a-z]+)*$/, f.id);
    assert.ok(f.what.length > 20, f.id);
    assert.ok(f.facts.length >= 1 && f.facts.length <= 2, f.id);
    for (const k of f.facts) assert.ok(FACTS[k], `${f.id}: ${k}`);
  }
  const quoted = new Set(Object.values(FACTS).map((f) => f.source));
  for (const s of SOURCES) assert.ok(quoted.has(s.id), s.id);
  assert.deepEqual(FINDINGS.filter((f) => f.severity === 'error').map((f) => f.id), ['no-environment-spec', 'secrets-in-notebook']);
  assert.deepEqual(FINDINGS.filter((f) => f.severity === 'warning').map((f) => f.id), ['unpinned-dependency', 'no-lock-file', 'notebook-out-of-order', 'notebook-outputs-with-errors', 'notebook-unreadable', 'missing-data-file', 'absolute-path', 'no-seed', 'no-readme', 'no-license', 'citation-invalid']);
  assert.deepEqual(FINDINGS.filter((f) => f.severity === 'info').map((f) => f.id), ['summary', 'notebook-large-outputs', 'no-citation']);
});

test('lists: the file names, the readers, the writers and the data endings have no duplicates, and lock files are environment files', () => {
  for (const list of [DATA_EXTENSIONS, READERS.python, READERS.r, WRITERS, ...Object.values(ENV_FILES), ...Object.values(LOCK_FILES)]) assert.equal(new Set(list).size, list.length);
  for (const e of DATA_EXTENSIONS) assert.equal(e, e.toLowerCase(), e);
  for (const lang of ['python', 'javascript', 'r']) for (const l of LOCK_FILES[lang]) assert.ok(ENV_FILES[lang].includes(l) || l === 'requirements.lock', l);
  for (const r of READERS.python) assert.ok(!WRITERS.includes(r), r);
  assert.deepEqual(CFF_REQUIRED, ['authors', 'cff-version', 'message', 'title']);
});

test('src writes no quoted sentence outside src/data.js', async () => {
  for (const file of ['rules.js', 'check.js', 'study.js', 'report.js', 'cli.js', 'code.js', 'notebook.js', 'requirements.js', 'manifests.js']) {
    const code = await readFile(new URL(`../src/${file}`, import.meta.url), 'utf8');
    for (const fact of Object.values(FACTS)) if (fact.text.length > 40) assert.ok(!code.includes(fact.text.slice(0, 40)), `${file} writes "${fact.text.slice(0, 40)}" itself`);
  }
});

test('docs: every sentence that the documents quote from a saved page is on a saved page', async () => {
  const pages = (await Promise.all(SOURCES.map((s) => text(s.id)))).map(flat).join(' ');
  let checked = 0;
  for (const file of ['docs/method.md', 'docs/rules-and-sources.md', 'docs/inputs.md', 'docs/limits.md', 'docs/decisions/0001-read-the-folder-never-run-the-code.md', 'README.md']) {
    const doc = await readFile(new URL(`../${file}`, import.meta.url), 'utf8');
    const prose = file === 'README.md' ? doc.replace(/```[\s\S]*?```/g, '') : doc;
    for (const m of prose.matchAll(/"([^"\n]{40,400})"/g)) {
      assert.ok(pages.includes(flat(m[1])), `${file}: ${m[1]}`);
      checked += 1;
    }
  }
  assert.ok(checked >= 30, `${checked} quotes checked`);
});

test('docs: docs/rules-and-sources.md names every saved page, every quoted sentence and every finding', async () => {
  const doc = await readFile(new URL('../docs/rules-and-sources.md', import.meta.url), 'utf8');
  for (const s of SOURCES) {
    assert.ok(doc.includes(s.file), s.file);
    assert.ok(doc.includes(s.url), s.url);
  }
  for (const [key, fact] of Object.entries(FACTS)) assert.ok(doc.includes(`| \`${key}\` |`) && doc.includes(fact.text), key);
  for (const f of FINDINGS) {
    assert.ok(doc.includes(`| \`${f.id}\` | ${f.severity} |`), f.id);
    assert.ok(doc.includes(`(method.md#${f.id}-${f.severity})`), f.id);
    for (const k of f.facts) assert.ok(new RegExp(`\\| \`${k}\` \\| [^|]*\`${f.id}\``).test(doc), `${k} is used by ${f.id}`);
  }
});
