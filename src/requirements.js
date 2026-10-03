// pip requirements files and the dependency specifiers in them (PEP 508), with the version clauses of PEP 440. The
// reader takes the parts the checks need: the name, the extras, the version clauses, a URL, the marker, and the
// options that include other files. It follows the line rules of the pip documentation: comments, line continuations
// and options on their own lines. Nothing is installed, resolved or fetched.

export const OPERATORS = ['===', '~=', '==', '!=', '<=', '>=', '<', '>'];

// The name as package indexes compare it: lower case, with runs of -, _ and . as one -.
export const normalizeName = (name) => name.toLowerCase().replace(/[-_.]+/g, '-');

const NAME = /^\s{0,40}([A-Za-z0-9](?:[A-Za-z0-9._-]{0,200}[A-Za-z0-9])?)/;
const CLAUSE = /^\s{0,20}(===|~=|==|!=|<=|>=|<|>)\s{0,20}([A-Za-z0-9_.*+!-]{1,100})\s{0,20}$/;
const IDENTIFIER = /^[A-Za-z0-9](?:[A-Za-z0-9._-]{0,100}[A-Za-z0-9])?$/;

// One dependency specifier, such as requests[security] >= 2.8.1, == 2.8.* ; python_version < "3.7". Returns the parts,
// or an error that says what is wrong.
export function parseRequirement(spec) {
  const s = String(spec);
  if (s.length > 3000) return { error: 'longer than 3,000 characters' };
  const m = NAME.exec(s);
  if (!m) return { error: 'does not start with a distribution name' };
  const out = { name: m[1], extras: [], specifiers: [], url: null, marker: null };
  let rest = s.slice(m[0].length);
  const ext = /^\s{0,20}\[([^\]]{0,500})\]/.exec(rest);
  if (ext) {
    out.extras = ext[1].split(',').map((e) => e.trim()).filter(Boolean);
    if (out.extras.some((e) => !IDENTIFIER.test(e))) return { ...out, error: 'an extra that is not a valid name' };
    rest = rest.slice(ext[0].length);
  }
  const at = /^\s{0,20}@\s{0,20}(\S{1,1500})/.exec(rest);
  if (at) {
    out.url = at[1];
    rest = rest.slice(at[0].length);
    const marker = /^\s{1,20};\s{0,20}(.{1,500})$/.exec(rest);
    if (marker) out.marker = marker[1].trim();
    else if (rest.trim()) return { ...out, error: 'text after the URL that is not a marker' };
    return out;
  }
  const semi = rest.indexOf(';');
  let versions = semi < 0 ? rest : rest.slice(0, semi);
  if (semi >= 0) {
    out.marker = rest.slice(semi + 1).trim();
    if (!out.marker) return { ...out, error: 'an empty marker after ;' };
  }
  versions = versions.trim();
  if (versions.startsWith('(') && versions.endsWith(')')) versions = versions.slice(1, -1);
  if (versions.trim()) {
    for (const part of versions.split(',')) {
      if (!part.trim()) continue;
      const c = CLAUSE.exec(part);
      if (!c) return { ...out, error: `a version clause that is not valid: ${part.trim().slice(0, 60)}` };
      out.specifiers.push({ op: c[1], version: c[2] });
    }
  }
  return out;
}

// A requirement pins one version when a clause uses === or uses == without a trailing .* (PEP 440, version matching).
// A direct reference pins when it names a built file or a commit hash of a version control system.
export function isPinned(req) {
  if (!req || req.error) return false;
  if (req.url) return isPinnedUrl(req.url);
  return req.specifiers.some((s) => s.op === '===' || (s.op === '==' && !s.version.endsWith('.*')));
}

export function isPinnedUrl(url) {
  if (/^(?:git|hg|svn|bzr)\+/i.test(url)) return /@[0-9a-f]{40}(?:[#&].*)?$/i.test(url);
  return /\.(?:whl|zip|tar\.gz|tgz|tar\.bz2)(?:#.*)?$/i.test(url) || /#sha(?:256|384|512)=/i.test(url);
}

// The text of a requirement for a report: the name with its clauses or URL.
export function requirementText(req) {
  if (req.url) return `${req.name} @ ${req.url}`;
  return req.specifiers.length ? `${req.name}${req.specifiers.map((s) => `${s.op}${s.version}`).join(',')}` : req.name;
}

// Physical lines joined where a line ends in an unescaped backslash, with the number of the first line of each.
function logicalLines(lines) {
  const out = [];
  let buf = null;
  let start = 0;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (buf === null) {
      buf = '';
      start = i + 1;
    }
    const trail = /\\+$/.exec(line);
    if (trail && trail[0].length % 2 === 1) {
      buf += line.slice(0, -1);
      if (i === lines.length - 1) out.push({ line: start, text: buf });
      continue;
    }
    out.push({ line: start, text: buf + line });
    buf = null;
  }
  return out;
}

const INCLUDE = /^(-r|--requirement|-c|--constraint)(?:\s{1,20}|=)(\S{1,1000})\s{0,20}$/;
const EDITABLE = /^(-e|--editable)(?:\s{1,20}|=)(\S{1,1000})/;

// Every line of a requirements file, read as pip reads it: a requirement, a local path or URL, an editable project,
// an include of another file, another option, or a line that is not valid.
export function parseRequirementsText(lines) {
  const out = { requirements: [], includes: [], options: [], paths: [], invalid: [] };
  for (const { line, text } of logicalLines(lines)) {
    if (/^\s{0,1000}#/.test(text)) continue;
    const body = text.replace(/(?:^|\s)#.*$/, '').trim();
    if (!body) continue;
    if (body.length > 3000) {
      out.invalid.push({ line, raw: body.slice(0, 80), error: 'longer than 3,000 characters' });
      continue;
    }
    const inc = INCLUDE.exec(body);
    if (inc) {
      out.includes.push({ line, kind: inc[1].startsWith('-c') || inc[1] === '--constraint' ? 'constraint' : 'requirement', target: inc[2] });
      continue;
    }
    const ed = EDITABLE.exec(body);
    if (ed) {
      out.paths.push({ line, kind: 'editable', target: ed[2] });
      continue;
    }
    if (body.startsWith('-')) {
      out.options.push({ line, text: body.slice(0, 200) });
      continue;
    }
    // Options that apply to one requirement (--hash, --config-settings) follow it after white space.
    const spec = body.replace(/\s{1,20}--?[A-Za-z][\s\S]*$/, '');
    if (/^[a-z][a-z0-9+.-]{0,20}:\/\//i.test(spec)) {
      out.paths.push({ line, kind: 'url', target: spec, pinned: isPinnedUrl(spec) });
      continue;
    }
    if (/^(?:\.{1,2}[\\/]|[\\/]|~[\\/]|[A-Za-z]:[\\/])/.test(spec) || /\.(?:whl|zip|tar\.gz|tgz)$/i.test(spec)) {
      out.paths.push({ line, kind: 'path', target: spec });
      continue;
    }
    const req = parseRequirement(spec);
    if (req.error) out.invalid.push({ line, raw: spec.slice(0, 80), error: req.error });
    else out.requirements.push({ line, ...req, pinned: isPinned(req) });
  }
  return out;
}
