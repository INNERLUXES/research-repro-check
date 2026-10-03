import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OPERATORS, isPinned, isPinnedUrl, normalizeName, parseCitation, parseEnvironmentYml, parsePackageJson, parsePipfile, parsePyproject, parseRequirement, parseRequirementsText, requirementText, splitLines } from '../src/index.js';

const reqs = (text) => parseRequirementsText(splitLines(text));

test('PEP 508: the example of the specification is read into its name, extras, clauses and marker', () => {
  const r = parseRequirement('requests [security,tests] >= 2.8.1, == 2.8.* ; python_version < "3.7"');
  assert.equal(r.error, undefined);
  assert.equal(r.name, 'requests');
  assert.deepEqual(r.extras, ['security', 'tests']);
  assert.deepEqual(r.specifiers, [{ op: '>=', version: '2.8.1' }, { op: '==', version: '2.8.*' }]);
  assert.equal(r.marker, 'python_version < "3.7"');
  assert.equal(isPinned(r), false, '== 2.8.* is a prefix match, not one version');
});

test('PEP 508: a name alone, clauses in parentheses, every operator, and a direct reference with a marker', () => {
  assert.deepEqual(parseRequirement('pytest').specifiers, []);
  assert.deepEqual(parseRequirement('name (>=1.0, <2)').specifiers, [{ op: '>=', version: '1.0' }, { op: '<', version: '2' }]);
  for (const op of OPERATORS) assert.equal(parseRequirement(`pkg ${op} 1.4.5`).specifiers[0].op, op, op);
  const url = parseRequirement('pip @ https://example.test/pip-1.3.1.zip ; sys_platform == "win32"');
  assert.equal(url.url, 'https://example.test/pip-1.3.1.zip');
  assert.equal(url.marker, 'sys_platform == "win32"');
  assert.equal(requirementText(url), 'pip @ https://example.test/pip-1.3.1.zip');
  assert.equal(requirementText(parseRequirement('numpy>=1.21,<2')), 'numpy>=1.21,<2');
});

test('PEP 508: text that is not a specifier is an error, never a requirement', () => {
  for (const bad of ['>=1.0', 'pkg >= ', 'pkg [bad extra!] ==1', 'pkg == 1.0 ;', 'pkg @ https://x.test/a.zip junk', 'pkg ^1.0', `${'a'.repeat(3100)}`]) {
    assert.ok(parseRequirement(bad).error, bad.slice(0, 40));
  }
});

test('PEP 440: == and === pin one version, == with .* and every range do not', () => {
  assert.equal(isPinned(parseRequirement('pandas==2.1.4')), true);
  assert.equal(isPinned(parseRequirement('pandas===2.1.4')), true);
  assert.equal(isPinned(parseRequirement('pandas>=2.1,==2.1.4')), true);
  for (const loose of ['pandas', 'pandas>=2.1', 'pandas~=2.1', 'pandas==2.1.*', 'pandas!=2.1.4', 'pandas<3']) assert.equal(isPinned(parseRequirement(loose)), false, loose);
  assert.equal(isPinned({ error: 'x' }), false);
});

test('direct references: a built file or a commit hash pins, a branch of a repository does not', () => {
  assert.equal(isPinnedUrl('https://example.test/pkg-1.0-py3-none-any.whl'), true);
  assert.equal(isPinnedUrl('https://example.test/archive.tar.gz'), true);
  assert.equal(isPinnedUrl(`git+https://example.test/repo.git@${'a1b2c3d4e5'.repeat(4)}`), true);
  assert.equal(isPinnedUrl('git+https://example.test/repo.git@main'), false);
  assert.equal(isPinnedUrl('git+https://example.test/repo.git'), false);
});

test('names are compared as package indexes compare them', () => {
  assert.equal(normalizeName('Scikit_Learn'), 'scikit-learn');
  assert.equal(normalizeName('zope.interface'), 'zope-interface');
  assert.equal(normalizeName('a--b__c'), 'a-b-c');
});

test('requirements files: comments, continuations, includes, editable projects, paths, URLs, per-requirement options and invalid lines', () => {
  const r = reqs([
    '# a comment',
    'pandas==2.1.4  # pinned',
    'numpy>=1.21 \\',
    '    ,<2',
    '-r base.txt',
    '--constraint=constraints.txt',
    '-e .',
    './wheels/tool-1.0-py3-none-any.whl',
    'git+https://example.test/repo.git@main#egg=repo',
    'requests==2.31.0 --hash=sha256:abcdef',
    '--index-url https://example.test/simple',
    'not a requirement !',
    ''
  ].join('\n'));
  assert.deepEqual(r.requirements.map((q) => [q.line, q.name, q.pinned]), [[2, 'pandas', true], [3, 'numpy', false], [10, 'requests', true]]);
  assert.deepEqual(r.requirements[1].specifiers, [{ op: '>=', version: '1.21' }, { op: '<', version: '2' }]);
  assert.deepEqual(r.includes, [{ line: 5, kind: 'requirement', target: 'base.txt' }, { line: 6, kind: 'constraint', target: 'constraints.txt' }]);
  assert.deepEqual(r.paths.map((p) => [p.line, p.kind]), [[7, 'editable'], [8, 'path'], [9, 'url']]);
  assert.equal(r.paths[2].pinned, false);
  assert.deepEqual(r.options.map((o) => o.line), [11]);
  assert.deepEqual(r.invalid.map((i) => i.line), [12]);
});

test('requirements files: CRLF and LF give the same reading, and a trailing backslash on the last line is kept', () => {
  const lf = reqs('pandas\nnumpy==1.26.4\n');
  const crlf = reqs('pandas\r\nnumpy==1.26.4\r\n');
  assert.deepEqual(crlf, lf);
  assert.equal(reqs('pandas==1.0 \\').requirements[0].name, 'pandas');
  assert.equal(reqs('pandas \\\\\nnumpy').requirements.length, 1, 'an escaped backslash is not a continuation');
});

test('pyproject.toml: the dependencies of [project] on one line or many, and Poetry dependencies other than python', () => {
  const one = parsePyproject(splitLines('[project]\nname = "x"\ndependencies = ["pandas>=2", "numpy"]\n'));
  assert.deepEqual(one.dependencies.map((d) => d.spec), ['pandas>=2', 'numpy']);
  assert.equal(one.line, 3);
  const many = parsePyproject(splitLines('[project]\ndependencies = [\n  "pandas>=2",  # data\n  "numpy",\n]\n[tool.other]\ndependencies = ["not this"]\n'));
  assert.deepEqual(many.dependencies.map((d) => d.spec), ['pandas>=2', 'numpy']);
  const poetry = parsePyproject(splitLines('[tool.poetry.dependencies]\npython = "^3.11"\npandas = "^2.1"\n'));
  assert.equal(poetry.poetry, 1);
  assert.equal(poetry.line, 3);
  assert.equal(parsePyproject(splitLines('[project]\nname = "x"\n')).dependencies.length, 0);
});

test('environment.yml: conda entries pin with = or ==, pip entries pin as requirements do, and other keys are left out', () => {
  const env = parseEnvironmentYml(splitLines('name: study\nchannels:\n  - conda-forge\ndependencies:\n  - python=3.11\n  - numpy\n  - conda-forge::pandas==2.1.4\n  - scipy>=1.11\n  - pip\n  - pip:\n    - requests==2.31.0\n    - rich\n'));
  assert.equal(env.line, 4);
  assert.deepEqual(env.dependencies.map((d) => [d.name, d.pip, d.pinned]), [['python', false, true], ['numpy', false, false], ['pandas', false, true], ['scipy', false, false], ['pip', false, false], ['requests', true, true], ['rich', true, false]]);
});

test('Pipfile and package.json: the number of packages and the line of the first', () => {
  assert.deepEqual(parsePipfile(splitLines('[[source]]\nurl = "x"\n[packages]\npandas = "*"\n[dev-packages]\npytest = "==8.0"\n[requires]\npython_version = "3.11"\n')), { count: 2, line: 4 });
  assert.deepEqual(parsePackageJson('{\n  "name": "x",\n  "dependencies": { "a": "^1.0.0" },\n  "devDependencies": { "b": "1.0.0" }\n}\n'), { count: 2, line: 3 });
  assert.deepEqual(parsePackageJson('{ "name": "x" }'), { count: 0, line: 0 });
  assert.throws(() => parsePackageJson('[1, 2]'), /not a JSON object/);
});

test('CITATION.cff: top-level keys with their lines and values, and the authors list counted', () => {
  const keys = parseCitation(splitLines('# comment\ncff-version: 1.2.0\nmessage: "Cite it."\ntitle: \'Study\'\nauthors:\n  - family-names: Doe\n    given-names: Ann\n  - name: "The team"\n'));
  assert.equal(keys.get('cff-version').value, '1.2.0');
  assert.equal(keys.get('message').value, 'Cite it.');
  assert.equal(keys.get('title').value, 'Study');
  assert.equal(keys.get('authors').items, 2);
  assert.equal(keys.get('authors').line, 5);
  assert.equal(parseCitation(splitLines('authors: [{name: a}, {name: b}]\n')).get('authors').items, 2);
  assert.equal(parseCitation(splitLines('authors: []\n')).get('authors').items, 0);
});
