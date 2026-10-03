import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SECRET_PATTERNS, absoluteKind, callAt, callRole, findRandomness, findSecrets, isPlaceholder, joinRelative, looksLikePath, maskSecret, maskSecrets, openMode, scanSource, splitLines } from '../src/index.js';
import { pieces } from './helpers.js';

test('lines: LF, CRLF and a lone CR all end a line', () => {
  assert.deepEqual(splitLines('a\nb\r\nc\rd'), ['a', 'b', 'c', 'd']);
});

test('source: string literals with their places and values, prefixes, escapes, and the code with strings blanked and comments removed', () => {
  const s = scanSource(['x = pd.read_csv("data/a.csv")  # read "b.csv"', "p = r'C:\\Users\\ann'", 'q = "C:\\\\Users\\\\ann"', 'f = f"{name}.csv"'].join('\n'), 'python');
  assert.deepEqual(s.literals.map((l) => [l.line, l.value, l.prefix]), [[0, 'data/a.csv', ''], [1, 'C:\\Users\\ann', 'r'], [2, 'C:\\Users\\ann', ''], [3, '{name}.csv', 'f']]);
  assert.equal(s.code[0], 'x = pd.read_csv("          ")  ');
  assert.equal(s.literals[0].col, 16);
});

test('source: a triple-quoted string over several lines is blanked and not taken as a literal; R has no triple quotes', () => {
  const s = scanSource('doc = """\nread_csv("x.csv")\n"""\ny = read_csv("y.csv")', 'python');
  assert.deepEqual(s.literals.map((l) => l.value), ['y.csv']);
  assert.equal(s.code[1].trim(), '');
  const r = scanSource('d <- read.csv("data/a.csv") # note\nset.seed(1)', 'r');
  assert.deepEqual(r.literals.map((l) => l.value), ['data/a.csv']);
  assert.equal(r.code[1], 'set.seed(1)');
});

test('source: lines over the limit are counted and not read, and too many lines is an error', () => {
  const s = scanSource(`a = 1\n${'x'.repeat(5000)}\nb = "c.csv"`, 'python');
  assert.equal(s.long, 1);
  assert.equal(s.code[1], '');
  assert.throws(() => scanSource('\n'.repeat(10), 'python', { maxLineLength: 4096, maxLines: 5 }), /more than 5 lines/);
});

test('calls: the call a literal is the first argument or a keyword of, and whether it reads or writes', () => {
  const line = 'df = pd.read_csv("data/a.csv", sep=",")';
  const s = scanSource(line, 'python');
  const call = callAt(s.code[0], s.literals[0].col);
  assert.deepEqual([call.name, call.last, call.first, call.keyword], ['pd.read_csv', 'read_csv', true, null]);
  assert.equal(callRole(call, 'python'), 'read');
  const sep = callAt(s.code[0], s.literals[1].col);
  assert.equal(sep.keyword, 'sep');
  assert.equal(callRole(sep, 'python'), null);
  const kw = scanSource('np.load(file="arr.npy")', 'python');
  assert.equal(callRole(callAt(kw.code[0], kw.literals[0].col), 'python'), 'read');
  const w = scanSource('df.to_csv("out/b.csv")', 'python');
  assert.equal(callRole(callAt(w.code[0], w.literals[0].col), 'python'), 'write');
  const r = scanSource('x <- read.csv("data/a.csv")', 'r');
  assert.equal(callRole(callAt(r.code[0], r.literals[0].col), 'r'), 'read');
  assert.equal(callAt('print(" ")', 6).name, 'print');
  assert.equal(callAt('x = "a"', 4), null);
});

test('open: the mode after the path says whether it reads or writes', () => {
  const line = 'with open("out.txt", "w") as f:';
  const s = scanSource(line, 'python');
  assert.equal(openMode(line, s.literals[0].end), 'w');
  assert.equal(openMode('open("a.txt", mode="rb")', 11), 'rb');
  assert.equal(openMode('open("a.txt")', 11), null);
});

test('paths: strings with a folder part or a data ending are paths; URLs, patterns, format strings and words are not', () => {
  for (const p of ['data/a.csv', 'a.parquet', '../raw/b.json', 'data\\c.xlsx', 'results/']) assert.equal(looksLikePath(p), true, p);
  for (const p of ['https://example.test/a.csv', 'data/*.csv', 'out_{}.csv', '%s.csv', 'hello world', 'utf-8', 'r', '', '-v', 'a b.csv']) assert.equal(looksLikePath(p), false, p);
});

test('absolute paths: Windows drives and shares, home folders, mounted disks, the home shortcut and file URLs; relative paths and URLs are not', () => {
  assert.equal(absoluteKind('C:\\Users\\ann\\data.csv'), 'a path on a Windows drive');
  assert.equal(absoluteKind('d:/work/x.csv'), 'a path on a Windows drive');
  assert.equal(absoluteKind('\\\\server\\share\\x.csv'), 'a Windows network path');
  assert.equal(absoluteKind('/home/ann/x.csv'), 'a path in the home folder of one user');
  assert.equal(absoluteKind('/Users/ann/x.csv'), 'a path in the home folder of one user');
  assert.equal(absoluteKind('/mnt/disk1/x.csv'), 'a path on one machine');
  assert.equal(absoluteKind('~/data/x.csv'), 'a path in the home folder');
  assert.equal(absoluteKind('file:///home/ann/pkg'), 'a path in the home folder of one user');
  for (const p of ['data/x.csv', '/api/v1', 'https://example.test/home/ann/', '/home', 'C:', 'x', null]) assert.equal(absoluteKind(p), null, String(p));
});

test('relative paths are joined to a folder with forward slashes, and climbing out of the root gives null', () => {
  assert.equal(joinRelative('src', '../data/a.csv'), 'data/a.csv');
  assert.equal(joinRelative('', './data\\a.csv'), 'data/a.csv');
  assert.equal(joinRelative('', '../a.csv'), null);
  assert.equal(joinRelative('a/b', '../../c'), 'c');
});

test('randomness: Python and R draws, calls without random_state, generators without a seed, and seeds; text in strings and comments does not count', () => {
  const py = scanSource([
    'import numpy as np',
    'x = np.random.normal(0, 1, 10)',
    'random.shuffle(ids)',
    'X_train, X_test = train_test_split(X, y,',
    '    test_size=0.2, random_state=7)',
    'model = RandomForestClassifier(n_estimators=50)',
    'rng = np.random.default_rng()',
    'df.sample(frac=0.5)',
    'print("np.random.rand(3)")  # np.random.rand(4)',
    'np.random.seed(11)'
  ].join('\n'), 'python');
  const r = findRandomness(py.code, 'python');
  assert.deepEqual(r.uses.map((u) => u.line), [1, 2, 5, 7]);
  assert.deepEqual(r.seeds.map((s) => [s.line, Boolean(s.local)]), [[3, true], [9, false]]);
  assert.deepEqual(r.unseeded.map((u) => u.line), [6]);
  const rr = findRandomness(scanSource('x <- rnorm(10)\ns <- sample(1:5)\nset.seed(3)', 'r').code, 'r');
  assert.deepEqual(rr.uses.map((u) => u.line), [0, 1]);
  assert.deepEqual(rr.seeds.map((u) => u.line), [2]);
  const seeded = findRandomness(scanSource('rng = np.random.default_rng(42)\ntorch.manual_seed(1)\ntf.random.set_seed(1)', 'python').code, 'python');
  assert.equal(seeded.uses.length, 0);
  assert.equal(seeded.seeds.length, 3);
  assert.equal(seeded.unseeded.length, 0);
});

test('secrets: key and token shapes and assigned values are found and masked; placeholders and variable names are not', () => {
  const aws = pieces('AK', 'IA', 'Z7Q4XW2M9KTR3BVN');
  const gh = pieces('gh', 'p_', 'a'.repeat(36));
  assert.deepEqual(findSecrets(`key = "${aws}"`).map((h) => h.id), ['aws-access-key']);
  assert.deepEqual(findSecrets(`t = '${gh}'`).map((h) => h.id), ['github-token']);
  assert.deepEqual(findSecrets(pieces('-----BEGIN RSA PRI', 'VATE KEY-----')).map((h) => h.masked), ['a private key block']);
  const assigned = findSecrets(pieces('api', '_key = "k3y_', '77aa88bb99cc"'));
  assert.deepEqual(assigned.map((h) => [h.id, h.masked]), [['assigned-secret', 'k3y_... (16 characters)']]);
  for (const ok of ['token = "<your token here>"', pieces('pass', 'word = "xxxxxxxxxxxxxx"'), pieces('api', '_key = "${API_KEY_VALUE}"'), 'token = os.environ["API_TOKEN"]', 'secret = "MY_SECRET_NAME"', 'token = "short"']) assert.deepEqual(findSecrets(ok), [], ok);
  assert.equal(isPlaceholder('your_key_here'), true);
  assert.equal(isPlaceholder('demo_0f3a9c71e2b8'), false);
  assert.equal(findSecrets(`x${' '.repeat(5000)}${aws}`).length, 0, 'a very long line is not scanned');
  assert.equal(SECRET_PATTERNS.length, 6);
});

test('masking: a secret is shown as its first four characters and its length, never in full', () => {
  assert.equal(maskSecret('abcdefghijkl'), 'abcd... (12 characters)');
  const aws = pieces('AS', 'IA', 'Z7Q4XW2M9KTR3BVN');
  const text = maskSecrets(`KeyError: ${aws} and token = "abcdefgh12345678"`);
  assert.ok(!text.includes(aws));
  assert.ok(!text.includes('abcdefgh12345678'));
  assert.match(text, /ASIA\.\.\. \(20 characters\)/);
  assert.equal(maskSecrets('token = "<placeholder value>"'), 'token = "<placeholder value>"');
});
