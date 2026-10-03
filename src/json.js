// A JSON reader for notebooks and package.json. It gives the same values as JSON.parse, and also the line on which
// each object and array starts, so a finding can point at the cell it is about. Nesting is capped, keys such as
// __proto__ are stored as plain own keys, and an error names the line where the text stops being JSON.

export const JSON_LIMITS = { maxDepth: 64 };

const NUMBER = /-?(?:0|[1-9][0-9]{0,400})(?:\.[0-9]{1,400})?(?:[eE][+-]?[0-9]{1,6})?/y;
const ESCAPES = { '"': '"', '\\': '\\', '/': '/', b: '\b', f: '\f', n: '\n', r: '\r', t: '\t' };

// Returns { value, lines } where lines is a WeakMap from every object and array to the line it starts on (from 1).
export function parseJson(text, maxDepth = JSON_LIMITS.maxDepth) {
  const lines = new WeakMap();
  const n = text.length;
  let i = text.charCodeAt(0) === 0xfeff ? 1 : 0;
  let line = 1;
  const fail = (what) => {
    throw Object.assign(new Error(`not valid JSON at line ${line}: ${what}`), { line });
  };
  const space = () => {
    while (i < n) {
      const c = text.charCodeAt(i);
      if (c === 10) {
        line += 1;
        i += 1;
      } else if (c === 32 || c === 9 || c === 13) i += 1;
      else break;
    }
  };
  const string = () => {
    i += 1;
    let out = '';
    let start = i;
    while (i < n) {
      const c = text.charCodeAt(i);
      if (c === 34) {
        out += text.slice(start, i);
        i += 1;
        return out;
      }
      if (c === 92) {
        out += text.slice(start, i);
        const e = text[i + 1];
        if (e === 'u') {
          const hex = text.slice(i + 2, i + 6);
          if (!/^[0-9a-fA-F]{4}$/.test(hex)) fail('a bad \\u escape');
          out += String.fromCharCode(parseInt(hex, 16));
          i += 6;
        } else if (e !== undefined && Object.hasOwn(ESCAPES, e)) {
          out += ESCAPES[e];
          i += 2;
        } else fail('a bad escape in a string');
        start = i;
        continue;
      }
      if (c < 32) fail('a control character in a string');
      i += 1;
    }
    return fail('a string that does not end');
  };
  const value = (depth) => {
    space();
    if (i >= n) fail('the text ends where a value was expected');
    const c = text[i];
    if (c === '{' || c === '[') {
      if (depth >= maxDepth) fail(`values nested more than ${maxDepth} deep`);
      const startLine = line;
      i += 1;
      if (c === '[') {
        const arr = [];
        lines.set(arr, startLine);
        space();
        if (text[i] === ']') {
          i += 1;
          return arr;
        }
        for (;;) {
          arr.push(value(depth + 1));
          space();
          if (text[i] === ',') i += 1;
          else if (text[i] === ']') {
            i += 1;
            return arr;
          } else fail('a missing comma or ] in an array');
        }
      }
      const obj = {};
      lines.set(obj, startLine);
      space();
      if (text[i] === '}') {
        i += 1;
        return obj;
      }
      for (;;) {
        space();
        if (text[i] !== '"') fail('a key that is not a string');
        const key = string();
        space();
        if (text[i] !== ':') fail('a missing : after a key');
        i += 1;
        Object.defineProperty(obj, key, { value: value(depth + 1), enumerable: true, writable: true, configurable: true });
        space();
        if (text[i] === ',') i += 1;
        else if (text[i] === '}') {
          i += 1;
          return obj;
        } else fail('a missing comma or } in an object');
      }
    }
    if (c === '"') return string();
    if (text.startsWith('true', i)) {
      i += 4;
      return true;
    }
    if (text.startsWith('false', i)) {
      i += 5;
      return false;
    }
    if (text.startsWith('null', i)) {
      i += 4;
      return null;
    }
    NUMBER.lastIndex = i;
    const m = NUMBER.exec(text);
    if (!m) fail('a value that is not JSON');
    i += m[0].length;
    return Number(m[0]);
  };
  const result = value(0);
  space();
  if (i < n) fail('text after the end of the value');
  return { value: result, lines };
}

export const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
