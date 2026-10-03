# Changes

## 1.0.0

First release.

- Reads the folder of a research study or prototype as text: Python and R scripts, Jupyter notebooks in nbformat 4, requirements files, `pyproject.toml`, `environment.yml`, `Pipfile`, `package.json`, `CITATION.cff`, README files and data documents. Walks the folder with `lstat` and never follows a symbolic link. Never runs the code, never starts a kernel, never installs a package and never fetches anything.
- Environment: code in Python, R or JavaScript with no file that says which packages it needs (`no-environment-spec`, error); requirements, and `environment.yml` entries, that are not pinned to one version when there is no lock file (`unpinned-dependency`); a `pyproject.toml`, `Pipfile` or `package.json` with dependencies and no lock file (`no-lock-file`). Requirements files are read as pip reads them, with comments, continuations, `-r` and `-c` includes inside the folder, and dependency specifiers read for their name, extras, version clauses, URL and marker.
- Notebooks: saved execution counts that show the cells were not run once from top to bottom, with a late start, a count that goes back, a gap or a skipped cell (`notebook-out-of-order`); saved error outputs (`notebook-outputs-with-errors`); a notebook that is not valid nbformat 4 JSON or is too large to read (`notebook-unreadable`); cells with large saved outputs (`notebook-large-outputs`, info, `--max-output`).
- Data and paths: a relative path read by the code that is not in the folder, not written by the code and not named in a README or data document (`missing-data-file`); a path that only exists on one computer or for one user (`absolute-path`).
- Randomness: random draws with no seed anywhere in the folder, and random generators made without a seed (`no-seed`).
- Secrets: keys, tokens and passwords in code and in saved outputs, always shown masked (`secrets-in-notebook`, error).
- The folder: no README (`no-readme`), no license (`no-license`), no `CITATION.cff` (`no-citation`, info), and a `CITATION.cff` without its required keys or with the wrong name (`citation-invalid`). A summary of what was read (`summary`, info).
- Every finding has an id, a severity (error, warning, info), the file and the line or cell, a message, a fix, and the sentence of the page it rests on, with the address.
- Every quoted sentence comes from pages of The Turing Way, the packaging specifications PEP 508 and PEP 440, the pip documentation, the notebook format description and the citation file guide, saved in `research/sources`; a test compares `src/data.js` and the documents with the saved text.
- Reports as text, Markdown, JSON and CSV; `--fail-on` for a pipeline gate; info never fails the run; exit code `2` for a usage or input error.
- Safe input: no link is followed, folders of tools and caches are skipped, at most 20,000 entries and 32 levels of folders, files to read up to 16 MB and 256 MB in all, binary files are not read, lines over 4,096 characters are not scanned, notebook JSON nests at most 64 deep, every pattern is anchored or bounded, and control characters are removed from every text shown.
- Release packages come with a CycloneDX SBOM, SHA-256 checksums and a build provenance attestation.
