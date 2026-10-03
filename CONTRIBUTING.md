# Contributing

Every change goes through a pull request and is reviewed before it is merged. The pipeline runs the tests on Linux, Windows and macOS, the repository checks, CodeQL, and a secure development check of the repository itself.

Commit messages in this repository follow Conventional Commits: `feat:`, `fix:`, `docs:`, `test:`, `ci:`, with `!` for a breaking change.

## Changing a check

1. Describe the change in docs/method.md first: what the check reports, its severity, what it can see and what it cannot, and the sentence of a saved page it follows. Where the tool makes its own choice (a severity, a default limit, a list of calls or file names), say so and say why.
2. Add a test with the study written inline (test/helpers.js builds a folder in memory, and a notebook from a list of cells), small enough that the result can be worked out by hand, and a near miss that must not match.
3. Text from the input goes through `safeText` before it reaches a finding or a note, so control characters are removed. A key or token is shown only through `maskSecret` or `maskSecrets`, never in full, in every format.
4. A finding id, once released, keeps its meaning: pipelines and other tools read it from the JSON and CSV reports.
5. A thing the tool cannot see is reported as a note or a finding, never passed.

## Changing a reader

1. The tool reads; it never runs. A change must not run, import or install anything from the study, open a path written in the study, or follow a link.
2. Keep the size, depth, count and line length limits, and the limit on how far back a pattern looks. A pattern must be anchored or have bounded repeats, with no nested repetition; add a test with a long near miss and a time check.
3. Folders written with LF and with CRLF line ends must give the same report. The example studies are stored as written (`.gitattributes`), and a test reads them both ways.
4. Paths are opened with `path.resolve`, never `path.join`, so an absolute path works on every system. Paths shown in a report are relative, with forward slashes. Do not assume that a backslash is a separator on Linux or macOS; a Windows path in a test is a string, never a file. A test that depends on the operating system (a symbolic link, a device, a name with a control character) is guarded with `process.platform`, and every other test builds its paths with `resolve()` from names with forward slashes.

## Changing the quoted sentences or the lists

The sentences in `src/data.js` come from the pages saved in `research/sources`: The Turing Way (definitions, reproducible environments, package management, version control for data), the packaging specifications (PEP 508 and PEP 440), the pip requirements file format, the notebook format description and the citation file guide. When a page changes, save the new text in `research/sources` (the address on the first line, plain ASCII, no date or year), change `src/data.js` to match, and update docs/rules-and-sources.md. `test/data.test.js` compares every quoted sentence with the saved text, so changing one without the other fails.

The lists of environment files, lock files, reader and writer calls, data endings, random calls, seeds and key shapes are the tool's own. Add to them with a test that shows a real line that needs the entry, and a near miss that must not match.

Never add a rule or a quoted sentence from memory or from a blog post. A new rule needs the official page, opened and saved, and the words of the page that it rests on.

## Rules for the code

- No runtime dependencies. Node 22 or newer and nothing else.
- The tool reads the folder it is given and writes only to the screen. It opens no network connection and runs no program.
- Source files stay ASCII; write any other character in a pattern as a Unicode escape, or build it from its code point.
- Never commit a real secret, even as a fixture. Build a key-shaped string in a test from pieces, so that it matches no real token format in the repository. `npm run check` fails on anything that looks like a credential.
- The README and the documents carry no dates or years, and the examples and tests hold no number that reads like a year. Version numbers (Node 22, Python 3.11) are fine.

## Before you open the pull request

```
npm test
npm run check
npm run example
```
