# research-repro-check

Reads the folder of a research study or prototype and reports what stops someone else from running the work again and getting the same result. You give it the folder that holds the scripts, the Jupyter notebooks, the requirements file and the README. It reads them as text, never runs them, and reports code with no file that pins its environment, requirements that are not pinned, notebooks run out of order or saved with errors, data files the code reads that are not there, paths that only exist on one computer, random numbers with no seed, keys written in the code or in saved outputs, and a missing README, license or citation file. Every finding names the file and the line or cell, the severity, a sentence on how to fix it, and the sentence of the page that it rests on, with its address.

A study can look finished and still fail on the first machine that is not the author's: a notebook that only worked because its cells ran in another order, `pandas` with no version, a CSV file that lives in a folder nobody else has, `/home/mira/` in the third cell. Each of these is written in the files. This tool reads them in a second, before a paper is submitted, a repository is made public or a prototype is handed over, and on every pull request after that.

- Every finding has an id, a severity (error, warning or info), the file and the line or cell, a plain message, a fix, and the quoted sentence of the page it rests on, with the address of the saved page.
- Nothing runs. The code is read as text: no script, cell, `setup.py`, pip, conda, R or kernel is ever started, and no symbolic link is followed. [docs/limits.md](docs/limits.md) says what a static reading cannot show, starting with the main thing: it cannot prove that a result reproduces.
- Every quoted sentence comes from The Turing Way, the packaging specifications (PEP 508 and PEP 440), the pip documentation, the notebook format description or the citation file guide, saved in [research/sources](research/sources); a test compares [src/data.js](src/data.js) and the documents with the saved text.
- Reports as text, Markdown, JSON and CSV, with an exit code for a pipeline gate. Info findings never fail the run.
- Plain JavaScript, no dependencies; the same folder always gives the same report, with LF or CRLF line ends.

```
npm test
```

```
tests 131
pass 127
fail 0
skipped 4
```

These are the summary lines that `npm test` prints at the end. The skipped tests are the ones that need a system other than Windows: links out of the folder and in a loop, a folder named through a link, a link to a device, and a file name with a control character. They are guarded with `process.platform`, and run on Linux and macOS.

## Quick start

Requires Node 22 or newer. There is nothing to install.

```
git clone https://github.com/INNERLUXES/research-repro-check.git
cd research-repro-check
node bin/research-repro-check.js examples/messy-study
```

Or without a clone, in the folder of your study:

```
npx --yes github:INNERLUXES/research-repro-check .
```

`examples/` holds two made-up versions of a small survey study. `examples/messy-study/` is wrong on purpose: its notebook was run out of order and saved with an error and a token in a cell, `requirements.txt` pins nothing, `clean_data.py` reads a raw data file that is not there and a codebook from a home folder, nothing sets a seed, and there is no README, license or citation file. `examples/clean-study/` is the same study repaired; it passes at the strictest level.

## Usage

```
node bin/research-repro-check.js examples/messy-study --fail-on warning
```

```
research-repro-check: examples/messy-study
folder: 4 files in 2 folders, 3 read, 0 not read, 0 links not followed, 0 folders skipped
code: 1 notebook, 1 Python script, 0 R scripts, 0 JavaScript files; languages: Python
environment: requirements.txt; lock files: none
limits: outputs over 100 KB per cell
areas:
  Folder          warn  summary x1, no-readme x1, no-license x1, no-citation x1
  Environment     warn  unpinned-dependency x1
  Notebooks       warn  notebook-out-of-order x1, notebook-outputs-with-errors x1
  Data and paths  warn  missing-data-file x1, absolute-path x1
  Randomness      warn  no-seed x1
  Secrets         fail  secrets-in-notebook x1
findings: 1 error, 8 warning, 2 info

Folder (4 findings)

  INFO     summary  examples/messy-study folder
           Read 3 of 4 files in 2 folders: 1 notebook (4 code cells), 1 Python script, 0 R scripts. Languages: Python. Dependencies: requirements.txt 4 requirements (0 pinned). The code reads 2 relative data paths; random numbers are drawn on 2 lines and a seed is set on 0 lines.
           basis: "At The Turing Way, we define reproducible research as work that can be independently recreated from the same data and the same code that the original team used." (Table of Definitions for Reproducibility, https://book.the-turing-way.org/reproducible-research/overview/overview-definitions/)
           fix: Nothing to fix; this is what the tool read. A clean report means none of the checks found anything, not that the result reproduces.

  WARNING  no-readme  examples/messy-study folder
           The folder has no README at its top level, so a reader does not learn what the study is, how to set up its environment, where the data comes from, or in what order to run the code.
           basis: "For research to be reproducible, researchers must publish and distribute the entire contained analysis, not just its results." (Science, https://book.the-turing-way.org/reproducible-research/renv/)
           basis: "If the project environment is not captured and the researchers need to return to their project after months or years (as is common in research), they will be unable to do so confidently." (Researchers, https://book.the-turing-way.org/reproducible-research/renv/)
           fix: Add a README.md that says what the study does, how to install the environment, where to get the data, and which scripts or notebooks to run in which order.

  WARNING  no-license  examples/messy-study folder
           The folder has no LICENSE, LICENCE or COPYING file at its top level. Without one, others may read the code but have no permission to run, change or share it.
           basis: "For research to be reproducible, researchers must publish and distribute the entire contained analysis, not just its results." (Science, https://book.the-turing-way.org/reproducible-research/renv/)
           fix: Add a LICENSE file with the license you choose for the code, and say in the README which terms cover the data.

  INFO     no-citation  examples/messy-study folder
           The folder has no CITATION.cff, so there is no file that tells others how to cite the work.
           basis: "A minimal example of a valid CITATION.cff file, that contains only the required keys, could look like this:" (Minimal example, https://github.com/citation-file-format/citation-file-format/blob/main/schema-guide.md)
           fix: Add a CITATION.cff with at least cff-version, message, title and authors. Code hosting sites and archives read it and show the citation.

Environment (1 finding)

  WARNING  unpinned-dependency  examples/messy-study/requirements.txt 4 requirements  line 1
           4 of 4 requirements in requirements.txt are not pinned to one version: pandas (no version), numpy (>=1.21), matplotlib (no version) and scikit-learn (~=1.3). pip installs the newest version that matches each one, so the same file gives other versions on another day, and there is no lock file that records the versions you used.
           basis: "When multiple candidate versions match a version specifier, the preferred version SHOULD be the latest version as determined by the consistent ordering defined by the standard Version scheme." (Version specifiers, https://packaging.python.org/en/latest/specifications/version-specifiers/)
           basis: "The strict version comparison operator is intended primarily for use when defining dependencies for repeatable deployments of applications while using a shared distribution index." (Version matching, https://packaging.python.org/en/latest/specifications/version-specifiers/)
           fix: Pin each requirement to the version you ran the study with (pandas==2.1.4), for example from pip freeze in that environment, or commit a lock file (poetry.lock, uv.lock or Pipfile.lock) next to the ranges.

Notebooks (2 findings)

  WARNING  notebook-out-of-order  examples/messy-study/analysis.ipynb cell 2  line 12
           The code cells were not run once from top to bottom: the first run cell (cell 2) has execution count 3, so 2 runs are not in the saved notebook; cell 3 has execution count 1, after cell 2 with 3; cell 4 was not run, but cells before and after it were; the execution count jumps from 1 (cell 3) to 7 (cell 5). The saved execution counts in cell order are 3, 1, none, 7. Someone who runs the notebook from the top does not repeat what was run, so the outputs may not come back.
           basis: "They also have an execution_count, which must be an integer or null." (Code cells, https://nbformat.readthedocs.io/en/latest/format_description.html)
           basis: "A result is reproducible when the same analysis steps performed on the same dataset consistently produces the same answer." (Table of Definitions for Reproducibility, https://book.the-turing-way.org/reproducible-research/overview/overview-definitions/)
           fix: Restart the kernel and run all cells from the top (Restart Kernel and Run All Cells), check that the results are the same, and save the notebook again.

  WARNING  notebook-outputs-with-errors  examples/messy-study/analysis.ipynb cell 5  line 63
           1 cell of the notebook has a saved error: cell 5 (KeyError: 'wage'). The run that made the saved outputs did not finish cleanly, so later cells may rest on a state the code does not make.
           basis: "Failed execution may show an error:" (error, https://nbformat.readthedocs.io/en/latest/format_description.html)
           basis: "These correspond to messages produced as a result of executing the cell." (Code cell outputs, https://nbformat.readthedocs.io/en/latest/format_description.html)
           fix: Fix the cell or remove it, then restart the kernel, run all cells and save. If the error is the point of the cell, say so in a Markdown cell above it.

Data and paths (2 findings)

  WARNING  missing-data-file  examples/messy-study/clean_data.py data/raw/responses_v2.csv  line 7
           pd.read_csv("data/raw/responses_v2.csv") at line 7 reads data/raw/responses_v2.csv, which is not in the folder and is not named in a README or data document.
           basis: "At The Turing Way, we define reproducible research as work that can be independently recreated from the same data and the same code that the original team used." (Table of Definitions for Reproducibility, https://book.the-turing-way.org/reproducible-research/overview/overview-definitions/)
           basis: "Together with all other components of a research project, data identified in precise versions is part of the research outcome." (Importance of Version Controlling Data, https://book.the-turing-way.org/reproducible-research/vcs/vcs-data/)
           fix: Add the file to the folder, or say in the README where to get it (an address, and a version or checksum), or add a script that downloads it.

  WARNING  absolute-path  examples/messy-study/clean_data.py  line 5
           "/home/mira/projects/survey/codebook.xlsx" is a path in the home folder of one user. On another computer, or for another user, the path does not exist, so the code stops there.
           basis: "In essence, mobility of compute means being able to contain the entire software stack, from data files up through the library stack, and reliably move it from system to system." (Science, https://book.the-turing-way.org/reproducible-research/renv/)
           basis: "Any research that is limited to where it can be deployed is instantly limited in the extent that it can be reproduced." (Science, https://book.the-turing-way.org/reproducible-research/renv/)
           fix: Use a path relative to the folder of the study (data/codebook.xlsx), built from the place of the script (Path(__file__).parent in Python, here::here() in R), or read the folder from a setting.

Randomness (1 finding)

  WARNING  no-seed  examples/messy-study/analysis.ipynb cell 3  line 45
           The code draws random numbers (analysis.ipynb cell 3: noise = np.random.normal(0, 1, len(df)) and clean_data.py line 12: random.shuffle(ids)) and no seed is set anywhere in the folder. Each run gives other numbers, so results that rest on them change from run to run.
           basis: "A result is reproducible when the same analysis steps performed on the same dataset consistently produces the same answer." (Table of Definitions for Reproducibility, https://book.the-turing-way.org/reproducible-research/overview/overview-definitions/)
           basis: "Worse, some bugs may remain undetected, potentially impacting the results." (Collaborators, https://book.the-turing-way.org/reproducible-research/renv/)
           fix: Set a seed once at the top of each script or notebook: random.seed(42), np.random.seed(42) or rng = np.random.default_rng(42), torch.manual_seed(42), or set.seed(42) in R. Pass random_state to scikit-learn calls.

Secrets (1 finding)

  ERROR    secrets-in-notebook  examples/messy-study/analysis.ipynb cell 5  line 76
           A key, token or password is written in the code: demo... (23 characters). Anyone who gets the folder gets the key, and it stays in the history of the repository after it is deleted.
           basis: "You can now store sensitive data (tokens, keys, etc.) in environment variables and only specify the variable name for your requirements, letting pip lookup the value at runtime." (Using environment variables, https://pip.pypa.io/en/stable/reference/requirements-file-format/)
           basis: "The Turing Way recognises that some research will use sensitive data that cannot be shared and this handbook will provide guides on how your research can be reproducible without all parts necessarily being open." (Reproducible But Not Open, https://book.the-turing-way.org/reproducible-research/overview/overview-definitions/)
           fix: Revoke the key now. Read it from an environment variable or a file that is not shared, clear the outputs that show it, and remove it from the history of the repository.

GATE: FAIL - 1 error, 8 warnings
```

The exit code is `1`: the token is an error, and errors fail the run by default. The eight warnings fail it too here, because of `--fail-on warning`. The `info` findings never fail a run. The key in the notebook is shown only as its first four characters and its length, in every format.

The repaired study passes, also with `--fail-on warning`:

```
node bin/research-repro-check.js examples/clean-study --fail-on warning
```

```
research-repro-check: examples/clean-study
folder: 8 files in 2 folders, 5 read, 0 not read, 0 links not followed, 0 folders skipped
code: 1 notebook, 1 Python script, 0 R scripts, 0 JavaScript files; languages: Python
environment: requirements.txt; lock files: none
limits: outputs over 100 KB per cell
areas:
  Folder          info  summary x1
  Environment     pass  no finding
  Notebooks       pass  no finding
  Data and paths  pass  no finding
  Randomness      pass  no finding
  Secrets         pass  no finding
findings: 0 error, 0 warning, 1 info

Folder (1 finding)

  INFO     summary  examples/clean-study folder
           Read 5 of 8 files in 2 folders: 1 notebook (4 code cells), 1 Python script, 0 R scripts. Languages: Python. Dependencies: requirements.txt 4 requirements (4 pinned). The code reads 3 relative data paths; random numbers are drawn on 1 line and a seed is set on 2 lines.
           basis: "At The Turing Way, we define reproducible research as work that can be independently recreated from the same data and the same code that the original team used." (Table of Definitions for Reproducibility, https://book.the-turing-way.org/reproducible-research/overview/overview-definitions/)
           fix: Nothing to fix; this is what the tool read. A clean report means none of the checks found anything, not that the result reproduces.

note: 1 data path that the code reads is not in the folder but is named in a README or data document, so it was not reported: data/raw/responses_v2.csv (README.md)

GATE: PASS (--fail-on warning)
```

The notebook was run again from the top, the requirements are pinned, the script finds its codebook in the folder and sets a seed, and the README, the license and `CITATION.cff` are there. The raw answers are still not in the folder, on purpose: the README says they hold personal data and how to ask for them, so the tool names them in a note instead of a finding. Passing means that none of the checks found anything in the files. It does not mean that the results reproduce; only running the study again shows that.

```
research-repro-check <folder> [options]
```

```
--format <name>       text, markdown, json or csv (default: text)
--fail-on <level>     exit with 1 when a finding is at this level or above: error or warning
                      (default: error); info never fails the run
--max-output <size>   the most saved output one notebook cell may hold before it is reported, in bytes
                      (100000, 100K, 1M) (default: 100 KB)
--help                show the usage
--version             show the version
```

Paths in the report are relative to the folder you run the command in, with forward slashes on every system; a folder outside it is shown with its absolute path.

## What is read

[docs/inputs.md](docs/inputs.md) has the details. The folder is walked without following links, and only the files the checks need are read; data files are listed by name and never opened.

| File | What the tool takes from it |
| --- | --- |
| `*.py`, `*.R`, `*.r`, `*.Rmd` | string literals with their lines, and the code with strings and comments blanked |
| `*.ipynb` (nbformat 4) | the cells, the execution counts, the outputs, and the code of each cell |
| `requirements*.txt`, `requirements*.in` and the files they include | every line, read as pip reads it: name, extras, version clauses, URL and marker |
| `pyproject.toml`, `environment.yml`, `Pipfile`, `package.json` | the dependencies they list |
| lock files (`poetry.lock`, `uv.lock`, `Pipfile.lock`, `renv.lock`, `package-lock.json` and others) | their names |
| `README*`, `LICENSE*`, `CITATION.cff`, data documents | whether they are there, the required keys of the citation file, and whether a missing data file is described |

## The checks

| Id | Severity | What it reports |
| --- | --- | --- |
| `no-environment-spec` | error | Python, R or JavaScript code with no file that says which packages it needs |
| `secrets-in-notebook` | error | A key, token or password in the code or in a saved output, shown masked |
| `unpinned-dependency` | warning | Requirements, or `environment.yml` entries, not pinned to one version, with no lock file |
| `no-lock-file` | warning | A `pyproject.toml`, `Pipfile` or `package.json` with dependencies and no lock file |
| `notebook-out-of-order` | warning | Saved execution counts that show the cells were not run once from top to bottom |
| `notebook-outputs-with-errors` | warning | A saved error output in a notebook |
| `notebook-unreadable` | warning | A notebook that is not valid nbformat 4 JSON, or is too large to read |
| `missing-data-file` | warning | A relative path the code reads that is not in the folder and not described in a README |
| `absolute-path` | warning | A path on one computer or for one user: `C:\Users\...`, `/home/<name>/...`, `/Users/<name>/...` |
| `no-seed` | warning | Random numbers drawn with no seed set anywhere, or a generator made without a seed |
| `no-readme` | warning | No README at the top of the folder |
| `no-license` | warning | No LICENSE file at the top of the folder |
| `citation-invalid` | warning | A `CITATION.cff` that lacks `cff-version`, `message`, `title` or `authors`, or has the wrong name |
| `notebook-large-outputs` | info | Notebook cells with saved outputs above `--max-output` |
| `no-citation` | info | No `CITATION.cff` at the top of the folder |
| `summary` | info | What was read: files, languages, notebooks, dependencies, data paths and seeds |

[docs/method.md](docs/method.md) gives each check, its exact rule, what it can see and what it cannot. [docs/rules-and-sources.md](docs/rules-and-sources.md) lists every quoted sentence with the saved page it comes from.

## Where the facts come from

| Fact | Source |
| --- | --- |
| What reproducible research and a reproducible result are | The Turing Way, Definitions, https://book.the-turing-way.org/reproducible-research/overview/overview-definitions/ |
| Capturing the computational environment, and moving an analysis from system to system | The Turing Way, Reproducible Environments, https://book.the-turing-way.org/reproducible-research/renv/ |
| Package managers and environment files | The Turing Way, Package Management Systems, https://book.the-turing-way.org/reproducible-research/renv/renv-package/ |
| Data as part of the research outcome | The Turing Way, Version Control for Data, https://book.the-turing-way.org/reproducible-research/vcs/vcs-data/ |
| The parts of a dependency specifier | Dependency specifiers (PEP 508), https://packaging.python.org/en/latest/specifications/dependency-specifiers/ |
| Version clauses, strict matching and the newest matching version | Version specifiers (PEP 440), https://packaging.python.org/en/latest/specifications/version-specifiers/ |
| The lines of a requirements file, and keeping secrets in environment variables | pip, Requirements File Format, https://pip.pypa.io/en/stable/reference/requirements-file-format/ |
| Code cells, execution_count and error outputs | nbformat, The Notebook file format, https://nbformat.readthedocs.io/en/latest/format_description.html |
| The required keys of CITATION.cff | Guide to Citation File Format schema version 1.2.0, https://github.com/citation-file-format/citation-file-format/blob/main/schema-guide.md |

## Formats

- `text`: for a terminal: the folder, code, environment and limits lines, the areas with their result, then the findings grouped by area, each with its id, place, line, message, quotation and fix.
- `markdown`: the same for a pull request comment or the job summary. Pipes, square brackets, backticks, asterisks, underscores, line breaks and angle brackets from the folder are escaped, so a file name cannot break a table or make a link.
- `json`: the whole report: the folder counts, the areas, every finding with id, severity, area, file, where, line, subject, message, fix, basis and source, the notes and the gate.
- `csv`: one row per finding, quoted as RFC 4180 says. A cell that starts with `=`, `+`, `-` or `@` gets a leading `'`, so a spreadsheet does not run it as a formula.

[examples/output](examples/output) holds the messy study in every format.

To put the report in the job summary of a GitHub Actions run:

```yaml
permissions:
  contents: read
steps:
  - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
  - uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0
    with:
      node-version: 22
  - name: Reproducibility report
    run: npx --yes github:INNERLUXES/research-repro-check . --format markdown >> "$GITHUB_STEP_SUMMARY"
  - name: Reproducibility gate
    run: npx --yes github:INNERLUXES/research-repro-check . --fail-on warning
```

It needs no secrets, no Python, no R and no data; a Linux runner is enough. Start with the default gate (errors only), and move to `--fail-on warning` when the first report is clean.

## Exit codes

`0` no finding at the `--fail-on` level, `1` at least one such finding (by default: an error, such as code with no environment file or a key in a notebook), `2` a usage or input error (a folder that does not exist, a file in place of a folder, a folder over the limits of entries, depth or bytes, an unknown option).

## Limits

The tool reads files; it does not run them, so it cannot prove that a result reproduces. It does not compare imports with requirements, check that pinned versions still install, follow paths held in variables, see the operating system or the hardware, or tell whether a seed is set before the draw it is meant for; the seed check is best effort. Python and R code are read; other languages only for their notebooks' order and outputs. A finding is a review item, and a clean report is a good start, not a proof. [docs/limits.md](docs/limits.md) lists these, with the size limits.

## Related

The tool asks whether a study's environment is pinned at all. The supply-chain side of Python dependency files (where each package comes from, hashes, indexes) is the subject of `requirements-check` in the same organization; this tool does not check it.

## Background

- How prototypes and research code are built so that others can run them again, with checks like this one in the pipeline: [software research and development services](https://innerluxes.dev/software-development/research-and-development).

## License

MIT
