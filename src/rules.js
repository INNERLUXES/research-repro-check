// The checks. Each one reads the model of the study folder (src/study.js) and reports something that stops another
// person from running the work again and getting the same result. docs/method.md gives the reason behind every finding
// and says what each check can and cannot see. Nothing here opens a file or runs a program.

import { CFF_REQUIRED, FACTS, LOCK_FILES, factPage } from './data.js';
import { joinRelative, maskSecrets } from './code.js';
import { baseName, dirOf } from './study.js';
import { normalizeName } from './requirements.js';
import { grouped, listText, plural, sizeText } from './size.js';

export const SEVERITIES = ['error', 'warning', 'info'];
export const RANK = { error: 0, warning: 1, info: 2 };

// The areas a report is grouped by, in report order.
export const AREAS = [
  { id: 'folder', title: 'Folder' },
  { id: 'environment', title: 'Environment' },
  { id: 'notebooks', title: 'Notebooks' },
  { id: 'data', title: 'Data and paths' },
  { id: 'randomness', title: 'Randomness' },
  { id: 'secrets', title: 'Secrets' }
];

// Every finding, in report order within an area. facts are the keys of the sentences of src/data.js that the finding
// quotes; the page of the first one is the finding's source.
export const FINDINGS = [
  { id: 'summary', severity: 'info', area: 'folder', what: 'What the tool read: the files, the languages, the notebooks and the dependencies', facts: ['reproducibleDefinition'] },
  { id: 'no-environment-spec', severity: 'error', area: 'environment', what: 'Code in a language with no file that says which packages and versions it needs', facts: ['captureEnvironment', 'noGuarantee'] },
  { id: 'secrets-in-notebook', severity: 'error', area: 'secrets', what: 'A key, token or password written in the code or in a saved output', facts: ['envSecrets', 'notOpen'] },
  { id: 'unpinned-dependency', severity: 'warning', area: 'environment', what: 'Requirements that are not pinned to one version, with no lock file', facts: ['preferredLatest', 'repeatable'] },
  { id: 'no-lock-file', severity: 'warning', area: 'environment', what: 'A pyproject.toml, Pipfile or package.json with dependencies and no lock file', facts: ['repeatable', 'reproduceQuickly'] },
  { id: 'notebook-out-of-order', severity: 'warning', area: 'notebooks', what: 'A notebook whose saved execution counts show it was not run once from top to bottom', facts: ['executionCount', 'reproducibleResult'] },
  { id: 'notebook-outputs-with-errors', severity: 'warning', area: 'notebooks', what: 'A notebook with a saved error output', facts: ['failedExecution', 'outputsCorrespond'] },
  { id: 'notebook-unreadable', severity: 'warning', area: 'notebooks', what: 'A notebook that is not valid nbformat 4 JSON, or that is too large to read', facts: ['officialFormat', 'topLevel'] },
  { id: 'missing-data-file', severity: 'warning', area: 'data', what: 'Code reads a relative path that is not in the folder and not named in a README or data document', facts: ['reproducibleDefinition', 'dataPartOfOutcome'] },
  { id: 'absolute-path', severity: 'warning', area: 'data', what: 'A path that only exists on one computer or for one user', facts: ['mobility', 'limitedDeploy'] },
  { id: 'no-seed', severity: 'warning', area: 'randomness', what: 'Code draws random numbers and no seed is set, or a generator is made without one', facts: ['reproducibleResult', 'bugsUndetected'] },
  { id: 'no-readme', severity: 'warning', area: 'folder', what: 'No README at the top of the folder', facts: ['publishWhole', 'returnLater'] },
  { id: 'no-license', severity: 'warning', area: 'folder', what: 'No LICENSE file at the top of the folder', facts: ['publishWhole'] },
  { id: 'citation-invalid', severity: 'warning', area: 'folder', what: 'A CITATION.cff that lacks a required key, or has the wrong name', facts: ['cffMinimal', 'cffVersion'] },
  { id: 'notebook-large-outputs', severity: 'info', area: 'notebooks', what: 'Notebook cells with saved outputs above the size limit', facts: ['outputKinds', 'outputsCorrespond'] },
  { id: 'no-citation', severity: 'info', area: 'folder', what: 'No CITATION.cff at the top of the folder', facts: ['cffMinimal'] }
];

const BY_ID = Object.fromEntries(FINDINGS.map((f) => [f.id, f]));
export const ORDER = Object.fromEntries(FINDINGS.map((f, i) => [f.id, i]));
export const BY_ID_SEVERITY = Object.fromEntries(FINDINGS.map((f) => [f.id, f.severity]));
export const AREA_ORDER = Object.fromEntries(AREAS.map((a, i) => [a.id, i]));

export const DEFAULTS = {
  maxOutput: 100 * 1024
};

// Control characters (C0 and C1), the line and paragraph separators and the Unicode direction controls, built from
// their code points so that this file holds only ASCII.
const span = (a, b) => `${String.fromCharCode(a)}-${String.fromCharCode(b)}`;
const UNSAFE_CHARACTERS = new RegExp(`[${span(0, 0x1f)}${span(0x7f, 0x9f)}${[0x200e, 0x200f, 0x2028, 0x2029, 0xfeff].map((c) => String.fromCharCode(c)).join('')}${span(0x202a, 0x202e)}${span(0x2066, 0x2069)}]`, 'g');

// Text from the input: control, line separator and direction characters replaced by a space, length capped.
export function safeText(value, max = 300) {
  const s = String(value).slice(0, max * 4).replace(UNSAFE_CHARACTERS, ' ');
  return s.length > max ? `${s.slice(0, max - 3)}...` : s;
}

export function meetsThreshold(severity, failOn) {
  return RANK[severity] <= RANK[failOn];
}

const quoted = (v, max = 120) => `"${safeText(v, max)}"`;

// Builds one finding with its quotations.
function finding(id, fields) {
  const def = BY_ID[id];
  const basis = def.facts.map((k) => ({ text: FACTS[k].text, section: FACTS[k].section, source: factPage(k) }));
  return {
    id,
    severity: def.severity,
    area: def.area,
    file: safeText(fields.file, 400),
    where: safeText(fields.where, 200),
    line: fields.line ?? 0,
    subject: safeText(fields.subject ?? fields.where, 200),
    message: safeText(fields.message, 1500),
    fix: safeText(fields.fix, 600),
    basis,
    source: basis[0].source
  };
}

const LANGUAGE_NAMES = { python: 'Python', r: 'R', javascript: 'JavaScript' };
const LOOKED_FOR = {
  python: 'requirements*.txt, pyproject.toml, setup.py, setup.cfg, environment.yml, Pipfile and the lock files of Poetry, uv, PDM and conda-lock',
  r: 'renv.lock and DESCRIPTION',
  javascript: 'package.json and the lock files of npm, yarn, pnpm and bun'
};
const ENV_FIX = {
  python: 'Write the packages the code imports, with the versions you ran it with, into requirements.txt (pip freeze in the environment you used, then remove what the study does not need), or into environment.yml for conda.',
  r: 'Record the R packages and their versions with renv: renv::init() and then renv::snapshot() write renv.lock. A DESCRIPTION file that lists the packages is the least to give.',
  javascript: 'Add a package.json that lists the dependencies, and commit the package-lock.json that npm install writes.'
};

// The files of a language: scripts, and notebooks whose kernel is in that language.
function codeOf(model, lang) {
  const nbs = model.notebooks.filter((n) => n.ok && n.language === lang).map((n) => n.rel);
  return [...(model.code[lang] ?? []), ...nbs].sort();
}

// Runs every check on the model. Returns the findings, the number left out of each kind past the cap, and the notes.
export function runRules(model, options = {}) {
  const folder = options.folder ?? '.';
  const maxOutput = options.maxOutput ?? DEFAULTS.maxOutput;
  const cap = options.limits?.maxListedPerFinding ?? 200;
  const at = (rel) => (folder === '.' ? rel : `${folder}/${rel}`);
  const findings = [];
  const notes = [];
  const add = (id, fields) => findings.push(finding(id, fields));

  // Folder files.
  if (!model.readme.length) {
    add('no-readme', { file: folder, where: 'folder', subject: 'README', message: 'The folder has no README at its top level, so a reader does not learn what the study is, how to set up its environment, where the data comes from, or in what order to run the code.', fix: 'Add a README.md that says what the study does, how to install the environment, where to get the data, and which scripts or notebooks to run in which order.' });
  }
  if (!model.license.length) {
    add('no-license', { file: folder, where: 'folder', subject: 'LICENSE', message: 'The folder has no LICENSE, LICENCE or COPYING file at its top level. Without one, others may read the code but have no permission to run, change or share it.', fix: 'Add a LICENSE file with the license you choose for the code, and say in the README which terms cover the data.' });
  }
  if (model.citationOtherCase) {
    add('citation-invalid', { file: at(model.citationOtherCase.rel), where: 'file name', subject: 'CITATION.cff', line: 1, message: `The citation file is named ${quoted(model.citationOtherCase.rel)}. The schema guide says the file must be named CITATION.cff, with that capitalization, so tools that look for it do not find it.`, fix: 'Rename the file to CITATION.cff.' });
  } else if (!model.citation) {
    add('no-citation', { file: folder, where: 'folder', subject: 'CITATION.cff', message: 'The folder has no CITATION.cff, so there is no file that tells others how to cite the work.', fix: 'Add a CITATION.cff with at least cff-version, message, title and authors. Code hosting sites and archives read it and show the citation.' });
  } else if (model.citation.text === null) {
    add('citation-invalid', { file: at(model.citation.rel), where: 'file', subject: 'CITATION.cff', line: 1, message: `CITATION.cff was not read: ${safeText(model.citation.reason, 200)}.`, fix: 'Keep CITATION.cff a small YAML text file.' });
  } else {
    const keys = model.citationKeys;
    const problems = [];
    let line = 0;
    for (const k of CFF_REQUIRED) {
      const v = keys.get(k);
      if (!v) problems.push(`the required key ${k} is missing`);
      else if (k === 'authors' && v.items === 0) {
        problems.push('authors lists no author');
        line = line ? Math.min(line, v.line) : v.line;
      } else if (k !== 'authors' && !v.value) {
        problems.push(`${k} has no value`);
        line = line ? Math.min(line, v.line) : v.line;
      }
    }
    const version = keys.get('cff-version');
    if (version && version.value && !/^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$/.test(version.value)) {
      problems.push(`cff-version is ${quoted(version.value, 40)}, not a version such as 1.2.0`);
      line = line ? Math.min(line, version.line) : version.line;
    }
    if (problems.length) {
      add('citation-invalid', { file: at(model.citation.rel), where: 'keys', subject: 'CITATION.cff', line: line || 1, message: `CITATION.cff is not valid: ${listText(problems, 6)}. The schema guide marks authors, cff-version, message and title as required.`, fix: 'Add the missing keys, as in the minimal example of the schema guide: cff-version: 1.2.0, a message, a title and a list of authors with family-names and given-names.' });
    }
  }

  // Environment.
  for (const lang of ['python', 'r', 'javascript']) {
    const code = lang === 'javascript' ? [...model.code.javascript, ...model.notebooks.filter((n) => n.ok && ['javascript', 'typescript'].includes(n.language)).map((n) => n.rel)].sort() : codeOf(model, lang);
    if (!code.length || model.env[lang].length) continue;
    add('no-environment-spec', { file: folder, where: LANGUAGE_NAMES[lang], subject: LANGUAGE_NAMES[lang], message: `The folder holds ${LANGUAGE_NAMES[lang]} code (${listText(code.map((c) => safeText(c, 120)))}) but no file that says which packages and versions it needs. The tool looked for ${LOOKED_FOR[lang]}, and found none.`, fix: ENV_FIX[lang] });
  }
  const pythonLocks = model.locks.python;
  if (!pythonLocks.length) {
    for (const req of model.requirements) {
      if (req.kind === 'constraint') continue;
      // A direct reference to a local file is reported by absolute-path, not here.
      const loose = req.parsed.requirements.filter((r) => !r.pinned && !(r.url && /^file:/i.test(r.url)) && !model.constraintPins.has(normalizeName(r.name)));
      const looseUrls = req.parsed.paths.filter((p) => p.kind === 'url' && p.pinned === false);
      const total = req.parsed.requirements.length + req.parsed.paths.filter((p) => p.kind === 'url').length;
      if (!loose.length && !looseUrls.length) continue;
      const items = [...loose.map((r) => ({ line: r.line, text: `${safeText(r.name, 80)} (${r.specifiers.length ? safeText(r.specifiers.map((s) => `${s.op}${s.version}`).join(','), 80) : r.url ? 'a URL with no commit or file' : 'no version'})` })), ...looseUrls.map((p) => ({ line: p.line, text: `${safeText(p.target, 100)} (no commit)` }))].sort((a, b) => a.line - b.line);
      add('unpinned-dependency', { file: at(req.rel), where: plural(items.length, 'requirement'), subject: req.rel, line: items[0].line, message: `${grouped(items.length)} of ${grouped(total)} requirements in ${safeText(baseName(req.rel), 80)} are not pinned to one version: ${listText(items.map((i) => i.text), 6)}. pip installs the newest version that matches each one, so the same file gives other versions on another day, and there is no lock file that records the versions you used.`, fix: 'Pin each requirement to the version you ran the study with (pandas==2.1.4), for example from pip freeze in that environment, or commit a lock file (poetry.lock, uv.lock or Pipfile.lock) next to the ranges.' });
    }
    for (const env of model.environmentYml) {
      const loose = env.dependencies.filter((d) => !d.pinned && !(d.name === 'pip' && !d.pip));
      if (!loose.length) continue;
      add('unpinned-dependency', { file: at(env.rel), where: plural(loose.length, 'dependency', 'dependencies'), subject: env.rel, line: loose[0].line, message: `${grouped(loose.length)} of ${grouped(env.dependencies.length)} dependencies in ${safeText(baseName(env.rel), 80)} are not pinned to one version: ${listText(loose.map((d) => safeText(d.spec, 80)), 6)}. conda and pip install the newest version that matches each one.`, fix: 'Pin each entry to the version you used (numpy=1.26.4), for example from conda env export --no-builds in that environment, or commit a conda-lock.yml.' });
    }
  }
  const pinnedRequirements = model.requirements.some((r) => r.kind === 'requirement' && r.parsed.requirements.length && r.parsed.requirements.every((q) => q.pinned || model.constraintPins.has(normalizeName(q.name))));
  for (const p of model.pyproject) {
    const n = p.dependencies.length + p.poetry;
    if (!n || pythonLocks.length || pinnedRequirements) continue;
    add('no-lock-file', { file: at(p.rel), where: 'dependencies', subject: p.rel, line: p.line, message: `${safeText(baseName(p.rel), 80)} lists ${plural(n, 'dependency', 'dependencies')}, and the folder has no lock file (poetry.lock, uv.lock, pdm.lock or pylock.toml) and no requirements file with every package pinned. The ranges in pyproject.toml allow other versions on each install.`, fix: 'Commit the lock file that your tool writes (poetry lock, uv lock or pdm lock), or a requirements.txt with every package pinned, made with pip freeze in the environment you used.' });
  }
  for (const p of model.pipfile) {
    if (!p.count || model.locks.python.some((l) => baseName(l).toLowerCase() === 'pipfile.lock')) continue;
    add('no-lock-file', { file: at(p.rel), where: 'packages', subject: p.rel, line: p.line, message: `${safeText(baseName(p.rel), 80)} lists ${plural(p.count, 'package')}, and there is no Pipfile.lock with the versions that were installed.`, fix: 'Run pipenv lock in the environment you used and commit Pipfile.lock.' });
  }
  for (const p of model.packageJson) {
    if (!p.count || model.locks.javascript.length) continue;
    add('no-lock-file', { file: at(p.rel), where: 'dependencies', subject: p.rel, line: p.line, message: `package.json lists ${plural(p.count, 'dependency', 'dependencies')}, and there is no lock file (${LOCK_FILES.javascript.slice(0, 4).join(', ')}). npm installs the newest versions the ranges allow.`, fix: 'Run npm install and commit package-lock.json, or the lock file of yarn or pnpm if you use one of them.' });
  }

  // Notebooks.
  for (const nb of model.notebooks) {
    if (!nb.ok) {
      add('notebook-unreadable', { file: at(nb.rel), where: 'notebook', subject: nb.rel, line: 1, message: `The notebook could not be read: ${safeText(nb.error, 300)}. Its cells, outputs and execution counts were not checked.`, fix: 'Open the notebook in a current Jupyter and save it, which writes nbformat 4 JSON. If it is very large, clear the outputs before saving.' });
      continue;
    }
    const o = nb.order;
    if (o.problems.length) {
      const first = o.problems[0];
      const counts = o.order.slice(0, 30).map((c) => (c === null ? 'none' : String(c)));
      add('notebook-out-of-order', { file: at(nb.rel), where: `cell ${first.cell.index}`, subject: nb.rel, line: first.cell.line, message: `The code cells were not run once from top to bottom: ${o.problems.slice(0, 4).map((p) => p.text).join('; ')}${o.problems.length > 4 ? `; and ${plural(o.problems.length - 4, 'more problem')}` : ''}. The saved execution counts in cell order are ${counts.join(', ')}${o.order.length > 30 ? ' and more' : ''}. Someone who runs the notebook from the top does not repeat what was run, so the outputs may not come back.`, fix: 'Restart the kernel and run all cells from the top (Restart Kernel and Run All Cells), check that the results are the same, and save the notebook again.' });
    }
    const errors = nb.cells.filter((c) => c.outputs.some((x) => x.type === 'error'));
    if (errors.length) {
      const items = errors.map((c) => {
        const e = c.outputs.find((x) => x.type === 'error');
        return `cell ${c.index} (${safeText(maskSecrets(`${e.ename}${e.evalue ? `: ${e.evalue}` : ''}`), 100)})`;
      });
      add('notebook-outputs-with-errors', { file: at(nb.rel), where: `cell ${errors[0].index}`, subject: nb.rel, line: errors[0].outputs.find((x) => x.type === 'error').line || errors[0].line, message: `${plural(errors.length, 'cell')} of the notebook ${errors.length === 1 ? 'has' : 'have'} a saved error: ${listText(items, 4)}. The run that made the saved outputs did not finish cleanly, so later cells may rest on a state the code does not make.`, fix: 'Fix the cell or remove it, then restart the kernel, run all cells and save. If the error is the point of the cell, say so in a Markdown cell above it.' });
    }
    const large = nb.cells.filter((c) => c.outputs.reduce((n, x) => n + x.size, 0) > maxOutput);
    if (large.length) {
      const size = (c) => c.outputs.reduce((n, x) => n + x.size, 0);
      add('notebook-large-outputs', { file: at(nb.rel), where: `cell ${large[0].index}`, subject: nb.rel, line: large[0].line, message: `${plural(large.length, 'cell')} of the notebook ${large.length === 1 ? 'holds' : 'hold'} saved outputs over ${sizeText(maxOutput)}: ${listText(large.map((c) => `cell ${c.index} (${grouped(size(c))} characters)`), 4)}. Large outputs make the notebook slow to open and hard to compare between versions.`, fix: 'Clear large outputs before saving (an image, a long table or a printed array), and write results that matter to a file in the folder. Change the limit with --max-output.' });
    }
  }

  // Data and paths.
  const produced = new Set();
  for (const p of model.produced) {
    for (const v of [joinRelative(dirOf(p.rel), p.value), joinRelative('', p.value)]) if (v !== null) produced.add(v);
  }
  const documented = [];
  const seenData = new Set();
  for (const ref of model.dataRefs) {
    const key = `${ref.rel}\n${ref.value}`;
    if (seenData.has(key)) continue;
    seenData.add(key);
    const fromScript = joinRelative(dirOf(ref.rel), ref.value);
    const fromRoot = joinRelative('', ref.value);
    const candidates = [fromScript, fromRoot].filter((v) => v !== null);
    if (candidates.some((c) => model.names.has(c) || produced.has(c))) continue;
    const plain = ref.value.replace(/\\/g, '/').replace(/^\.\//, '');
    const base = plain.split('/').at(-1);
    const doc = model.dataDocs.find((d) => d.text.includes(plain) || d.text.includes(base));
    if (doc) {
      documented.push(`${safeText(plain, 120)} (${safeText(doc.rel, 120)})`);
      continue;
    }
    const outside = !candidates.length;
    add('missing-data-file', { file: at(ref.rel), where: safeText(plain, 160), subject: plain, line: ref.line, message: outside ? `${safeText(ref.call, 60)}(${quoted(ref.value)}) at ${ref.where} reads a path outside the folder of the study, so another copy of the folder does not have it.` : `${safeText(ref.call, 60)}(${quoted(ref.value)}) at ${ref.where} reads ${safeText(candidates[0], 160)}, which is not in the folder and is not named in a README or data document.`, fix: 'Add the file to the folder, or say in the README where to get it (an address, and a version or checksum), or add a script that downloads it.' });
  }
  if (documented.length) notes.push(`${plural(documented.length, 'data path')} that the code reads ${documented.length === 1 ? 'is' : 'are'} not in the folder but ${documented.length === 1 ? 'is' : 'are'} named in a README or data document, so ${documented.length === 1 ? 'it was' : 'they were'} not reported: ${listText(documented, 5)}`);
  const seenAbs = new Set();
  for (const a of model.absolutes) {
    const key = `${a.rel}\n${a.value}`;
    if (seenAbs.has(key)) continue;
    seenAbs.add(key);
    add('absolute-path', { file: at(a.rel), where: a.where, subject: a.value, line: a.line, message: `${quoted(a.value)} is ${a.kind}. On another computer, or for another user, the path does not exist, so the code stops there.`, fix: 'Use a path relative to the folder of the study (data/codebook.xlsx), built from the place of the script (Path(__file__).parent in Python, here::here() in R), or read the folder from a setting.' });
  }

  // Randomness.
  const r = model.random;
  r.uses.sort((a, b) => (a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : a.line - b.line));
  if (r.uses.length && !r.seeds.length) {
    const u = r.uses[0];
    add('no-seed', { file: at(u.rel), where: u.where, subject: 'seed', line: u.line, message: `The code draws random numbers (${listText(r.uses.map((x) => `${safeText(x.rel, 100)} ${x.where}: ${safeText(x.text, 70)}`), 3)}) and no seed is set anywhere in the folder. Each run gives other numbers, so results that rest on them change from run to run.`, fix: 'Set a seed once at the top of each script or notebook: random.seed(42), np.random.seed(42) or rng = np.random.default_rng(42), torch.manual_seed(42), or set.seed(42) in R. Pass random_state to scikit-learn calls.' });
  }
  for (const u of r.unseeded) {
    add('no-seed', { file: at(u.rel), where: u.where, subject: 'generator', line: u.line, message: `${safeText(u.text, 120)} makes a random generator with no seed. A seed set elsewhere does not reach it, so it gives other numbers on each run.`, fix: 'Give the generator a seed: np.random.default_rng(42) or random.Random(42).' });
  }

  // Secrets.
  const seenSecret = new Set();
  for (const s of model.secrets) {
    const key = `${s.rel}\n${s.line}\n${s.id}\n${s.in}`;
    if (seenSecret.has(key)) continue;
    seenSecret.add(key);
    add('secrets-in-notebook', { file: at(s.rel), where: s.where, subject: s.id, line: s.line, message: `${s.name[0].toUpperCase()}${s.name.slice(1)} is written in the ${s.in === 'output' ? 'saved output' : 'code'}: ${s.masked}. Anyone who gets the folder gets the key, and it stays in the history of the repository after it is deleted.`, fix: 'Revoke the key now. Read it from an environment variable or a file that is not shared, clear the outputs that show it, and remove it from the history of the repository.' });
  }

  // The summary, from the same model.
  const readCount = model.files.filter((f) => f.text !== null).length;
  const reqs = model.requirements.filter((x) => x.kind === 'requirement');
  const reqCount = reqs.reduce((n, x) => n + x.parsed.requirements.length, 0);
  const pinnedCount = reqs.reduce((n, x) => n + x.parsed.requirements.filter((q) => q.pinned).length, 0);
  const deps = [];
  for (const x of reqs) deps.push(`${safeText(x.rel, 120)} ${plural(x.parsed.requirements.length, 'requirement')} (${grouped(x.parsed.requirements.filter((q) => q.pinned).length)} pinned)`);
  for (const p of model.pyproject) deps.push(`${safeText(p.rel, 120)} ${plural(p.dependencies.length + p.poetry, 'dependency', 'dependencies')}`);
  for (const e of model.environmentYml) deps.push(`${safeText(e.rel, 120)} ${plural(e.dependencies.length, 'dependency', 'dependencies')} (${grouped(e.dependencies.filter((d) => d.pinned).length)} pinned)`);
  for (const p of model.pipfile) deps.push(`${safeText(p.rel, 120)} ${plural(p.count, 'package')}`);
  for (const p of model.packageJson) deps.push(`${safeText(p.rel, 120)} ${plural(p.count, 'dependency', 'dependencies')}`);
  const languages = [...model.languages].sort();
  const okNotebooks = model.notebooks.filter((n) => n.ok);
  const cells = okNotebooks.reduce((n, nb) => n + nb.cells.filter((c) => c.type === 'code').length, 0);
  add('summary', {
    file: folder,
    where: 'folder',
    subject: 'summary',
    message: `Read ${grouped(readCount)} of ${plural(model.files.length, 'file')} in ${plural(model.folders.length + 1, 'folder')}: ${plural(model.code.notebook.length, 'notebook')} (${plural(cells, 'code cell')}), ${plural(model.code.python.length, 'Python script')}, ${plural(model.code.r.length, 'R script')}. Languages: ${languages.length ? listText(languages, 5) : 'none found'}. Dependencies: ${deps.length ? listText(deps, 5) : 'no file lists any'}. The code reads ${plural(new Set(model.dataRefs.map((d) => d.value)).size, 'relative data path')}; random numbers are drawn on ${plural(r.uses.length, 'line')} and a seed is set on ${plural(r.seeds.length, 'line')}.`,
    fix: 'Nothing to fix; this is what the tool read. A clean report means none of the checks found anything, not that the result reproduces.'
  });

  // Notes on what was not read.
  if (model.links.length) notes.push(`${plural(model.links.length, 'symbolic link')} ${model.links.length === 1 ? 'was' : 'were'} not followed: ${listText(model.links.map((l) => safeText(l, 120)), 5)}`);
  if (model.skipped.length) notes.push(`${plural(model.skipped.length, 'folder')} of tools or caches ${model.skipped.length === 1 ? 'was' : 'were'} not entered: ${listText(model.skipped.map((l) => safeText(l, 120)), 5)}`);
  const unread = model.unread.filter((u) => !model.code.notebook.includes(u.rel));
  if (unread.length) notes.push(`${plural(unread.length, 'file')} ${unread.length === 1 ? 'was' : 'were'} not read: ${listText(unread.map((u) => `${safeText(u.rel, 120)} (${safeText(u.reason, 80)})`), 5)}`);
  if (model.special.length) notes.push(`${plural(model.special.length, 'entry', 'entries')} ${model.special.length === 1 ? 'is' : 'are'} not a regular file or folder, or could not be read: ${listText(model.special.map((u) => `${safeText(u.rel, 120)} (${safeText(u.reason, 80)})`), 5)}`);
  if (model.longLines) notes.push(`${plural(model.longLines, 'line')} of code longer than ${grouped(model.limits.maxLineLength)} characters ${model.longLines === 1 ? 'was' : 'were'} not scanned`);
  if (model.otherKernels.size) notes.push(`notebooks with a ${listText([...model.otherKernels].sort().map((k) => safeText(k, 40)), 5)} kernel were checked for their order and outputs; their code was not scanned`);
  if (!languages.length) notes.push('the folder holds no Python, R or JavaScript code; only the files at its top were checked');
  for (const n of model.notes) notes.push(safeText(n, 600));

  // Order, and the cap per kind.
  findings.sort((a, b) => AREA_ORDER[a.area] - AREA_ORDER[b.area] || ORDER[a.id] - ORDER[b.id] || (a.file < b.file ? -1 : a.file > b.file ? 1 : 0) || a.line - b.line);
  const omitted = {};
  const kept = [];
  const perId = {};
  for (const f of findings) {
    perId[f.id] = (perId[f.id] ?? 0) + 1;
    if (perId[f.id] <= cap) kept.push(f);
    else omitted[f.id] = (omitted[f.id] ?? 0) + 1;
  }
  for (const [id, n] of Object.entries(omitted)) notes.push(`${grouped(n)} more findings of ${id} are counted but not listed`);
  return { findings: kept, omitted, notes };
}
