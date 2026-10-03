// Reading Python and R source as text: the string literals with their places, the code with strings and comments
// blanked out, and the patterns of the checks run on them. Nothing here runs or imports the code.

import { DATA_EXTENSIONS, ENV_NAME, RANDOM, READERS, SECRET_PATTERNS, SECRET_PLACEHOLDER, SEEDS, WRITERS } from './data.js';

// A value of the assigned-secret pattern that is a placeholder or the name of a variable, not a secret.
export const isPlaceholder = (value) => SECRET_PLACEHOLDER.test(value) || ENV_NAME.test(value);

export const CODE_LIMITS = { maxLineLength: 4096, maxLines: 1000000 };

// LF, CRLF and a lone CR all end a line.
export function splitLines(text) {
  return text.split(/\r\n|\r|\n/);
}

const IDENT = /[A-Za-z0-9_]/;

// The source split into lines, each with its string literals, and a copy of each line in which the inside of every
// string is blanked and comments are removed. Python triple-quoted strings may span lines; their text is blanked and
// not taken as a literal. Lines longer than the limit are counted in .long and not read.
export function scanSource(text, language, limits = CODE_LIMITS) {
  const lines = splitLines(text);
  if (lines.length > limits.maxLines) throw new Error(`more than ${limits.maxLines.toLocaleString('en-US')} lines`);
  const code = [];
  const literals = [];
  let long = 0;
  let triple = null;
  for (let idx = 0; idx < lines.length; idx += 1) {
    const line = lines[idx];
    if (line.length > limits.maxLineLength) {
      long += 1;
      code.push('');
      continue;
    }
    let out = '';
    let j = 0;
    const L = line.length;
    while (j < L) {
      if (triple) {
        const end = line.indexOf(triple, j);
        if (end < 0) {
          out += ' '.repeat(L - j);
          j = L;
          break;
        }
        out += `${' '.repeat(end - j)}${triple}`;
        j = end + 3;
        triple = null;
        continue;
      }
      const c = line[j];
      if (c === '#') break;
      if (c === '"' || c === "'") {
        const pre = /([rRbBuUfF]{1,2})$/.exec(line.slice(Math.max(0, j - 2), j));
        let prefix = pre ? pre[1] : '';
        if (prefix && j - prefix.length > 0 && IDENT.test(line[j - prefix.length - 1])) prefix = '';
        if (language === 'python' && line.startsWith(c.repeat(3), j)) {
          triple = c.repeat(3);
          out += triple;
          j += 3;
          continue;
        }
        let k = j + 1;
        while (k < L && line[k] !== c) k += line[k] === '\\' ? 2 : 1;
        const body = line.slice(j + 1, Math.min(k, L));
        const raw = /r/i.test(prefix);
        literals.push({ line: idx, col: j, end: Math.min(k, L), value: raw ? body : body.replace(/\\([\\'"])/g, '$1'), body, prefix });
        out += `${c}${' '.repeat(body.length)}${k < L ? c : ''}`;
        j = k + 1;
        continue;
      }
      out += c;
      j += 1;
    }
    code.push(out);
  }
  return { lines, code, literals, long };
}

// The call that a literal is an argument of: the name before the nearest open parenthesis on the same line, whether the
// literal is the first argument, and the keyword it is given with. Looks back at most 300 characters.
export function callAt(codeLine, col) {
  let depth = 0;
  let commas = 0;
  let p = -1;
  for (let k = col - 1; k >= 0 && k >= col - 300; k -= 1) {
    const c = codeLine[k];
    if (c === ')' || c === ']' || c === '}') depth += 1;
    else if (c === '(' || c === '[' || c === '{') {
      if (depth === 0) {
        p = c === '(' ? k : -1;
        break;
      }
      depth -= 1;
    } else if (c === ',' && depth === 0) commas += 1;
  }
  if (p < 0) return null;
  const name = /([A-Za-z_][A-Za-z0-9_.]{0,100})\s{0,4}$/.exec(codeLine.slice(Math.max(0, p - 120), p));
  if (!name) return null;
  const between = codeLine.slice(p + 1, col);
  const lastComma = between.lastIndexOf(',');
  const kw = /^\s{0,8}([A-Za-z_][A-Za-z0-9_]{0,40})\s{0,4}=\s{0,4}[rRbBuUfF]{0,2}$/.exec(between.slice(lastComma + 1));
  return { name: name[1], last: name[1].split('.').at(-1), first: commas === 0 && !kw, keyword: kw ? kw[1] : null, open: p };
}

const PATH_KEYWORDS = ['filepath_or_buffer', 'path', 'file', 'fname', 'filename', 'path_or_buf', 'io', 'con', 'f', 'file_name', 'filepath'];

// Whether a call reads a file named by this literal, writes it, or neither.
export function callRole(call, language) {
  if (!call) return null;
  if (WRITERS.includes(call.last) || WRITERS.includes(call.name)) return 'write';
  const reader = language === 'r' ? READERS.r.includes(call.name) || READERS.r.includes(call.last) : READERS.python.includes(call.last);
  if (reader && (call.first || PATH_KEYWORDS.includes(call.keyword))) return 'read';
  return null;
}

// The mode string given to open() after the path, from the raw line: "w", "a" and "x" write.
export function openMode(rawLine, end) {
  const m = /^\s{0,8},\s{0,8}(?:mode\s{0,4}=\s{0,4})?['"]([rwxabt+]{1,4})['"]/.exec(rawLine.slice(end + 1, end + 60));
  return m ? m[1] : null;
}

// A string that reads like a relative path to a file: it has a folder part or a file ending of data, and is not a URL,
// a pattern or a format string.
export function looksLikePath(v) {
  if (!v || v.length > 300 || /[\n{}%*?<>|$\t]/.test(v) || /^[a-z][a-z0-9+.-]{0,20}:\/\//i.test(v) || v.startsWith('-')) return false;
  if (/[\\/]/.test(v)) return /[A-Za-z0-9]/.test(v) && !/\s{2}/.test(v);
  const ext = /\.([A-Za-z0-9]{1,10})$/.exec(v);
  return Boolean(ext) && DATA_EXTENSIONS.includes(ext[1].toLowerCase()) && !/\s/.test(v);
}

// What kind of absolute path a string is, or null. Only paths that tie the code to one machine or one person are named.
export function absoluteKind(v) {
  if (typeof v !== 'string' || v.length < 3) return null;
  if (/^[A-Za-z]:[\\/]/.test(v)) return 'a path on a Windows drive';
  if (/^\\\\[^\\\s]{1,100}\\/.test(v)) return 'a Windows network path';
  if (/^file:\/\/\/?/i.test(v)) return absoluteKind(v.replace(/^file:\/\/\/?/i, '/').replace(/^\/([A-Za-z]:)/, '$1')) ?? null;
  if (/^\/(?:home|Users)\/[^/\s]{1,100}\//.test(v)) return 'a path in the home folder of one user';
  if (/^\/(?:root|mnt|media|Volumes)\/[^/\s]{1,200}/.test(v)) return 'a path on one machine';
  if (/^~[\\/][^\s]/.test(v)) return 'a path in the home folder';
  return null;
}

// A relative path joined to a folder, both with forward slashes: null when it climbs out of the root.
export function joinRelative(folder, path) {
  const parts = folder ? folder.split('/') : [];
  for (const seg of path.replace(/\\/g, '/').split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') {
      if (!parts.length) return null;
      parts.pop();
    } else parts.push(seg);
  }
  return parts.join('/');
}

// The text of the call that starts at an open parenthesis, up to its closing one, over at most 20 lines.
function callText(code, idx, open) {
  let depth = 0;
  let out = '';
  for (let k = idx; k < code.length && k < idx + 20; k += 1) {
    const line = k === idx ? code[k].slice(open) : code[k];
    for (let j = 0; j < line.length; j += 1) {
      const c = line[j];
      if (c === '(') depth += 1;
      else if (c === ')') {
        depth -= 1;
        if (depth === 0) return out + line.slice(0, j + 1);
      }
    }
    out += `${line}\n`;
  }
  return out;
}

const STATEFUL = new RegExp(`(?:^|[^A-Za-z0-9_.])(${RANDOM.stateful.filter((n) => n !== 'sample').join('|')})\\s{0,4}\\(|(?<!\\brandom)\\.(sample)\\s{0,4}\\(`, 'g');
const HAS_STATE = /\brandom_state\s{0,4}=\s{0,4}(?!None\b)[^\s,)]/;

// Calls that draw random numbers, and calls that seed a generator, in code with strings and comments blanked.
export function findRandomness(code, language) {
  const uses = [];
  const seeds = [];
  const unseeded = [];
  for (let idx = 0; idx < code.length; idx += 1) {
    const line = code[idx];
    if (!line.trim()) continue;
    const seedHit = (SEEDS[language] ?? []).some((p) => p.test(line));
    if (seedHit) seeds.push({ line: idx });
    if (language === 'python' && RANDOM.unseededGenerator.test(line)) unseeded.push({ line: idx, text: line.trim() });
    let used = (RANDOM[language] ?? []).some((p) => p.test(line));
    if (language === 'python') {
      STATEFUL.lastIndex = 0;
      let m;
      while ((m = STATEFUL.exec(line)) !== null) {
        const open = line.indexOf('(', m.index + m[0].length - 1);
        if (HAS_STATE.test(callText(code, idx, open))) seeds.push({ line: idx, local: true });
        else used = true;
      }
    }
    if (used) uses.push({ line: idx, text: line.trim() });
  }
  return { uses, seeds, unseeded };
}

// A secret shown masked: its first four characters and its length, so the report never carries the value.
export function maskSecret(value) {
  const v = String(value);
  return `${v.slice(0, 4)}... (${v.length} characters)`;
}

// Keys and tokens in one line of text, with the value masked.
export function findSecrets(line) {
  const hits = [];
  if (line.length > CODE_LIMITS.maxLineLength) return hits;
  for (const s of SECRET_PATTERNS) {
    const m = s.pattern.exec(line);
    if (!m) continue;
    const value = s.id === 'assigned-secret' ? m[1] : m[0];
    if (s.id === 'assigned-secret' && isPlaceholder(value)) continue;
    hits.push({ id: s.id, name: s.name, masked: s.id === 'private-key' ? 'a private key block' : maskSecret(value) });
  }
  return hits;
}

// Text with every key or token in it masked, for text from a notebook that a report shows.
export function maskSecrets(text) {
  let out = String(text);
  for (const s of SECRET_PATTERNS) {
    const g = new RegExp(s.pattern.source, s.pattern.flags.includes('g') ? s.pattern.flags : `${s.pattern.flags}g`);
    out = out.replace(g, (whole, value) => (s.id === 'assigned-secret' ? (isPlaceholder(value) ? whole : whole.replace(value, maskSecret(value))) : s.id === 'private-key' ? '[private key]' : maskSecret(whole)));
  }
  return out;
}
