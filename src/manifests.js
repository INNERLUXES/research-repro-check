// The other files that describe an environment or a citation: pyproject.toml, environment.yml, Pipfile, package.json
// and CITATION.cff. Each reader takes only what the checks need, line by line, and says what it could not read. None of
// them is a full TOML or YAML parser; docs/limits.md says what that leaves out.

import { parseJson, isObject } from './json.js';
import { isPinned, parseRequirement } from './requirements.js';

const unquote = (v) => v.trim().replace(/^(['"])(.*)\1$/, '$2');

// pyproject.toml: the dependencies array of [project], and the keys of [tool.poetry.dependencies] other than python.
export function parsePyproject(lines) {
  const out = { dependencies: [], line: 0, poetry: 0 };
  let table = '';
  let inArray = false;
  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i].replace(/(^|\s)#.*$/, '');
    const head = /^\s{0,8}\[\s{0,4}([A-Za-z0-9_.\-"' ]{1,200}?)\s{0,4}\]\s{0,8}$/.exec(raw);
    if (!inArray && head) {
      table = head[1].replace(/\s/g, '');
      continue;
    }
    if (inArray) {
      for (const m of raw.matchAll(/(['"])([^'"]{1,500})\1/g)) out.dependencies.push({ line: i + 1, spec: m[2] });
      if (raw.includes(']')) inArray = false;
      continue;
    }
    if (table === 'project') {
      const dep = /^\s{0,8}dependencies\s{0,8}=\s{0,8}\[(.{0,3000})$/.exec(raw);
      if (dep) {
        out.line = i + 1;
        const rest = dep[1];
        for (const m of rest.matchAll(/(['"])([^'"]{1,500})\1/g)) out.dependencies.push({ line: i + 1, spec: m[2] });
        inArray = !rest.includes(']');
      }
    } else if (table === 'tool.poetry.dependencies') {
      const key = /^\s{0,8}([A-Za-z0-9_.-]{1,200})\s{0,8}=/.exec(raw);
      if (key && key[1].toLowerCase() !== 'python') {
        out.poetry += 1;
        if (!out.line) out.line = i + 1;
      }
    }
  }
  return out;
}

// environment.yml: the entries of the dependencies list, and of the pip list inside it. A conda entry pins with = or ==
// (numpy=1.26.4); a pip entry pins as a requirement does.
export function parseEnvironmentYml(lines) {
  const out = { dependencies: [], line: 0 };
  let inDeps = false;
  let pipIndent = -1;
  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i].replace(/(^|\s)#.*$/, '');
    if (!raw.trim()) continue;
    const indent = raw.length - raw.trimStart().length;
    if (indent === 0) {
      inDeps = /^dependencies\s{0,8}:\s{0,8}$/.test(raw);
      if (inDeps) out.line = i + 1;
      pipIndent = -1;
      continue;
    }
    if (!inDeps) continue;
    const item = /^(\s{1,40})-\s{1,8}(.{1,500})$/.exec(raw);
    if (!item) continue;
    const value = unquote(item[2]);
    if (pipIndent >= 0 && item[1].length > pipIndent) {
      const req = parseRequirement(value);
      out.dependencies.push({ line: i + 1, spec: value, pip: true, name: req.error ? value : req.name, pinned: isPinned(req) });
      continue;
    }
    pipIndent = -1;
    if (/^pip\s{0,8}:\s{0,8}$/.test(value)) {
      pipIndent = item[1].length;
      continue;
    }
    const name = /^([A-Za-z0-9_.:/-]{1,200}?)(?:\s{0,8}[=<>!~]|\s|$)/.exec(value);
    out.dependencies.push({ line: i + 1, spec: value, pip: false, name: name ? name[1].replace(/^.*::/, '') : value, pinned: /(?:^|[^<>!~=])==?\s{0,8}[0-9]/.test(value) });
  }
  return out;
}

// Pipfile: the number of entries in [packages] and [dev-packages].
export function parsePipfile(lines) {
  let table = '';
  let count = 0;
  let line = 0;
  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i].replace(/(^|\s)#.*$/, '');
    const head = /^\s{0,8}\[([A-Za-z0-9_.-]{1,100})\]\s{0,8}$/.exec(raw);
    if (head) {
      table = head[1];
      continue;
    }
    if ((table === 'packages' || table === 'dev-packages') && /^\s{0,8}["']?[A-Za-z0-9_.-]{1,200}["']?\s{0,8}=/.test(raw)) {
      count += 1;
      if (!line) line = i + 1;
    }
  }
  return { count, line };
}

// package.json: the number of dependencies and devDependencies, and the line of the first of the two keys.
export function parsePackageJson(text) {
  const { value } = parseJson(text);
  if (!isObject(value)) throw new Error('not a JSON object');
  let count = 0;
  for (const key of ['dependencies', 'devDependencies']) if (isObject(value[key])) count += Object.keys(value[key]).length;
  const at = text.search(/"(?:dependencies|devDependencies)"\s*:/);
  const line = at < 0 ? 0 : text.slice(0, at).split('\n').length;
  return { count, line };
}

// CITATION.cff: the top-level keys with their lines, whether each scalar has a value, and the number of authors.
export function parseCitation(lines) {
  const keys = new Map();
  let current = null;
  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i];
    if (/^\s{0,1000}#/.test(raw) || !raw.trim()) continue;
    const top = /^([A-Za-z][A-Za-z0-9_-]{0,80})\s{0,8}:(.{0,3000})$/.exec(raw);
    if (top) {
      const value = top[2].replace(/\s#.*$/, '').trim();
      current = { line: i + 1, value: unquote(value), items: 0 };
      if (/^\[.{0,3000}\]$/.test(value)) current.items = value.slice(1, -1).trim() ? value.slice(1, -1).split(/,(?![^{]*\})/).length : 0;
      keys.set(top[1], current);
      continue;
    }
    if (current && /^\s{0,4}-\s/.test(raw)) current.items += 1;
  }
  return keys;
}
