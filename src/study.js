// The model of a study folder: which files it holds, which languages its code is in, what describes its environment,
// and what the code, the notebooks and the requirements files say. src/rules.js turns the model into findings. Nothing
// here opens a file: the walk in src/files.js hands over the names and the text of the files it read.

import { CODE, ENV_FILES, LOCK_FILES, isDataDocName, isLicenseName, isReadmeName, isRequirementsName } from './data.js';
import { CODE_LIMITS, absoluteKind, callAt, callRole, findRandomness, findSecrets, joinRelative, looksLikePath, openMode, scanSource, splitLines } from './code.js';
import { parseCitation, parseEnvironmentYml, parsePackageJson, parsePipfile, parsePyproject } from './manifests.js';
import { executionProblems, parseNotebook } from './notebook.js';
import { normalizeName, parseRequirementsText } from './requirements.js';

const base = (rel) => rel.split('/').at(-1);
const dirOf = (rel) => (rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/')) : '');
const extOf = (rel) => {
  const b = base(rel);
  return b.includes('.') ? b.slice(b.lastIndexOf('.')).toLowerCase() : '';
};

const MANIFESTS = ['pyproject.toml', 'environment.yml', 'environment.yaml', 'pipfile', 'package.json', 'citation.cff'];

// Whether the walk reads a file: code, notebooks, files that describe the environment or the citation, documents
// that may describe the data, and small .txt and .in files that a requirements file may include.
export function wantedFile(rel, size = 0) {
  const b = base(rel);
  const lower = b.toLowerCase();
  const ext = extOf(rel);
  if ([...CODE.python, ...CODE.r, ...CODE.notebook].includes(ext)) return true;
  if (isRequirementsName(b) || MANIFESTS.includes(lower) || isDataDocName(b)) return true;
  return (ext === '.txt' || ext === '.in') && size <= 1024 * 1024;
}

// The kind of a file by its name: python, r, notebook, javascript or null.
export function codeKind(rel) {
  const ext = extOf(rel);
  for (const [kind, exts] of Object.entries(CODE)) if (exts.includes(ext)) return kind;
  return null;
}

// Scans one piece of code (a script, or one cell of a notebook) and adds what it found to the model. place(idx) turns
// a line index of the piece into { line, where } in the file.
function scanUnit(model, unit) {
  const { rel, language, text, place } = unit;
  let scan;
  try {
    scan = scanSource(text, language, model.limits);
  } catch (error) {
    model.notes.push(`${rel}: ${error.message}, not read`);
    return;
  }
  model.longLines += scan.long;
  for (const lit of scan.literals) {
    const at = place(lit.line);
    const kind = absoluteKind(lit.value);
    if (kind) {
      model.absolutes.push({ rel, ...at, value: lit.value, kind });
      continue;
    }
    if (lit.prefix.toLowerCase().includes('f') && lit.value.includes('{')) continue;
    const call = callAt(scan.code[lit.line], lit.col);
    const role = callRole(call, language);
    if (!role || !looksLikePath(lit.value)) continue;
    if (role === 'read' && call.last === 'open') {
      const mode = openMode(scan.lines[lit.line], lit.end);
      if (mode && /[wax]/.test(mode)) {
        model.produced.push({ rel, value: lit.value });
        continue;
      }
    }
    if (role === 'write') model.produced.push({ rel, value: lit.value });
    else model.dataRefs.push({ rel, ...at, value: lit.value, call: call.name });
  }
  const r = findRandomness(scan.code, language);
  for (const u of r.uses) model.random.uses.push({ rel, ...place(u.line), text: u.text });
  for (const s of r.seeds) model.random.seeds.push({ rel, ...place(s.line), local: Boolean(s.local) });
  for (const u of r.unseeded) model.random.unseeded.push({ rel, ...place(u.line), text: u.text });
  scan.lines.forEach((line, idx) => {
    for (const hit of findSecrets(line)) model.secrets.push({ rel, ...place(idx), ...hit, in: 'code' });
  });
}

// Builds the model from what the walk found: { files: [{ rel, size, text, reason }], folders, links, skipped, special }.
export function buildModel(walk, limits = CODE_LIMITS) {
  const files = walk.files;
  const byRel = new Map(files.map((f) => [f.rel, f]));
  const names = new Set([...files.map((f) => f.rel), ...walk.folders, ...walk.links]);
  const model = {
    limits,
    files,
    names,
    folders: walk.folders,
    links: walk.links,
    skipped: walk.skipped,
    special: walk.special ?? [],
    readme: files.filter((f) => !f.rel.includes('/') && isReadmeName(f.rel)).map((f) => f.rel),
    license: files.filter((f) => !f.rel.includes('/') && isLicenseName(f.rel)).map((f) => f.rel),
    citation: files.find((f) => f.rel === 'CITATION.cff') ?? null,
    citationOtherCase: files.find((f) => !f.rel.includes('/') && f.rel.toLowerCase() === 'citation.cff' && f.rel !== 'CITATION.cff') ?? null,
    code: { python: [], r: [], notebook: [], javascript: [] },
    languages: new Set(),
    otherKernels: new Set(),
    env: { python: [], r: [], javascript: [] },
    locks: { python: [], r: [], javascript: [] },
    requirements: [],
    constraintPins: new Set(),
    pyproject: [],
    environmentYml: [],
    pipfile: [],
    packageJson: [],
    notebooks: [],
    dataRefs: [],
    produced: [],
    absolutes: [],
    random: { uses: [], seeds: [], unseeded: [] },
    secrets: [],
    dataDocs: [],
    unread: files.filter((f) => f.reason).map((f) => ({ rel: f.rel, reason: f.reason })),
    notes: [],
    longLines: 0
  };

  for (const f of files) {
    const kind = codeKind(f.rel);
    if (kind) model.code[kind].push(f.rel);
    const lower = base(f.rel).toLowerCase();
    for (const lang of Object.keys(ENV_FILES)) {
      if (ENV_FILES[lang].includes(lower) || (lang === 'python' && isRequirementsName(base(f.rel)))) model.env[lang].push(f.rel);
      if (LOCK_FILES[lang].includes(lower)) model.locks[lang].push(f.rel);
    }
    if (isDataDocName(base(f.rel)) && f.text !== null) model.dataDocs.push({ rel: f.rel, text: f.text });
  }
  if (model.code.python.length) model.languages.add('Python');
  if (model.code.r.length) model.languages.add('R');
  if (model.code.javascript.length) model.languages.add('JavaScript');

  // Requirements files, and the files they include that are in the folder.
  const queue = files.filter((f) => isRequirementsName(base(f.rel))).map((f) => ({ rel: f.rel, kind: 'requirement', included: false }));
  const seen = new Set();
  while (queue.length) {
    const item = queue.shift();
    if (seen.has(item.rel)) continue;
    seen.add(item.rel);
    const f = byRel.get(item.rel);
    if (!f || f.text === null) continue;
    const parsed = parseRequirementsText(splitLines(f.text));
    model.requirements.push({ rel: item.rel, kind: item.kind, included: item.included, parsed });
    if (item.kind === 'constraint') for (const r of parsed.requirements) if (r.pinned) model.constraintPins.add(normalizeName(r.name));
    for (const p of [...parsed.paths, ...parsed.requirements.filter((r) => r.url).map((r) => ({ line: r.line, target: r.url }))]) {
      const kind = absoluteKind(p.target);
      if (kind) model.absolutes.push({ rel: item.rel, line: p.line, where: `line ${p.line}`, value: p.target, kind });
    }
    for (const inc of parsed.includes) {
      const kind = absoluteKind(inc.target);
      const target = kind ? null : joinRelative(dirOf(item.rel), inc.target);
      if (kind) model.absolutes.push({ rel: item.rel, line: inc.line, where: `line ${inc.line}`, value: inc.target, kind });
      if (target === null) model.notes.push(`${item.rel} line ${inc.line} includes ${inc.target}, which is outside the folder; it was not read`);
      else if (!byRel.has(target)) model.notes.push(`${item.rel} line ${inc.line} includes ${inc.target}, which is not in the folder`);
      else if (byRel.get(target).text === null) model.notes.push(`${item.rel} line ${inc.line} includes ${inc.target}, which was not read (${byRel.get(target).reason ?? 'not a text file'})`);
      else {
        queue.push({ rel: target, kind: inc.kind, included: true });
        if (!model.env.python.includes(target)) model.env.python.push(target);
      }
    }
  }
  // A constraints file can also be read before the file that names it; collect its pins again now that all are read.
  for (const r of model.requirements) if (r.kind === 'constraint') for (const q of r.parsed.requirements) if (q.pinned) model.constraintPins.add(normalizeName(q.name));

  // The other manifests.
  for (const f of files) {
    if (f.text === null) continue;
    const lower = base(f.rel).toLowerCase();
    try {
      if (lower === 'pyproject.toml') model.pyproject.push({ rel: f.rel, ...parsePyproject(splitLines(f.text)) });
      else if (lower === 'environment.yml' || lower === 'environment.yaml') model.environmentYml.push({ rel: f.rel, ...parseEnvironmentYml(splitLines(f.text)) });
      else if (lower === 'pipfile') model.pipfile.push({ rel: f.rel, ...parsePipfile(splitLines(f.text)) });
      else if (lower === 'package.json' && !f.rel.includes('/')) model.packageJson.push({ rel: f.rel, ...parsePackageJson(f.text) });
    } catch (error) {
      model.notes.push(`${f.rel} could not be read: ${error.message}`);
    }
  }
  if (model.packageJson.length) model.languages.add('JavaScript');

  // Notebooks: the cells, the execution order, the outputs, and the code of each cell scanned as a script.
  for (const rel of model.code.notebook) {
    const f = byRel.get(rel);
    if (f.text === null) {
      model.notebooks.push({ rel, ok: false, error: `not read: ${f.reason}` });
      continue;
    }
    const nb = parseNotebook(f.text);
    if (!nb.ok) {
      model.notebooks.push({ rel, ok: false, error: nb.error });
      continue;
    }
    const language = nb.language === 'python' || nb.language.startsWith('python') ? 'python' : nb.language === 'r' ? 'r' : nb.language;
    if (language === 'python') model.languages.add('Python');
    else if (language === 'r') model.languages.add('R');
    else if (['javascript', 'typescript'].includes(language)) model.languages.add('JavaScript');
    else model.otherKernels.add(language);
    model.notebooks.push({ rel, ok: true, language, cells: nb.cells, order: executionProblems(nb.cells) });
    for (const cell of nb.cells) {
      if (cell.type === 'code' && (language === 'python' || language === 'r')) {
        scanUnit(model, { rel, language, text: cell.source, cell, place: (idx) => ({ line: cell.sourceArray ? cell.sourceLine + idx : cell.sourceLine, where: `cell ${cell.index}` }) });
      }
      for (const o of cell.outputs) {
        for (const line of splitLines(o.text)) {
          for (const hit of findSecrets(line)) model.secrets.push({ rel, line: o.line, where: `cell ${cell.index} output`, ...hit, in: 'output' });
        }
      }
    }
  }

  // Scripts.
  for (const rel of [...model.code.python, ...model.code.r]) {
    const f = byRel.get(rel);
    if (f.text === null) continue;
    const language = model.code.python.includes(rel) ? 'python' : 'r';
    scanUnit(model, { rel, language, text: f.text, place: (idx) => ({ line: idx + 1, where: `line ${idx + 1}` }) });
  }

  // The citation file.
  if (model.citation && model.citation.text !== null) model.citationKeys = parseCitation(splitLines(model.citation.text));
  return model;
}

export { dirOf, base as baseName };
